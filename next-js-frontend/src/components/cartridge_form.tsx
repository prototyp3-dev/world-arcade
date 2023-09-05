import { useState } from "react";
import { Stack, Form, Row, Col, FloatingLabel, Button, Spinner, Badge } from "react-bootstrap";
import { GiDisc, GiLoad } from "react-icons/gi";
import { IoWarning } from "react-icons/io5";
import { ethers } from "ethers";
import { IInputBox__factory, IInputBox } from "@cartesi/rollups";
import { useRouter } from "next/router";
import Image from 'react-bootstrap/Image';
import { useConnectWallet } from "@web3-onboard/react";
import { getInputReportsAndNotices } from "@/graphql/inputs";


enum PageStatus {
    Ready,
    UploadCartridge,
    Finish
}

function sleep(ms:number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function additional_tx_warning() {
    return (
        <div className="text-warning">
            <span style={{fontSize:18}}><IoWarning/></span>
            <span style={{fontSize:12}}> Adding this info will require an additional transaction.</span>
        </div>
    );
}

async function handle_file_input(e:React.ChangeEvent<HTMLInputElement>, callback:Function) {
    if (!e.target.files || e.target.files.length == 0) {
        return;
    }

    let file = e.target.files[0];

    const reader = new FileReader();
    reader.onload = async (readerEvent) => {
        let data: ArrayBuffer;
        if (readerEvent.target?.result instanceof ArrayBuffer) {
            data = readerEvent.target?.result;
        } else {
            data = {} as ArrayBuffer;
        }
        if (data) {
            callback(new Uint8Array(data));
        }
    };

    reader.readAsArrayBuffer(file);
}

async function addCartridge(inputContract:ethers.Contract, cartridge:Uint8Array, setChunk:Function) {
    if (!process.env.NEXT_PUBLIC_MAX_SIZE_TO_SEND) {
        console.log("MAX SIZE TO SEND not defined.");
        return;
    }

    const maxSizeToSend = parseInt(process.env.NEXT_PUBLIC_MAX_SIZE_TO_SEND);
    let input;

    const id = (window as any).generateCartridgeId(cartridge)
    if (cartridge.length > maxSizeToSend) {
        const chunks = (window as any).prepareData(ethers.utils.hexlify(cartridge), maxSizeToSend);
        for (let c = 0; c < chunks.length; c += 1) {
            const chunkToSend = chunks[c];
            setChunk([c+1, chunks.length]);
            input = await inputContract.addInput(process.env.NEXT_PUBLIC_DAPP_ADDR,
                (window as any).encodeAddCartridgeChunk(id, chunkToSend));
            await input.wait();
        }
    } else {
        setChunk([1,1]);
        input = await inputContract.addInput(process.env.NEXT_PUBLIC_DAPP_ADDR,
            (window as any).encodeAddCartridge(id, ethers.utils.hexlify(cartridge)));
    }

    const receipt = await input.wait();
    return receipt;
}

async function check_upload_report(input_index:number) {
    if (!process.env.NEXT_PUBLIC_GRAPHQL_URL) throw new Error("Undefined graphql url.");

    const result = await getInputReportsAndNotices(process.env.NEXT_PUBLIC_GRAPHQL_URL, input_index);

    if (result.reports.length == 0) {
        throw new Error(`Upload Failed! Report not found for input ${input_index}`);
    }

    const payload_utf8 = ethers.utils.toUtf8String(result.reports[0].payload);
    const payload_json = JSON.parse(payload_utf8);

    if (payload_json.status == "STATUS_SUCCESS") {
        const game_id = payload_json.hash;
        return game_id;
    } else {
        throw new Error(`Upload Failed! ${payload_json}`);
    }
}

export default function CartridgeForm() {
    const router = useRouter();
    const [{ wallet }] = useConnectWallet();
    const [cartridge, setCartridge] = useState<Uint8Array|null>(null);

    // used for feedback when uploading a cartridge
    const [chunksCartridge, setChunksCartridge] = useState<number[]>([0, 0]);

    // Page Status
    const [pageStatus, setPageStatus] = useState(PageStatus.Ready);

    function handle_cartridge(e:React.ChangeEvent<HTMLInputElement>) {
        handle_file_input(e, setCartridge);
    }

    async function upload() {
        if (!cartridge) {
            alert("Cartridge field is mandatory!");
            return;
        }

        if (!wallet) throw new Error("Connect first to upload a cartridge.");

        if (!process.env.NEXT_PUBLIC_INPUT_BOX_ADDR) {
            console.log("Input BOX addr not defined.");
            return;
        }

        if (!process.env.NEXT_PUBLIC_DAPP_ADDR) {
            console.log("DAPP addr not defined.");
            return;
        }

        const signer = new ethers.providers.Web3Provider(wallet.provider, 'any').getSigner();
        const inputContract = new ethers.Contract(process.env.NEXT_PUBLIC_INPUT_BOX_ADDR, IInputBox__factory.abi, signer);

        setPageStatus(PageStatus.UploadCartridge);
        try {
            let receipt = await addCartridge(inputContract, cartridge, setChunksCartridge);

            let game_id = await check_upload_report(Number(receipt.events[0].args[1]._hex));

            await sleep(300);
            router.push(`/cartridge/${game_id}`);
        } catch (error) {
            setPageStatus(PageStatus.Ready);
            alert((error as Error).message);
        }
    }

    if (pageStatus != PageStatus.Ready) {

        return (
            <Row>
                <Col md={{ span: 5, offset: 4 }}>
                    <div className="bg-dark text-center text-light py-3 rounded">
                        <h1>Uploading your Cartridge</h1>
                        <Stack gap={1} className="mb-2">
                            <div className="d-flex justify-content-center">
                                <Spinner className="my-2" animation="border" variant="light"></Spinner>
                            </div>
                        </Stack>

                        <Stack gap={2} direction="horizontal" className="justify-content-center">
                            <Badge bg={pageStatus > PageStatus.UploadCartridge? "success":"warning"}>
                                Cartridge: {`${chunksCartridge[0]} of ${chunksCartridge[1]}`}
                            </Badge>
                        </Stack>
                    </div>
                </Col>
            </Row>
        );

    }


    return (
        <Form className="bg-dark rounded py-3 px-5 text-light">
            <h1 className="text-center mb-4">Setup your Cartridge</h1>

            <Row>
                <Col md="12">
                    <Form.Group controlId="formFile" className="mb-3">
                        <Form.Label>Cartridge File<span className="ms-1"><GiDisc/></span></Form.Label>
                        <Form.Control type="file" onChange={handle_cartridge} />
                    </Form.Group>
                </Col>
            </Row>

            <Row>
                <Col md="12">
                    <Button variant="outline-light" className="text-center" onClick={() => {upload()}}>
                        <span className="me-1"><GiLoad/></span>Upload Cartridge
                    </Button>
                </Col>
            </Row>
        </Form>
    );
}