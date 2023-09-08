import Footer from "@/components/footer";
import Header from "@/components/header";
import { Button, Container } from "react-bootstrap";
import CartridgeForm from "@/components/cartridge_form";
import { useState } from "react";
import CartridgeFileSystemForm from "@/components/cartridge_filesystem";

enum UploadMode {
    FileSystem,
    Form
}

export default function UploadCartridge() {
    const [uploadMode, setUploadMode] = useState(UploadMode.FileSystem);

    return (
        <Container>
            <Header activeKey="/upload"/>

            <div className="bg-dark rounded">
                <div className="text-center pt-2">
                    <Button variant="outline-light" className="me-2" disabled={uploadMode==UploadMode.FileSystem}
                        onClick={()=>{setUploadMode(UploadMode.FileSystem)}}>
                        SquashFs
                    </Button>

                    <Button variant="outline-light" disabled={uploadMode==UploadMode.Form}
                        onClick={()=>{setUploadMode(UploadMode.Form)}}>
                        Upload Form
                    </Button>
                </div>
                {
                    uploadMode == UploadMode.FileSystem
                    ?
                        <CartridgeFileSystemForm/>
                    :
                        <CartridgeForm/>
                }

            </div>

            <Footer/>
        </Container>
    );
}