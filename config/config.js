'use strict';

var fs = require('fs');
var path = require('path');
var merge = require('lodash.merge');
var minimist = require('minimist');

var argv = minimist(process.argv.slice(2));
var config = {};

// Show the help/usage info if told to
if (argv.help) {
    console.log('Usage: imbo-face-detector --config=<configuration.json>\n');
    console.log('See README for details on configuration file format\n');
    process.exit(0);
}

// Load the configuration file if one is specified
if (argv.config) {
    try {
        fs.statSync(argv.config);
        config = JSON.parse(fs.readFileSync(argv.config));
    } catch (e) {
        if (e.code === 'ENOENT') {
            throw new Error('Configuration file "' + argv.config + '" not found');
        } else if (e.message.indexOf('Syntax')) {
            throw new Error('Configuration file "' + argv.config + '" is not valid JSON');
        }
    }
}

module.exports = merge({
    amqp: {
        host: process.env.AMQP_HOST || 'localhost',
        port: process.env.AMQP_PORT || 5672,
        user: process.env.AMQP_USER || 'guest',
        password: process.env.AMQP_PASSWORD || 'guest',
        vhost: process.env.AMQP_VHOST || '/'
    },

    queue: {
        // Leave `name` blank to auto-generate
        name: process.env.AMQP_QUEUE || '',
        exclusive: boolify('AMQP_EXCLUSIVE', true),
        routingKey: process.env.ROUTING_KEY || ''
    },

    exchange: {
        name: process.env.AMQP_EXCHANGE || 'imbo',
        type: process.env.AMQP_EXCHANGE_TYPE || 'fanout',
        durable: boolify('AMQP_EXCHANGE_DURABLE', false),
        autoDelete: boolify('AMQP_EXCHANGE_AUTODELETE', false)
    },

    consumption: {
        noAck: boolify('AMQP_NOACK', true)
    },

    imbo: {
        host: process.env.IMBO_HOST || 'http://imbo',
        port: process.env.IMBO_PORT || 80,
        publicKey: process.env.IMBO_PUBLICKEY || 'face-detect',
        privateKey: process.env.IMBO_PRIVATEKEY || 'face-detect-private-key',
        events: ['images.post']
    },

    detection: {
        imageWidth: process.env.IMAGE_WIDTH || 1024,
        classifier: (
            process.env.DETECTOR_CLASSIFIER ||
            path.resolve(path.join(
                __dirname, '..', 'node_modules', 'opencv',
                'data', 'haarcascade_frontalface_alt_tree.xml'
            ))
        )
    },

    logging: {
        level: process.env.LOG_LEVEL || 'trace'
    },

    healthCheck: {
        port: process.env.HTTP_PORT || 8888
    }
}, config);

function boolify(envVar, defaultVal) {
    var value = process.env[envVar];
    if (typeof value === 'undefined') {
        return defaultVal;
    }

    if (value === '1' || value === '') {
        return true;
    } else if (value === '0') {
        return false;
    }

    return defaultVal;
}
