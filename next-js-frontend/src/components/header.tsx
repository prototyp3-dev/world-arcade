import { useConnectWallet } from "@web3-onboard/react";
import { Button, Nav, Navbar, Stack } from "react-bootstrap";


export default function Header() {
    const [{ wallet, connecting }, connect, disconnect] = useConnectWallet()


    return (
        <Navbar bg="dark" className="mb-3 rounded sticky-top position-relative">
            <Stack gap={1}>
                <Navbar.Brand href="/" className="d-flex justify-content-center">
                    <img
                        className="header-image-left"
                        alt="Cartesi Arcade Image"
                        src="./controlls.png"
                        width="60"
                        height="60"
                    />
                    <h1 className="text-light m-2">Cartesi Arcade</h1>
                    <img
                        className="header-image-right"
                        alt="Cartesi Arcade Image"
                        src="./controlls.png"
                        width="60"
                        height="60"
                    />
                </Navbar.Brand>

                <Nav variant="underline" className="justify-content-center" activeKey="/">
                    <Nav.Item>
                        <Nav.Link href="/">Home</Nav.Link>
                    </Nav.Item>
                    
                    <Nav.Item>
                        <Nav.Link eventKey="link-1">Upload</Nav.Link>
                    </Nav.Item>
                    
                    <Nav.Item>
                        <Nav.Link eventKey="link-2">How To</Nav.Link>
                    </Nav.Item>
                    
                    <Nav.Item>
                        <Nav.Link eventKey="link-2">About</Nav.Link>
                    </Nav.Item>
                </Nav>

            </Stack>

            <Button variant="outline-light" className="position-absolute bottom-0 end-0 m-2" onClick={() => (wallet ? disconnect(wallet) : connect())}>
                {connecting ? 'Connecting' : wallet ? 'Disconnect' : 'Connect Wallet'}
            </Button>
        </Navbar>
    );
}