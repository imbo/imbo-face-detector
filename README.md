# Imbo face detector
OpenCV based face detection for Imbo. It listens on an AMQP queue for relevant events to act on, performs face detection and sets the detected point of interests as metadata on the image in Imbo.

## Environment variables
- `DETECTOR_CLASSIFIER` - Full file path to the classifier to use for detecting faces. Default: `node_modules/opencv/data/haarcascade_frontalface_alt_tree.xml`

## License
Copyright (c) 2015, [Kristoffer Brabrandand](mailto:kristoffer@brabrand.no) and [Espen Hovlandsdal](mailto:espen@hovlandsdal.com).

Licensed under the MIT License
