# RIV Framework

```
Cartesi Rollups version: 0.9.x
```

The RIV Framework allows users to play riscv-binaries of games on a RISC-v Cartesi Machine on the browser (WIP - currently you must run on the host), submit the game moves onchain so the session will be replayed a Cartesi Rollups DApp to generate a provable score. Naturally you can upload you own games.

DISCLAIMERS

This is not a final product and should not be used as one.

## Requirements


This project works with [sunodo](https://github.com/sunodo/sunodo), so run it you should first install sunodo.

```shell
npm install -g @sunodo/cli
```

## Building

Build with:

```shell
sunodo build
```

For the frontend build with:

```shell
cd frontend
yarn
yarn codegen
```

## Running

Run with:

```shell
sunodo run
```

Run the frontend with:

```shell
yarn start
```

## Interact with the Application

Interact with the application using the web frontend

The flow of the protocol is as follows:
1. Load Wasm to be able to encode inputs to send to the DApp.
2. Upload cartridge riscv binary.
3. Send cartridge riscv binary to the DApp.
4. Get saved cartridges from DApp.
5. Upload an image for the cartridge.
6. Send the cartridge image to the DApp (only original cartridge sender).
7. Remove the cartridge from the DApp (only mock wallet #0).
8. Upload the score and log files generated from local cartridge run.
9. Send the log and score hash to the DApp to validate score.
10. List the Scores validated by the DApp.

