FROM node:18.19-alpine

RUN apk add --update python3 g++ make yarn git
RUN alias python=python3

WORKDIR /app/

ADD . /app/
COPY ./env/.env.sample /app/env/.env

RUN yarn install
RUN yarn run build

