#!/usr/bin/env node
'use strict';

var bunyan = require('bunyan');
var merge = require('lodash.merge');
var config = require('../config/config');
var amqpConsumer = require('../lib/amqp-consumer');
var getMessageHandler = require('../lib/message-handler');
var imboClient = require('../lib/imbo-client');
var healthCheck = require('../lib/health-check');
var aclCheck = require('../lib/imbo-acl-check');

var logger = bunyan.createLogger({
    name: 'imbo-face-detector',
    level: config.logging.level
});

// Perform an async Imbo ACL check (if we can't modify metadata, shut down)
aclCheck(logger, function onAclChecked(err, users) {
    if (err) {
        throw err;
    }

    var consumer = amqpConsumer({
        logger: logger
    });

    var handleMessage = getMessageHandler({
        imboClient: imboClient,
        events: config.imbo.events,
        users: users,
        imageWidth: config.detection.imageWidth,
        log: logger
    });

    healthCheck(merge({ log: logger }, config));

    consumer
        .on('message', handleMessage)
        .on('error', logger.error.bind(logger));
});
