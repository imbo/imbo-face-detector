FROM ubuntu:14.04
MAINTAINER Kristoffer Brabrand <kristoffer@brabrand.no>

RUN apt-get update && apt-get install -y software-properties-common
RUN add-apt-repository -y ppa:kubuntu-ppa/backports

# Install Node.js 0.12
RUN apt-get update -qq && apt-get install -y curl build-essential
RUN curl --silent --location https://deb.nodesource.com/setup_0.12 | bash -
RUN apt-get install -y nodejs

# Install OpenCV
RUN apt-get install --force-yes -y libcv-dev libcvaux-dev libhighgui-dev libopencv-dev

# Exclude npm cache from the image
VOLUME /root/.npm

# Install deps
ADD package.json /app/package.json
RUN cd /app && npm install

# Copy the entire application into the build container
COPY . /app
WORKDIR /app

# Expose health check port
EXPOSE 8888 8888

# Start application
CMD ["npm", "start"]
