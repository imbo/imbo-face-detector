'use strict';

var amqp = require('amqplib/callback_api');
var detectFaces = require('./detect-faces');
var config = require('../config/config');

// Variables that are changed during the setup process
var channel, queueName;

var dsn = getConnectionString(config.amqp);
amqp.connect(dsn, function(err, conn) {
    if (err) {
        throw err;
    }

    conn.createChannel(onChannelOpened);
});

function onChannelOpened(err, chan) {
    if (err) {
        throw err;
    }

    channel = chan;
    channel.assertQueue('', config.queue, onQueueAsserted);
}

function onQueueAsserted(err, ok) {
    if (err) {
        throw err;
    }

    queueName = ok.queue;

    channel.bindQueue(queueName, config.exchange.name, config.queue.routingKey);
    channel.consume(queueName, parseMessage, config.consumption, onConsumingQueue);
}

function onConsumingQueue(err, ok) {
    if (err) {
        throw err;
    }
}

function parseMessage(msg) {
    if (!msg) {
        return;
    }

    try {
        var body = JSON.parse(msg.content.toString());
    } catch (e) {
        // @todo replace with logging module (eg: bunyan)
        console.error(e);
    }

    console.log(body);
    // @todo Build image URL, retrieve image, feed binary data to face detector
}

function getConnectionString(config) {
    return [
        'amqp://',
        config.user, ':',
        config.password, '@',
        config.host, ':',
        config.port,
        config.vhost
    ].join('');
}
