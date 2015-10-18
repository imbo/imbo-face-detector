'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');
var mocha = require('mocha');
var detectFaces = require('../lib/detect-faces');

var it = mocha.it;
var describe = mocha.describe;
var testImage = fs.readFileSync(path.join(__dirname, 'fixtures', 'test.jpg'));

describe('#detect-faces()', function() {
    it('should detect some faces', function(done) {
        detectFaces(testImage, function(err, faces) {
            assert.ifError(err);

            assert.equal(faces.length, 3);
            done();
        });
    });

    it('should error on invalid image', function(done) {
        detectFaces('foo', function(err) {
            assert(err);
            done();
        });
    });
});
