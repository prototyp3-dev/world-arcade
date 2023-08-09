// Copyright 2022 Cartesi Pte. Ltd.

// Licensed under the Apache License, Version 2.0 (the "License"); you may not
// use this file except in compliance with the License. You may obtain a copy
// of the license at http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
// WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
// License for the specific language governing permissions and limitations
// under the License.

import React, { useEffect,useRef,useState } from "react";
import { useRollups } from "./useRollups";
import { Game } from "./Helpers";
import { ethers } from "ethers";

interface IInputPropos {
    dappAddress: string;
    game: Game;
    wasmLoaded: boolean;
    cardChanged?: boolean;
    onChangeGameCartridge?: (value: Game) => void;
}

export const InputCartridge: React.FC<IInputPropos> = ({dappAddress,game,onChangeGameCartridge,wasmLoaded,cardChanged}) => {
    const rollups = useRollups(dappAddress);
    const fileRef = useRef<HTMLInputElement | null>(null);
    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
    const prevGame = useRef({ game }).current;

    useEffect(() => {
        if (prevGame.game !== game) {
            setGameNameVar(game?.name || "");
            setSendCartridgeMessage("");
        }
    }, [game]);

    useEffect(() => {
        setGameNameVar(game?.name || "");
        setSendCartridgeMessage("");
    }, [wasmLoaded]);

    const addInput = async (str: string, callback: () => void = ()=>{}) => {
        if (rollups) {
            rollups.inputContract.addInput(rollups.dappContract.address, str)
                .then(() => {
                    callback();
                })
                .catch(async (e) => {
                    console.log(e)
                    setSendCartridgeMessage("Something Happened...");
                    await delay(5000);
                    setSendCartridgeMessage("");
            });
        }
    };

    const sendGameCartridge = async () => {
        if (game.cartridge) {
            if (game.cartridge.length > maxSizeToSend) {
                setSendCartridgeMessage("Preparing Cartridge...");
                await delay(1);
                const chunks = (window as any).prepareData(ethers.utils.hexlify(game.cartridge),maxSizeToSend);
                setSendCartridgeMessage("Sending Cartridge...");
                for (let c = 0; c < chunks.length; c += 1) {
                    const chunkToSend = chunks[c];
                    await addInput((window as any).encodeAddCartridgeChunk(gameName,chunkToSend),clearSendGameCartridge);
                }
            } else {
                setSendCartridgeMessage("Sending Cartridge...");
                await addInput((window as any).encodeAddCartridge(gameName,ethers.utils.hexlify(game.cartridge)),clearSendGameCartridge);
            }
        }
    };
    
    const sendEditCartridge = async () => {
        if (game.id && game.card) {
            if (game.card.length > maxSizeToSend) {
                setSendCartridgeMessage("Preparing Cartridge Card...");
                await delay(1);
                const chunks = (window as any).prepareData(ethers.utils.hexlify(game.card),maxSizeToSend);
                setSendCartridgeMessage("Sending Cartridge Card...");
                for (let c = 0; c < chunks.length; c += 1) {
                    const chunkToSend = chunks[c];
                    await addInput((window as any).encodeEditCartridgeChunk(game.id,chunkToSend),clearSendGameCartridge);
                }
            } else {
                setSendCartridgeMessage("Sending Cartridge Card...");
                await addInput((window as any).encodeEditCartridge(game.id,ethers.utils.hexlify(game.card)),clearSendGameCartridge);
            }
        }
    };
    
    const clearSendGameCartridge = async () => {
        setSendCartridgeMessage("");
    };

    const removeCartridge = async () => {
        if (game && (window as any).encodeRemoveCartridge) {
            setSendCartridgeMessage("Removing Cartridge...");
            await addInput((window as any).encodeRemoveCartridge(game.id),() => {
                onChangeGameCartridge && onChangeGameCartridge({} as Game);
                clearSendGameCartridge();
            });
        }
    };

    const setGameName = (name: string) => {
        setGameNameVar(name);
        if (game){
            game.name = gameName;
        }
    };

    const [sendCartridgeMessage, setSendCartridgeMessage] = useState<string>("");
    const [gameName, setGameNameVar] = useState<string>("");
    const [maxSizeToSend, setMaxSizeToSend] = useState<number>(409600);

    if (!rollups) return <p>Connect wallet to manage cartridge...</p>;

    return (
        <div>
            {/* <span>Max chunk size: </span><input
                type="number"
                min="0"
                value={maxSizeToSend}
                onChange={(e) => setMaxSizeToSend(Number(e.target.value))}
            />  */}
            <div>
                <h3>Game Cartridge</h3>
                Name <input type="text" value={gameName} onChange={(e) => setGameName(e.target.value)} disabled={!game?.uploaded} />
                <br />
                Id <input type="text" value={game?.id || ""} disabled={true} />
                {/* <textarea value={game?.cartridge} disabled={true} onChange={() => setGameName(game.name)} /> */}
                <br />
                <br />
                <button onClick={() => removeCartridge()} disabled={!(!game?.uploaded && game?.id && sendCartridgeMessage === "" && wasmLoaded)}>
                    Remove Cartridge
                </button>
                <button onClick={() => sendEditCartridge()} disabled={!(!game?.uploaded && game?.id && cardChanged && sendCartridgeMessage === "" && wasmLoaded)}>
                    Edit Cartridge Card 
                </button>
                <button onClick={() => sendGameCartridge()} disabled={!(gameName !== "" && game?.uploaded && game?.cartridge && sendCartridgeMessage === "" && wasmLoaded)}>
                    Send Cartridge
                </button>
                {!(wasmLoaded) && <span> [Load wasm to Encode Inputs]</span> }
                {(!game?.uploaded && game?.id) && <span> [Game from library]</span> }
                {(sendCartridgeMessage !== "") && <span> {sendCartridgeMessage}</span> }
            </div>

        </div>
    );
};
