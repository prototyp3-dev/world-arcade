import { Col, Nav, Navbar, Row } from "react-bootstrap";
import { FaDiscord, FaGithub, FaTwitter } from "react-icons/fa6";


export default function Footer() {
    return (
        <Navbar bg="dark" className="mt-3 justify-content-center rounded sticky-bottom text-light">
            <Nav variant="underline">
                <Row>
                    <Col>
                        <h3>Developer</h3>
                        <Nav.Link className="ms-2 p-0" href="https://github.com/cartesi">
                            <span className="me-1"><FaGithub/></span>
                            Github
                        </Nav.Link>
                        
                        <Nav.Link className="ms-2 p-0">
                            <img src="./cartesi.jpg" width={16} className="me-1 mb-2"></img>
                            Documentation
                        </Nav.Link>
                    </Col>

                    <Col>
                        <h3>Community</h3>
                        <Nav.Link className="ms-2 p-0" href="https://discord.gg/VCbnrbrh">
                            <span className="me-1"><FaDiscord/></span>
                            Discord
                        </Nav.Link>
                        <Nav.Link className="ms-2 p-0" href="https://twitter.com/cartesiproject?s=20">
                            <span className="me-1"><FaTwitter/></span>
                            Twitter
                        </Nav.Link>
                    </Col>
                </Row>
            </Nav>
        </Navbar>
    );
}