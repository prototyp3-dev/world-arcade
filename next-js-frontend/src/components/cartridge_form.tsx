import { useState } from "react";
import { Stack, Form, Row, Col, FloatingLabel, Button, Spinner, Badge } from "react-bootstrap";
import { GiDisc, GiLoad } from "react-icons/gi";
import { IoWarning } from "react-icons/io5";
import { ethers } from "ethers";
import { IInputBox__factory } from "@cartesi/rollups";
import { WalletState } from "@web3-onboard/core";
import { useRouter } from "next/router";
import Image from 'react-bootstrap/Image';
import { getReport } from "@/graphql/reports";


enum PageStatus {
    Ready,
    UploadCartridge,
    UploadEdit, // CoverImage upload
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

async function addInput(wallet:WalletState|null, id:string, data:Uint8Array, setChunk:Function, encodeChunk:Function, encode:Function) {
    if (!wallet) throw new Error("Connect first to upload a cartridge.");

    if (!process.env.NEXT_PUBLIC_INPUT_BOX_ADDR) {
        console.log("Input BOX addr not defined.");
        return;
    }

    if (!process.env.NEXT_PUBLIC_MAX_SIZE_TO_SEND) {
        console.log("MAX SIZE TO SEND not defined.");
        return;
    }

    const maxSizeToSend = parseInt(process.env.NEXT_PUBLIC_MAX_SIZE_TO_SEND);

    const signer = new ethers.providers.Web3Provider(wallet.provider, 'any').getSigner();
    const inputContract = new ethers.Contract(process.env.NEXT_PUBLIC_INPUT_BOX_ADDR, IInputBox__factory.abi, signer);
    let input;

    if (data.length > maxSizeToSend) {
        const chunks = (window as any).prepareData(ethers.utils.hexlify(data), maxSizeToSend);
        for (let c = 0; c < chunks.length; c += 1) {
            const chunkToSend = chunks[c];
            setChunk([c+1, chunks.length]);
            input = await inputContract.addInput(process.env.NEXT_PUBLIC_DAPP_ADDR, encodeChunk(id, chunkToSend));
            await input.wait();
        }
    } else {
        setChunk([1,1]);
        input = await inputContract.addInput(process.env.NEXT_PUBLIC_DAPP_ADDR, encode(id, ethers.utils.hexlify(data)));
    }

    const receipt = await input.wait();
    return receipt;
}

async function check_upload_report(input_index:number) {
    if (!process.env.NEXT_PUBLIC_GRAPHQL_URL) throw new Error("Undefined graphql url.");

    const report = await getReport(process.env.NEXT_PUBLIC_GRAPHQL_URL, input_index);

    const payload_utf8 = ethers.utils.toUtf8String(report.payload);
    const payload_json = JSON.parse(payload_utf8);

    if (payload_json.status == "STATUS_SUCCESS") {
        const game_id = payload_json.hash;
        return game_id;
    } else {
        throw new Error(`Upload Failed! ${payload_json}`);
    }
}

export default function CartridgeForm({wallet}: {wallet:WalletState|null}) {
    const router = useRouter();
    const [cartridgeTitle, setCartridgeTitle] = useState<string|null>(null);
    // const [cartridgeDescription, setCartridgeDescription] = useState<string|null>(null);
    const [cartridge, setCartridge] = useState<Uint8Array|null>(null);
    const [coverImage, setCoverImage] = useState<Uint8Array|null>(null);
    const [coverImagePreview, setCoverImagePreview] = useState<any|null>(null);

    // used for feedback when uploading a cartridge and/or coverImage
    const [chunksCartridge, setChunksCartridge] = useState<number[]>([0, 0]);
    const [chunksCoverImage, setChunksCoverImage] = useState<number[]>([0, 0]);

    // Page Status
    const [pageStatus, setPageStatus] = useState(PageStatus.Ready);

    function handle_cartridge_title(e:React.ChangeEvent<HTMLInputElement>) {
        setCartridgeTitle(e.target.value);
    }

    // function handle_cartridge_description(e:React.ChangeEvent<HTMLInputElement>) {
    //     setCartridgeDescription(e.target.value);
    // }

    function handle_cartridge(e:React.ChangeEvent<HTMLInputElement>) {
        handle_file_input(e, setCartridge);
    }

    function handle_cover_image(e:React.ChangeEvent<HTMLInputElement>) {
        handle_file_input(e, (data:Uint8Array) => {
            setCoverImage(data);

            // Set the cover image preview to be exhibit in the form
            const date = new Date();
            const blobFile = new Blob([data||new Uint8Array()],{type:'image/png'})
            const file = new File([blobFile], `${date.getMilliseconds()}`);
            setCoverImagePreview(URL.createObjectURL(file));
        });
    }

    async function upload() {
        if (!cartridgeTitle || cartridgeTitle.length == 0 || !cartridge) {
            alert("Title and cartridge field are mandatory!");
            return;
        }

        setPageStatus(PageStatus.UploadCartridge);
        try {
            let receipt = await addInput(wallet, cartridgeTitle, cartridge, setChunksCartridge,
                (window as any).encodeAddCartridgeChunk, (window as any).encodeAddCartridge);

            let game_id = await check_upload_report(Number(receipt.events[0].args[1]._hex));

            if (coverImage && game_id) {
                setPageStatus(PageStatus.UploadEdit);
                receipt = await addInput(wallet, game_id, coverImage, setChunksCoverImage,
                    (window as any).encodeEditCartridgeChunk, (window as any).encodeEditCartridge);

                await check_upload_report(Number(receipt.events[0].args[1]._hex));
            }

            // if (description) {
            //     send_description();
            // }

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
                        {
                            pageStatus == PageStatus.UploadEdit?
                                <Badge bg={pageStatus > PageStatus.UploadEdit? "success":"warning"}>
                                    Cover Image: {`${chunksCoverImage[0]} of ${chunksCoverImage[1]}`}
                                </Badge>
                            :
                            <></>
                        }
                        </Stack>
                    </div>
                </Col>
            </Row>
        );

    }


    return (
        <Form className="bg-dark rounded py-3 px-5 text-light">
            <h1 className="text-center mb-4">Setup your Cartridge</h1>

            <Row className="mb-3">
                <Col md="4">
                    <div className={coverImagePreview? "text-center": "border border-light rounded"} style={coverImagePreview? {}:{height: 250}}>
                        <Image src={coverImagePreview? coverImagePreview:""} fluid
                            className={coverImagePreview? "border border-light rounded":""}
                        />
                    </div>
                </Col>

                <Col md="8">
                    <FloatingLabel controlId="cartridgeTitle" label="Title" className="mb-4 text-dark">
                        <Form.Control placeholder="Default Title" onChange={handle_cartridge_title} />
                    </FloatingLabel>

                    {/* <FloatingLabel controlId="cartridgeDescription" label="Description (Optional)" className="text-dark">
                        <Form.Control as="textarea" placeholder="Default Description"
                            style={{ height: '100px' }} onChange={handle_cartridge_description}
                        />
                        {additional_tx_warning()}

                    </FloatingLabel> */}
                </Col>
            </Row>

            <Row>
                <Col md="4">
                    <Form.Group controlId="formCartridgeCover">
                        <Form.Label>Cartridge Cover Image (Optional)</Form.Label>
                        <Form.Control type="file" accept="image/*" onChange={handle_cover_image} />
                    </Form.Group>
                    {additional_tx_warning()}
                </Col>

                <Col md="8">
                    <Form.Group controlId="formFile" className="mb-3">
                        <Form.Label>Cartridge File<span className="ms-1"><GiDisc/></span></Form.Label>
                        <Form.Control type="file" onChange={handle_cartridge} />
                    </Form.Group>
                </Col>
            </Row>

            <Row>
                <Col md={{ span: 3, offset: 6 }}>
                    <Button variant="outline-light" className="float-end" onClick={() => {upload()}}>
                        <span className="me-1"><GiLoad/></span>Upload Cartridge
                    </Button>
                </Col>
            </Row>
        </Form>
    );
}