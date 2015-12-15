'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');
var mocha = require('mocha');
var imbo = require('../lib/imbo-client');
var messageHandler = require('../lib/message-handler');

var it = mocha.it;
var describe = mocha.describe;
var testImage = fs.readFileSync(path.join(__dirname, 'fixtures', 'test.jpg'));

describe('#message-handler()', function() {
    it('should throw error on missing options', function() {
        assert.throws(messageHandler);
    });

    it('should throw error on missing imboclient', function() {
        assert.throws(function() {
            messageHandler({ events: [] });
        }, /imboClient/);
    });

    it('should throw error on missing events', function() {
        assert.throws(function() {
            messageHandler({ imboClient: {} });
        }, /events/);
    });

    it('should skip events that are not configured', function() {
        messageHandler({
            events: ['foo'],
            imboClient: {
                user: dontCall('user'),
                getImageUrl: dontCall('getImageUrl')
            }
        })({ eventName: 'bar' });
    });

    it('should skip message that lack an `image` property', function() {
        messageHandler({
            events: ['foo'],
            imboClient: {
                user: dontCall('user'),
                getImageUrl: dontCall('getImageUrl')
            }
        })({ eventName: 'foo' });
    });

    it('should request an image with the configured size', function() {
        getHandler({
            imageWidth: 2048,
            getImageDataFromUrl: function(url) {
                assert(decodeURIComponent(url.toString()).indexOf('width=2048') !== -1);
            }
        })({
            eventName: 'images.post',
            image: { identifier: 'foo' }
        });
    });

    it('should emit errors encountered while retrieving images from Imbo', function(done) {
        var onMessage = getHandler({
            getImageDataFromUrl: function(url, cb) {
                setImmediate(cb, new Error('404 Image Not Found'));
            },
            onLog: function(level, msg) {
                assert.equal(level, 'error');
                assert(msg && msg.message.indexOf('404') !== -1);
                done();
            }
        });

        onMessage({
            eventName: 'images.post',
            image: { identifier: 'foo' }
        });
    });

    it('should call face detector with downloaded image', function(done) {
        var onMessage = getHandler({
            detectFaces: function(img) {
                assert.equal(img, testImage);
                done();
            }
        });

        onMessage({
            eventName: 'images.post',
            image: { identifier: 'foo' }
        });
    });

    it('should log on unhandled users', function(done) {
        var onMessage = getHandler({
            onLog: function(level, msg) {
                assert.equal(level, 'trace');
                assert(msg.indexOf('zing') !== -1);
                done();
            },
            users: ['foo']
        });

        onMessage({
            eventName: 'images.post',
            image: { user: 'zing' }
        });
    });

    it('should log any face detection error', function(done) {
        var onMessage = getHandler({
            detectFaces: function(img, cb) {
                setImmediate(cb, new Error('foo'));
            },
            onLog: function(level, err) {
                assert.equal(level, 'error');
                assert(err.message.indexOf('foo') !== -1);
                done();
            }
        });

        onMessage({
            eventName: 'images.post',
            image: { identifier: 'foo' }
        });
    });

    it('should log a trace message if no faces are found', function(done) {
        var onMessage = getHandler({
            detectFaces: function(img, cb) {
                setImmediate(cb, null, []);
            },
            onLog: function(level, meta, msg) {
                assert.equal(level, 'trace');
                assert(msg.indexOf('No faces') !== -1);
                done();
            }
        });

        onMessage({
            eventName: 'images.post',
            image: { identifier: 'foo' }
        });
    });

    it('should log an info message if `poi` metadata is not an array', function(done) {
        var onMessage = getHandler({
            detectFaces: function(img, cb) {
                setImmediate(cb, null, [{}]);
            },
            onLog: function(level, meta, msg) {
                assert.equal(level, 'info');
                assert(msg.indexOf('not an array') !== -1);
                done();
            }
        });

        onMessage({
            eventName: 'images.post',
            image: { identifier: 'foo', metadata: { poi: 'foo' } }
        });
    });

    it('should update Imbo with detected POIs and log trace message', function(done) {
        var msg = {
            eventName: 'images.post',
            image: {
                identifier: 'foo',
                width: 2048,
                height: 1536
            }
        };

        var onMessage = getHandler({
            detectFaces: function(img, cb) {
                setImmediate(cb, null, getMockFaceData());
            },
            editMetadata: function(id, body, cb) {
                assert.equal(id, 'foo');

                // Largest POI first
                assert.equal(body.poi[0].width, 478);
                assert.equal(body.poi[0].height, 478);
                assert.equal(body.poi[0].x, 736);
                assert.equal(body.poi[0].y, 152);
                assert.equal(body.poi[0].cx, 975);
                assert.equal(body.poi[0].cy, 391);

                // All onboard?
                assert.equal(body.poi.length, 3);

                cb(null, msg);
            },
            onLog: function(level, meta, info) {
                assert.equal(meta.message, msg);
                assert.equal(info, 'Metadata updated');
                done();
            }
        });

        onMessage(msg);
    });

    it('should log errors encountered during editing of metadata', function(done) {
        var onMessage = getHandler({
            detectFaces: function(img, cb) {
                setImmediate(cb, null, getMockFaceData());
            },
            editMetadata: function(id, body, cb) {
                cb(new Error('Failed to update'));
            },
            onLog: function(level, meta) {
                assert.equal(meta.message, 'Failed to update');
                done();
            }
        });

        onMessage({
            eventName: 'images.post',
            image: {
                identifier: 'foo'
            }
        });
    });

    it('removes duplicate pois', function(done) {
        var msg = {
            eventName: 'images.post',
            image: {
                identifier: 'foo',
                width: 2048,
                height: 1536
            }
        };

        var onMessage = getHandler({
            detectFaces: function(img, cb) {
                setImmediate(cb, null, getMockFaceData({ duplicates: true }));
            },
            editMetadata: function(id, body) {
                assert.equal(body.poi.length, 1);
                done();
            }
        });

        onMessage(msg);
    });
});

function dontCall(name) {
    return function() {
        throw new Error('`' + name + '` was not expected to be called');
    };
}

function getHandler(opts) {
    var currentUser = '-';
    var imboClient = {
        getImageUrl: opts.getImageUrl || function(id) {
            return imbo.user(currentUser).getImageUrl(id);
        },
        user: opts.user || function(user) {
            currentUser = user;
            return imboClient;
        },
        getImageDataFromUrl: opts.getImageDataFromUrl || function(url, cb) {
            setImmediate(cb, null, testImage);
            return imboClient;
        },
        editMetadata: opts.editMetadata || function() {}
    };

    var onLog = opts.onLog || function() {};
    var log = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'].reduce(function(logger, level) {
        logger[level] = function(msg, meta) {
            onLog(level, msg, meta);
        };
        return logger;
    }, {});

    return messageHandler({
        events: ['images.post'],
        imboClient: imboClient,
        imageWidth: opts.imageWidth,
        users: opts.users || '*',
        log: log,
        detectFaces: opts.detectFaces || function(img, cb) {
            setImmediate(cb, null, []);
        }
    });
}

function getMockFaceData(opts) {
    opts = opts || {};

    var first = {
        x: 0.0634765625,
        y: 0.3059895833333333,
        cx: 0.08837890625,
        cy: 0.3391927083333333,
        width: 0.0498046875,
        height: 0.06640625
    };

    return [
        first,
        opts.duplicates ? first : {
            x: 0.443359375,
            y: 0.8893229166666666,
            cx: 0.482421875,
            cy: 0.94140625,
            width: 0.078125,
            height: 0.10416666666666667
        },
        opts.duplicates ? first : {
            x: 0.359375,
            y: 0.09895833333333333,
            cx: 0.47607421875,
            cy: 0.2545572916666667,
            width: 0.2333984375,
            height: 0.3111979166666667
        }
    ];
}
