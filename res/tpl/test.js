var config = {
    http: {
        host: '127.0.0.1',
        port: 8080
    }
}, http = require('http');

// load the service
process.argv = [process.execPath, require('fs').realpathSync('.')];
require('module').runMain();

var assert = require('assert');

describe('initing', function () {
    this.timeout(4000);
    it('wait for http server ready', function (next) {
        function retry() {
            request({path: '/'}, function () {
                next();
            }, true).on('error', retry).end();
        }

        retry();
    });
});

describe('testing src/action/index.js', function () {
    it('/', function (next) {
        request({path: '/'}, function (buf) {
            assert.strictEqual(buf.toString(), 'Hello World');
            next();
        }).on('error', next).end();
    });
});


function request(options, cb, raw) {
    options.host = config.http.host;
    options.port = config.http.port;
    return http.request(options, raw ? cb : function (tres) {
        var chunks = [];
        tres.on('data', chunks.push.bind(chunks)).on('end', function () {
            cb(Buffer.concat(chunks));
        });
    });
}