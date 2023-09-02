import { createClient, fetchExchange } from "@urql/core";
import { retryExchange } from '@urql/exchange-retry';
import fetch from "cross-fetch";
import {
    Notice,
    GetInputDocument,
    Report
} from "@/generated/graphql";


/**
 * Queries a GraphQL server for notices based on an input index
 * @param url URL of the GraphQL server
 * @param input input index
 * @returns Object with a list of notices and reports for an input
 */
export const getInputReportsAndNotices = async (
    url: string,
    inputIndex: number
): Promise<{notices: Array<Notice>, reports: Array<Report>}> => {
    // create GraphQL client to reader server
    const client = createClient({ url, exchanges: [retryExchange({
        initialDelayMs: 2000, // 2 seconds
        maxNumberAttempts: Number.POSITIVE_INFINITY,
        retryIf: error => { // retry if has a graphql error (ex: notice not found for this inputIndex)
            console.log("Checking error then retrying...")
            return !!(error.graphQLErrors.length > 0);
        }}), fetchExchange], fetch });

    // query the GraphQL server for the notice
    console.log(
        `querying ${url} for notices and reports for input with index "${inputIndex}"...`
    );

    const { data, error } = await client
        .query(GetInputDocument, { inputIndex })
        .toPromise();


    if (data?.input) {
        let result = {notices: [] as Array<Notice>, reports: [] as Array<Report>}
        // add notices to the result
        for (let i = 0; i < data.input.notices.edges.length; i++) {
            result.notices.push(data.input.notices.edges[i].node);
        }

        // add reports to the result
        for (let i = 0; i < data.input.reports.edges.length; i++) {
            result.reports.push(data.input.reports.edges[i].node);
        }
        return result;
    } else {
        throw new Error(error?.message);
    }
};