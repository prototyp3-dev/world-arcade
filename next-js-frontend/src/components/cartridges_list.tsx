import { useEffect, useState } from "react";
import CartridgeCard, { CartridgeInterface } from "./cartridge_card";
import { Col, Row } from "react-bootstrap";
import { get_cartridge_list } from "@/inspect/cartridge";


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
        if (!cartridges) {
            get_cartridge_list()
            .then((result) => {
                setCartridges(result);
            });
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