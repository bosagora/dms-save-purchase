# Rollup Server

A server that receives transactions and then stores it in a blockchain

## Installation

```shell
git clone https://github.com/bosagora/rollup-server.git
cd rollup-server
npm install
cp env/.env.sample env/.env
```

## Run

Running on mainnet

```shell
npm run start:mainnet
```

Running on testnet

```shell
npm run start:testnet
```

## Testing

```shell
npx hardhat compile
npx hardhat test
```

## Run Test Client for Testing

```shell
$ cp env/.env.client.sample env/.env.client
$ npm run start:client
```

## API User's Guide

The following endpoints are provided:

-   /tx/record - Endpoint entering the transaction
-   /tx/sequence - Endpoint requesting the sequence of the last transaction received

Refer to the [API User's Guide](API.md) for more information
