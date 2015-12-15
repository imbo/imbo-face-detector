'use strict';

var intersect = require('lodash.intersection');
var without = require('lodash.without');
var client = require('./imbo-client');
var config = require('../config/config');

module.exports = function checkImboAccess(log, cb) {
    log.trace('Checking for metadata edit access');
    client.getAccessControlRules(config.imbo.publicKey, true, onAclResponse);

    function onAclResponse(err, acl) {
        if (err) {
            log.error(err);
            throw err;
        }

        assertAccess(acl);
    }

    function assertAccess(acl) {
        var hasAccess = acl.reduce(reduceAccess, {
            'metadata.post': [],
            'image.get': []
        });

        var users = intersect(hasAccess['metadata.post'], hasAccess['image.get']);
        var diff = without.apply(this, [
            hasAccess['metadata.post'].concat(hasAccess['image.get'])
        ].concat(users));

        if (!users.length) {
            return cb(new Error(
                'Configured public key does not have access to the required resources ' +
                '(`metadata.post`/`image.get`) for any user. Cannot function like this.'
            ));
        }

        if (diff.length) {
            log.warn(
                'Configured public key only has access to one of `metadata.post`/`image.get` ' +
                'for users: [' + diff.join(', ') + ']. Needs to have access to both resources ' +
                'in order for it to work. Skipping aforementioned users.'
            );
        }

        for (var key in hasAccess) {
            if (!hasAccess[key]) {
                return cb(Error('Configured public key does not have access to `' + key + '`'));
            } else if (hasAccess[key] !== '*') {
                log.warn(
                    'Configured public key only has `' + key + '` access to certain users - ' +
                    'will reject messages that refer to images not within the following list ' +
                    'of users: [' + users.join(', ') + ']'
                );
            }
        }

        cb(null, users);
    }

    function reduceAccess(has, rule) {
        for (var key in has) {
            if (rule.resources.indexOf(key) === -1) {
                continue;
            } else if (rule.users === '*') {
                has[key] = '*';
                continue;
            } else {
                has[key] = has[key].concat(rule.users);
            }
        }

        return has;
    }
};
