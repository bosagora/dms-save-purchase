FROM node:16-alpine

RUN apk add --no-cache git py-pip alpine-sdk \
    bash autoconf libtool automake

WORKDIR /app/

ADD . /app/
COPY ./env/.env.sample /app/env/.env

RUN yarn install
RUN yarn build
