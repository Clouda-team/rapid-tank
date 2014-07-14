console.log('[app] spawned with args', process.argv);

// scan for all addons loaded
var addons = process.env.tankjs_addons.split(',').map(function (name) {
    var ret = require(name + '/package.json'), path = require.resolve(name + '/package.json');
    ret.priority |= 0;
    ret.name = name;
    return ret;
}).sort(function (a, b) {
    return  b.priority - a.priority;
});


var context = global.context = {
    addons: {}
}, disabled = {}, startup = null;

var workerAddons = [];

addons.forEach(function (json) {
    if (disabled[json.name]) {
        return;
    }
    var obj = context.addons[json.name] = {};
    if (json.master) {
        var module = require(json.name + '/' + json.master);

        if (typeof module.requestHandler === 'function') {
            obj.requestHandler = module.requestHandler;
        }
        if (!startup && json.startup) {
            startup = module.startup;
        }
    }
    if (json.main) {
        workerAddons.push(json.name);
    }
    if (json.disable) {
        if (typeof json.disable === 'string') {
            disabled[json.disable] = true;
        } else {
            json.disable.forEach(function (disable) {
                disabled[disable] = true;
            });
        }
    }
    if (json.services) { // {'text':'/index.html'}
        obj.services = json.services;
    }
});

process.env.tankjs_worker_addons = workerAddons.join(',');

if (startup) {
    startup();
} else {
    require('./process.js');
}