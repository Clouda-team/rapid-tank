/**
 * Created by lizheng02 on 2014/6/30.
 */
exports.startWatchdog = function (config, stdout, stderr) {
    var spawnChild = require('child_process').spawn,
        fs = require('fs');

    var unixsock = config.path,
        timeout = config.timeout;
    if (unixsock && fs.existsSync(unixsock)) {
        fs.unlinkSync(unixsock);
    }

    var apps = exports.apps = [], // [{id:'app3',path:'/path',env:{},pid:1234}]
        pids = {},// {pid:app}
        paths = {}; // {path:app}

    exports.start = function (path, env, cwd) {
        if (typeof path !== 'string') {
            throw {message: 'path is required'};
        }
        if (paths[path]) {
            throw {message: 'app `' + path + '` already under control'};
        }
        console.log('watchdog.start(`' + path + '`)');
        // spawn child process
        for (var id = 0; apps[id]; id++);

        spawn(apps[id] = paths[path] = {
            id: 'app' + id,
            atime: 0,
            pid: 0,
            cwd: cwd,
            path: path,
            env: env,
            uptime: Date.now()
        });
    };


    var signals = {
        stop: 'KILL',
        reload: 'QUIT',
        inc_workers: 'USR1',
        dec_workers: 'USR2'
    };

    Object.keys(signals).forEach(function (action) {
        var sig = signals[action];
        exports[action] = function (req, cb) {
            var appinfo = req.id ? apps[+req.id.substr(3)] :
                req.pid ? pids[req.pid] :
                    paths[req.path];

            if (appinfo) {
                console.log('watchdog.' + action + '(' + appinfo.id + ')');
                if (action === 'stop') { // delete app info
                    apps[+appinfo.id.substr(3)] = null;
                    delete pids[appinfo.pid];
                    delete paths[appinfo.path];
                }
                sendSignal(appinfo.pid, sig, cb);
            } else {
                cb({message: 'app not found'});
            }
        };
    });


    // restart := started ? stop() && start() : start();
    exports.restart = function (req, cb) {
        var appinfo = req.id ? apps[+req.id.substr(3)] :
            req.pid ? pids[req.pid] :
                paths[req.path];

        if (appinfo) {
            console.log('watchdog.stop(' + appinfo.id + ')');
            sendSignal(appinfo.pid, 'KILL', function (err) {
                if (err) {
                    cb(err);
                } else {
                    appinfo.uptime = Date.now();
                    appinfo.atime = 0;
                    spawn(appinfo);
                    cb(null, 'app started');
                }
            });
        } else {
            cb({message: 'app not found'});
        }
    };

    var server = require('http').createServer(function (req, res) {
        res.setHeader('Connection', 'close');
        var action = req.method + req.url, posts;
        if (req.method === 'POST') {
            req.readBody(function (buf) {
                posts = JSON.parse(buf);
                next();
            });
        } else {
            next();
        }
        function next() {
            try {
                switch (action) {
                    case 'GET/syn':
                        send(202);
                        break;
                    case 'GET/list':
                        res.end(JSON.stringify(apps));
                        break;
                    case 'GET/exit':
                        console.log('exiting');

                        res.end('daemon exiting');
                        server.close(function () {
                            process.exit();
                        });
                        break;

                    /* POST /start
                     * {"path":"/path/to/app","env":{}}
                     */
                    case 'POST/start':
                        exports.start(posts.path, posts.env, posts.cwd);
                        res.end('starting ' + posts.path);
                        break;
                    case 'POST/stop':
                    case 'POST/reload':
                        exports[req.url.substr(1)](posts, cb);
                        break;

                    case 'POST/restart':
                        exports.restart(posts, cb, posts.env);
                        break;

                    case 'POST/keepalive':
                        var obj = paths[posts.path];
//                        console.log('recv keepalive', obj);
                        if (obj) {
                            if (obj.pid === posts.pid) {
//                              console.log('received heartbeat ' + path);
                                obj.atime = Date.now();
                                obj.context = posts.context;
                                res.end();
                            } else {
                                send(403, 'bad pid');
                            }
                        } else if (posts.env) {
                            console.log('former app recorded: ' + posts.path);
                            for (var id = 0; apps[id]; id++);
                            posts.id = 'app' + id;
                            apps[id] = paths[posts.path] = pids[posts.pid] = posts;
                            posts.atime = Date.now();
                            res.end();
                        } else {
                            res.writeHead(202);
                            res.end();
                        }
                        break;
                    default:
                        send(404, 'command not found');
                }
            } catch (e) {
                send(500, e.message);
            }
        }


        function cb(err, ret) {
            if (err) {
                send(500, err.message);
            } else {
                res.end(ret);
            }
        }

        function send(status, text) {
            res.statusCode = status;
            res.end(text);
        }

    }).on('error', function (err) {
        console.error('watchdog start fail: ' + err.message);
        process.exit(1);
    });
    if (unixsock) {
        console.log('starting watchdog on unix://' + unixsock);

        server.listen(unixsock, function () {
            console.error('watchdog started at: ', this.address());
        });
    } else {
        console.log('starting watchdog on http://' + config.host + ':' + config.port);
        server.listen(config.port, config.host, function () {
            console.log('watchdog started at: ', this.address());
        });
    }

    function sendSignal(pid, sig, cb) {
        spawnChild('kill', ['-' + sig, pid]).on('error', function (err) {
            cb({message: 'Error sending SIG' + sig + ': ' + err.message});
        }).on('exit', function (code) {
            cb(null, '{"code":' + code + ',"pid":' + pid + ',"signal":"SIG' + sig + '"}');
        });
    }

    var appPath = fs.realpathSync(__dirname + '/../../app');

    function spawn(obj) {
        console.log('spawning app ' + obj.id);
        var env = obj.env;
        if (unixsock) {
            env.WATCHDOG_PATH = unixsock;
        } else {
            env.WATCHDOG_HOST = config.host;
            env.WATCHDOG_PORT = config.port;
        }
        env.WATCHDOG_TIMEOUT = timeout;

        try {
            var child = spawnChild(process.execPath, [appPath, obj.path], {
                cwd: obj.cwd,
                detached: true,
                stdio: ['ignore', stdout, stderr],
                env: env
            });
            child.unref();
            if (obj.pid) {
                delete pids[obj.pid];
            }
            obj.pid = child.pid;
            pids[obj.pid] = obj;
            obj.atime = Date.now();
        } catch (e) {
            console.error(e);
        }
    }


    // scheduled checker
    setInterval(function () {
        var expired = Date.now() - timeout;
        Object.keys(apps).forEach(function (path) {
            var obj = apps[path];
            if (!obj) return;
            if (obj.atime < expired) {
                sendSignal(obj.pid, 'KILL', function (err) {
                    if (err)
                        console.error(err);
                    else
                        spawn(obj);
                });
            }
        });
    }, timeout);
    return apps;
};