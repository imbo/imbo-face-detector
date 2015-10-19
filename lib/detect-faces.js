'use strict';

var cv = require('opencv');
var config = require('../config/config');

/**
 * Detect faces in an image using Haar cascade classification
 *
 * @param {Buffer}   image    Binary buffer representation of image
 * @param {Object}   options  Options to use for detecting faces. Optional.
 * @param {Function} callback Function to call when completed. Provides array of objects with
 *                             `x`, `y`, `cx`, `cy`, `width` and `height` as percentages
 */
module.exports = function detectFaces(image, options, callback) {
    if (!callback && typeof options === 'function') {
        callback = options;
        options = {};
    }

    cv.readImage(image, function onImageRead(err, im) {
        if (err) {
            return callback(err);
        }

        var width = im.width();
        var height = im.height();

        if (width < 1 || height < 1) {
            return callback(new Error('Image has no size'));
        }

        var classifier = options.classifier || config.detection.classifier;
        im.detectObject(classifier, {}, function onObjectsDetected(detectErr, objects) {
            if (detectErr) {
                return callback(detectErr);
            }

            callback(null, objects.map(function mapObjects(face) {
                return {
                    x: face.x / width,
                    y: face.y / height,
                    cx: (face.x + face.width / 2) / width,
                    cy: (face.y + face.height / 2) / height,
                    width: face.width / width,
                    height: face.height / height
                };
            }));
        });
    });
};
