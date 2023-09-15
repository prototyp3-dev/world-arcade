import { VerifyReplayNotice } from "@/pages/ranking/[id]";
import { useEffect, useState } from "react";
import { Button, OverlayTrigger, Popover, Table } from "react-bootstrap";
import { GiPodiumSecond, GiPodiumThird, GiPodiumWinner } from "react-icons/gi";
import { RiExpandUpDownLine } from "react-icons/ri";

function formatScore(higherScore:number, scoreToFormat:number) {
    const higherScoreStr = higherScore.toString();
    const scoreToFormatStr = scoreToFormat.toString();

    return '0'.repeat(higherScoreStr.length-scoreToFormatStr.length) + scoreToFormatStr;
}

function get_ranking_icon(position:number) {
    if (position == 0) return <GiPodiumWinner/>;
    if (position == 1) return <GiPodiumSecond/>;
    if (position == 2) return <GiPodiumThird/>;

    return position+1;
}

function build_popover(obj:Array<any>) {
    if (obj.length == 0) return;

    const keys = Object.keys(obj[0]);
    return (
        <Popover>
            <Popover.Body className="">
                <Table className="m-0" striped size="sm">
                    <thead>
                        <tr>
                            {
                                keys.map((key) => {
                                    return (
                                        <th key={key}>{key}</th>
                                    )
                                })
                            }
                        </tr>
                    </thead>

                    <tbody>
                        {
                            obj.map((value, index) => {
                                return (
                                    <tr key={index}>
                                        {
                                            keys.map((key:string) => {
                                                return <td key={`${key}-${value[key]}`}>{value[key]}</td>
                                            })
                                        }
                                    </tr>
                                )
                            })
                        }

                    </tbody>
                </Table>
            </Popover.Body>
        </Popover>
    )

}

export default function Ranking({ranking}: {ranking:Array<VerifyReplayNotice>}) {
    const [rankingItems, setRankingItems] = useState<Array<string>>([]);
    if (ranking.length == 0) {
        return (
            <div className="text-center">
                <h1>Be the first to play!</h1>
            </div>

        )
    }

    useEffect(() => {
        setRankingItems(Object.keys(ranking[0].outcard_json));
    }, [])

    return (
        <Table variant="dark">
            <thead>
                <tr>
                    <th>#</th>
                    <th>User</th>
                    {
                        rankingItems.map((item) => {
                            return <th key={item}>{item}</th>
                        })
                    }
                    <th>Timestamp</th>
                </tr>
            </thead>

            <tbody>
                {
                    ranking.map((replayNotice, pos:number) => {
                        return (
                        <tr key={pos}>
                            <td>
                                {get_ranking_icon(pos)}
                            </td>

                            <td>{replayNotice.player_id}</td>

                            {rankingItems.map((item:string, index:number) => {
                                if (typeof replayNotice.outcard_json[item] === "object") {
                                    const popover = build_popover(replayNotice.outcard_json[item]);
                                    if (!popover) return <td>-</td>;

                                    return (
                                        <td key={index}>
                                            <OverlayTrigger trigger="click" placement="bottom" overlay={popover}>
                                                <Button className="p-1" variant="outline-light">
                                                    {Object.keys(replayNotice.outcard_json[item]).toString()} <RiExpandUpDownLine/>
                                                </Button>
                                            </OverlayTrigger>
                                        </td>
                                    )
                                }
                                if (item == "score") {
                                    replayNotice.outcard_json[item] = formatScore(
                                        "max_score" in ranking[0].outcard_json? ranking[0].outcard_json["max_score"]:ranking[0].outcard_json["score"],
                                        replayNotice.outcard_json["score"]
                                    )
                                }
                                return <td key={index}>{replayNotice.outcard_json[item].toString()}</td>
                            })}

                            <td>
                                {new Date(replayNotice.timestamp*1000).toLocaleString()}
                            </td>
                        </tr>
                        )
                    })
                }
            </tbody>
        </Table>
    )

}