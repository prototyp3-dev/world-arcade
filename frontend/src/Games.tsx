// Copyright 2022 Cartesi Pte. Ltd.

// Licensed under the Apache License, Version 2.0 (the "License"); you may not
// use this file except in compliance with the License. You may obtain a copy
// of the license at http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
// WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
// License for the specific language governing permissions and limitations
// under the License.

import React, { useEffect,useRef,useState,useCallback } from "react";
import { ethers } from "ethers";
import Select from "react-select";
// import { useRollups } from "./useRollups";
import { Game } from "./Helpers";

import configFile from "./config.json";

const config: any = configFile;

interface Option {
    label: string;
    value: string;
    card?: Uint8Array;
}

interface IProps {
    reloadGameListToggle: boolean;
    onChangeGameCartridge?: (value: Game) => void;
    onChangeCard?: (value: boolean) => void;
}

export const Games: React.FC<IProps> = ({onChangeGameCartridge,reloadGameListToggle,onChangeCard}) => {
    // const rollups = useRollups();
    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
    const fileRef = useRef<HTMLInputElement | null>(null);
    const cardFileRef = useRef<HTMLInputElement | null>(null);
    const inspectCall = async (str: string, callback: (data: any) => void ) => {
        const payload = str;

        let apiURL= ""

        if(config.inspectAPIURL) {
            apiURL = `${config.inspectAPIURL}/inspect`;
        } else {
            console.error(`No inspect interface defined`);
            return;
        }

        fetch(`${apiURL}/${payload}`)
            .then(response => response.json())
            .then(data => {
                if (data.reports.length > 0) {

                    let allData = "0x";
                    for (let i = 0; i < data.reports.length; i++) {
                        allData = allData.concat(data.reports[i].payload.substring(2));
                    }
                    callback(ethers.utils.arrayify(allData));
                }
            });
    };

    const resetSelection = useCallback(() => {
        setSelectedGame(null);
        setPreview(null);
        setCartridgeCard("");
        onChangeCard && onChangeCard(false);
    },[onChangeCard]);

    const doInspectGameList = useCallback(() => {
        const setGameListData = (data: any) => {
            const reports = JSON.parse(ethers.utils.toUtf8String(ethers.utils.hexlify(data)));
            let options: Option[] = [];
            for (let i = 0; i < reports.length; i++) {
                const op: Option = {label: reports[i].name, value: reports[i].id, card: Uint8Array.from(atob(reports[i].card), c => c.charCodeAt(0))};
                options.push(op);            
            }
            setGameList(options);
            resetSelection();
        }
            inspectCall("cartridges",setGameListData);
    },[resetSelection])

    const doInspectGameCartridge = () => {
        setGetGameCartridgeMessage("Getting Game Cartridge");
        inspectCall(`cartridges/${gameId}`,setGameCartridge);
    }

    const setGameCartridge = async (data: any) => {
        setGetGameCartridgeMessage("Got Game Cartridge");
        setGame({cartridge:data,id:gameId,name:gameName, uploaded:false});
        await delay(5000);
        setGetGameCartridgeMessage("");
    }

    const handleFileChange = (e: any) => {
        const reader = new FileReader();
        reader.onload = async (readerEvent) => {
            let data: ArrayBuffer;
            if (readerEvent.target?.result instanceof ArrayBuffer) {
                data = readerEvent.target?.result;
            } else {
                data = {} as ArrayBuffer;
            }
            if (data) {
                setGame({cartridge:new Uint8Array(data), uploaded:true});
                setGetGameCartridgeMessage("Got Game Cartridge From file");
                e.target.value = null;
                await delay(5000);
                setGetGameCartridgeMessage("");
            }
        };
        reader.readAsArrayBuffer(e.target.files[0])
    };

    const handleCardFileInput = (cardFile: File|null) => {
        // setCartridgeCard(cardFileUrl||"");

        let reader = new FileReader();

        if (cardFile) {
            reader.onload = function(readerEvent) {
                let data: ArrayBuffer;
                if (readerEvent.target?.result instanceof ArrayBuffer) {
                    data = readerEvent.target?.result;
                } else {
                    data = {} as ArrayBuffer;
                }
                const card = (data && new Uint8Array(data)) || undefined;
                setCard(card,true);
            }
        
            reader.readAsArrayBuffer(cardFile);
        } else {
            setCard(undefined,true);
        }
    };

    const readFile = () => {
        resetSelection();
        fileRef.current?.click();
    };

    const setCard = (card: Uint8Array|undefined, setGameObj = false) => {
        if (card && card.length > 0) {
            const date = new Date();
            let blobFile = new Blob([card||new Uint8Array()],{type:'image/png'})
            var file = new File([blobFile], `${date.getMilliseconds()}`);
            const cardFileUrl = URL.createObjectURL(file);
            setPreview(cardFileUrl);
        } else {
            setPreview(null);
        }
        if (setGameObj){
            if (card !== currGame.card) {
                onChangeCard && onChangeCard(true);
            }
            currGame.card = card;
            setGame(currGame);
        }
    };

    const readCardFile = () => {
        cardFileRef.current?.click();
    };

    const setSelectedGameVars = (e:Option) => {
        setGameId((e && e.value) || "");
        setGameName((e && e.label) || ""); 
        setSelectedGame(e);
        setCard(e.card);
        setGame({id:e.value,name:e.label,uploaded:false,card:e.card});
    };

    const [currGame, setGame] = useState<Game>({} as Game);
    const [gameId, setGameId] = useState<string>("");
    const [gameName, setGameName] = useState<string>("");
    const [gameList, setGameList] = useState<Option[]>();
    const [getGameCartridgeMessage, setGetGameCartridgeMessage] = useState<string>("");
    const [selectedGame, setSelectedGame] = useState<Option|null>();
    const [cartridgeCard, setCartridgeCard] = useState<string>("");
    const [preview, setPreview] = useState<string | null>(null);

    const prevGame = useRef({ currGame }).current;
    const prevRoloadToggle = useRef({ reloadGameListToggle }).current;

    useEffect(() => {
        if (prevGame.currGame !== currGame) {
            onChangeGameCartridge && onChangeGameCartridge(currGame);
        }
    }, [currGame,onChangeGameCartridge,prevGame]);

    useEffect(() => {
        if (prevRoloadToggle.reloadGameListToggle !== reloadGameListToggle){
            doInspectGameList();
        }
    }, [reloadGameListToggle,prevRoloadToggle,doInspectGameList]);

    return (
        <div>
            <div>
            </div>
            <div>
                <button onClick={() => readFile()}>
                    Upload New Cartridge
                </button>
                <input type="file" ref={fileRef} onChange={handleFileChange} style={{ display: 'none' }}/>
                <h4>DApp Cartridges</h4>
                {/* <input
                    type="text"
                    disabled={true}
                    value={gameId}
                    onChange={(e) => setGameId(e.target.value)}
                /> */}
                <button onClick={() => doInspectGameList()}>
                    Get List
                </button>
                <br />
                <br />
                <div style={{ width: '200px' }}>
                    <Select options={gameList} value={selectedGame} onChange={(e:any) => setSelectedGameVars(e)} />
                </div>
                <div onClick={() => readCardFile()} style={{width:'200px',height:"200px", border: "1px solid rgba(0, 0, 0, 0.05)"}} >
                    {preview ? <img src={preview} width={200} height={200} alt='Card' /> : ''}
                    <input type="file" value={cartridgeCard} ref={cardFileRef} onChange={(e) => handleCardFileInput(e.target.files && e.target.files[0])} style={{ display: 'none' }}/>
                </div>
                <button onClick={() => doInspectGameCartridge()} disabled={gameId === ""}>
                    Load Cartridge from DApp
                </button> <br /> <br />
                <br />
                {getGameCartridgeMessage}
            </div>
        </div>
    );
};
