'use strict';

var Imbo = require('imboclient');

var config = require('../config/config');

module.exports = new Imbo.Client({
    hosts: config.imbo.host,
    user: config.imbo.publicKey,
    publicKey: config.imbo.publicKey,
    privateKey: config.imbo.privateKey
});
