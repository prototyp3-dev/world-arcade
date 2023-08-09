// Copyright 2022 Cartesi Pte. Ltd.

// Licensed under the Apache License, Version 2.0 (the "License"); you may not
// use this file except in compliance with the License. You may obtain a copy
// of the license at http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
// WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
// License for the specific language governing permissions and limitations
// under the License.

import { ethers } from "ethers";
import React from "react";
import { useNoticesQuery } from "./generated/graphql";

type Notice = {
    // id: string;
    // index: number;
    // input: any, //{index: number; epoch: {index: number; }
    // payload: string;
    game?: string;
    player?: string;
    timestamp?: number;
    scores?: any;
    finished?: boolean;
};

interface IPropos {
    wasmLoaded: boolean;
}

export const Notices: React.FC<IPropos> = ({wasmLoaded}) => {
    const [result,reexecuteQuery] = useNoticesQuery();
    const { data, fetching, error } = result;

    if (!wasmLoaded) return <p>Load wasm to decode Notice...</p>;
    if (fetching) return <p>Loading...</p>;
    if (error) return <p>Oh no... {error.message}</p>;

    if (!data || !data.notices) return <p>No scores</p>;

    const notices: Notice[] = data.notices.edges.map((node: any) => {
        const n = node.node;
        const notice = {} as Notice;
        let inputPayload = n?.input.payload;
        if (inputPayload) {
            try {
                inputPayload = ethers.utils.toUtf8String(inputPayload);
            } catch (e) {
                inputPayload = inputPayload + " (hex)";
            }
        } else {
            inputPayload = "(empty)";
        }
        let payload = n?.payload;
        if (payload) {
            // payload = payload + " (hex)";
            if (wasmLoaded) {
                try {
                    const noticeData = (window as any).decodeScoreNotice(payload).split(",");
                    notice.game = noticeData[0];
                    notice.player = noticeData[1];
                    notice.timestamp = Number(noticeData[2]);
                    notice.finished = Boolean(noticeData[3]);
                    //notice.card = noticeData[4];
                    const scores = new Array<number>();
                    for (let i = 5; i<noticeData.length; i++) {
                        scores.push(Number( noticeData[i]));
                    }
                    notice.scores = scores;
                }  catch (e) {
                    console.log(e);
                }
            }
        } else {
            payload = "(empty)";
        }
        return notice;
    }).sort((b: any, a: any) => {
        return b.scores[0] - a.scores[0];
    });

    // const forceUpdate = useForceUpdate();
    return (
        <div>
            <button onClick={() => reexecuteQuery({ requestPolicy: 'network-only' })}>
                Reload
            </button>
            <table>
                <thead>
                    <tr>
                        <th>Player</th>
                        <th>Game</th>
                        <th>Timestamp</th>
                        <th>Finished</th>
                        <th>Scores</th>
                        {/* <th>Input Payload</th> */}
                        {/* <th>Payload</th> */}
                    </tr>
                </thead>
                <tbody>
                    {notices.length === 0 && (
                        <tr>
                            <td colSpan={4}>no notices</td>
                        </tr>
                    )}
                    {notices.map((n: any) => (
                        <tr key={`${n.player}-${n.game}-${n.timestamp}`}>
                            {/* <td>{n.input.index}</td>
                            <td>{n.index}</td>
                            <td>{n.input.payload}</td>
                            <td>{n.payload}</td> */}
                            <td>{n.player}</td>
                            <td>{n.game}</td>
                            <td>{n.timestamp}</td>
                            <td>{`${n.finished}`}</td>
                            <td>{n.scores?.join(',')}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

        </div>
    );
};
