var net = require('net'),
    balancer = require('./balancer');

var servers = [];

/**
 * GET /addons/cluster/flow
 */
exports.requestHandler = function (req, res) {
    res.end(JSON.stringify(servers.map(function (svr) {
        return {addr: svr.addr, workers: svr.workers.map(function (worker) {
            arrShift(worker);
            return servers.slice.call(worker.stat);
        })}
    })));
};

var queryHttpServer = function () {
    return function (args) {
        var argStr = JSON.stringify(args);
        for (var i = 0, L = servers.length; i < L; i++) {
            var svr = servers[i];
            if (svr.argStr === argStr) {
                return svr;
            }
        }

        var server = net.createServer(function (conn) {
            conn.on('error', conn.destroy);
            conn.pause();
            var worker = balancer(conn, svr);
            if (!worker) {
                // no worker chosen, maybe app reloading
                return conn.end();
            }
//            console.log('[master] dispatch request to' + worker.child.pid);
            worker.child.send({
                id: worker.id,
                type: 'connection'
            }, conn);
            addStat(worker);
        });
        var svr = {
            argStr: argStr,
            instance: server,
            workers: [],
            err: null,
            addr: null,
            add: addWorker
        };
        server.on('error', function (err) {
            console.log('[master] bind error', err.message);
            svr.err = err;
            svr.workers.forEach(function (worker) {
                worker.child.send({id: worker.id, type: 'error', message: err.message});
            });
        });
        console.log('[master] trying to listen on', args);
        server.listen.apply(server, args);
        server.on('listening', function () {
            svr.addr = this.address();
            console.log('[master] bound to', svr.addr);
            svr.workers.forEach(function (worker) {
                worker.child.send({id: worker.id, type: 'listening', addr: svr.addr});
            });
        });
        servers.push(svr);
        return svr;
    };

    function addWorker(id, worker) {
        this.workers.push({id: id, child: worker, stat: new Uint32Array(16), prev: -1});
        if (this.err) {
            worker.send({id: id, type: 'error', message: this.err.message});
        } else if (this.addr) {
            worker.send({id: id, type: 'listening', addr: this.addr});
        }
        worker._svrs.push({id: id, workers: this.workers});
    }


    function addStat(worker) {
        arrShift(worker);
        worker.stat[0]++;
    }
}();
// spawn workers
exports.startup = function () {
    var fork = require('child_process').fork;
    var children = [];

    var env = process.env, context = global.context,
        module = require('module')._resolveFilename('./process.js', process.mainModule),
        args = [process.argv[2]], options = { stdio: 'inherit', env: env};

    context.forks = env.cluster_forks | 0;

// fork for multiple threads

    console.log('fork for ' + context.forks + ' processes');

    for (var i = context.forks; i--;) {
        startWorker(i);
    }

    function startWorker(i) {
        var spawnTime = 0;

        respawn();

        function respawn() {
            var now = Date.now(), interval = 1e4 + spawnTime - now;
            if (interval > 0) {
                console.log('spawn to fast... respawn in' + interval + 'ms.');
                return setTimeout(respawn, interval);
            }
            spawnTime = now;

            var worker = children[i] = fork(module, args, options);
            console.log('spawned child:' + i + ', pid=' + worker.pid);
            worker.id = i;
            worker._svrs = [];
            worker._onStop = onStop;
            worker.on('exit', onExit);
            worker.on('message', onMessage);
        }

        function onExit() {
            this._onStop();
            respawn();
        }
    }

    var channel = require('rapid-tank/src/channel'), emitter = Function.apply.bind(channel.worker_message.emit);
    channel.master_message.emit = function () {
        var msg = {
            type: 'master_message',
            args: Array.prototype.slice.call(arguments)
        };
        children.forEach(function (worker) {
            worker.send(msg);
        });
    };

    process.on('SIGQUIT', function () { // reload
        console.log('Reloading');
        //restarts all children
        children.forEach(function (worker) {
            worker._onStop();
            worker.disconnect();
        });
    }).on('SIGUSR1', function () { // inc_forks
        startWorker(children.length);
        context.forks = children.length;
    }).on('SIGUSR2', function () { // dec_forks
        if (children.length > 1) {
            var worker = children.pop();
            worker._onStop();
            worker.removeAllListeners('exit');
            console.log('killing child', worker.id);
            worker.disconnect();
            context.forks = children.length;
        }
    });


    function onStop() {
        this._onStop = Boolean;
        this._svrs.forEach(function (svr) { // {id:id,workers:server.workers}
            var id = svr.id, arr = svr.workers;
            for (var L = arr.length; L--;) {
                if (arr[L].id === id) {
                    arr.splice(L, 1);
                    return;
                }
            }
        });
    }

    function onMessage(msg) {
        switch (msg.type) {
            case 'queryHttpServer':
                queryHttpServer(msg.args).add(msg.id, this);
                break;
            case 'worker_message':
                emitter(channel.worker_message, args);
                break;
        }
    }
};


function arrShift(worker) {
    var curr = Date.now() >> 12, diff = curr - worker.prev; // 4.096s
    if (diff) {
        // shift
        var arr = worker.stat;
        for (var i = 15; i >= 0; i--) {
            arr[i] = i >= diff ? arr[i - diff] : 0;
        }
        worker.prev = curr;
    }
}