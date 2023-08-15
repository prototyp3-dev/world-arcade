import { useEffect, useState } from "react";
import { ethers } from "ethers";
import CartridgeCard, { Cartridge } from "./cartridge_card";
import { Col, Row } from "react-bootstrap";


function game_cover(card:Uint8Array) {
    if (!(card && card.length > 0)) {
        return null;
    }

    const date = new Date();
    let blobFile = new Blob([card||new Uint8Array()],{type:'image/png'})
    var file = new File([blobFile], `${date.getMilliseconds()}`);
    const cover = URL.createObjectURL(file);

    return cover;
}

function build_cards(cartridges:Cartridge[]) {
    return (
        cartridges.map((cartridge: Cartridge) => {
            return (
                <Col key={cartridge?.id}>
                    <CartridgeCard cartridge={cartridge} cover={game_cover(cartridge.card)} ></CartridgeCard>
                </Col>
            )
        })
    );
}


export default function CartridgesList() {
    const [cartridges, setCartridges] = useState<Cartridge[]>();

    useEffect(() => {
        async function get_cartridge_list() {
            // GET /cartridges
            let url = `${process.env.NEXT_PUBLIC_INSPECT_URL}/cartridges`;
        
            fetch(url, {method: "GET", mode: "cors"})
            .then((response) => {
                response.json().then((inspect_res) => {
                    let payload = JSON.parse(ethers.utils.toUtf8String(inspect_res.reports[0].payload));
                    let cartridges:Cartridge[] = [];

                    for (let i = 0; i < payload.length; i++) {
                        payload[i].card = ethers.utils.arrayify(payload[i].card);
                        cartridges.push(payload[i]);
                    }

                    setCartridges(cartridges);
                })
            })
        }

        if (!cartridges) {
            get_cartridge_list();
        }
    }, [])

    if (!cartridges) {
        //set loading
        return (
            <div className="d-flex justify-content-center pacman_loading">
                <h1 className="mb-5 text-light align-self-end">Loading...</h1>
            </div>
        );
    }

    
    return (
        <Row md={3}>
            {build_cards(cartridges)}
        </Row>
    );
}