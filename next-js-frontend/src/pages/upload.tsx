import Footer from "@/components/footer";
import Header from "@/components/header";
import { useState } from "react";
import { Button, Col, Container, FloatingLabel, Form, Row } from "react-bootstrap";
import { IoWarning } from "react-icons/io5";
import { GiLoad, GiDisc } from "react-icons/gi";


// function upload(title:string|null, description:string|null) {

// }

function additional_tx_warning() {
    return (
        <div className="text-warning">
            <span style={{fontSize:18}}><IoWarning/></span>
            <span style={{fontSize:12}}> Adding this info will require an additional transaction.</span>
        </div>
    );
}

async function handle_file_input(e:React.ChangeEvent<HTMLInputElement>, callback:Function) {
    if (!e.target.files || e.target.files.length == 0) {
        return;
    }

    let file = e.target.files[0];

    const reader = new FileReader();
    reader.onload = async (readerEvent) => {
        let data: ArrayBuffer;
        if (readerEvent.target?.result instanceof ArrayBuffer) {
            data = readerEvent.target?.result;
        } else {
            data = {} as ArrayBuffer;
        }
        if (data) {
            callback(new Uint8Array(data));
        }
    };

    reader.readAsArrayBuffer(file);
}

export default function UploadCartridge() {
    const [cartridgeTitle, setCartridgeTitle] = useState<string|null>(null);
    const [cartridgeDescription, setCartridgeDescription] = useState<string|null>(null);
    const [cartridge, setCartridge] = useState<any|null>(null);
    const [coverImage, setCoverImage] = useState<any|null>(null);
    const [coverImagePreview, setCoverImagePreview] = useState<any|null>(null);

    function handle_cartridge_title(e:React.ChangeEvent<HTMLInputElement>) {
        setCartridgeTitle(e.target.value);
    }

    function handle_cartridge_description(e:React.ChangeEvent<HTMLInputElement>) {
        setCartridgeDescription(e.target.value);
    }

    function handle_cartridge(e:React.ChangeEvent<HTMLInputElement>) {
        handle_file_input(e, setCartridge);
    }

    function handle_cover_image(e:React.ChangeEvent<HTMLInputElement>) {
        handle_file_input(e, (data:Uint8Array) => {
            setCoverImage(data);

            // Set the cover image preview to be exhibit in the form
            const date = new Date();
            const blobFile = new Blob([data||new Uint8Array()],{type:'image/png'})
            const file = new File([blobFile], `${date.getMilliseconds()}`);
            setCoverImagePreview(URL.createObjectURL(file));
        });
    }

    return (
        <Container>
            <Header activeKey="/upload"/>
            <Form className="bg-dark rounded py-3 px-5 text-light">
                <h1 className="text-center mb-4">Setup your Cartridge</h1>

                <Row className="mb-3">
                    <Col md="4">
                        <div className="border border-light rounded text-center" style={{height: 250}}>
                            <img src={coverImagePreview? coverImagePreview:""} style={{height: "100%"}} ></img>
                        </div>
                    </Col>

                    <Col md="8">
                        <FloatingLabel controlId="cartridgeTitle" label="Title" className="mb-4 text-dark">
                            <Form.Control placeholder="Default Title" onChange={handle_cartridge_title} />
                        </FloatingLabel>

                        <FloatingLabel controlId="cartridgeDescription" label="Description" className="text-dark">
                            <Form.Control as="textarea" placeholder="Default Description"
                                style={{ height: '100px' }} onChange={handle_cartridge_description}
                            />
                            {additional_tx_warning()}

                        </FloatingLabel>
                    </Col>
                </Row>

                <Row>
                    <Col md="4">
                        <Form.Group controlId="formCartridgeCover">
                            <Form.Label>Cartridge Cover Image</Form.Label>
                            <Form.Control type="file" accept="image/*" onChange={handle_cover_image} />
                        </Form.Group>
                        {additional_tx_warning()}
                    </Col>

                    <Col md="8">
                        <Form.Group controlId="formFile" className="mb-3">
                            <Form.Label>Cartridge File<span className="ms-1"><GiDisc/></span></Form.Label>
                            <Form.Control type="file" onChange={handle_cartridge} />
                        </Form.Group>
                    </Col>
                </Row>

                <Row>
                    <Col md={{ span: 3, offset: 6 }}>
                        <Button variant="outline-light" className="float-end" onClick={() => {upload(cartridgeTitle, cartridgeDescription)}}>
                            <span className="me-1"><GiLoad/></span>Upload Cartridge
                        </Button>
                    </Col>
                </Row>
            </Form>
            <Footer/>
        </Container>
    );
}