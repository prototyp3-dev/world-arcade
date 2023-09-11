import { useEffect, useState } from "react";
import { CartridgeInterface } from "./cartridge_card";
import { Col, Container, Modal, Row, Spinner, Stack, Table, Badge} from "react-bootstrap";
import Image from 'react-bootstrap/Image';
import { RiSendPlaneFill, RiDownload2Line, RiEdit2Line } from "react-icons/ri";
import { FaRankingStar } from "react-icons/fa6";
import { GiPodiumWinner, GiPodiumSecond, GiPodiumThird } from "react-icons/gi";
import { useConnectWallet } from "@web3-onboard/react";
import { getNotices } from "@/graphql/notices";
import { getInputReportsAndNotices } from "@/graphql/inputs";
import { ethers } from "ethers";
import LogForm from "./log_form";
import useDownloader from "react-use-downloader";

interface Score {
    user: string,
    score: number
}

interface VerifyReplayNotice {
    cartridge_id: string,
    player_id: string,
    timestamp: number,
    valid: boolean,
    outcard_data: string,
    outcard_json: any,
    score: number,
}

const link_classes = "me-2 link-light link-offset-2 link-underline link-underline-opacity-0 link-underline-opacity-75-hover"
const ranking_style = {
    fontSize: "smaller"
}

function sleep(ms:number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function insertSorted(ranking:Array<Score>, score:Score) {
    let i = 0;
    while (i < ranking.length && ranking[i].score > score.score) i++;
    ranking.splice(i, 0, score);
}

function formatScore(higherScore:number, scoreToFormat:number) {
    const higherScoreStr = higherScore.toString();
    const scoreToFormatStr = scoreToFormat.toString();

    return '0'.repeat(higherScoreStr.length-scoreToFormatStr.length) + scoreToFormatStr;
}

function decodeAndParseVerifyReplayNotice(payload: string) {
    let notice_array = JSON.parse((window as any).decodeVerifyReplayNotice(payload)).Array;
    let notice: VerifyReplayNotice = {
        cartridge_id: notice_array[0],
        player_id: notice_array[1],
        timestamp: notice_array[2],
        valid: notice_array[3],
        outcard_data: notice_array[4],
        outcard_json: null,
        score: 0
    }
    if (notice.outcard_data.substring(0, 4) == 'JSON') {
        notice.outcard_json = JSON.parse(notice.outcard_data.substring(4));
        if ('score' in notice.outcard_json) {
            notice.score = notice.outcard_json.score;
        }
    }
    return notice;
}

async function get_cartridge(game_id:string) {
    let url = `${process.env.NEXT_PUBLIC_INSPECT_URL}/cartridges/${game_id}/cartridge`;
    let response = await fetch(url, {method: 'GET', mode: 'cors',});

    let allData = "0x";
    if (response.status == 200) {
        let inspect_res = await response.json();

        try {
            for (let i = 0; i < inspect_res.reports.length; i++) {
                allData = allData.concat(inspect_res.reports[i].payload.substring(2));
            }
        } catch (error) {
            console.log(error);
        }
    }

    return ethers.utils.arrayify(allData);
}

async function get_ranking(game_id:string) {
    if (!process.env.NEXT_PUBLIC_GRAPHQL_URL) throw new Error("Undefined graphql url.");

    let notices = await getNotices(process.env.NEXT_PUBLIC_GRAPHQL_URL);
    let ranking:Array<Score> = [];

    for (let i = 0; i < notices.length; i++) {
        const notice = decodeAndParseVerifyReplayNotice(notices[i].payload);
        if (notice.cartridge_id == game_id) {
            insertSorted(ranking, {"user": notice.player_id, "score": notice.score});
        }
    }

    return ranking;
}

async function get_score(game_id:string, input_index:number) {
    if (!process.env.NEXT_PUBLIC_GRAPHQL_URL) throw new Error("Undefined graphql url.");

    const result = await getInputReportsAndNotices(process.env.NEXT_PUBLIC_GRAPHQL_URL, input_index);
    if (result.notices.length == 0) {
        const report = result.reports[0];
        let error_msg = `Invalid gameplay!\n${ethers.utils.toUtf8String(report.payload)}`
        throw new Error(error_msg);
    }

    const notice = decodeAndParseVerifyReplayNotice(result.notices[0].payload);
    if (notice.cartridge_id != game_id) throw new Error(`Score does not match game: ${notice}`);

    const score:Score = {"user": notice.player_id, "score": notice.score};
    return score
}

export default function Cartridge({game}:{game:CartridgeInterface|null}) {
    const [{ wallet }] = useConnectWallet();
    const [show, setShow] = useState(false);
    const [ranking, setRanking] = useState<Array<Score>|null>(null);
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
        if (!game || !ranking) return;

        try {
            const score = await get_score(game.id, input_index);
            insertSorted(ranking, score);

            setRanking(ranking);
            handleClose();
        } catch (error) {
            handleClose();
            alert((error as Error).message);
        }

    }

    useEffect(() => {
        if (!game || ranking) return;

        get_ranking(game.id)
        .then((ranking) => {
            setRanking(ranking);
        })
        .catch((error) => {
            console.log(error.message);
            setRanking([]);
        })

    }, [game]);


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
                <h2 className="me-2">{game.info.name}</h2>

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
            </div>

            <div className="d-flex pb-2">

                {/* Description */}
                <div className="me-3 flex-fill">
                    <div className="border-bottom border-light">
                        <h4>Description</h4>
                    </div>

                    <p className="ms-2">{game.info.description}</p>
                </div>
            </div>

            <div className="d-flex pb-2">
                {/* Ranking */}
                <div className="me-3 flex-fill">
                    <div className="text-center text-nowrap" style={ranking_style}>
                        <h4><span className="me-1"><FaRankingStar/></span>Ranking</h4>
                        {
                            ranking !== null
                            ?
                                <Stack gap={1}>
                                    <div>
                                        <span className="me-1"><GiPodiumWinner/></span>
                                        <span className="font-monospace">
                                            {
                                                ranking.length >= 1
                                                ?
                                                    `${ranking[0].user} - ${ranking[0].score}`
                                                :
                                                    "Be the first to play!"
                                            }
                                        </span>
                                    </div>

                                    {
                                        ranking.length >= 2
                                        ?
                                            <div>
                                                <span className="me-1"><GiPodiumSecond/></span>
                                                <span className="font-monospace">
                                                    {`${ranking[1].user} - ${formatScore(ranking[0].score, ranking[1].score)}`}
                                                </span>
                                            </div>
                                        :
                                            <></>
                                    }

                                    {
                                        ranking.length >= 3
                                        ?
                                            <div>
                                                <span className="me-1"><GiPodiumThird/></span>
                                                <span className="font-monospace">
                                                    {`${ranking[2].user} - ${formatScore(ranking[0].score, ranking[2].score)}`}
                                                </span>
                                            </div>
                                        :
                                            <></>
                                    }

                                </Stack>
                            :
                                <Spinner className="my-2" animation="border" variant="light">
                                    <span className="visually-hidden">Loading...</span>
                                </Spinner>
                        }
                    </div>
                </div>
            </div>

            <Table responsive striped variant="dark" size="sm">
                <tbody>
                    <tr>
                        <td>Short Description</td>
                        <td>{game.info.summary}</td>
                    </tr>
                    <tr>
                        <td>Uploader</td>
                        <td>{game.userAddress}</td>
                    </tr>
                    <tr>
                        <td>Created At</td>
                        <td>{new Date(game.createdAt*1000).toLocaleString()}</td>
                    </tr>
                    <tr>
                        <td>Tags</td>
                        <td>
                            <Stack direction="horizontal" gap={2}>
                                {game.info.tags && game.info.tags.map((tag) => <Badge bg="secondary">{tag}</Badge>)}
                            </Stack>
                        </td>
                    </tr>
                    <tr>
                        <td>URL</td>
                        <td><a href={game.info.url}>{game.info.url}</a></td>
                    </tr>
                    <tr>
                        <td>Authors</td>
                        <td>
                            <Stack direction="horizontal" gap={2}>
                                {game.info.authors && game.info.authors.map((author) => <a href={author.link}>{author.name}</a>)}
                            </Stack>
                        </td>
                    </tr>
                </tbody>
            </Table>

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