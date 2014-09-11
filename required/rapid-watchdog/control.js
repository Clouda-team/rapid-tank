exports.startControl = function (config) {
    var watchdog = require('./watchdog'),
        fs = require('fs'),
        os = require('os'),
        info = {apps: watchdog.apps, addons: {}}, addonPrefix = {};

    // scan for all modules
    require('../../src/scan')(function checkName(prefix, name) {
        var pkg = require(prefix + '/' + name + '/package.json');
        addonPrefix[name] = prefix + '/';
        if (pkg.actions) {
            info.addons[name] = pkg.actions;
        }
    });


    var mimeTypes = {
        'html': 'text/html; charset=utf-8', 'js': 'text/javascript', 'css': 'text/css',
        'png': 'image/png',
        'manifest': 'application/cache-manifest'
    };
    var http = require('http');

    var user = Object.keys(config.auth.user)[0];
    console.log('starting monitor at port ' + config.port + ' with authinfo: ' + user + '::' + config.auth.user[user].password);

    var URL = require('url');
    http.createServer(require('../../src/auth')(config.auth.user, config.auth.realm, function (req, res) {
        var $url = URL.parse(req.url, true), url = $url.pathname;

        if (url[url.length - 1] === '/') {
            url += 'index.html';
        }
        try {
            if (watchdog[url.substr(1)]) {
                // GET  /stop /reload /restart?id=
                watchdog[url.substr(1)]({id: $url.query.id}, cb);
            } else if (/\.\w+$/.test(url)) { // sends file
                sendFile(url, req, res);
            } else if (url === '/info') {
                info.stat = {
                    name: os.platform() + ' ' + os.hostname() + ' ' + os.arch(),
                    load: os.loadavg(),
                    mem: {
                        total: os.totalmem(),
                        free: os.freemem()
                    }
                };

                var ret = new Buffer(JSON.stringify(info));
                res.writeHead(200, {
                    'Content-Type': mimeTypes.json,
                    'Content-Length': ret.length,
                    'Cache-Control': 'no-cache'
                });
                res.end(ret);
            } else if (url.substr(0, 8) === '/addons/') {
                var app = info.apps[+$url.query.id.substr(3)];
                if (!app || !app.context || !app.context.addonPort) {
                    res.statusCode = 404;
                    return res.end();
                }
                http.request({
                    method: "GET",
                    host: '127.0.0.4',
                    port: app.context.addonPort,
                    path: url.substr(7)
                }, function (tres) {
                    res.writeHead(tres.statusCode, tres.headers);
                    tres.pipe(res);
                }).on('error', function (err) {
                    res.statusCode = 500;
                    res.end(err.message);
                }).end();
            } else if (url.substr(0, 9) === '/restart/') { // restart with options
                var app = info.apps[+$url.query.id.substr(3)];
                if (!app) {
                    res.statusCode = 404;
                    return res.end();
                }
                var env = app.env,
                    curr_addons = {};
                env.tankjs_addons.split(',').forEach(function (name) {
                    curr_addons[name] = true;
                });
                url.substr(9).split('/').forEach(function (stmt) {
                    var m = /^(\w+)-(.+)$/.exec(stmt);
                    if (!m) return;
                    switch (true) {
                        case stmt.substr(0, 5) === 'with-':
                            curr_addons[stmt.substr(5)] = true;
                            break;
                        case stmt.substr(0, 8) === 'without-':
                            delete curr_addons[stmt.substr(8)];
                            break;
                    }
                });
                env.tankjs_addons = Object.keys(curr_addons).join(',');
                watchdog.restart(app, cb);
            } else {
                res.statusCode = 404;
                res.end('command not found');
            }
        } catch (e) {
            cb(e);
        }

        function cb(err, ret) {
            if (err) {
                res.statusCode = 500;
                res.end(err.message);
            } else {
                res.end(ret);
            }
        }
    })).listen(config.port, function () {
        console.log('monitor bound to port ' + this.address().port);
    }).on('error', function (e) {
        console.error(e.message);
    });

    function sendFile(path, req, res) {
        var filePath;
        if (path.substr(0, 8) === '/addons/') {
            var idx = path.indexOf('/', 8),
                addonName = path.substring(8, idx),
                prefix = addonPrefix[addonName];
            if (!prefix) {
                res.statusCode = 404;
                return res.end();
            }
            filePath = prefix + '/' + path.substr(8);
        } else {
            filePath = 'res' + path;
        }
        fs.stat(filePath, function (err, stat) {
            if (err) {
                res.writeHead(404);
                return  res.end();
            }
            var mtime = stat.mtime.toGMTString();
            if (req.headers['if-modified-since'] === mtime) {
                res.writeHead(304);
                res.end();
            } else {
                res.writeHead(200, {
                    'Content-Type': mimeTypes[req.url.substr(req.url.lastIndexOf('.') + 1).toLowerCase()],
                    'Last-Modified': mtime,
                    'Cache-Control': 'max-age=300',
                    'Content-Length': stat.size
                });
                fs.createReadStream(filePath).pipe(res);
            }
        });
    }
};
