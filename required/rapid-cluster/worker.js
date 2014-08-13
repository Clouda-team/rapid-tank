var channel = require('rapid-tank/src/channel'), emitter = Function.apply.bind(channel.worker_message.emit);
channel.worker_message.emit = function () {
    process.send({
        type: 'worker_message',
        args: Array.prototype.slice.call(arguments)
    });
};

var callbacks = {}; // id: obj
process.on('message', function (msg, socket) {
//    console.log('[worker] recv message', msg);
    var obj = callbacks[msg.id];
    switch (msg.type) {
        case 'error':
            obj.emit('error', new Error(msg.message));
            break;
        case 'listening':
            obj._handle = {
                address: msg.addr,
                getsockname: function () {
                    return this.address;
                }
            };
            obj.emit('listening');
            break;
        case 'connection':
            if (socket) {
                obj.emit('connection', socket);
            } // else console.error('received empty connection message');
//            console.log('recv request', socket._handle);
            break;
        case 'master_message':
            emitter(channel.master_message, msg.args);
            break;
    }
}).on('disconnect', function () {
    console.log('[worker] disconnected from master, exiting');
    setTimeout(process.exit, 3000).unref();
});


// Overwrite Server::listen
require('net').Server.prototype.listen = function (/*args,cb*/) {
    var args = Array.prototype.slice.call(arguments);
    var uuid = (Math.random() + Date.now()).toString(36);
    if (typeof args[args.length - 1] === 'function') {
        var cb = args.pop();
        this.once('listening', cb);
    }
    callbacks[uuid] = this;
    process.send({
        id: uuid,
        type: 'queryHttpServer',
        args: args
    });
    return this;
};