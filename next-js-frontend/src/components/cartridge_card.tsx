import { useRouter } from "next/router";
import { Card, Image } from "react-bootstrap";

interface Author {
    name:string,
    link:string
}

interface CartridgeInfo {
    name?:string,
    summary?:string,
    description?:string,
    version?:string,
    status?:string,
    tags?:Array<string>,
    authors?:Array<Author>,
    url?:string
}

export interface CartridgeInterface {
    id:string,
    userAddress:string,
    info:CartridgeInfo,
    createdAt:number,
    cover:string,
}

export default function CartridgeCard({cartridge}: {cartridge: CartridgeInterface}) {
    const router = useRouter();

    let cover_on_click = () => {
        router.push({
          pathname: '/cartridge/[id]',
          query: { id: cartridge.id },
        })
    }

    return (
        <Card className="bg-dark text-light mb-4 box-shadow-hover" onClick={cover_on_click}>
            <Image className="card-img-top cartridge-cover" src={cartridge.cover? `data:image/png;base64,${cartridge.cover}`:"/cartesi.jpg"}/>
            <Card.Body className="text-wrap text-truncate" style={{height: "100px"}}>
                <h5 className="card-title">{cartridge.info.name || cartridge.id}</h5>
                <p className="card-subtitle mb-2">{cartridge.info.summary}</p>
            </Card.Body>

        </Card>
    );


}