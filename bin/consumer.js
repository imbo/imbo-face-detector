#!/usr/bin/env node
'use strict';

var amqpClient = require('amqplib/callback_api');
var detectFaces = require('../lib/detect-faces');
var config = require('../config/config');
var imboClient = require('../lib/imbo-client');
var unique = require('lodash.uniq');

// Variables that are changed during the setup process
var channel, queueName;

// Grab a DSN based on configuration and connect to the server
var dsn = getConnectionString(config.amqp);
amqpClient.connect(dsn, function onClientConnected(err, conn) {
    if (err) {
        throw err;
    }

    conn.createChannel(onChannelOpened);
});

/**
 * Called when the AMQP channel has been opened
 *
 * @param  {Error|null} err An error instance, should the channel have failed to open
 * @param  {AmqpChannel} chan AMQP channel instance to perform operations on
 */
function onChannelOpened(err, chan) {
    if (err) {
        throw err;
    }

    channel = chan;
    channel.assertQueue('', config.queue, onQueueAsserted);
}

/**
 * Called when the queue has been asserted to exist/created
 *
 * @param {Error|null} err An error instance, should the queue assertion have failed
 * @param {Object} ok An object containing the name of the created queue
 */
function onQueueAsserted(err, ok) {
    if (err) {
        throw err;
    }

    queueName = ok.queue;

    channel.bindQueue(queueName, config.exchange.name, config.queue.routingKey);
    channel.consume(queueName, onMessageReceived, config.consumption, onConsumingQueue);
}

/**
 * Called when the AMQP client has started consuming the queue
 *
 * @param {Error|null} err An error instance, should the consumption have failed
 */
function onConsumingQueue(err) {
    if (err) {
        throw err;
    }
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

    var body = parseJson(msg.content.toString());
    if (!body || config.imbo.events.indexOf(body.eventName) === -1) {
        return;
    }

    if (!body.image) {
        return;
    }

    var client = imboClient.user(body.image.user);
    var url = client.getImageUrl(body.image.identifier).maxSize({ width: config.detection.imageWidth });

    client.getImageDataFromUrl(url, function onImageDataReceived(err, image) {
        if (err) {
            return log(err, 'error');
        }

        detectFaces(image, function onFaceDetectComplete(faceErr, result) {
            onFacesDetected(faceErr, body, result);
        });
    });
}

/**
 * Called when face detection completes
 *
 * @param {Error|null} err
 * @param {Object} message The message that triggered this face detection
 * @param {Array} faces Array of discovered faces
 * @return {void}
 */
function onFacesDetected(err, message, faces) {
    if (err) {
        return log(err, 'error');
    }

    if (faces.length === 0) {
        return log('No faces found', 'info');
    }

    var existingPois = (message.image.metadata ? message.image.metadata : {}).poi;
    if (existingPois && !Array.isArray(existingPois)) {
        return log('`metadata.poi` was not an array, skipping', 'warning');
    }

    var imageWidth = message.image.width;
    var imageHeight = message.image.height;

    // @todo match existing pois against found faces
    var pois = faces.reduce(function(curr, face) {
        curr.push({
            x: Math.min(Math.round(imageWidth * face.x), imageWidth),
            y: Math.min(Math.round(imageHeight * face.y), imageHeight),
            width: Math.round(message.image.width * face.width),
            height: Math.round(message.image.height * face.height)
        });
        return curr;
    }, (existingPois || []).slice(0));

    // Update the metadata in Imbo
    imboClient.user(message.image.user).editMetadata(
        message.image.identifier,
        { poi: unique(pois, hashPoi) },
        onMetadataUpdated
    );
}

/**
 * Called when the metadata has been updated in Imbo
 *
 * @param  {Error|null} err
 * @return {void}
 */
function onMetadataUpdated(err) {
    if (err) {
        return log(err, 'error');
    }

    log('Metadata updated', 'info');
}

/**
 * Takes a point of interest object and creates a hash out of it,
 * for use as the `unique()` iteratee comparison method.
 *
 * @param  {Object} poi
 * @return {mixed}
 */
function hashPoi(poi) {
    if (typeof poi.x === 'undefined' || typeof poi.y === 'undefined') {
        return poi;
    }

    var hash = poi.x + '|' + poi.y;

    if (typeof poi.width === 'undefined' || typeof poi.height === 'undefined') {
        return hash;
    }

    return hash + '|' + poi.width + '|' + poi.height;
}

/**
 * Parse a JSON message without throwing exceptions on errors, instead simply logging them
 *
 * @param  {String} msg JSON string
 * @return {mixed} Value of parsed JSON string on success, or undefined if it fails
 */
function parseJson(msg) {
    try {
        return JSON.parse(msg);
    } catch (e) {
        return log(e, 'error');
    }
}

/**
 * Log messages based on configuration
 *
 * @param {Error|String} msg Error or a string to log
 * @param {String} level The level of this message (info/warning/error)
 */
function log(msg, level) {
    // @todo replace with logging module (eg: bunyan)
    switch (level || 'info') {
        case 'error':
            console.error(msg);
            break;
        case 'warning':
            console.warn(msg);
            break;
        default:
            console.log(msg);
    }
}

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
