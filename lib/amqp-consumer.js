'use strict';

var gleipnir = require('gleipnir');
var events = require('events');
var merge = require('lodash.merge');
var config = require('../config/config');

/**
 * AMQP consumer
 *
 * @param  {Object} options Optional options. See `config/config.js` for available options.
 * @return {EventEmitter} EventEmitter that can be listened on for `message` and `error`
 */
module.exports = function amqpConsumer(options) {
    // Merge options with default configuration
    var opts = merge({}, config, options);

    // Instantiate an event emitter
    var emitter = new events.EventEmitter();

    // Variables that are changed during the setup process
    var channel;

    // Construct a new gleipnir client with the merged options
    gleipnir({
        url: getConnectionString(opts.amqp),
        assert: {
            exchanges: [opts.exchange],
            queues: [merge(opts.queue, {
                binding: {
                    exchange: opts.exchange.name,
                    pattern: opts.queue.routingKey
                }
            })]
        }
    }, function onAmqpConnect(err, chan, conn, queues) {
        if (err) {
            return emitter.emit('error', err);
        }

        // Start consuming the queue
        channel = chan;
        channel.consume(queues[0], onMessageReceived, opts.consumption, onConsume);
    });

    /**
     * Called when consumption of the queue has started
     *
     * @param  {Error|null} err An error instance, should the consumption init fail
     * @return {void}
     */
    function onConsume(err) {
        if (err) {
            return emitter.emit('error', err);
        }

        emitter.emit('consume');
    }

    /**
     * Called when a message is received
     *
     * @param {Message} msg AMQP message
     * @return {void}
     */
    function onMessageReceived(msg) {
        if (!msg) {
            return;
        }

        try {
            var body = JSON.parse(msg.content.toString());
            emitter.emit('message', body);
        } catch (e) {
            emitter.emit('error', e);
        }
    }

    return emitter;
};

/**
 * Get a connection string (DSN) for AMQP given a configuration object
 *
 * @param  {Object} amqp AMQP configuration object
 * @return {String}
 */
function getConnectionString(amqp) {
    return [
        'amqp://',
        amqp.user, ':',
        amqp.password, '@',
        amqp.host, ':',
        amqp.port,
        amqp.vhost
    ].join('');
}
