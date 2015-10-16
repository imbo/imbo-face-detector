'use strict';

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
        name: '',
        exclusive: true,
        routingKey: ''
    },

    exchange: {
        name: 'imbo'
    },

    consumption: {
        noAck: true
    },

    imbo: {
        host: process.env.IMBO_HOST || 'http://imbo',
        port: process.env.IMBO_PORT || 80,
        publicKey: process.env.IMBO_PUBLICKEY || 'publickey',
        privateKey: process.env.IMBO_PUBLICKEY || 'privatekey'
    },

    detection: {
        imageWidth: 924
    }
};
