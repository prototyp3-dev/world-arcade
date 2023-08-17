import { useRouter } from 'next/router';
import { useEffect, useState } from "react";
import Container from "react-bootstrap/Container";
import Header from '@/components/header';
import { ethers } from "ethers";
import Footer from '@/components/footer';


async function process_inspect_call(url: string) {
  let result;
  let response = await fetch(url, {method: 'GET', mode: 'cors',});

  if (response.status == 200) {
    let inspect_res = await response.json();
    let payload_utf8 = ethers.utils.toUtf8String(inspect_res.reports[0].payload);

    try {
      result = JSON.parse(payload_utf8);
    } catch (error) {
      result = payload_utf8
    }
  }

  return result;
}

async function get_cartridge(game_id: number) {
  let url = `${process.env.NEXT_PUBLIC_INSPECT_URL}/cartridges/${game_id}`;
  let game = await process_inspect_call(url);

  return game
}

export default function CartridgePage() {
  const router = useRouter();
  const [game_id, setGameId] = useState("");

  useEffect(() => {
    if (router.isReady && router.query.id) {
        setGameId(typeof router.query.id == "string"? router.query.id: router.query.id[0])
    //   let game_id = parseInt(typeof router.query.id == "string"? router.query.id: router.query.id[0]);
    //   get_cartridge(game_id)
    //   .then((result) => {
    //     setGameId(result);
    //   });
    }
  }, [router.isReady]);


  return (
    <Container>
      <Header activeKey=''/>

      <Footer/>
    </Container>
  );
}