var timeout = process.env.TEST_TIMEOUT | 0 || 600;
var tests = [], currentTitle = '', currentTimeout = timeout;

var handles = {
    timeout: function (newTimeout) {
        currentTimeout = newTimeout;
    }
};

global.describe = function (title, cb) {
    if (typeof title === 'function') {
        cb = title;
        title = '';
    }
    currentTitle = '[ \x1b[32m' + title + '\x1b[0m ] ';
    try {
        cb.call(handles);
    } catch (e) {
        console.error(e);
    }
    currentTitle = '';
    currentTimeout = timeout;
};

global.it = function (unit, run) {
    if (typeof unit === 'function') {
        run = unit;
        unit = '';
    }
    var timeout = currentTimeout;

    tests.push(run.length ? {
        title: currentTitle + unit,
        run: function (next) {
            var hasDone = false;
            var pid = setTimeout(done, timeout, 'timeout');
            this.done = done;
            try {
                run(done);
            } catch (e) {
                done(e);
            }
            function done(e) {
                clearTimeout(pid);
                if (hasDone) return;
                hasDone = true;
                next(e)
            }
        }
    } : { // sync
        title: currentTitle + unit,
        run: function (next) {
            try {
                run();
                next();
            } catch (e) {
                next(e);
            }
        }
    });
};


exports.startup = function () {
    var path = process.argv[2], fs = require('fs');
    if ('.js' === path.substr(-3)) {
        load(path);
    } else if (fs.existsSync(path += '/test/')) {
        fs.readdirSync(path).forEach(function (fname) {
            if ('.js' === fname.substr(-3)) {
                load(path + fname);
            }
        });

    } else {
        console.log('nothing to do, exiting...');
        process.exit();
    }

    function load(path) {
        try {
            require(path);
        } catch (e) {
            console.error(e.stack);
        }
    }


// run all tests
    var i = 0, L = tests.length, failed = 0;

    var domain = require('domain').create();

    domain.on('error', function (err) {
        console.error('uncaught error occured');
        tests[i - 1].done(err);
    });

    var report = process.env.TEST_REPORT;
    if (report) {
        /**
         * VERB /addon/path
         */
        var context = global.context;
        require('http').IncomingMessage.prototype.readBody = function (cb) {
            var chunks = [];
            this.on('data', chunks.push.bind(chunks)).on('end', function () {
                cb(Buffer.concat(chunks));
            });
        };
        report = require('http').createServer(function (req, res) {
            if (req.url === '/exit') {
                res.setHeader('Connection', 'close');
                res.end('bye');
                return this.close(function () {
                    process.exit();
                });
            }
            var url = req.url, idx = url.indexOf('/', 1), addon, name;
            if (idx === -1) { // /addon
                addon = context.addons[name = url.substr(1)];
                req.url = '/';
            } else {
                addon = context.addons[name = url.substring(1, idx)];
                req.url = url.substring(idx);
            }
            if (addon) {
                if (/^\/[^?]+\.\w+$/.test(url)) { // url=/index.html
                    var path = require.resolve(name + '/package.json');
                    path = path.substr(0, path.length - 13) + req.url;
                    if (fs.existsSync(path))
                        return fs.createReadStream(path).pipe(res);
                    console.log('file not found: ' + path);
                } else if (addon.requestHandler) {
                    return addon.requestHandler(req, res);
                }
            }
            res.statusCode = 404;
            res.end();
        }).listen(report === 'true' ? 0 : +report).on('error', function (err) {
            console.error('Error binding to test report address: ' + err.message);
        });
    }

    domain.enter();
    next();

    function next(err) {
        if (err) {
            console.log('\n  \x1b[31m' + i + ')\x1b[0m ' + tests[i - 1].title + ': ', err.stack || err);
            failed++;
        }
        if (i < L) {
            process.stdout.write('\x1b[32m.\x1b[0m ');
            domain.run(function () {
                tests[i++].run(next);
            });
        } else {
            console.log('\ndone, ' + failed + '/' + L + ' failed');
            domain.exit();
            if (report) {
                var addr = 'http://127.0.0.1:' + report.address().port;
                var str = '    Reporter enabled at  ' + addr +
                    '\n                   Exit  ' + addr + '/exit';
                Object.keys(context.addons).forEach(function (name) {
                    var addon = context.addons[name];
                    if (addon.links) {
                        Object.keys(addon.links).forEach(function (key) {
                            str += '\n' + '                       '.substr(key.length) + key + '  ' + (key.length < 7 ? '\t\t' : key.length < 15 ? '\t' : '') + addr + '/' + name + addon.links[key].path;
                        });
                    }
                });
                console.log(str);
            } else {
                process.exit();
            }
        }
    }
};