import { useRouter } from 'next/router';
import { useEffect, useState } from "react";
import Container from "react-bootstrap/Container";
import Header from '@/components/header';
import Footer from '@/components/footer';
import Cartridge from '@/components/cartridge';
import { CartridgeInterface } from "@/components/cartridge_card";
import { ethers } from "ethers";


async function process_inspect_call(url: string) {
  let result: CartridgeInterface|null = null;
  let response = await fetch(url, {method: 'GET', mode: 'cors',});

  if (response.status == 200) {
    let inspect_res = await response.json();
    let payload_utf8 = ethers.utils.toUtf8String(inspect_res.reports[0].payload);

    try {
      result = JSON.parse(payload_utf8);
    } catch (error) {
      console.log(error);
    }
  }

  return result;
}

async function get_cartridge_info(game_id: string) {
  let url = `${process.env.NEXT_PUBLIC_INSPECT_URL}/cartridges/${game_id}`;
  let game = await process_inspect_call(url);

  return game
}

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