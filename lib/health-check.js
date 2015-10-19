'use strict';

var http = require('http');
var merge = require('lodash.merge');
var config = require('../config/config');

module.exports = function httpHealthCheck(opts) {
    var options = merge({}, config, opts);

    var server = http.createServer(function onHealthCheckRequest(req, res) {
        var is404 = req.url !== '/status';

        res.writeHead(is404 ? 404 : 200);
        return res.end(is404 ? 'File not found' : 'OK');
    });

    server.listen(options.healthCheck.port, function onHealthCheckListen(err) {
        if (err) {
            if (opts.log) {
                opts.log.error(err);
            }

            throw err;
        }

        if (opts.log) {
            opts.log.trace('Health check server listening on port ' + opts.healthCheck.port);
        }
    });

    return server;
};
