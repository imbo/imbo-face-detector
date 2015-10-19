#!/usr/bin/env node
'use strict';

var bunyan = require('bunyan');
var config = require('../config/config');
var amqpConsumer = require('../lib/amqp-consumer');
var getMessageHandler = require('../lib/message-handler');
var imboClient = require('../lib/imbo-client');

var logger = bunyan.createLogger({
    name: 'imbo-face-detector',
    level: config.logging.level
});

var handleMessage = getMessageHandler({
    imboClient: imboClient,
    events: config.imbo.events,
    imageWidth: config.detection.imageWidth,
    log: logger
});

amqpConsumer()
    .on('message', handleMessage)
    .on('error', logger.error.bind(logger));
