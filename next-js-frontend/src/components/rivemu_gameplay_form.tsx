import { useConnectWallet } from "@web3-onboard/react";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { Button, Spinner } from "react-bootstrap";
import { ethers } from "ethers";
import * as sha256 from "fast-sha256";
import { IInputBox__factory } from "@cartesi/rollups";
import { GameLog } from "./log_form";
import useDownloader from "react-use-downloader";
import JSZip from "jszip";


enum SubmitStatus {
    Ready,
    Sending,
    Sent
}

function prepare_game_log(rivlog: Uint8Array, outcard: string) {
    const utf8EncodeText = new TextEncoder();
    let wasmRivemuLog = {args:"", inCard: utf8EncodeText.encode("")} as GameLog;

    wasmRivemuLog.log = rivlog;

    wasmRivemuLog.outCard = outcard;
    const hasher = new sha256.Hash();
    hasher.update(utf8EncodeText.encode(outcard));
    wasmRivemuLog.outCardHash = hasher.digest();

    return wasmRivemuLog;
}

export default function RivEmuLogForm({game_id, rivlog, outcard, log_sent, showModal}:
    {game_id:string, rivlog:Uint8Array, outcard:string, log_sent:Function, showModal:Function}) {
    const [{ wallet }, connect] = useConnectWallet();
    const [ submitStatus, setSubmitStatus] = useState(SubmitStatus.Ready);
    const { download, isInProgress } = useDownloader();


    async function submit() {
        if (!wallet) {
            alert("Connect first to upload a gameplay log.");
            showModal(false);
            await connect();
            showModal(true);
            return;
        }

        if (!process.env.NEXT_PUBLIC_INPUT_BOX_ADDR) {
            console.log("Input BOX addr not defined");
            return;
        }

        if (!process.env.NEXT_PUBLIC_MAX_SIZE_TO_SEND) {
            console.log("MAX SIZE TO SEND not defined.");
            return;
        }

        const gamelog = prepare_game_log(rivlog, outcard);

        const maxSizeToSend = parseInt(process.env.NEXT_PUBLIC_MAX_SIZE_TO_SEND);
        const signer = new ethers.providers.Web3Provider(wallet.provider, 'any').getSigner();
        const inputContract = new ethers.Contract(process.env.NEXT_PUBLIC_INPUT_BOX_ADDR, IInputBox__factory.abi, signer);
        let input;
        let receipt;

        try {
            setSubmitStatus(SubmitStatus.Sending);
            if (gamelog.log.length > maxSizeToSend) {
                const chunks = (window as any).prepareData(ethers.utils.hexlify(gamelog.log), maxSizeToSend);

                for (let c = 0; c < chunks.length; c += 1) {
                    const chunkToSend = chunks[c];

                    input = await inputContract.addInput(process.env.NEXT_PUBLIC_DAPP_ADDR, (window as any).encodeReplayChunk(
                        game_id,
                        ethers.utils.hexlify(gamelog.outCardHash),
                        gamelog.args,
                        ethers.utils.hexlify(gamelog.inCard),
                        chunkToSend
                    ));

                    receipt = await input.wait();
                }
            } else {
                input = await inputContract.addInput(process.env.NEXT_PUBLIC_DAPP_ADDR, (window as any).encodeReplay(
                    game_id,
                    ethers.utils.hexlify(gamelog.outCardHash),
                    gamelog.args,
                    ethers.utils.hexlify(gamelog.inCard),
                    ethers.utils.hexlify(gamelog.log)
                ));

                receipt = await input.wait();
            }

            await log_sent(Number(receipt.events[0].args[1]._hex));
            setSubmitStatus(SubmitStatus.Sent);
        } catch (error) {
            setSubmitStatus(SubmitStatus.Ready);
            alert((error as Error).message);
        }
    }

    async function download_gamelog() {
        const zip = new JSZip();
        zip.file("gameplay.rivlog", rivlog, {binary: true});
        zip.file("score.outcard", outcard);
        zip.generateAsync({type:"blob"}).then(function(content) {
            const blobFile = new Blob([content],{type:'application/octet-stream'})
            const file = new File([blobFile], "gameplay.zip");

            const urlObj = URL.createObjectURL(file);
            download(urlObj, "gameplay.zip");
        });
    }


    return (
        <div className="d-flex justify-content-center">
            {
                isInProgress
                ?
                    <div>
                        <Spinner className="my-2" animation="border" variant="light">
                            <span className="visually-hidden">Loading...</span>
                        </Spinner>
                    </div>
                :
                    <Button variant="outline-light" className="me-4" onClick={download_gamelog}>Download</Button>
            }

            {
                submitStatus as SubmitStatus == SubmitStatus.Sending
                ?
                    <div>
                        <Spinner className="my-2" animation="border" variant="light">
                            <span className="visually-hidden">Loading...</span>
                        </Spinner>
                    </div>
                :
                    <Button variant="outline-light" onClick={submit} disabled={submitStatus as SubmitStatus == SubmitStatus.Sent}>
                        {submitStatus as SubmitStatus == SubmitStatus.Sent? "Validated":"Submit"}
                    </Button>
            }

        </div>
    );
}