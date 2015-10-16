'use strict';

var path = require('path');

module.exports = (
    process.env.DETECTOR_CASCADE ||
    path.resolve(__dirname, '../node_modules/opencv/data/haarcascade_frontalface_alt2.xml')
);
