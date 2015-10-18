'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');
var mocha = require('mocha');
var detectFaces = require('../lib/detect-faces');

var it = mocha.it;
var describe = mocha.describe;
var imageWidth = 1024;
var testImage = fs.readFileSync(path.join(__dirname, 'fixtures', 'test.jpg'));

describe('#detect-faces()', function() {
    it('should detect faces at correct coordinates', function(done) {
        detectFaces(testImage, function(err, faces) {
            assert.ifError(err);
            assert.equal(faces.length, 3);

            var pois = faces.map(toPixels);
            assertEqualPois(pois[0], { x: 65, y: 313, cx: 91, cy: 347, width: 51, height: 68 });
            assertEqualPois(pois[1], { x: 454, y: 911, cx: 494, cy: 964, width: 80, height: 107 });
            assertEqualPois(pois[2], { x: 368, y: 101, cx: 488, cy: 261, width: 239, height: 319 });

            done();
        });
    });

    it('should error on invalid image', function(done) {
        detectFaces('foo', function(err) {
            assert(err);
            done();
        });
    });

    it('can receive options as optional second parameter', function(done) {
        var classifier = path.resolve(path.join(
            __dirname, '..', 'node_modules', 'opencv',
            'data', 'haarcascade_frontalface_alt_tree.xml'
        ));

        detectFaces(testImage, { classifier: classifier }, function(err, faces) {
            assert.ifError(err);
            assert.equal(faces.length, 3);
            done();
        });
    });
});

function toPixels(face) {
    var pixels = {};
    for (var key in face) {
        pixels[key] = Math.round(face[key] * imageWidth);
    }

    return pixels;
}

function assertEqualPois(actual, expected) {
    for (var key in actual) {
        assert.equal(actual[key], expected[key], '`' + key + '` did not have expected value');
    }
}
