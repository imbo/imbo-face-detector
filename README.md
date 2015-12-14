# Imbo face detector

OpenCV based face detection for Imbo, written in Node.JS. It listens on an AMQP queue for relevant events to act on, performs face detection and sets the detected point of interests as metadata on the image in Imbo.

## Installation

In order to use the Imbo face detector you must have an Imbo installation, with the [AMQP publisher](https://github.com/imbo/imbo-amqp-publisher) enabled and set up to publish messages for the `images.post` event.

You will need a public/private keypair with access to `image.get` and `metadata.post` on all users of the installation.

For the actual face detection to take place, you will need to have [OpenCV](http://opencv.org). On Ubuntu/Debian/Mint (and so on) the following is usually enough:

```sh
sudo apt-get install libopencv-dev
```

## Configuration

The configuration of the application is done either by setting environment variables or specifying a path to a configuration file. All the different variables are described below.

## Environment variables

### Consumer

- `LOG_LEVEL` - Level of messages that should be logged. Possible values: `fatal`, `error`, `warn`, `info`, `debug`, `trace`. Default: `trace`

### Detector

- `DETECTOR_CLASSIFIER` - Full file path to the classifier to use for detecting faces. Default: `node_modules/opencv/data/haarcascade_frontalface_alt_tree.xml`
- `IMAGE_WIDTH` - Width of image to use for detector. Default: `1024`

### Imbo

- `IMBO_HOST` - Hostname of the Imbo server. Default: `http://imbo`
- `IMBO_PORT` - Port number of the Imbo server. Default: `80`
- `IMBO_PUBLICKEY` - Public key to use for retrieving images and updating metadata. Default: `face-detect`
- `IMBO_PRIVATEKEY` - Private key that belongs to the public key specified. Default: `face-detect-private-key`

### AMQP

- `AMQP_HOST` - Hostname of the AMQP server. Default: `localhost`
- `AMQP_PORT` - Port of the AMQP server. Default: `5672`
- `AMQP_USER` - Username for the AMQP server. Default: `guest`
- `AMQP_PASSWORD` - Password for the AMQP server. Default: `guest`
- `AMQP_VHOST` - vhost to use. Default: `/`
- `AMQP_QUEUE` - Name of queue to use. Leave blank to auto-generate. Default: `face-detect`
- `AMQP_EXCLUSIVE` - Whether or not to use exclusive queue. Default: `false`
- `AMQP_ROUTING_KEY` - Routing key to specify for queue. Default: ``
- `AMQP_EXCHANGE` - Name of exchange to use. Default: `imbo`
- `AMQP_EXCHANGE_TYPE` - Type of exchange to use. Default: `fanout`
- `AMQP_EXCHANGE_DURABLE` - Whether or not the exchange should be durable. Default: `false`
- `AMQP_EXCHANGE_AUTODELETE` - Whether or not the exchange should auto-delete when there are no queues. Default: `false`
- `AMQP_NOACK` - Whether or not to use `noAck` mode for messages. Default: `true`

### Health check

- `HTTP_PORT` - Port for health check server. Default: `8888`

## Configuration file

Should you instead want to use a configuration file, simply create a JSON file with any or all of the options below, and specify the path to the file with the `--config` option. The configuration will be recursively merged with the default values.

```json
{
    "amqp": {
        "host": "localhost",
        "port": 5672,
        "user": "guest",
        "password": "guest",
        "vhost": "/"
    },
    "queue": {
        "name": "",
        "routingKey": "",
        "options": {
            "exclusive": true
        }
    },
    "exchange": {
        "name": "imbo",
        "type": "fanout",
        "options": {
            "durable": true,
        }
    },
    "consumption": {
        "noAck": true
    },
    "imbo": {
        "host": "http://imbo",
        "port": 80,
        "publicKey": "face-detect",
        "privateKey": "face-detect-private-key",
        "events": ["images.post"]
    },
    "detection": {
        "imageWidth": 1024,
        "classifier": "./node_modules/opencv/data/haarcascade_frontalface_alt_tree.xml"
    }
}
```

## Building the docker image
In order to build and push the official `imbo/face-detector` image your user need to have push access to the imbo organization on the docker hub. You can of course build it and push it somewhere else without access. For the official docker image however, the process is as follows:

```sh
$ npm run docker:build
```

The docker image will be built with the `latest` tag and you should tag it with something appropriate in addition to that. In order to find the image id:

```sh
$ docker images
REPOSITORY          TAG     IMAGE ID      CREATED            VIRTUAL SIZE
imbo/face-detector  latest  82afe0d63bed  About an hour ago  878.9 MB
```

Then tag this image with something sensible (1.2 as an example):

```sh
docker tag 82afe0d63bed imbo/face-detector:1.2
```

And now, the only thing left is pushing it to the docker hub to make it publicly available:

```sh
npm run docker:push
```

## License

Copyright (c) 2015, [Kristoffer Brabrand](mailto:kristoffer@brabrand.no) and [Espen Hovlandsdal](mailto:espen@hovlandsdal.com).

Licensed under the MIT License
