import { useConnectWallet } from "@web3-onboard/react";
import { useState } from "react";
import { Form, Button, Spinner } from "react-bootstrap";
import { ethers } from "ethers";
import { GoLog } from "react-icons/go";
import { GiFinishLine } from "react-icons/gi";
import * as sha256 from "fast-sha256";
import { IInputBox__factory } from "@cartesi/rollups";
import { envClient } from "@/utils/clientEnv";


export interface GameLog {
    log: Uint8Array;
    outCard: string;
    outCardHash: Uint8Array;
    args: string;
    inCard: Uint8Array;
};

enum FormStatus {
    Ready,
    Sending
}

export default function LogForm({game_id, log_sent}:{game_id:string, log_sent:Function}) {
    const utf8EncodeText = new TextEncoder();
    const [{ wallet }] = useConnectWallet();
    const [ gameplay, setGameplay ] = useState<GameLog>({args:"", inCard:utf8EncodeText.encode("")} as GameLog);
    const [ disableSubmit, setDisableSubmit ] = useState(true);
    const [ formStatus, setFormStatus] = useState(FormStatus.Ready);

    async function submit_log() {
        if (!wallet) {
            alert("Connect first to upload a gameplay log.");
            return;
        }

        const maxSizeToSend = envClient.NEXT_PUBLIC_MAX_SIZE_TO_SEND;

        const signer = new ethers.providers.Web3Provider(wallet.provider, 'any').getSigner();
        const inputContract = new ethers.Contract(envClient.NEXT_PUBLIC_INPUT_BOX_ADDR, IInputBox__factory.abi, signer);
        let input;
        let receipt;

        setFormStatus(FormStatus.Sending);
        try {
            if (gameplay.log.length > maxSizeToSend) {
                const chunks = (window as any).prepareData(ethers.utils.hexlify(gameplay.log), maxSizeToSend);

                for (let c = 0; c < chunks.length; c += 1) {
                    const chunkToSend = chunks[c];

                    input = await inputContract.addInput(envClient.NEXT_PUBLIC_DAPP_ADDR, (window as any).encodeReplayChunk(
                        game_id,
                        ethers.utils.hexlify(gameplay.outCardHash),
                        gameplay.args,
                        ethers.utils.hexlify(gameplay.inCard),
                        chunkToSend
                    ));

                    receipt = await input.wait();
                }
            } else {
                input = await inputContract.addInput(envClient.NEXT_PUBLIC_DAPP_ADDR, (window as any).encodeReplay(
                    game_id,
                    ethers.utils.hexlify(gameplay.outCardHash),
                    gameplay.args,
                    ethers.utils.hexlify(gameplay.inCard),
                    ethers.utils.hexlify(gameplay.log)
                ));

                receipt = await input.wait();
            }

            console.log("Log Sent!");
            log_sent(Number(receipt.events[0].args[1]._hex));
        } catch (error) {
            setFormStatus(FormStatus.Ready);
            alert((error as Error).message);
        }
    }

    function handleGameplayFileChange(e:React.ChangeEvent<HTMLInputElement>) {
        if (!e.target.files || e.target.files.length == 0) {
            return;
        }

        let file = e.target.files[0];

        const reader = new FileReader();
        reader.onload = async (readerEvent) => {
            if (readerEvent.target?.result) {
                let data: ArrayBuffer;
                if (readerEvent.target?.result instanceof ArrayBuffer) {
                    data = readerEvent.target?.result;
                } else {
                    data = {} as ArrayBuffer;
                }

                gameplay.log = (data && new Uint8Array(data)) || undefined;

                checkDisableSubmit();
            }
        };
        reader.readAsArrayBuffer(file)
    };

    function handleScoreFileChange(e:React.ChangeEvent<HTMLInputElement>) {
        if (!e.target.files || e.target.files.length == 0) {
            return;
        }

        let file = e.target.files[0];

        const reader = new FileReader();
        reader.onload = async (readerEvent) => {
            if (readerEvent.target?.result) {
                const s = readerEvent.target?.result.toString();
                gameplay.outCard = s;
                const hasher = new sha256.Hash();
                hasher.update(utf8EncodeText.encode(s));
                gameplay.outCardHash = hasher.digest();

                checkDisableSubmit();
            }
        };
        reader.readAsText(file)
    };

    function checkDisableSubmit() {
        if (gameplay.log && gameplay.outCard && gameplay.outCardHash) {
            setDisableSubmit(false);
        } else {
            setDisableSubmit(true);
        }
    }

    if (formStatus != FormStatus.Ready) {
        return (
            <div className="text-center">
                <Spinner className="my-2" animation="border" variant="light">
                    <span className="visually-hidden">Loading...</span>
                </Spinner>
            </div>
        );
    }

    return (
        <Form>
            <Form.Group controlId="formFile" className="mb-3">
                <Form.Label>Gameplay Log<span className="ms-1"><GoLog/></span></Form.Label>
                <Form.Control title="Log generated for a gameplay" type="file" accept=".rivlog" onChange={handleGameplayFileChange} />
            </Form.Group>

            <Form.Group controlId="formFile" className="mb-3">
                <Form.Label>Score<span className="ms-1"><GiFinishLine/></span></Form.Label>
                <Form.Control  title="Score for the selected gameplay" type="file" accept=".outcard" onChange={handleScoreFileChange} />
            </Form.Group>

            <Button className="float-end mb-3" variant="outline-light" onClick={submit_log} disabled={disableSubmit}>
                Submit
            </Button>
        </Form>
    );
}