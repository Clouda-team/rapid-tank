var context = global.context,
    http = require('http'),
    param = {
        method: 'POST',
        path: '/keepalive'
    },
    data = {path: process.argv[2], pid: process.pid, context: context},
    data2 = {path: data.path, pid: process.pid, context: context, cwd: process.cwd(), env: process.env, uptime: Date.now()};
if (process.env.WATCHDOG_PATH) {
    param.socketPath = process.env.WATCHDOG_PATH;
} else {
    param.host = process.env.WATCHDOG_HOST;
    param.port = process.env.WATCHDOG_PORT;
}
console.log('set interval ' + process.env.WATCHDOG_TIMEOUT / 2);
setInterval(sendKeepAlive, process.env.WATCHDOG_TIMEOUT / 2).unref();
function sendKeepAlive(withEnv) {
//    console.log('sending keepalive ' + data.path, param);
    http.request(param, function (tres) {
        if (tres.statusCode === 202) { // requesting env
            sendKeepAlive(true);
        }
    }).on('error', function (err) {
        console.log('keepalive send error ' + err.message);
    }).end(withEnv ? JSON.stringify(data2) : JSON.stringify(data));
}

http.IncomingMessage.prototype.readBody = function (cb) {
    var chunks = [];
    this.on('data', chunks.push.bind(chunks)).on('end', function () {
        cb(Buffer.concat(chunks));
    });
};

/**
 * VERB /addon/path
 */
http.createServer(function (req, res) {
    var url = req.url, idx = url.indexOf('/', 1), addon;
    if (idx === -1) { // /addon
        addon = context.addons[url.substr(1)];
        req.url = '/';
    } else {
        addon = context.addons[url.substring(1, idx)];
        req.url = url.substring(idx);
    }
    if (addon && addon.requestHandler) {
        addon.requestHandler(req, res);
    } else { //
        res.statusCode = 404;
        res.end();
    }
}).listen(0, '127.0.0.4', function () {
    context.addonPort = this.address().port;
    sendKeepAlive();
});