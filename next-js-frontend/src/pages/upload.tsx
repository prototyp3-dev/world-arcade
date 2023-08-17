import Footer from "@/components/footer";
import Header from "@/components/header";
import { Container } from "react-bootstrap";
import { useConnectWallet } from "@web3-onboard/react";
import CartridgeForm from "@/components/cartridge_form";

export default function UploadCartridge() {
    const [{ wallet, connecting }, connect, disconnect] = useConnectWallet();

    return (
        <Container>
            <Header activeKey="/upload"/>
            <CartridgeForm wallet={wallet}/>
            <Footer/>
        </Container>
    );
}