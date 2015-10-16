'use strict';

module.exports = {
    amqp: {
        host: process.env.AMQP_HOST || 'localhost',
        port: process.env.AMQP_PORT || 5672,
        user: process.env.AMQP_USER || 'guest',
        pass: process.env.AMQP_PASSWORD || 'guest',
        vhost: process.env.AMQP_VHOST || '/'
    }
};
