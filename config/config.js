'use strict';

var path = require('path');

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

module.exports = {
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
        name: process.env.AMQP_EXCHANGE || 'imbo'
    },

    consumption: {
        noAck: boolify('AMQP_NOACK', true)
    },

    imbo: {
        host: process.env.IMBO_HOST || 'http://imbo',
        port: process.env.IMBO_PORT || 80,
        publicKey: process.env.IMBO_PUBLICKEY || 'face-detect',
        privateKey: process.env.IMBO_PUBLICKEY || 'zEKjL0f9XLyPrMkGcs_621RrDQi7KekbduCXsbFHTWs'
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
    }
};
