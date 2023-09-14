import { useRouter } from 'next/router';
import { useEffect, useState } from "react";
import Container from "react-bootstrap/Container";
import Header from '@/components/header';
import Footer from '@/components/footer';
import Cartridge from '@/components/cartridge';
import { CartridgeInterface } from "@/components/cartridge_card";
import { get_cartridge_info } from '@/inspect/cartridge';


export default function CartridgePage() {
  const router = useRouter();
  const [game, setGame] = useState<CartridgeInterface|null>(null);

  useEffect(() => {
    if (router.isReady && router.query.id) {
      let game_id = typeof router.query.id == "string"? router.query.id: router.query.id[0];
      get_cartridge_info(game_id)
      .then((result) => {
        setGame(result);
      });
    }
  }, [router.isReady]);


  return (
    <Container>
      <Header activeKey=''/>

      <Cartridge game={game}/>

      <Footer/>
    </Container>
  );
}