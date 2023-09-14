import { CartridgeInterface } from "@/components/cartridge_card";
import Footer from "@/components/footer";
import Header from "@/components/header";
import Ranking from "@/components/ranking";
import { getNotices } from "@/graphql/notices";
import { get_cartridge_info } from "@/inspect/cartridge";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { Button, Container, Spinner } from "react-bootstrap";
import { PiArrowFatLeftBold } from "react-icons/pi";


export interface VerifyReplayNotice {
    cartridge_id: string,
    player_id: string,
    timestamp: number,
    valid: boolean,
    outcard_data: string,
    outcard_json: Record<string, any>,
    score: number,
}

function insertSorted(ranking:Array<VerifyReplayNotice>, score:VerifyReplayNotice) {
    let i = 0;
    while (i < ranking.length && ranking[i].score > score.score) i++;
    ranking.splice(i, 0, score);
}

function decodeAndParseVerifyReplayNotice(payload: string) {
  let notice_array = JSON.parse((window as any).decodeVerifyReplayNotice(payload)).Array;
  let notice: VerifyReplayNotice = {
      cartridge_id: notice_array[0],
      player_id: notice_array[1],
      timestamp: notice_array[2],
      valid: notice_array[3],
      outcard_data: notice_array[4],
      outcard_json: {},
      score: 0
  }

  if (notice.outcard_data.substring(0, 4) == 'JSON') {
      notice.outcard_json = JSON.parse(notice.outcard_data.substring(4));
      if ('score' in notice.outcard_json) {
          notice.score = notice.outcard_json.score as number;
      }
  }
  return notice;
}

async function get_ranking(game_id:string) {
    if (!process.env.NEXT_PUBLIC_GRAPHQL_URL) throw new Error("Undefined graphql url.");

    let notices = await getNotices(process.env.NEXT_PUBLIC_GRAPHQL_URL);
    let ranking:Array<VerifyReplayNotice> = [];

    for (let i = 0; i < notices.length; i++) {
      try {
        const notice = decodeAndParseVerifyReplayNotice(notices[i].payload);
        if (notice.cartridge_id == game_id && notice.valid) {
          insertSorted(ranking, notice);
        }
      } catch (error) {
        console.log((error as Error).message)
      }
    }

    return ranking;
}

export default function RankingPage() {
    const router = useRouter();
    const [gameId, setGameId] = useState("");
    const [game, setGame] = useState<CartridgeInterface>();
    const [ranking, setRanking] = useState<Array<VerifyReplayNotice>|null>(null);


    useEffect(() => {
      if (router.isReady && router.query.id) {
        const game_id = typeof router.query.id == "string"? router.query.id: router.query.id[0]
        setGameId(game_id);

        get_ranking(game_id)
        .then((result)=>{
            setRanking(result);
        })

        get_cartridge_info(game_id)
        .then((result) => {
          if (!result) return;
          setGame(result);
        })
      }
    }, [router.isReady]);

    return (
      <Container>
        <Header activeKey=''/>

        <Container className="bg-dark text-light rounded">

          <div className="d-flex align-items-center">
            <Button className="me-2" title="back to game page" variant="outline-light mt-2" onClick={() => {router.push(`/cartridge/${gameId}`)}}>
              <PiArrowFatLeftBold/>
            </Button>
            <h1 className="m-0">{game?.info.name}</h1>
          </div>

          {
            ranking
            ?
              <Ranking ranking={ranking}/>
            :
              <div className="text-center">
                <Spinner className="my-2" animation="border" variant="light">
                    <span className="visually-hidden">Loading...</span>
                </Spinner>
              </div>
          }

        </Container>

        <Footer/>
      </Container>
    );
  }