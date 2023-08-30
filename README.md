# RIV Framework

```
Cartesi Rollups version: 0.9.x
```

The RIV Framework allows users to play riscv-binaries of games on a RISC-v Cartesi Machine on the browser (WIP - currently you must run on the host), submit the game moves onchain so the session will be replayed a Cartesi Rollups DApp to generate a provable score. Naturally you can upload you own games.

DISCLAIMERS

This is not a final product and should not be used as one.

## Requirements


This project works with [sunodo](https://github.com/sunodo/sunodo), so run it you should first install sunodo.

To install sunodo and to run the frontend, you will also need [npm](https://docs.npmjs.com/cli/v9/configuring-npm/install).

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
cd next-js-frontend
npm run codegen
```

## Running

Run with:

```shell
sunodo run
```

Run the frontend with:

```shell
npm run dev
```

## Interact with the Application

Interact with the application using the web frontend

The flow of the protocol is as follows:
1. Upload a cartridge RISCV binary through the upload form available on the *Upload* page. This page can be accessed using the navbar. On upload success, you will be redirected to the game page.
> [!IMPORTANT]
> The folder **rnd** has a riscv binary of a "counting game" that can be used.
2. On the game page, download the game cartridge by clicking on *Download Cartridge*. The game cartridges are saved with **game_bin** as their filename.
3. Now, play the game using an instance of the Cartesi Machine. To do it, run the command below replacing the **path_to_downloaded_cartridge** with the actual path in your system. The game generates two files for the gameplay: the gameplay log (**log** file) and the score (**score** file).
```shell
docker run -it --rm -v ${path_to_downloaded_cartridge}/:/binaries sunodo/sdk:0.15.0 sh -c "cd /binaries && chmod +x game_bin && ./game_bin"
```
> [!NOTE]
> Considering that the **game_bin** was saved in the **Downloads** directory, you can run the game as folowing.
```shell
docker run -it --rm -v ~/Downloads/:/binaries sunodo/sdk:0.15.0 sh -c "cd /binaries && chmod +x game_bin && ./game_bin"
```
4. Still on the game page, click on *Submit Log* to send your gameplay to the DApp. After the gameplay verification, your score should appear in the ranking.
