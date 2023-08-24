import { useEffect, useState } from "react";
import { CartridgeInterface } from "./cartridge_card";
import { ethers } from "ethers";
import { Button, Col, Container, Modal, Row, Spinner, Stack } from "react-bootstrap";
import Image from 'react-bootstrap/Image';
import { RiSendPlaneFill, RiDownload2Line, RiEdit2Line } from "react-icons/ri";
import { FaRankingStar } from "react-icons/fa6";
import { GiPodiumWinner, GiPodiumSecond, GiPodiumThird } from "react-icons/gi";


interface Score {
    user: string,
    score: string
}

const link_classes = "mx-2 link-light link-offset-2 link-underline link-underline-opacity-0 link-underline-opacity-75-hover"

function sleep(ms:number) {
    return new Promise(resolve => setTimeout(resolve, ms));
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

    return allData;
}

async function get_ranking(game_id:string) {
    // TODO
    await sleep(2000);
    const score0 = "100"
    const score1 = "80"
    const score2 = "75"
    return [
        {user: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", score: score0},
        {user: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", score: `${'0'.repeat(score0.length-score1.length) + score1}`},
        {user: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", score: `${'0'.repeat(score0.length-score2.length) + score2}`}
    ];
}

export default function Cartridge({game}:{game:CartridgeInterface|null}) {
    const [show, setShow] = useState(false);
    const [coverImagePreview, setCoverImagePreview] = useState<any|null>(null);
    const [ranking, setRanking] = useState<Array<Score>|null>(null);
    const [cartridge, setCartridge] = useState("");

    const handleClose = () => setShow(false);
    const handleShow = () => setShow(true);

    async function download_cartridge() {
        if (!game) return;

        const data = await get_cartridge(game.id);
        setCartridge(data);
        console.log("Cartridge Downloaded!")
    }

    useEffect(() => {
        if (!game) return;

        if (!coverImagePreview) {
            // Set the cover image preview to be exhibit in the form
            const date = new Date();
            const blobFile = new Blob([game.card||new Uint8Array()],{type:'image/png'})
            const file = new File([blobFile], `${date.getMilliseconds()}`);

            const urlObj = URL.createObjectURL(file);

            console.log(urlObj);
            setCoverImagePreview(urlObj);
        }

        get_ranking(game.id).then(
            (ranking) => {
                setRanking(ranking);
            }
        )

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
            <div className="d-flex align-items-baseline">
                <h2>{game.name}</h2>

                <a className={link_classes} role="button" onClick={download_cartridge}
                  title="Download the cartridge to play on your machine">
                    <span className="me-1"><RiDownload2Line/></span>Download Cartridge
                </a>

                <a className={link_classes}
                  title="Submit the log of a match/run" role="button" onClick={handleShow}>
                    <span className="me-1"><RiSendPlaneFill/></span>Submit Log
                </a>

                <a className={`ms-auto ${link_classes}`}
                  title="Edit the game" role="button" onClick={handleShow}>
                    <span className="me-1"><RiEdit2Line/></span>Edit
                </a>
            </div>

            <Row>
                <Col md="4">
                    <div className={coverImagePreview? "text-center": "border border-light rounded"} style={coverImagePreview? {}:{height: 250}}>
                        <Image src={coverImagePreview? coverImagePreview:""} fluid
                            className={coverImagePreview? "border border-light rounded":""}
                        />
                    </div>
                </Col>
                <Col className="text-center">
                    <h4><span className="me-1"><FaRankingStar/></span>Ranking</h4>
                    {
                        ranking !== null?
                            <Stack gap={1}>
                                <div>
                                    <span className="me-1"><GiPodiumWinner/></span>
                                    <span className="font-monospace">
                                        {ranking.length >= 1? `${ranking[0].user} - ${ranking[0].score}`: "Be the first"}
                                    </span>
                                </div>

                                <div>
                                    <span className="me-1"><GiPodiumSecond/></span>
                                    <span className="font-monospace">
                                        {ranking.length >= 2? `${ranking[1].user} - ${ranking[1].score}`: "Get to the podium"}
                                    </span>
                                </div>

                                <div>
                                    <span className="me-1"><GiPodiumThird/></span>
                                    <span className="font-monospace">
                                        {ranking.length >= 3? `${ranking[2].user} - ${ranking[2].score}`: "Get to the podium"}
                                    </span>
                                </div>
                            </Stack>
                        :
                        <Spinner className="my-2" animation="border" variant="light">
                            <span className="visually-hidden">Loading...</span>
                        </Spinner>
                    }
                </Col>
            </Row>


            <Modal show={show} onHide={handleClose}>
                <Modal.Header closeButton>
                    <Modal.Title>Modal title</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    Select a log to submit
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleClose}>
                        Close
                    </Button>
                    <Button variant="primary">Understood</Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
}