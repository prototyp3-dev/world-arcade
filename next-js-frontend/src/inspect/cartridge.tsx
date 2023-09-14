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

export const get_cartridge_info = async(game_id: string): Promise<CartridgeInterface|null> => {
  let url = `${process.env.NEXT_PUBLIC_INSPECT_URL}/cartridges/${game_id}`;
  let game = await process_inspect_call(url);

  return game
}

export const get_cartridge = async (game_id:string): Promise<Uint8Array> => {
    let url = `${process.env.NEXT_PUBLIC_INSPECT_URL}/cartridges/${game_id}/cartridge`;
    let response = await fetch(url, {method: 'GET', mode: 'cors',});

    let allData = "0x";
    if (response.status == 200) {
        let inspect_res = await response.json();

        try {
            for (let i = 0; i < inspect_res.reports.length; i++) {
                allData = allData.concat(inspect_res.reports[i].payload.substring(2));
            }
        } catch (error) {
            console.log(error);
        }
    }

    return ethers.utils.arrayify(allData);
}

export const get_cartridge_list = async(): Promise<CartridgeInterface[]> => {
    let url = `${process.env.NEXT_PUBLIC_INSPECT_URL}/cartridges`;

    let response = await fetch(url, {method: "GET", mode: "cors"});
    let cartridges:CartridgeInterface[] = [];

    if (response.status != 200) return cartridges;

    let inspect_res = await response.json();
    let allData = "0x";
    for (let i = 0; i < inspect_res.reports.length; i++) {
        allData = allData.concat(inspect_res.reports[i].payload.substring(2));
    }

    cartridges = JSON.parse(ethers.utils.toUtf8String(allData));
    return cartridges
}