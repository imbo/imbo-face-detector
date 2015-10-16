FROM schickling/opencv:latest
MAINTAINER Kristoffer Brabrand <kristoffer@brabrand.no>

RUN apt-get update && apt-get install -y curl
RUN curl --silent --location https://deb.nodesource.com/setup_0.12 | bash -
RUN apt-get install -y nodejs

# Exclude npm cache from the image
VOLUME /root/.npm

# Install deps
ADD package.json /app/package.json
RUN cd /app && npm install

# Copy the entire application into the build container
COPY . /app
WORKDIR /app

# Start application
CMD ["npm", "run", "start"]
