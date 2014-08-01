var assert = require('assert');

describe('commands', function () {
    it('command', function (next) {
        var commands = require('../src/command');
        commands.testcommand = {
            action: function (appInfo, env, args) {
                assert.deepEqual(appInfo, {
                    path: process.cwd()
                });
                next();
            }
        };
        process.argv = ['node', 'tank.js', 'testcommand'];

        require('../tank.js');

    });

    it('id', function (next) {
        var commands = require('../src/command');
        commands.testcommand = {
            action: function (appInfo, env, args) {
                assert.deepEqual(appInfo, {
                    path: process.cwd(),
                    id: 'app0'
                });
                next();
            }
        };
        process.argv = ['node', 'tank.js', 'testcommand', 'app0'];
        reload('../tank.js');
    });
    it('pid', function (next) {
        var commands = require('../src/command');
        commands.testcommand = {
            action: function (appInfo, env, args) {
                assert.deepEqual(appInfo, {
                    path: process.cwd(),
                    pid: 12345
                });
                next();
            }
        };
        process.argv = ['node', 'tank.js', 'testcommand', '12345'];
        reload('../tank.js');
    });

    it('help', function (next) {
        var commands = require('../src/command');
        commands.testcommand = {
            desc: {
                toString: function () {
                    process.nextTick(next);
                    return '';
                }
            }
        };
        console.error = function () {
        };
        process.argv = ['node', 'tank.js'];
        reload('../tank.js');
    });


});

describe('args', function () {

    it('parse args', function (next) {
        var commands = reload('../src/command');
        commands.testcommand = {
            args: {
                '-t': {

                }
            },
            action: function (appInfo, env, args) {
                assert.deepEqual(args, {t: true});
                assert.deepEqual(appInfo, {
                    path: process.cwd(),
                    pid: 12345
                });
                next();
            }
        };
        process.argv = ['node', 'tank.js', 'testcommand', '-t', '12345'];
        reload('../tank.js');
    });
    it('parse args', function (next) {
        var commands = reload('../src/command');
        commands.testcommand = {
            args: {
                '-t': {

                }
            },
            action: function (appInfo, env, args) {
                assert.deepEqual(args, {t: '12345'});
                assert.deepEqual(appInfo, {
                    path: process.cwd()
                });
                next();
            }
        };
        process.argv = ['node', 'tank.js', 'testcommand', '-t12345'];
        reload('../tank.js');
    });
    it('long args', function (next) {
        var commands = reload('../src/command');
        commands.testcommand = {
            args: {
                '--test': {

                }
            },
            action: function (appInfo, env, args) {
                assert.deepEqual(args, {test: 'abc'});
                assert.deepEqual(appInfo, {
                    path: process.cwd()
                });
                next();
            }
        };
        process.argv = ['node', 'tank.js', 'testcommand', '--test=abc'];
        reload('../tank.js');
    });
    it('bind_env', function (next) {
        var commands = reload('../src/command');
        commands.testcommand = {
            args: {
                '--test': {
                    bind_env: 'foobar'
                }
            },
            action: function (appInfo, env, args) {
                assert.deepEqual(args, {test: 'abc'});
                assert.strictEqual(env.foobar, 'abc');
                next();
            }
        };
        process.argv = ['node', 'tank.js', 'testcommand', '--test=abc'];
        reload('../tank.js');
    });
});

function reload(module) {
    delete require.cache[require.resolve(module)];
    return require(module);
}