exports['start'] = {
    desc: "starts app by path. (Tries to start daemon if not started)",
    action: function (appinfo, env, args) {
        var relapath = appinfo.id || appinfo.pid;
        if (relapath) {
            // try to treat pid|id as path
            var fs = require('fs');
            if (fs.existsSync(relapath)) {
                appinfo.path = fs.realpathSync(relapath);
            } else {
                fatal('app path not found: `' + relapath + '` (start command does not accept pid|id)');
            }
        }

        checkDaemon(function () {
            appinfo.env = env;
            appinfo.id = args.id;
            info('starting app ' + appinfo.path);
            sendCmd('start', appinfo);
        });
    }
};

exports['stop'] = {
    desc: "stops app by path or pid/id",
    action: function (appinfo) {
        info('stopping app ' + JSON.stringify(appinfo));
        sendCmd('stop', appinfo);
    }
};

exports['reload'] = {
    desc: "reloads app by path or pid/id",
    action: function (appinfo) {
        info('reloading app ' + JSON.stringify(appinfo));
        sendCmd('reload', appinfo);
    }
};
exports['restart'] = {
    desc: "restarts app by path or pid/id",
    action: function (appinfo, env) {
        info('restarting app ' + JSON.stringify(appinfo));
        appinfo.env = env;
        sendCmd('restart', appinfo);
    }
};

exports['list'] = {
    desc: "list active apps",
    action: function (appinfo, env, args) {
        request('GET', '/list', null, function (tres) {
            var buf = [];
            tres.on('data', buf.push.bind(buf)).on('end', function () {
                var apps = JSON.parse(Buffer.concat(buf));
                console.error('List of active apps:\n' + Object.keys(apps).map(function (id) {
                    var app = apps[id];
                    return '\n\x1b[42m' + id + '\x1b[0m\t* * * * * * * * * * * * * * * * * * * * *' +
                        '\n   \x1b[32mpath\x1b[0m: ' + app.path +
                        '\n    \x1b[32mpid\x1b[0m: ' + app.pid +
                        '\n  \x1b[32matime\x1b[0m: ' + new Date(app.atime).toLocaleString() +
                        '\n \x1b[32muptime\x1b[0m: ' + new Date(app.uptime).toLocaleString()

                }).join('') + '\n* * * * * * * * * * * * * * * * * * * * * * * * *');
            });
        });
    }
};

exports['ls'] = {
    alias: 'list'
};

exports['args'] = {
    desc: "see available args for each command",
    action: function () {
        console.error(Object.keys(exports).reduce(function (str, cmd) {
            var args = exports[cmd].args;
            if (!args)return str;
            return Object.keys(args).reduce(function (str, label) {
                var arg = args[label];
                if (arg.demo) {
                    label += label[1] === '-' ? '=' + arg.demo : arg.demo;
                }

                return str + '\n  ' + label + (label.length > 5 ? label.length > 13 ? '\n\t\t' : '\t' : '\t\t') + arg.desc;
            }, str + '\n\n\x1b[32;1m' + cmd + (cmd.length > 7 ? '\t' : '\t\t')
                + '\x1b[30;1m' + exports[cmd].desc + '\x1b[0m');
        }, '\x1b[32mcommands and their args:'));
    }
};

exports['kill-daemon'] = {
    desc: "kills daemon",
    action: function () {
        request('GET', '/exit', null, function (tres) {
            tres.pipe(process.stdout);
        });
    }
};

exports['-kd'] = {
    alias: 'kill-daemon'
};


exports['start-daemon'] = {
    desc: "starts daemon",
    args: {
        '-u': {
            demo: '{username}',
            desc: 'set control panel username(default: admin)',
            bind_env: 'ctrl_uname'
        },
        '-p': {
            demo: '{password}',
            desc: 'set control panel password(default: random generated)',
            bind_env: 'ctrl_pwd'
        }
    },
    action: function () {
        checkDaemon(Boolean, true);
    }
};

exports['-sd'] = {
    alias: 'start-daemon'
};

exports['test'] = {
    desc: "runs test suits",
    action: function (appinfo, env) {
        if (appinfo.id || appinfo.pid) {
            fatal('test command does not accept id|pid');
        }
        env.tankjs_addons = 'tankjs-test' + (env.tankjs_addons ? ',' + env.tankjs_addons : '');
        require('./spawnChild')([__dirname + '/app/index.js', appinfo.path], {
            stdio: 'inherit'
        });
    }
};

function request(method, path, data, cb, onErr) {
    var param = {
        method: method,
        path: path,
        headers: {'Connection': 'close'}
    }, conf = require('../package.json').config.watchdog;

    if (conf.path) {
        param.socketPath = conf.path;
    } else {
        param.host = conf.host;
        param.port = conf.port;
    }

    require('http').request(param, function (tres) {
        cb(tres);
    }).on('error', onErr || function () {
        fatal('request to daemon failed, is daemon started?');
    }).end(data);
}

function checkDaemon(cb) {
    request('GET', '/syn', null, function (tres) {
        if (tres.statusCode !== 202) {
            fatal('watchdog bind port in use, daemon cannot start');
        } else {
            cb();
        }
    }, function () {
        info('daemon not started, spawning...');
        require('./spawnChild')([__dirname + '/daemon/'],
            {detached: true, stdio: 'inherit'}).unref();
        setTimeout(cb, 500);
    });
}

function sendCmd(cmd, appinfo) {
    request('POST', '/' + cmd, JSON.stringify(appinfo), function (tres) {
        var buf = [];
        tres.on('data', buf.push.bind(buf)).on('end', function () {
            buf = String(Buffer.concat(buf));
            if (tres.statusCode !== 200) {
                fatal(buf);
            } else {
                console.log(buf);
            }
        });
    });
}

require('util')._extend(exports.start.args = {}, exports['start-daemon'].args);