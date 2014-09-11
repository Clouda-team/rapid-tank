#!/usr/bin/env node
/**
 * Created by kyriosli on 2014/6/18.
 *
 * Usage:
 * tank [command] [path] [args]
 */

global.info = function (msg) {
    console.info('\x1b[42mINFO\x1b[0m  ' + msg);
};
global.warn = function (msg) {
    console.warn('\x1b[43mWARN\x1b[0m  ' + msg);
};
global.fatal = function (msg) {
    console.error('\x1b[41mFATAL\x1b[0m ' + msg);
    throw 'exiting';
};
process.on('uncaughtException', function (e) {
    if (typeof e !== 'string') {
        process.stderr.write(e.stack || e.message);
    } else {
        process.stderr.on('drain', function () {
            process.exit(1);
        });
    }
});

var commands = require('./src/command'),
    cmd = process.argv[2] || 'help';

if (!commands[cmd]) {
    console.error('Unrecognized command: ' + cmd);
    return commands.help.action();
}
if (commands[cmd].alias) {
    cmd = commands[cmd].alias;
}

if (commands[cmd].noExt) {
    return commands[cmd].action();
}

var appinfo = {path: process.cwd()},
    cmdinfo = commands[cmd],
    addons = {},
    env = process.env, args = {};

// scan for all addons
initAddons();

// check for all arguments
parseArgs();

addons = Object.keys(addons);
if (addons.length) {
    env.tankjs_addons = addons.join(',');
}

// run command!
commands[cmd].action(appinfo, env, args);


// BEGIN method definition

function initAddons() {
    require('./src/scan')(function (dir, name) {
//        console.log('check', prefix, name);

        var arr = require(dir + '/' + name + '/package.json').args;
        if (!arr)
            return;
        Object.keys(arr).forEach(function (label) {
            var arg = arr[label];
            arg.addon = name;
            arg.commands.forEach(function (cmd) {
                (commands[cmd].args || (commands[cmd].args = {})) [label] = arg;
            });
            // load default module
            if (arg.defaults && cmdinfo.args && cmdinfo.args[label]) {
                addons[name] = true;
                if (arg.bind_env) {
                    env[arg.bind_env] = arg.defaults;
//                    console.log('set env', arg.bind_env, arg.defaults);
                }
            }
        });
    });

}


function parseArgs() {
    var foundAppInfo = false;
    for (var arr = process.argv, L = arr.length, i = 3; i < L; i++) {
        var argi = arr[i], label, name, value;
        if (argi[0] !== '-') { // appinfo
            if (!foundAppInfo) {
                var fs = require('fs');
                if (cmd === 'add') {
                    if (/^\w+$/.test(argi)) {
                        argi = 'rapid-' + argi;
                    } else if (!/^rapid-\w+$/.test(argi)) {
                        fatal('bad module name');
                    }
                    appinfo = {
                        modules: [argi]
                    };
                } else if (/^\d+$/.test(argi)) { // pid
                    appinfo.pid = +argi;
                } else if (/^app\w+$/.test(argi)) { // id
                    appinfo.id = argi;
                } else if (!fs.existsSync(argi)) {
                    fatal('app path not found: `' + argi + '`');
                } else {
                    appinfo = {
                        cwd: process.cwd(),
                        path: fs.realpathSync(argi)
                    };
                }
                foundAppInfo = true;
            } else {
                if (cmd === 'add') {
                    if (/^\w+$/.test(argi)) {
                        argi = 'rapid-' + argi;
                    } else if (!/^rapid-\w+$/.test(argi)) {
                        fatal('bad module name');
                    }
                    appinfo.modules.push(argi);
                } else {
                    warn('ingoring unknown argument: `' + argi + '`');
                }
            }
            continue;
        }
        if (argi.length === 1) { // -
            // WTF??
            continue;
        }
        if (argi[1] === '-') { // --name=value
            var idx = argi.indexOf('=', 2);
            if (idx === -1) { // --name
                name = argi.substr(2);
                value = true;
            } else {
                name = argi.substring(2, idx);
                value = argi.substr(idx + 1);
                argi = argi.substr(0, idx);
            }
        } else { // -kv
            name = argi[1];
            if (argi.length > 2) {
                value = argi.substr(2);
                argi = argi.substr(0, 2);
            } else { // -k
                value = true;
            }
        }
//        console.log(argi, name, value);
        var arg = cmdinfo.args && cmdinfo.args[argi];
        if (!arg) {
            warn('ingoring unknown parameter ' + argi);
        } else {
            if (arg.addon)
                addons[arg.addon] = true;
//            console.log(arg);
            if (arg.bind_env) {
                env[arg.bind_env] = value;
//                console.log('set env', arg.bind_env, value);
            }
            args[name] = value;
        }
    }
}
