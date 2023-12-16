import "@/styles/styles.scss";
import type { AppProps } from "next/app";
import { Web3OnboardProvider, init } from '@web3-onboard/react'
import injectedModule from '@web3-onboard/injected-wallets'
import { ethers } from "ethers";
import { envClient } from "@/utils/clientEnv";

const ethereumBlockchain = {
  id: '0x1',
  token: 'ETH',
  label: 'Ethereum',
}
const chains = [ethereumBlockchain]
const wallets = [injectedModule()]

const web3Onboard = init({
  wallets,
  chains,
  appMetadata: {
    name: 'World Arcade Cartesi Rollups',
    icon: "/cartesi.jpg",
    description: 'The World Arcade allows users to play riscv-binaries of games on a RISC-V Cartesi Machine on the browser. The game moves are submited onchain so the session can be replayed in a Cartesi Rollups DApp to generate a provable score.'
  },
  connect: {
    autoConnectLastWallet: true
  }
})


if (typeof window !== "undefined") {
  // Client-side-only code
  require('../../public/wasm_exec');
  const go = new (window as any).Go();

  let wasmData = window.sessionStorage.getItem("go_wasm");
  if (wasmData) {
    const wasmBytes = ethers.utils.arrayify(wasmData);
    go.importObject.env["syscall/js.finalizeRef"] = () => {}
    WebAssembly.instantiate(wasmBytes, go.importObject).then( (obj:any) => {
      const wasm = obj.instance;
      go.run(wasm);
    })
  } else {
    let url = `${envClient.NEXT_PUBLIC_INSPECT_URL}/wasm`;

    fetch(url)
    .then(response => response.json())
    .then(data => {
      if (data.reports.length > 0) {
        let allData = "0x";
        for (let i = 0; i < data.reports.length; i++) {
          allData = allData.concat(data.reports[i].payload.substring(2));
        }
        const wasmBytes = ethers.utils.arrayify(allData);

        //remove the message: syscall/js.finalizeRef not implemented
        go.importObject.env["syscall/js.finalizeRef"] = () => {}

        WebAssembly.instantiate(wasmBytes, go.importObject).then( (obj:any) => {
          const wasm = obj.instance;
          go.run(wasm);
          window.sessionStorage.setItem("go_wasm", allData);
        })
      }
      console.log("WASM loaded!");

    }).catch(() => {
      console.log("Something went wrong while loading wasm");
    });
  }
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <Web3OnboardProvider web3Onboard={web3Onboard}>
      <Component {...pageProps} />
    </Web3OnboardProvider>
  );
}
