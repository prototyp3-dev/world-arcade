// Copyright 2022 Cartesi Pte. Ltd.

// Licensed under the Apache License, Version 2.0 (the "License"); you may not
// use this file except in compliance with the License. You may obtain a copy
// of the license at http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
// WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
// License for the specific language governing permissions and limitations
// under the License.

// import React, { useRef,useState } from "react";

import { Game,GameLog } from "./Helpers";
import * as sha256 from "fast-sha256";



interface IInputPropos {
    onGameFinish?: (value: GameLog) => void;
    game: Game;
}

export const Gameplay: React.FC<IInputPropos> = ({game,onGameFinish}) => {

    const utf8EncodeText = new TextEncoder();
    const playGame = () => {
        const score = "291633,708367";
        // const resultHash = createHash('sha256').update(score).digest('hex');
        // const resultHash = CryptoJS.SHA256(score).toString(CryptoJS.enc.Hex)
        const hasher = new sha256.Hash();
        hasher.update(utf8EncodeText.encode(score));
        const resultHash = hasher.digest();
        onGameFinish && onGameFinish({log:utf8EncodeText.encode("7,7708367d"),score: score,resultHash:resultHash,args:"",card:utf8EncodeText.encode("")});
    }

    return (
        <div>
            {/* <h3>Game</h3> */}
            <div>
                <button onClick={() => playGame()} disabled={!(game?.cartridge)}>
                    Play
                </button>
            </div>
        </div>
    );
};
