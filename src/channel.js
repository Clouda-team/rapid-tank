var EventEmitter = require('events').EventEmitter;
exports.master_message = new EventEmitter;
exports.worker_message = new EventEmitter;