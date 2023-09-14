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

const link_classes = "me-2 link-light link-offset-2 link-underline link-underline-opacity-0 link-underline-opacity-75-hover"


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
    const [show, setShow] = useState(false);
    const [cartridgeDownloading, setCartridgeDownloading] = useState(false);
    const { size, elapsed, percentage, download,
        cancel, error, isInProgress } = useDownloader();

    const handleClose = () => setShow(false);
    const handleShow = () => setShow(true);

    async function download_cartridge() {
        if (!game || cartridgeDownloading) return;

        setCartridgeDownloading(true);
        const data = await get_cartridge(game.id);
        setCartridgeDownloading(false);

        const filename = "game_bin"
        const blobFile = new Blob([data],{type:'application/octet-stream'})
        const file = new File([blobFile], filename);

        const urlObj = URL.createObjectURL(file);
        console.log("Cartridge Downloaded!");
        download(urlObj, filename)
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


    if (!game) {
        return (
            <div className="d-flex justify-content-center pacman_loading">
                <h1 className="mb-5 text-light align-self-end">Loading...</h1>
            </div>
        );
    }

    return (
        <Container className="bg-dark text-light rounded">
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

            <div className="d-flex pb-2">

                {/* Description */}
                <div className="flex-fill">
                    <div className="border-bottom border-light">
                        <h4>Description</h4>
                    </div>

                    <pre className="ms-2">{game.info.description}</pre>
                </div>
            </div>

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
        </Container>
    );
}