'use strict';

var assert = require('assert');
var mocha = require('mocha');
var merge = require('lodash.merge');
var amqpConsumer = require('../lib/amqp-consumer');

var it = mocha.it;
var describe = mocha.describe;
var randomQueueName = 'queue-' + Date.now();

describe('#amqp-consumer()', function() {
    it('should build the right connection DSN from options', function(done) {
        getClient({
            amqp: { host: 'foo', port: 31337, user: 'user', password: 'pass', vhost: '/zing' }
        }, {
            connect: function(dsn) {
                assert.equal(dsn, 'amqp://user:pass@foo:31337/zing');
                done();
            }
        });
    });

    it('should emit error when fails to connect', function(done) {
        getClient({}, {
            connect: function(dsn, cb) {
                setImmediate(cb, new Error('Connection failed'));
            }
        }).on('error', function(err) {
            assert(err);
            assert(err.message.indexOf('Connection failed') !== -1);
            done();
        });
    });

    it('should emit error when channels fails to be created', function(done) {
        getClient({}, {
            connect: function(dsn, cb) {
                setImmediate(cb, null, {
                    createChannel: function(callback) {
                        setImmediate(callback, new Error('Channel init failed'));
                    }
                });
            }
        }).on('error', function(err) {
            assert(err);
            assert(err.message.indexOf('Channel init failed') !== -1);
            done();
        });
    });

    it('should use passed exchange configuration', function(done) {
        getClient({
            exchange: {
                name: 'exchangeName',
                type: 'exchangeType',
                durable: true,
                autoDelete: true
            }
        }, {
            channel: {
                assertExchange: function(name, type, opts) {
                    assert.equal(name, 'exchangeName');
                    assert.equal(type, 'exchangeType');
                    assert.equal(opts.durable, true);
                    assert.equal(opts.autoDelete, true);
                    done();
                }
            }
        });
    });

    it('should emit error if exchange assertion fails', function(done) {
        getClient({}, {
            channel: {
                assertExchange: function(name, type, opts, cb) {
                    setImmediate(cb, new Error('Exchange assertion failed'));
                }
            }
        }).on('error', function(err) {
            assert(err);
            assert(err.message.indexOf('Exchange assertion failed') !== -1);
            done();
        });
    });

    it('should use passed queue configuration', function(done) {
        getClient({
            queue: {
                name: 'queueName',
                exclusive: false,
                routingKey: 'routingKey'
            }
        }, {
            channel: {
                assertQueue: function(name, opts) {
                    assert.equal(name, 'queueName');
                    assert.equal(opts.exclusive, false);
                    assert.equal(opts.routingKey, 'routingKey');
                    done();
                }
            }
        });
    });

    it('should emit error if queue assertion fails', function(done) {
        getClient({}, {
            channel: {
                assertQueue: function(name, opts, cb) {
                    setImmediate(cb, new Error('Queue assertion failed'));
                }
            }
        }).on('error', function(err) {
            assert(err);
            assert(err.message.indexOf('Queue assertion failed') !== -1);
            done();
        });
    });

    it('should bind queue to exchange and consume', function(done) {
        getClient({
            exchange: { name: 'someExchange' },
            queue: { routingKey: 'route-foo' },
            consumption: { noAck: false }
        }, {
            channel: {
                bindQueue: function(queue, exchange, routingKey) {
                    assert.equal(queue, randomQueueName);
                    assert.equal(exchange, 'someExchange');
                    assert.equal(routingKey, 'route-foo');
                },
                consume: function(queue, onMsg, opts, cb) {
                    assert.equal(queue, randomQueueName);
                    assert.equal(typeof onMsg, 'function');
                    assert.equal(opts.noAck, false);
                    assert.equal(typeof cb, 'function');

                    done();
                }
            }
        });
    });

    it('should emit error if consumption fails', function(done) {
        getClient({}, {
            channel: {
                consume: function(queue, onMsg, opts, cb) {
                    setImmediate(cb, new Error('Consumption failed'));
                }
            }
        }).on('error', function(err) {
            assert(err);
            assert(err.message.indexOf('Consumption failed') !== -1);
            done();
        });
    });

    it('should emit consume if consumption succeeds', function(done) {
        getClient().on('consume', done);
    });

    it('should not emit anything if message is empty', function(done) {
        getClient({}, {
            channel: {
                consume: function(queue, onMsg, opts, cb) {
                    setImmediate(cb);
                    setImmediate(function() {
                        onMsg();
                        process.nextTick(done);
                    });
                }
            }
        }).on('error', function() {
            assert.fail('error', 'null', '`error` should not be emitted if message is empty');
        }).on('message', function() {
            assert.fail('message', 'null', '`message` should not be emitted if message is empty');
        });
    });

    it('should emit error if JSON fails to parse', function(done) {
        getClient({}, {
            channel: {
                consume: function(queue, onMsg, opts, cb) {
                    setImmediate(cb);
                    setImmediate(function() {
                        onMsg({ content: 'foo' });
                    });
                }
            }
        }).on('error', function(err) {
            assert(err && err.message.indexOf('Syntax'));
            done();
        }).on('message', function() {
            assert.fail('message', 'null', '`message` should not be emitted if message is invalid');
        });
    });

    it('should emit message if message is parsed successfully', function(done) {
        getClient({}, {
            channel: {
                consume: function(queue, onMsg, opts, cb) {
                    setImmediate(cb);
                    setImmediate(function() {
                        onMsg({ content: '{"foo":"bar"}' });
                    });
                }
            }
        }).on('error', function(err) {
            assert.ifError(err);
        }).on('message', function(msg) {
            assert(msg);
            assert.equal(msg.foo, 'bar');
            done();
        });
    });
});

function getClient(opts, mocks) {
    return amqpConsumer(merge({
        amqp: {
            client: merge(getClientMock((mocks || {}).channel), mocks)
        }
    }, opts));
}

function getClientMock(channelMocks) {
    var chanMocks = merge({
        assertExchange: function(name, type, opts, cb) {
            setImmediate(cb);
        },
        assertQueue: function(name, opts, cb) {
            setImmediate(cb, null, { queue: randomQueueName });
        },
        consume: function(name, onMsg, opts, cb) {
            setImmediate(cb);
        },
        bindQueue: function() {}
    }, channelMocks);

    var mocks = {
        connect: function(dsn, cb) {
            setImmediate(cb, null, {
                createChannel: function(callback) {
                    setImmediate(callback, null, chanMocks);
                }
            });
        }
    };

    return mocks;
}
