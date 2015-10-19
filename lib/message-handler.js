'use strict';

var unique = require('lodash.uniq');
var detectFaces = require('./detect-faces');

module.exports = function getMessageHandler(options) {
    ['imboClient', 'events'].forEach(function assertOptions(opt) {
        if (!(options || {})[opt]) {
            throw new Error('Option `' + opt + '` must be specified for message handler');
        }
    });

    var faceDetector = options.detectFaces || detectFaces;

    /**
     * Called when a message is received
     *
     * @param {Object} msg AMQP message body
     * @return {void}
     */
    function messageHandler(msg) {
        if (options.events.indexOf(msg.eventName) === -1) {
            return log('trace', 'Message was not in event name filter (`' + msg.eventName + '`)');
        }

        if (!msg.image) {
            return log('trace', 'Message did not have an `image`-property, skipping');
        }

        var client = options.imboClient.user(msg.image.user);
        var url = client.getImageUrl(msg.image.identifier).maxSize({
            width: options.imageWidth || 1024
        });

        client.getImageDataFromUrl(url, function onImageDataReceived(err, image) {
            if (err) {
                return log('error', err);
            }

            faceDetector(image, function onFaceDetectComplete(faceErr, result) {
                onFacesDetected(faceErr, msg, result);
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
            return log('error', err);
        }

        if (faces.length === 0) {
            return log('trace', {
                message: message
            }, 'No faces found in image');
        }

        var existingPois = (message.image.metadata ? message.image.metadata : {}).poi;
        if (existingPois && !Array.isArray(existingPois)) {
            return log('info', {
                message: message
            }, '`metadata.poi` was not an array, skipping');
        }

        var imageWidth = message.image.width;
        var imageHeight = message.image.height;

        // @todo match existing pois against found faces
        var pois = faces.reduce(function(curr, face) {
            var x = Math.min(Math.round(imageWidth * face.x), imageWidth),
                y = Math.min(Math.round(imageHeight * face.y), imageHeight),
                w = Math.round(face.width * imageWidth),
                h = Math.round(face.height * imageHeight);

            curr.push({
                x: x,
                y: y,
                cx: Math.round(x + (w / 2)),
                cy: Math.round(y + (h / 2)),
                width: w,
                height: h
            });
            return curr;
        }, (existingPois || []).slice(0));

        // Update the metadata in Imbo
        options.imboClient.user(message.image.user).editMetadata(
            message.image.identifier,
            { poi: unique(pois, hashPoi).sort(sortBySize) },
            function onImboMetadataResponse(metaErr) {
                onMetadataUpdated(metaErr, message);
            }
        );
    }

    /**
     * Called when the metadata has been updated in Imbo
     *
     * @param  {Error|null} err
     * @param  {Object} msg
     * @return {void}
     */
    function onMetadataUpdated(err, msg) {
        if (err) {
            return log('error', err);
        }

        log('trace', {
            message: msg
        }, 'Metadata updated');
    }

    /**
     * Log a message to the configured log adapter (if any)
     *
     * @param {String} level
     */
    function log(level) {
        if (options.log) {
            options.log[level].apply(options.log, Array.prototype.slice.call(arguments, 1));
        }
    }

    return messageHandler;
};

/**
 * Sort points of interest by size, descending
 *
 * @param {Object} a
 * @param {Object} b
 * @return {Number}
 */
function sortBySize(a, b) {
    return (b.width * b.height) - (a.width * a.height);
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
