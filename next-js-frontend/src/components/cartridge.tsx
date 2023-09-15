import { useState } from "react";
import { CartridgeInterface } from "./cartridge_card";
import { Container, Modal, Spinner, Stack, Table, Badge} from "react-bootstrap";
import Image from 'react-bootstrap/Image';
import { RiSendPlaneFill, RiDownload2Line } from "react-icons/ri";
import { FaRankingStar } from "react-icons/fa6";
import { getInputReportsAndNotices } from "@/graphql/inputs";
import LogForm from "./log_form";
import useDownloader from "react-use-downloader";
import { useRouter } from "next/router";
import { get_cartridge } from "@/inspect/cartridge";
import Script from 'next/script';
import RivEmuLogForm from "./rivemu_gameplay_form";

const link_classes = "me-2 link-light link-offset-2 link-underline link-underline-opacity-0 link-underline-opacity-75-hover"
let cartridge_data:Uint8Array;



async function check_gameplay_result(game_id:string, input_index:number) {
    if (!process.env.NEXT_PUBLIC_GRAPHQL_URL) throw new Error("Undefined graphql url.");

    const result = await getInputReportsAndNotices(process.env.NEXT_PUBLIC_GRAPHQL_URL, input_index);
    if (result.notices.length == 0 && result.reports.length == 0) {
        throw new Error("Unable to find result from submited gameplay.");
    }

    const notice = JSON.parse((window as any).decodeVerifyReplayNotice(result.notices[0].payload)).Array
    if (notice[0] != game_id) {
        throw new Error("Game Id does not match.");
    }
    if (!notice[3]) {
        throw new Error("The Gameplay submited is not valid!");
    }
}

export default function Cartridge({game}:{game:CartridgeInterface|null}) {
    const router = useRouter();
    const [rivlog, setRivlog] = useState(new Uint8Array(0));
    const [outcard, setOutcard] = useState("");
    const [playBtnText, setPlayBtnText] = useState("Start");
    const [gameStarting, setGameStarting] = useState(false);

    const [show, setShow] = useState(false);
    const [showRivEmuLogForm, setShowRivEmuLogForm] = useState(false);

    const [cartridgeDownloading, setCartridgeDownloading] = useState(false);
    const { download } = useDownloader();

    const handleClose = () => setShow(false);
    const handleShow = () => setShow(true);

    const handleRivEmuLogFormClose = () => setShowRivEmuLogForm(false);
    const handleRivEmuLogFormShow = () => setShowRivEmuLogForm(true);

    async function download_cartridge() {
        if (!game || cartridgeDownloading) return;

        setCartridgeDownloading(true);
        if (!cartridge_data) {
            cartridge_data = await get_cartridge(game.id);
        }
        setCartridgeDownloading(false);

        const filename = "game.sqfs";
        const blobFile = new Blob([cartridge_data],{type:'application/octet-stream'});
        const file = new File([blobFile], filename);

        const urlObj = URL.createObjectURL(file);
        console.log("Cartridge Downloaded!");
        download(urlObj, filename);
    }

    async function log_sent(input_index:number) {
        if (!game) return;

        try {
            await check_gameplay_result(game.id, input_index);
            handleClose();
        } catch (error) {
            handleClose();
            alert((error as Error).message);
        }

    }

    async function rivemu_log_sent(input_index:number) {
        if (!game) return;

        try {
            await check_gameplay_result(game.id, input_index);
        } catch (error) {
            alert((error as Error).message);
        }

    }

    if (!game) {
        return (
            <div className="d-flex justify-content-center pacman_loading">
                <h1 className="mb-5 text-light align-self-end">Loading...</h1>
            </div>
        );
    }


    async function rivemu_start() {
        if (!game)
            return;
        console.log('rivemu_start');
        setGameStarting(true);
        // @ts-ignore:next-line
        if (Module.quited) { // restart wasm when back to page
            // @ts-ignore:next-line
            Module._main();
        }
        if (!cartridge_data) {
            // @ts-ignore:next-line
            cartridge_data = await get_cartridge(game.id);
        } else {
            // wait spinner animation to show up
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        // @ts-ignore:next-line
        let buf = Module._malloc(cartridge_data.length);
        console.log(buf, cartridge_data.length);
        // @ts-ignore:next-line
        Module.HEAPU8.set(cartridge_data, buf);
        // @ts-ignore:next-line
        Module.ccall('rivemu_start', null, [ 'number', 'number' ], [ buf, cartridge_data.length ]);
        // @ts-ignore:next-line
        Module._free(buf);
    }

    // @ts-nocheck
    function rivemu_stop() {
        if (!game)
            return;
        console.log('rivemu_stop');
        // @ts-ignore:next-line
        Module.cwrap('rivemu_stop')();
    }

    if (typeof window !== 'undefined') {
        // stop wasm when page changes
        var pushState = window.history.pushState;
        window.history.pushState = function() {
            // @ts-ignore:next-line
            pushState.apply(window.history, arguments);
            // @ts-ignore:next-line
            if (!Module.quited) {
                // @ts-ignore:next-line
                Module._quit();
                // @ts-ignore:next-line
                Module.quited = true;
            }
        };

        // @ts-ignore:next-line
        window.rivemu_on_begin = function(width : any, height : any) {
            // @ts-ignore:next-line
            var canvas = document.getElementById("canvas");
            if (!canvas) return;
            // @ts-ignore:next-line
            canvas.width = Math.floor(768 / width) * width
            // @ts-ignore:next-line
            canvas.height = Math.floor((height / width) * canvas.width);
            // force resize in WASM
            // @ts-ignore:next-line
            window.dispatchEvent(new Event('resize'));
            setPlayBtnText("Restart");
            setGameStarting(false);
            window.scrollTo({top: canvas.offsetTop -10});
        }

        // @ts-ignore:next-line
        window.rivemu_on_finish = function(rivlog : ArrayBuffer, outcard : ArrayBuffer) {
            console.log('rivemu_on_finish');

            setRivlog(new Uint8Array(rivlog));
            setOutcard(new TextDecoder("utf-8").decode(outcard));
            handleRivEmuLogFormShow();
        }

        //let decoder = new TextDecoder();
        // @ts-ignore:next-line
        window.rivemu_on_outcard_update = function(outcard : any) {
            /*
            let outcard_str = decoder.decode(outcard);
            if (outcard_str.substring(0, 4) == 'JSON') {
                let scores = JSON.parse(outcard_str.substring(4));
            }
            */
        }
    }

    return (
        <Container className="bg-dark text-light rounded">

            <div className="pb-2 pt-4">
                <canvas className="border border-light" id="canvas" width={768} height={432} onContextMenu={(e)=> e.preventDefault()} tabIndex={-1}/>
            </div>

            <div className="text-center d-flex justify-content-center">
                {
                    gameStarting
                    ?
                        <div className="py-2 px-3">
                            <Spinner animation="border" variant="light"></Spinner>
                        </div>
                    :
                        <button className="btn btn-lg btn-light m-1" role="button"
                        onKeyDown={(e)=> e.preventDefault()} onClick={rivemu_start} title={playBtnText}>
                            {playBtnText}
                        </button>
                }

                <button className="btn btn-lg btn-light m-1" role="button" disabled={gameStarting} onClick={rivemu_stop} title="Stop and Submit">
                    Stop
                </button>
            </div>

            <div className="d-flex pb-2">

                {/* Description */}
                <div className="flex-fill">
                    <div className="border-bottom border-light">
                        <h4>Description</h4>
                    </div>

                    <pre className="ms-2">{game.info.description}</pre>
                </div>
            </div>

            <div className="mb-2 d-flex align-items-baseline">
                {
                    game.info.name
                    ?
                        <h2 className="me-2">{game.info.name}</h2>
                    :
                        <></>
                }

                <a className={link_classes} role="button" onClick={download_cartridge}
                        title="Download the cartridge to play on your machine">
                    {
                        cartridgeDownloading
                        ?
                            <Spinner className="me-1" size="sm" animation="border" variant="light"></Spinner>
                        :
                            <span className="me-1"><RiDownload2Line/></span>
                    }
                Download Cartridge</a>

                <a className={link_classes}
                title="Submit the log of a match/run" role="button" onClick={handleShow}>
                    <span className="me-1"><RiSendPlaneFill/></span>Submit Log
                </a>
            </div>

            <div className="d-flex pb-2">
                {/* Image */}
                <div className="me-3">
                    <div className="cartridge-cover">
                        <Image src={game?.cover? `data:image/png;base64,${game.cover}`:"/cartesi.jpg"} height={256} rounded/>
                    </div>
                </div>

                {/* Info table */}
                <div className="flex-fill">
                    <Table responsive striped variant="dark" size="sm">
                        <tbody>
                            {
                                game.info.summary
                                ?
                                    <tr>
                                        <td>Short Description</td>
                                        <td>{game.info.summary}</td>
                                    </tr>
                                :
                                    <></>
                            }
                            <tr>
                                <td>Uploader</td>
                                <td>{game.userAddress}</td>
                            </tr>
                            <tr>
                                <td>Created At</td>
                                <td>{new Date(game.createdAt*1000).toLocaleString()}</td>
                            </tr>
                            {
                                game.info.tags
                                ?
                                    <tr>
                                        <td>Tags</td>
                                        <td>
                                            <Stack direction="horizontal" gap={2}>
                                                {game.info.tags && game.info.tags.map((tag) => <Badge key={tag} bg="secondary">{tag}</Badge>)}
                                            </Stack>
                                        </td>
                                    </tr>
                                :
                                    <></>
                            }
                            {
                                game.info.url
                                ?
                                    <tr>
                                        <td>URL</td>
                                        <td><a href={game.info.url}>{game.info.url}</a></td>
                                    </tr>
                                :
                                    <></>
                            }
                            {
                                game.info.authors
                                ?
                                    <tr>
                                        <td>Authors</td>
                                        <td>
                                            <Stack direction="horizontal" gap={2}>
                                                {game.info.authors && game.info.authors.map(
                                                    (author) => <a key={author.name} href={author.link}>{author.name}</a>
                                                )}
                                            </Stack>
                                        </td>
                                    </tr>
                                :
                                    <></>
                            }
                        </tbody>
                    </Table>


                    {/* Access Ranking Page */}
                    <a className={link_classes}
                    title="View this game ranking" role="button" onClick={() => {router.push(`/ranking/${game.id}`)}}>
                        <h4><span className="me-1"><FaRankingStar/></span>Ranking</h4>
                    </a>
                </div>

            </div>

            <Modal className="py-3 px-5" show={showRivEmuLogForm} animation={false} onHide={handleRivEmuLogFormClose}>
                <div className="bg-dark text-light rounded border border-light">
                    <Modal.Header closeButton closeVariant="white">
                        <Modal.Title>Your gameplay is ready</Modal.Title>
                    </Modal.Header>

                    <Modal.Body>
                        <RivEmuLogForm game_id={game.id} rivlog={rivlog} outcard={outcard} log_sent={rivemu_log_sent}></RivEmuLogForm>
                    </Modal.Body>
                </div>
            </Modal>

            <Modal className="py-3 px-5" show={show} animation={false} onHide={handleClose}>
                <div className="bg-dark text-light rounded border border-light">
                    <Modal.Header closeButton closeVariant="white">
                        <Modal.Title>Submit a gameplay for this game</Modal.Title>
                    </Modal.Header>

                    <Modal.Body >
                        <LogForm game_id={game.id} log_sent={log_sent}></LogForm>
                    </Modal.Body>
                </div>
            </Modal>
            <Script src="/rivemu.js" strategy="lazyOnload"/>
        </Container>
    );
}