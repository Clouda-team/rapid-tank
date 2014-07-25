var config = require('../../package.json').config;

process.chdir(__dirname + '/../..');

var fs = require('fs');

var stdout = fs.createWriteStream(config.stdout, {flags: 'a'}),
    stderr = fs.createWriteStream(config.stderr, {flags: 'a'});


console.log = makeLogger('LOG', stdout);
console.error = makeLogger('ERROR', stdout);

require('http').IncomingMessage.prototype.readBody = function (cb) {
    var chunks = [];
    this.on('data', chunks.push.bind(chunks)).on('end', function () {
        cb(Buffer.concat(chunks));
    });
};


require('./watchdog').startWatchdog(config.watchdog, stdout, stderr);

var user = config.control.auth.user = {},
    username = process.env.ctrl_uname || 'admin';

user[username] = {
    password: process.env.ctrl_pwd || ( (Date.now() & 65535) + Math.random()).toString(36).substr(0, 10)
};

require('./control').startControl(config.control);


function makeLogger(level, stream) {
    var inspect = require('util').inspect;
    return function (arg0) {
        var str, L = arguments.length;
        if (!L) {
            str = '';
        } else if (L === 1 && typeof arg0 === 'string') {
            str = arg0;
        } else {
            str = inspect(arg0);
            for (var i = 1; i < L; i++) {
                str += ' ' + inspect(arguments[i]);
            }
        }
        var t = new Date(), now = t.getFullYear() * 1e4 + (t.getMonth() + 1) * 1e2 + t.getDate()
            + t.getHours() / 1e2 + t.getMinutes() / 1e4 + t.getSeconds() / 1e6 + t.getMilliseconds() / 1e9;
        stream.write('\x1b[33m[' + level + ']\x1b[30;1m ' + now + '\x1b[0m ' + str + '\n');
    }
}