'use strict';

var path = require('path');

module.exports = (
    process.env.DETECTOR_CLASSIFIER ||
    path.resolve(__dirname, '../node_modules/opencv/data/haarcascade_frontalface_alt_tree.xml')
);
