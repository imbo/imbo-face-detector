'use strict';

var assert = require('assert');
var mocha = require('mocha');
var sinon = require('sinon');
var proxyquire = require('proxyquire');

var it = mocha.it;
var describe = mocha.describe;
var beforeEach = mocha.beforeEach;

describe('#imbo-acl-check()', function() {
    var logger;

    beforeEach(function() {
        logger = getLogger();
    });

    it('logs and throws on ACL error response', function() {
        var err = new Error('Some weird error');
        var aclCheck = getAclChecker([err]);
        assert.throws(function() {
            aclCheck(logger, function() {});
        });

        assert(logger.error.calledWith(err));
    });

    it('responds with error if no users are found with correct resources', function() {
        var aclCheck = getAclChecker([null, [{
            resources: ['foo.bar'],
            users: '*'
        }]]);

        aclCheck(logger, function(err) {
            assert.equal(
                err.message,
                'Configured public key does not have access to the required resources ' +
                '(`metadata.post`/`image.get`) for any user. Cannot function like this.'
            );
        });
    });

    it('logs warnings for users that only have access to one of required resources', function() {
        var aclCheck = getAclChecker([null, [{
            resources: ['image.get'],
            users: ['foo', 'bar']
        }, {
            resources: ['metadata.post'],
            users: ['foo']
        }]]);

        aclCheck(logger, function(err, users) {
            assert.ifError(err);
            assert.equal(users.length, 1);
            assert.equal(users[0], 'foo');
            assert(logger.warn.calledWith(
                'Configured public key only has access to one of `metadata.post`/`image.get` ' +
                'for users: [bar]. Needs to have access to both resources ' +
                'in order for it to work. Skipping aforementioned users.'
            ));
        });
    });

    it('returns wildcard if wildcard with all required resources are present', function() {
        var aclCheck = getAclChecker([null, [{
            resources: ['image.get', 'metadata.post'],
            users: '*'
        }]]);

        aclCheck(logger, function(err, users) {
            assert.ifError(err);
            assert.equal(users, '*');
        });
    });
});

function getLogger() {
    return {
        trace: sinon.spy(),
        warn: sinon.spy(),
        error: sinon.spy(),
        debug: sinon.spy()
    };
}

function getAclChecker(responseArgs) {
    return proxyquire('../lib/imbo-acl-check', {
        './imbo-client': {
            getAccessControlRules: function(pubKey, expand, cb) {
                cb.apply(null, responseArgs);
            }
        }
    });
}
