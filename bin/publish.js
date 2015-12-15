#!/usr/bin/env node
'use strict';

var bunyan = require('bunyan');
var gleipnir = require('gleipnir');
var merge = require('lodash.merge');
var minimist = require('minimist');
var config = require('../config/config');
var client = require('../lib/imbo-client');
var Imbo = require('imboclient');

var argv = minimist(process.argv.slice(2));

var logger = bunyan.createLogger({
    name: 'imbo-face-detector',
    level: config.logging.level
});

var user = argv.user || 'user';
var identifier = argv.identifier || 'foo';

function fetchImboImageDetails() {
    var q = (new Imbo.Query()).ids([identifier]).metadata(true);

    client.user(user).getImages(q, function(err, images) {
        if (err) {
            throw err;
        }

        if (!images.length) {
            throw new Error('Image with ID `' + identifier + '` not found, user: `' + user + '`');
        }

        var img = images[0];
        connectToAmqp(img);
    });
}

var channel, connection;
function connectToAmqp(img) {
    gleipnir({
        url: config.amqp,
        log: logger,
        assert: {
            exchanges: [config.exchange],
            queues: [merge(config.queue, {
                binding: {
                    exchange: config.exchange.name,
                    pattern: config.queue.routingKey
                }
            })]
        }
    }, function onAmqpConnect(err, chan, conn) {
        if (err) {
            throw err;
        }

        channel = chan;
        connection = conn;

        publishMessage(img);
        setImmediate(closeConnection);
    });
}

function publishMessage(img) {
    channel.publish(
        config.exchange.name,
        config.queue.routingKey,
        new Buffer(JSON.stringify({
            eventName: argv.event || 'images.post',
            image: merge({
                user: user,
                identifier: identifier
            }, img)
        })),
        { durable: true }
    );
}

function closeConnection() {
    channel.close();
    connection.close();
}

fetchImboImageDetails();
