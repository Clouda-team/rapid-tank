//console.log('[app] spawned with args', process.argv);

// scan for all addons loaded
var addons = process.env.tankjs_addons.split(',').map(function (name) {
    var ret, prefix;
    try {
        prefix = '../required/';
        require.resolve(prefix + name);
    } catch (e) {
        prefix = '';
    }
    ret = require(prefix + name + '/package.json');
    ret.module = prefix + name;
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
        var module = require(json.module + '/' + json.master);

        if (typeof module.requestHandler === 'function') {
            obj.requestHandler = module.requestHandler;
        }
        if (!startup && json.startup) {
            startup = module.startup;
        }
    }
    if (json.main) {
        workerAddons.push(json.module);
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
    if (json.links) { // {'text':'/index.html'}
        obj.links = json.links;
    }
});

process.env.tankjs_worker_addons = workerAddons.join(',');

if (startup) {
    startup();
} else {
    require('./process.js');
}