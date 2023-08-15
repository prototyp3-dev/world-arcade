import { useRouter } from "next/router";
import { Card, Image, Table } from "react-bootstrap";

export interface Cartridge {
    id:string,
    name:string,
    userAddress:string,
    createdAt:number,
    card: Uint8Array;
}

export default function CartridgeCard({cartridge, cover}: {cartridge: Cartridge, cover:string | null}) {
    const router = useRouter();

    let card_on_click = () => {
        router.push({
          pathname: '/cartridge/[id]',
          query: { id: cartridge.id },
        })
    }

    return (
        <Card className="bg-dark text-light mb-4 box-shadow-hover" onClick={card_on_click}>
            <Card.Body>
                <Card.Title>{cartridge.name}</Card.Title>
                
                <div className="text-center border border-dark rounded">
                    <Image src={cover? cover:"./arcade_background.jpg"} height={150}/>
                </div>
                
                
                <Card.Text>
                {/* {auction.description} */}
                Description
                </Card.Text>

                <Table responsive striped variant="dark" size="sm" style={{fontSize: '12px'}}>
                    <tbody>
                        <tr>
                            <td>Uploaded by</td>
                            <td>{cartridge.userAddress}</td>
                        </tr>
                        <tr>
                            <td>Created At</td>
                            <td>{new Date(cartridge.createdAt*1000).toLocaleString()}</td>
                        </tr>
                    </tbody>
                </Table>
            </Card.Body>

        </Card>
    );


}