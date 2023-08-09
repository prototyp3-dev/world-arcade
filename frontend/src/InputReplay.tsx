// Copyright 2022 Cartesi Pte. Ltd.

// Licensed under the Apache License, Version 2.0 (the "License"); you may not
// use this file except in compliance with the License. You may obtain a copy
// of the license at http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
// WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
// License for the specific language governing permissions and limitations
// under the License.

import React, { useEffect,useState,useRef } from "react";
import { useRollups } from "./useRollups";
import { Game,GameLog } from "./Helpers";
import { ethers } from "ethers";
import * as sha256 from "fast-sha256";


interface IInputPropos {
    dappAddress: string;
    game: Game;
    gameLog?: GameLog;
    wasmLoaded: boolean;
}

export const InputReplay: React.FC<IInputPropos> = ({dappAddress,game,gameLog,wasmLoaded}) => {
    const rollups = useRollups(dappAddress);
    const utf8EncodeText = new TextEncoder();
    const utf8DecodeText = new TextDecoder();
    const prevGameLog = useRef({ gameLog }).current;
    const scoreFileRef = useRef<HTMLInputElement | null>(null);
    const logFileRef = useRef<HTMLInputElement | null>(null);

    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

    useEffect(() => {
        reset();
        if (gameLog && prevGameLog.gameLog !== gameLog) {
            setLog(utf8DecodeText.decode(gameLog.log));
            setScore(gameLog.score);
            setGameLogToSend(gameLog);
            setSendMessage("");
        }
    }, [gameLog]);

    const addInput = async (str: string) => {
        if (rollups) {
            rollups.inputContract.addInput(rollups.dappContract.address, str)
            .catch(async (e) => {
                console.log(e)
                setSendMessage("Something Happened...");
                await delay(5000);
            }).then(() => {
                setSendMessage("");
                reset();
            });
        }
    };

    const sendGameLog = () => {
        if (game && gameLogToSend && (window as any).encodeReplayChunk && (window as any).encodeReplay) {
            if (gameLogToSend.log.length > maxSizeToSend) {
                setSendMessage("Preparing Replay...");
                const chunks = (window as any).prepareData(ethers.utils.hexlify(gameLogToSend.log),maxSizeToSend);
                for (let c = 0; c < chunks.length; c += 1) {
                    const chunkToSend = chunks[c];
                    setSendMessage("Sending Replay...");
                    addInput((window as any).encodeReplayChunk(game.id,ethers.utils.hexlify(gameLogToSend.resultHash),gameLogToSend.args,ethers.utils.hexlify(gameLogToSend.card),chunkToSend));
                }
            } else {
                setSendMessage("Sending Replay...");
                addInput((window as any).encodeReplay(game.id,ethers.utils.hexlify(gameLogToSend.resultHash),gameLogToSend.args,ethers.utils.hexlify(gameLogToSend.card),ethers.utils.hexlify(gameLogToSend.log)));
            }
        }
    };

    const setGameLog = (l: string) => {
        setLog(l);
        gameLogToSend.log = utf8EncodeText.encode(l);
    };

    const setGameScore = (s: string) => {
        setScore(s);
        gameLogToSend.score = s;
    };

    const handleScoreFileChange = (e: any) => {
        const reader = new FileReader();
        reader.onload = async (readerEvent) => {
            if (readerEvent.target?.result) {
                const s = readerEvent.target?.result.toString();
                setScore(s);
                gameLogToSend.score = s;
                const hasher = new sha256.Hash();
                hasher.update(utf8EncodeText.encode(s));
                gameLogToSend.resultHash = hasher.digest();
            }
        };
        reader.readAsText(e.target.files[0])
    };

    const reset = () => {
        setLog("");
        setScore("");
        setGameLogToSend({args:"",card:utf8EncodeText.encode("")} as GameLog);
        if (scoreFileRef?.current) {scoreFileRef.current.value = "";}
        if (logFileRef?.current) {logFileRef.current.value = "";}
    };

    const handleLogFileChange = (e: any) => {
        const reader = new FileReader();
        reader.onload = async (readerEvent) => {
            if (readerEvent.target?.result) {
                let data: ArrayBuffer;
                if (readerEvent.target?.result instanceof ArrayBuffer) {
                    data = readerEvent.target?.result;
                } else {
                    data = {} as ArrayBuffer;
                }
                const l = readerEvent.target.result;
                setLog(utf8DecodeText.decode(data));
                gameLogToSend.log = (data && new Uint8Array(data)) || undefined;
            }
        };
        reader.readAsArrayBuffer(e.target.files[0])
    };

    const [gameLogToSend, setGameLogToSend] = useState<GameLog>({} as GameLog);
    const [sendMessage, setSendMessage] = useState<string>("");
    const [maxSizeToSend, setMaxSizeToSend] = useState<number>(409600);
    const [log, setLog] = useState<string>("");
    const [score, setScore] = useState<string>("");

    if (!rollups) return <p>Connect wallet to send replays...</p>;

    return (
        <div>
            <h3>Game Log</h3>
            {/* <span>Max chunk size: </span><input
                type="number"
                min="0"
                value={maxSizeToSend}
                onChange={(e) => setMaxSizeToSend(Number(e.target.value))}
            />  */}

            <div>
                <h4>Score</h4>
                <input ref={scoreFileRef} type="file" onChange={handleScoreFileChange} />
                <br />
                <textarea
                    value={score}
                    onChange={(e) => setGameScore(e.target.value)}
                />
                <h4>Log</h4>
                <input ref={logFileRef} type="file" onChange={handleLogFileChange} />
                <br />
                <textarea
                    value={log}
                    onChange={(e) => setGameLog(e.target.value)}
                />
            </div>
            <br />
            <div>
                <button onClick={reset}>
                    Reset
                </button>
                <button onClick={sendGameLog} disabled={!(rollups && gameLogToSend?.log && gameLogToSend?.score && gameLogToSend?.resultHash && game?.id && wasmLoaded)}>
                    Send
                </button>
                {!wasmLoaded && <span> [Load wasm to Encode Input]</span> }
                {(sendMessage !== "") && <span> {sendMessage}</span> }
                <br /><br />
            </div>
        </div>
    );
};
