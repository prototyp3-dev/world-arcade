import { useRouter } from "next/router";
import { Card, Image, Table } from "react-bootstrap";

export interface CartridgeInterface {
    id:string,
    userAddress:string,
    info:Object,
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
            <Card.Body>
                <h5 className="card-title">{cartridge.info.name || cartridge.id}</h5>
                <p className="card-subtitle mb-2">{cartridge.info.summary}</p>
            </Card.Body>

        </Card>
    );


}