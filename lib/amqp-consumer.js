'use strict';

var events = require('events');
var merge = require('lodash.merge');
var amqpClient = require('amqplib/callback_api');
var config = require('../config/config');

/**
 * AMQP consumer
 *
 * @param  {Object}   options  Optional options. See `config/config.js` for available options.
 * @param  {Function} callback Function that will be called once the consumer has connected and is
 *                             done asserting exchange/queue, or has encountered an error
 * @return {EventEmitter}      EventEmitter that can be listened on for `message` and `error`
 */
module.exports = function amqpConsumer(options, callback) {
    // Options are optional
    if (!callback && typeof options === 'function') {
        callback = options;
        options = {};
    }

    // Merge options with default configuration
    var opts = merge({}, config, options);

    // Instantiate an event emitter
    var emitter = new events.EventEmitter();

    // Variables that are changed during the setup process
    var channel, queueName;

    // Grab a DSN based on configuration and connect to the server
    var dsn = getConnectionString(opts.amqp);
    amqpClient.connect(dsn, function onClientConnected(err, conn) {
        if (err) {
            return callback(err);
        }

        conn.createChannel(onChannelOpened);
    });

    /**
     * Called when the AMQP channel has been opened
     *
     * @param  {Error|null} err An error instance, should the channel have failed to open
     * @param  {AmqpChannel} chan AMQP channel instance to perform operations on
     * @return {void}
     */
    function onChannelOpened(err, chan) {
        if (err) {
            return callback(err);
        }

        channel = chan;
        channel.assertExchange(
            opts.exchange.name,
            opts.exchange.type,
            {
                durable: opts.exchange.durable,
                autoDelete: opts.exchange.autoDelete
            },
            onExchangeAsserted
        );
    }

    /**
     * Called when the exchange has been asserted to exist/created
     *
     * @param  {Error|null} err An error instance, should the exchange assertion have failed
     * @return {void}
     */
    function onExchangeAsserted(err) {
        if (err) {
            return callback(err);
        }

        channel.assertQueue('', opts.queue, onQueueAsserted);
    }

    /**
     * Called when the queue has been asserted to exist/created
     *
     * @param {Error|null} err An error instance, should the queue assertion have failed
     * @param {Object} ok An object containing the name of the created queue
     * @return {void}
     */
    function onQueueAsserted(err, ok) {
        if (err) {
            return callback(err);
        }

        queueName = ok.queue;

        channel.bindQueue(queueName, opts.exchange.name, opts.queue.routingKey);
        channel.consume(queueName, onMessageReceived, opts.consumption, callback);
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
