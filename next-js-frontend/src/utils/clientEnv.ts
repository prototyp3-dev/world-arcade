import { str, envsafe, num, url  } from 'envsafe';


export const envClient = envsafe({
    NEXT_PUBLIC_INSPECT_URL: url({
    // because of how nextjs deals with transpiling public env vars
    // we have to put it in as `input`
    input: process.env.NEXT_PUBLIC_INSPECT_URL,
    desc: "Cartesi Node inspect endpoint."
  }),
  NEXT_PUBLIC_GRAPHQL_URL: url({
    input: process.env.NEXT_PUBLIC_GRAPHQL_URL,
    desc: "Cartesi Node graphQL endpoint."
  }),
  NEXT_PUBLIC_DAPP_ADDR: str({
    input: process.env.NEXT_PUBLIC_DAPP_ADDR,
    desc: "Cartesi DApp ETH address."
  }),
  NEXT_PUBLIC_MAX_SIZE_TO_SEND: num({
    input: process.env.NEXT_PUBLIC_MAX_SIZE_TO_SEND,
    desc: "Max size (in bytes) of data to send in a transaction."
  }),
  NEXT_PUBLIC_INPUT_BOX_ADDR: str({
    default: "0x59b22D57D4f067708AB0c00552767405926dc768",
    input: process.env.NEXT_PUBLIC_INPUT_BOX_ADDR,
    desc: "Cartesi Rollup Input Box contract address."
  }),
})
