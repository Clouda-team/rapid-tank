var crypto = require('crypto');
var regKV = /^\s*(\w+)=(?:(\d+)|"(.+)")\s*$/;


/**
 * require('.../auth')({username:{password:'password'}}, function(req, res){...})
 *
 * @param users
 * @param realm
 * @param cb
 * @returns {Function}
 */
module.exports = function (users, realm, cb) {

    Object.keys(users).forEach(function (username) {
        var user = users[username];
        user.username = username;
        user.password = MD5(username + ':' + realm + ':' + user.password);
    });


    return function (req, res) {
        var now = Date.now() + 3e5;
        var auth = req.headers.authorization, opaque = MD5(req.headers['user-agent']);
        switch (true) {
            case auth && "Digest " === auth.substr(0, 7):
                var keys = auth.substr(7).split(','), obj = {};
                for (var i = keys.length, m; i--;) {
                    if (m = regKV.exec(keys[i])) {
                        obj[m[1]] = m[2] ? +m[2] : m[3];
                    }
                }

                var user = users[obj.username];

                if (!user || obj.opaque !== opaque || obj.uri !== req.url) break;

                var time = parseInt(obj.nonce, 36);
                if (time > now || time < now - 36e5) break;
                var sign = MD5(user.password + ':' + obj.nonce + ':' + MD5(req.method + ':' + req.url));

                if (sign === obj.response) {
                    req.auth = user;
                    return cb(req, res);
                }
        }
        res.writeHead(401, {
            'WWW-Authenticate': 'Digest realm="' + realm + '",nonce="' + now.toString(36) + '",opaque="' + opaque + '",algorithm="MD5"',
            'Content-Length': 0
        });
        res.end();
    };

};

function MD5(input) {
    return crypto.createHash('md5').update(input).digest('hex');
}