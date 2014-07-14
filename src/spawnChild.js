var spawn = require('child_process').spawn;

//TODO: win32 support

module.exports = function (args, options) {
    return spawn(process.execPath, args, options);
};