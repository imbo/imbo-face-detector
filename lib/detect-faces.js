'use strict';

var opencv = require('opencv');
var cascade = require('./cascade');

/**
 * Detect faces in an image using Haar cascade classification
 *
 * @param {Buffer} image Binary buffer representation of image
 * @return {Array} Array of POI objects with x and y pos, width and height in percent
 */
module.exports = function detectFaces(image, callback) {
    cv.readImage(buffer, function(err, im) {
        if (err) {
            return callback(err);
        }

        var width = im.width();
        var height = im.height();

        if (width < 1 || height < 1) {
            return callback(new Error('Image has no size'));
        }

        im.detectObject(cascade, {}, function(err, faces) {
            if (err) {
                return callback(err);
            }

            var faces = [];

            for (var i = 0; i < faces.length; i++) {
                faces.push({
                    x: (face.x + face.width / 2) / width,
                    y: (face.y + face.height / 2) / height,
                    width: face.width / width,
                    height: face.height / height
                });
            }

            return faces;
        });
    });
};
