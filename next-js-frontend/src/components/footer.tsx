import { Col, Nav, Navbar, Row } from "react-bootstrap";
import { FaDiscord, FaGithub, FaTwitter } from "react-icons/fa6";


export default function Footer() {
    return (
            <Navbar bg="dark" className="mt-auto justify-content-center rounded text-light">
                <Nav variant="underline">
                    <Row>
                        <Col className="px-5">
                            <h3>Developer</h3>
                            <Nav.Link className="ms-1 p-0" href="https://github.com/cartesi">
                                <span className="d-flex align-items-center">
                                    <FaGithub/> <span className="ms-1">Github</span>
                                </span>

                            </Nav.Link>

                            {/* Using an image for Cartesi because Font Awesome does not have an icon for it. */}
                            <Nav.Link className="ms-1 p-0" href="https://docs.cartesi.io/">
                                <img src="/cartesi.jpg" width={16} className="me-1 align-baseline"></img>
                                Documentation
                            </Nav.Link>
                        </Col>

                        <Col className="px-5">
                            <h3>Community</h3>
                            <Nav.Link className="ms-1 p-0" href="https://discord.gg/VCbnrbrh">
                                <span className="d-flex align-items-center">
                                    <FaDiscord/> <span className="ms-1">Discord</span>
                                </span>
                            </Nav.Link>

                            <Nav.Link className="ms-1 p-0" href="https://twitter.com/cartesiproject?s=20">
                                <span className="d-flex align-items-center">
                                    <FaTwitter/> <span className="ms-1">Twitter</span>
                                </span>
                            </Nav.Link>
                        </Col>
                    </Row>
                </Nav>
            </Navbar>
    );
}