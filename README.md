# Imbo face detector
OpenCV based face detection for Imbo. It listens on an AMQP queue for relevant events to act on, performs face detection and sets the detected point of interests as metadata on the image in Imbo.

## Installation
In order to use the Imbo face detector you must have an Imbo installation, with the [AMQP publisher](https://github.com/imbo/imbo-amqp-publisher) enabled.

You will public/private keypair with access to `images.get` and `metadata.post` on all users on the installation.

For the actual face detection to take place, you will need to have [OpenCV](http://opencv.org). On Ubuntu/Debian/Mint (and so on) the following is usually enough:

```sh
sudo apt-get install libopencv-dev
```

## Configuration
The configuration of the application is done by setting environment variables. All the different variables are described below.

## Environment variables
- `DETECTOR_CLASSIFIER` - Full file path to the classifier to use for detecting faces. Default: `node_modules/opencv/data/haarcascade_frontalface_alt_tree.xml`

## License
Copyright (c) 2015, [Kristoffer Brabrandand](mailto:kristoffer@brabrand.no) and [Espen Hovlandsdal](mailto:espen@hovlandsdal.com).

Licensed under the MIT License
