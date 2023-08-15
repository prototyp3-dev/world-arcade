import "@/styles/styles.scss";
import type { AppProps } from "next/app";
import { Web3OnboardProvider, init } from '@web3-onboard/react'
import injectedModule from '@web3-onboard/injected-wallets'

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
    name: 'Web3-Onboard Demo',
    icon: '<svg>App Icon</svg>',
    description: 'A demo of Web3-Onboard.'
  },
  connect: {
    autoConnectLastWallet: true
  }
})


export default function App({ Component, pageProps }: AppProps) {
  return (
    <Web3OnboardProvider web3Onboard={web3Onboard}>
      <Component {...pageProps} />
    </Web3OnboardProvider>
  );
}
