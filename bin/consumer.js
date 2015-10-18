#!/usr/bin/env node
'use strict';

var bunyan = require('bunyan');
var config = require('../config/config');
var amqpConsumer = require('../lib/amqp-consumer');
var getMessageHandler = require('../lib/message-handler');
var imboClient = require('../lib/imbo-client');

var handleMessage = getMessageHandler({
    imboClient: imboClient,
    events: config.imbo.events,
    imageWidth: config.detection.imageWidth,
    log: bunyan.createLogger({ name: 'imbo-face-detector', level: 'trace' })
});

amqpConsumer(function(err) {
    // Throw on initialization errors
    if (err) {
        throw err;
    }
}).on('message', handleMessage).on('error', function(err) {
    console.error(err);
});
