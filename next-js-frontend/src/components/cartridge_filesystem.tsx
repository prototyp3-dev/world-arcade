import { useConnectWallet } from "@web3-onboard/react";
import { useRouter } from "next/router";
import { useState } from "react";
import { Badge, Button, Col, FloatingLabel, Form, Row, Spinner, Stack } from "react-bootstrap";
import { ethers } from "ethers";
import { GiDisc, GiLoad } from "react-icons/gi";
import { IInputBox__factory } from "@cartesi/rollups";
import { check_upload_report, handle_file_input } from "@/utils/utils";

enum PageStatus {
    Ready,
    Uploading,
}


export default function CartridgeFileSystemForm() {
    const router = useRouter();
    const [{ wallet }] = useConnectWallet();
    const [cartridgeTitle, setCartridgeTitle] = useState<string|null>(null);
    const [cartridgeFileSystem, setcartridgeFileSystem] = useState<Uint8Array|null>(null);
    const [pageStatus, setPageStatus] = useState(PageStatus.Ready);
    const [chunksCartridgeFs, setChunksCartridgeFs] = useState<number[]>([0, 0]);

    function handle_cartridge_title(e:React.ChangeEvent<HTMLInputElement>) {
        setCartridgeTitle(e.target.value);
    }

    function handle_cartridge(e:React.ChangeEvent<HTMLInputElement>) {
        handle_file_input(e, setcartridgeFileSystem);
    }

    async function upload() {
        if (!cartridgeTitle || cartridgeTitle.length == 0 || !cartridgeFileSystem) {
            alert("Title and FileSystem fields are mandatory!");
            return;
        }

        if (!wallet) {
            alert("Connect first to upload a cartridge.");
            return;
        }

        if (!process.env.NEXT_PUBLIC_INPUT_BOX_ADDR) {
            console.log("Input BOX addr not defined.");
            return;
        }

        if (!process.env.NEXT_PUBLIC_DAPP_ADDR) {
            console.log("DAPP addr not defined.");
            return;
        }

        if (!process.env.NEXT_PUBLIC_MAX_SIZE_TO_SEND) {
            console.log("MAX SIZE TO SEND not defined.");
            return;
        }

        const signer = new ethers.providers.Web3Provider(wallet.provider, 'any').getSigner();
        const inputContract = new ethers.Contract(process.env.NEXT_PUBLIC_INPUT_BOX_ADDR, IInputBox__factory.abi, signer);
        const maxSizeToSend = parseInt(process.env.NEXT_PUBLIC_MAX_SIZE_TO_SEND);

        let input;
        setPageStatus(PageStatus.Uploading);
        try {
            if (cartridgeFileSystem.length > maxSizeToSend) {
                const chunks = (window as any).prepareData(ethers.utils.hexlify(cartridgeFileSystem), maxSizeToSend);
                for (let c = 0; c < chunks.length; c += 1) {
                    const chunkToSend = chunks[c];
                    setChunksCartridgeFs([c+1, chunks.length]);
                    input = await inputContract.addInput(process.env.NEXT_PUBLIC_DAPP_ADDR,
                        (window as any).encodeAddCartridgeSquashFsChunk(cartridgeTitle, chunkToSend));
                    await input.wait();
                }
            } else {
                input = await inputContract.addInput(process.env.NEXT_PUBLIC_DAPP_ADDR,
                    (window as any).encodeAddCartridgeSquashFs(cartridgeTitle, ethers.utils.hexlify(cartridgeFileSystem)));
            }
            const receipt = await input.wait();
            let game_id = await check_upload_report(Number(receipt.events[0].args[1]._hex));

            router.push(`/cartridge/${game_id}`);
        } catch (error) {
            setPageStatus(PageStatus.Ready);
            alert((error as Error).message);
        }
    }

    if (pageStatus != PageStatus.Ready) {

        return (
            <Row>
                <Col md={{ span: 6, offset: 3 }}>
                    <div className="bg-dark text-center text-light py-3 rounded">
                        <h1>Uploading your Cartridge</h1>
                        <Stack gap={3} className="mb-2">
                            <div className="d-flex justify-content-center">
                                <Spinner className="my-2" animation="border" variant="light"></Spinner>
                            </div>

                            <div>
                                <Badge bg={chunksCartridgeFs[0] == chunksCartridgeFs[1]? "success":"warning"}>
                                    Cartridge FS: {`${chunksCartridgeFs[0]} of ${chunksCartridgeFs[1]}`}
                                </Badge>
                            </div>
                        </Stack>
                    </div>
                </Col>
            </Row>
        );

    }

    return (
        <Form className="py-3 px-5 text-light">
            <h1 className="text-center mb-4">Setup your Cartridge (SquashFs)</h1>

            <Row>
                <Col md={{span: 6, offset: 3}}>
                    <FloatingLabel controlId="cartridgeTitle" label="Game Title" className="mb-4 text-dark">
                        <Form.Control placeholder="Default Title" onChange={handle_cartridge_title} />
                    </FloatingLabel>

                    <Form.Group controlId="formFile" className="mb-3">
                        <Form.Label>Cartridge SquashFs<span className="ms-1"><GiDisc/></span></Form.Label>
                        <Form.Control type="file" onChange={handle_cartridge} />
                    </Form.Group>

                    <div className="text-center">
                        <Button variant="outline-light" onClick={() => {upload()}}>
                            <span className="me-1"><GiLoad/></span>Upload Cartridge FileSystem
                        </Button>
                    </div>
                </Col>
            </Row>
        </Form>
    )
}