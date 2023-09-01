import Footer from "@/components/footer";
import Header from "@/components/header";
import { Container } from "react-bootstrap";
import CartridgeForm from "@/components/cartridge_form";

export default function UploadCartridge() {

    return (
        <Container>
            <Header activeKey="/upload"/>
            <CartridgeForm/>
            <Footer/>
        </Container>
    );
}