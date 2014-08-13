module.exports = function (cb) {
    var fs = require('fs');
// check modules from parent directory as well as node_modules
    var curr = __dirname;

    if (process.platform === 'win32') {
        curr = curr.substr(curr.indexOf('\\')).replace(/\\/g, '/');
    }

    curr = curr.substr(0, curr.lastIndexOf('/'));
    checkDir(curr + '/required');
    while (curr) {
        checkDir(curr + '/node_modules');
        curr = curr.substr(0, curr.lastIndexOf('/'));
    }

    function checkDir(dir) {
        if (fs.existsSync(dir)) {
            fs.readdirSync(dir).forEach(function (name) {
                if (/^rapid-\w+$/.test(name))
                    cb(dir, name);
            });
        }
    }
};