import { getInputReportsAndNotices } from "@/graphql/inputs";
import { ethers } from "ethers";

export function sleep(ms:number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function check_upload_report(input_index:number) {
    if (!process.env.NEXT_PUBLIC_GRAPHQL_URL) throw new Error("Undefined graphql url.");

    const result = await getInputReportsAndNotices(process.env.NEXT_PUBLIC_GRAPHQL_URL, input_index);

    if (result.reports.length == 0) {
        throw new Error(`Upload Failed! Report not found for input ${input_index}`);
    }

    const payload_utf8 = ethers.utils.toUtf8String(result.reports[0].payload);
    const payload_json = JSON.parse(payload_utf8);

    if (payload_json.status == "STATUS_SUCCESS") {
        const game_id = payload_json.hash;
        return game_id;
    } else {
        throw new Error(`Upload Failed! ${payload_json}`);
    }
}

export async function handle_file_input(e:React.ChangeEvent<HTMLInputElement>, callback:Function) {
    if (!e.target.files || e.target.files.length == 0) {
        return;
    }

    let file = e.target.files[0];

    const reader = new FileReader();
    reader.onload = async (readerEvent) => {
        let data: ArrayBuffer;
        if (readerEvent.target?.result instanceof ArrayBuffer) {
            data = readerEvent.target?.result;
        } else {
            data = {} as ArrayBuffer;
        }
        if (data) {
            callback(new Uint8Array(data));
        }
    };

    reader.readAsArrayBuffer(file);
}