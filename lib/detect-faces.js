'use strict';

var cv = require('opencv');
var classifier = require('./classifier');

/**
 * Detect faces in an image using Haar cascade classification
 *
 * @param {Buffer} image Binary buffer representation of image
 * @return {Array} Array of POI objects with x and y pos, width and height in percent
 */
module.exports = function detectFaces(image, callback) {
    cv.readImage(image, function(err, im) {
        if (err) {
            return callback(err);
        }

        var width = im.width();
        var height = im.height();

        if (width < 1 || height < 1) {
            return callback(new Error('Image has no size'));
        }

        im.detectObject(classifier, {}, function(err, objects) {
            if (err) {
                return callback(err);
            }

            callback(null, objects.map(function(face) {
                return {
                    x: (face.x + face.width / 2) / width,
                    y: (face.y + face.height / 2) / height,
                    width: face.width / width,
                    height: face.height / height
                };
            }));
        });
    });
};
