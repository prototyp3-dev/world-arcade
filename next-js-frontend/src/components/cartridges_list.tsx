import { useEffect, useState } from "react";
import { ethers } from "ethers";
import CartridgeCard, { CartridgeInterface } from "./cartridge_card";
import { Col, Row } from "react-bootstrap";


function build_cards(cartridges:CartridgeInterface[]) {
    return (
        cartridges.map((cartridge: CartridgeInterface) => {
            return (
                <Col key={cartridge?.id}>
                    <CartridgeCard cartridge={cartridge} ></CartridgeCard>
                </Col>
            )
        })
    );
}


export default function CartridgesList() {
    const [cartridges, setCartridges] = useState<CartridgeInterface[]>();

    useEffect(() => {
        async function get_cartridge_list() {
            // GET /cartridges
            let url = `${process.env.NEXT_PUBLIC_INSPECT_URL}/cartridges`;

            fetch(url, {method: "GET", mode: "cors"})
            .then((response) => {
                response.json().then((inspect_res) => {
                    let allData = "0x";
                    for (let i = 0; i < inspect_res.reports.length; i++) {
                        allData = allData.concat(inspect_res.reports[i].payload.substring(2));
                    }

                    const cartridges:CartridgeInterface[] = JSON.parse(ethers.utils.toUtf8String(allData));

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