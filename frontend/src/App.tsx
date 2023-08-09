// Copyright 2022 Cartesi Pte. Ltd.

// Licensed under the Apache License, Version 2.0 (the "License"); you may not
// use this file except in compliance with the License. You may obtain a copy
// of the license at http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
// WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
// License for the specific language governing permissions and limitations
// under the License.

import { FC,useState } from "react";
import injectedModule from "@web3-onboard/injected-wallets";
import { init } from "@web3-onboard/react";

import { GraphQLProvider } from "./GraphQL";
import { Notices } from "./Notices";
import { InputCartridge } from "./InputCartridge";
import { InputReplay } from "./InputReplay";
import { Games } from "./Games";
import { Gameplay } from "./Gameplay";
import { Network } from "./Network";
// import { Vouchers } from "./Vouchers";
import { Reports } from "./Reports";
import { Wasm } from "./Wasm";
import configFile from "./config.json";
import { Game,GameLog } from "./Helpers";

const config: any = configFile;

const injected: any = injectedModule();
init({
    wallets: [injected],
    chains: Object.entries(config.chains).map(([k, v]: [string, any], i) => ({id: k, token: v.token, label: v.label, rpcUrl: v.rpcUrl})),
    appMetadata: {
        name: "Cartesi Rollups Test DApp",
        icon: "<svg><svg/>",
        description: "Demo app for Cartesi Rollups",
        recommendedInjectedWallets: [
            { name: "MetaMask", url: "https://metamask.io" },
        ],
    },
});

const App: FC = () => {
    const [dappAddress, setDappAddress] = useState<string>("0x142105FC8dA71191b3a13C738Ba0cF4BC33325e2");
    const [game, setGame] = useState<Game>({} as Game);
    // const [gameLog, setGameLog] = useState<GameLog>({} as GameLog);
    const [wasmLoaded, setWasmLoaded] = useState<boolean>(false);
    const [reloadGameListToggle, setReloadGameListTolggle] = useState<boolean>(false);
    const [cardChanged, setCardChanged] = useState<boolean>(false);

    return (
        <div>
            <Network />
            <GraphQLProvider>
                <div>
                    Dapp Address: <input
                        type="text"
                        value={dappAddress}
                        onChange={(e) => setDappAddress(e.target.value)}
                    />
                    <br /><br />
                </div>
                <h2>Wasm</h2>
                <Wasm onWasmLoaded={() => {setWasmLoaded(true)}} />
                <h2>Cartridges</h2>
                <Games reloadGameListToggle={reloadGameListToggle} onChangeGameCartridge={setGame} onChangeCard={setCardChanged} />
                <h2>Manage Cartridge</h2>
                <InputCartridge dappAddress={dappAddress} game={game} cardChanged={cardChanged} wasmLoaded={wasmLoaded} onChangeGameCartridge={() => {setReloadGameListTolggle(!reloadGameListToggle);}} />
                <h2>Gameplay</h2>
                {/* <Gameplay game={game} onGameFinish={(log:any) => setGameLog(log)} /> */}
                {/* <InputReplay dappAddress={dappAddress} game={game} gameLog={gameLog} wasmLoaded={wasmLoaded} /> */}
                <InputReplay dappAddress={dappAddress} game={game} wasmLoaded={wasmLoaded} />
                <h2>Scores</h2>
                <Notices wasmLoaded={wasmLoaded} />
                <h2>Reports</h2>
                <Reports />
            </GraphQLProvider>
        </div>
    );
};

export default App;
