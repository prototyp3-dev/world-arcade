# World Arcade

```
Cartesi Rollups version: 1.0.x
```

The World Arcade allows users to play riscv-binaries of games on a RISC-v Cartesi Machine on the browser, submit the game moves onchain so the session will be replayed a Cartesi Rollups DApp to generate a provable score. Naturally you can upload you own games.

DISCLAIMERS

This is not a final product and should not be used as one.

## Requirements

- [npm](https://docs.npmjs.com/cli/v9/configuring-npm/install) (To install dependencies and run the frontend)
- [Sunodo](https://github.com/sunodo/sunodo) (To build and run the DApp backend)
- [Metamask](https://metamask.io/) (To sign transactions in the frontend)

> [!IMPORTANT]
> This project uses Sunodo version 0.8.1, after installing *npm* install sunodo using the command below.
```shell
npm install -g @sunodo/cli@0.8.1
```

To build the DApp, two images are also required: `riv/toolchain` and `sunodo/sdk:0.2.0-riv`.

- To generate `riv/toolchain`, clone [RIV repository](https://github.com/edubart/riv) and in its directory do:
```shell
make toolchain
```

- To generate `sunodo/sdk:0.2.0-riv`, in the `world-arcade` project directory do:
```shell
make
```

## Building

Build with:

```shell
sunodo build
```

For the frontend, open a new terminal and:

Go to the frontend folder:

```shell
cd next-js-frontend
```

Then, build it with:

```shell
npm install && npm run codegen
```

## Running

Run the DApp environment with:

```shell
sunodo run
```

The frontend can be executed in developer mode or production mode. After choosing the desired mode, run the command in the terminal opened for the frontend.

### Developer Mode
```shell
npm run dev
```

### Production Mode
```shell
npm run build && npm run start
```

## Metamask Setup (one time only)

Since the DApp will be running on top of a local Blockchain, it is necessary to configure Metamask to interact with the local blockchain RPC node. The user will need an account in this local network to pay for the transactions. Luckily, this environment has standard accounts with tokens ready to use. So, the setup has two steps:

1. [Add the local network](https://metamask.zendesk.com/hc/en-us/articles/360043227612-How-to-add-a-custom-network-RPC), setting the values specified below.

    1. RPC URL: http://localhost:8545
    2. Chain ID: 31337
2. [Import one of the ready-to-use accounts](https://support.metamask.io/hc/en-us/articles/360015489331-How-to-import-an-Account). For this, use one of the private keys below:

    0. 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
    1. 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
    2. 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a
    3. 0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6
    4. 0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a
    5. 0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba
    6. 0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e
    7. 0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356
    8. 0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97
    9. 0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6

## Interact with the Application

Interact with the application using the web frontend

> [!WARNING]
> Every time the DApp backend is interrupted (Ctrl+c) and [started again](#running), a new local blockchain is create. So, to avoid inconsistencies between Metamask and the local blockchain, remember to [clear your account activity](https://support.metamask.io/hc/en-us/articles/360015488891-How-to-clear-your-account-activity-reset-account).

The flow of the protocol is as follows:
1. Upload a cartridge Squash File System (sqfs) through the upload form available on the *Upload* page. This page can be accessed using the navbar. On upload success, you will be redirected to the game page.

> [!IMPORTANT]
> You can download some cartridges sqfs examples [here](https://github.com/edubart/riv/releases/tag/downloads).

2. On the game page, read its description to get to know its controls.

3. Click on "Start" to initiate the game.

4. When the gameplay finishes (beat the game or click on "Stop"), you will be able to:
    1. Download your gameplay log to submit later.
    2. Submit your current gameplay log for verification.

5. If the gameplay log was submitted and validated, you can access the game's ranking to see your place in it.
