'use strict';

var assert = require('assert');
var mocha = require('mocha');
var proxyquire = require('proxyquire');

var it = mocha.it;
var describe = mocha.describe;

describe('#amqp-consumer()', function() {
    it('should build the right connection DSN from options', function(done) {
        proxyquire('../lib/amqp-consumer', {
            gleipnir: function(opts) {
                assert.equal(opts.url, 'amqp://user:pass@foo:31337/zing');
                done();
            }
        })({
            amqp: { host: 'foo', port: 31337, user: 'user', password: 'pass', vhost: '/zing' }
        });
    });

    it('should emit error when fails to connect', function(done) {
        proxyquire('../lib/amqp-consumer', {
            gleipnir: function(opts, cb) {
                setImmediate(cb, new Error('Connection failed'));
            }
        })().on('error', function(err) {
            assert(err);
            assert(err.message.indexOf('Connection failed') !== -1);
            done();
        });
    });

    it('should use passed exchange configuration', function(done) {
        var opts = {
            exchange: {
                name: 'exchangeName',
                type: 'exchangeType',
                options: {
                    durable: true,
                    autoDelete: true
                }
            },
            queue: {
                name: 'foo'
            }
        };

        proxyquire('../lib/amqp-consumer', {
            gleipnir: function(options) {
                assert.deepEqual(options.assert.exchanges[0], opts.exchange);
                assert.equal(options.assert.queues[0].name, 'foo');
                assert.equal(options.assert.queues[0].binding.exchange, 'exchangeName');
                done();
            }
        })(opts);
    });

    it('should emit error if consumption fails', function(done) {
        var channel = {
            consume: function(q, onMsg, consumeOpts, onConsume) {
                setImmediate(onConsume, new Error('Consumption failed'));
            }
        };

        proxyquire('../lib/amqp-consumer', {
            gleipnir: function(opts, cb) {
                setImmediate(cb, null, channel, null, ['foo']);
            }
        })().on('error', function(err) {
            assert(err);
            assert(err.message.indexOf('Consumption failed') !== -1);
            done();
        });
    });

    it('should emit consume if consumption succeeds', function(done) {
        var channel = {
            consume: function(q, onMsg, consumeOpts, onConsume) {
                setImmediate(onConsume);
            }
        };

        proxyquire('../lib/amqp-consumer', {
            gleipnir: function(opts, cb) {
                setImmediate(cb, null, channel, null, ['foo']);
            }
        })().on('consume', done);
    });

    it('should not emit anything if message is empty', function(done) {
        var channel = {
            consume: function(q, onMsg, consumeOpts, onConsume) {
                setImmediate(onConsume);
                setImmediate(function() {
                    onMsg();
                    process.nextTick(done);
                });
            }
        };

        proxyquire('../lib/amqp-consumer', {
            gleipnir: function(opts, cb) {
                setImmediate(cb, null, channel, null, ['foo']);
            }
        })().on('error', function() {
            assert.fail('error', 'null', '`error` should not be emitted if message is empty');
        }).on('message', function() {
            assert.fail('message', 'null', '`message` should not be emitted if message is empty');
        });
    });

    it('should emit error if JSON fails to parse', function(done) {
        var channel = {
            consume: function(q, onMsg, consumeOpts, onConsume) {
                setImmediate(onConsume);
                setImmediate(function() {
                    onMsg({ content: 'foo' });
                });
            }
        };

        proxyquire('../lib/amqp-consumer', {
            gleipnir: function(opts, cb) {
                setImmediate(cb, null, channel, null, ['foo']);
            }
        })().on('error', function(err) {
            assert(err && err.message.indexOf('Syntax'));
            done();
        }).on('message', function() {
            assert.fail('message', 'null', '`message` should not be emitted if message is invalid');
        });
    });

    it('should emit message if message is parsed successfully', function(done) {
        var channel = {
            consume: function(q, onMsg, consumeOpts, onConsume) {
                setImmediate(onConsume);
                setImmediate(function() {
                    onMsg({ content: '{"foo":"bar"}' });
                });
            }
        };

        proxyquire('../lib/amqp-consumer', {
            gleipnir: function(opts, cb) {
                setImmediate(cb, null, channel, null, ['foo']);
            }
        })().on('error', function(err) {
            assert.ifError(err);
        }).on('message', function(msg) {
            assert(msg);
            assert.equal(msg.foo, 'bar');
            done();
        });
    });
});
