// Copyright 2022 Cartesi Pte. Ltd.

// Licensed under the Apache License, Version 2.0 (the "License"); you may not
// use this file except in compliance with the License. You may obtain a copy
// of the license at http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
// WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
// License for the specific language governing permissions and limitations
// under the License.

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { useSetChain, useWallets } from "@web3-onboard/react";

import {
    CartesiDApp,
    CartesiDApp__factory,
    InputBox,
    InputBox__factory,
    EtherPortal,
    EtherPortal__factory,
    ERC20Portal,
    ERC20Portal__factory,
    ERC721Portal,
    ERC721Portal__factory,
    DAppAddressRelay,
    DAppAddressRelay__factory
} from "./generated/rollups";
import { ConnectedChain } from "@web3-onboard/core";

import configFile from "./config.json";
import { JsonRpcSigner } from "@ethersproject/providers";

const config: any = configFile;


export interface RollupsContracts {
    dappContract: CartesiDApp;
    signer: JsonRpcSigner;
    realyContract: DAppAddressRelay;
    inputContract: InputBox;
    etherPortalContract: EtherPortal;
    erc20PortalContract: ERC20Portal;
    erc721PortalContract: ERC721Portal;
}

export const useRollups = (dAddress: string): RollupsContracts | undefined => {
    const [contracts, setContracts] = useState<RollupsContracts | undefined>();
    const [{ connectedChain }] = useSetChain();
    const [connectedWallet] = useWallets();
    const [dappAddress] = useState<string>(dAddress);

    useEffect(() => {
        const connect = async (
            chain: ConnectedChain
            ): Promise<RollupsContracts> => {
            const provider = new ethers.providers.Web3Provider(
                connectedWallet.provider
            );
            const signer = provider.getSigner();

            let dappRelayAddress = "";
            if(config.chains[chain.id]?.DAppRelayAddress) {
                dappRelayAddress = config.chains[chain.id].DAppRelayAddress;
            } else {
                console.error(`No dapp relay address address defined for chain ${chain.id}`);
            }

            let inputBoxAddress = "";
            if(config.chains[chain.id]?.InputBoxAddress) {
                inputBoxAddress = config.chains[chain.id].InputBoxAddress;
            } else {
                console.error(`No input box address address defined for chain ${chain.id}`);
            }

            let etherPortalAddress = "";
            if(config.chains[chain.id]?.EtherPortalAddress) {
                etherPortalAddress = config.chains[chain.id].EtherPortalAddress;
            } else {
                console.error(`No ether portal address address defined for chain ${chain.id}`);
            }

            let erc20PortalAddress = "";
            if(config.chains[chain.id]?.Erc20PortalAddress) {
                erc20PortalAddress = config.chains[chain.id].Erc20PortalAddress;
            } else {
                console.error(`No erc20 portal address address defined for chain ${chain.id}`);
                alert(`No box erc20 portal address defined for chain ${chain.id}`);
            }

            let erc721PortalAddress = "";
            if(config.chains[chain.id]?.Erc721PortalAddress) {
                erc721PortalAddress = config.chains[chain.id].Erc721PortalAddress;
            } else {
                console.error(`No erc721 portal address address defined for chain ${chain.id}`);
                alert(`No box erc721 portal address defined for chain ${chain.id}`);
            }
            // dapp contract 
            const dappContract = CartesiDApp__factory.connect(dappAddress, signer);

            // relay contract
            const realyContract = DAppAddressRelay__factory.connect(dappRelayAddress, signer);

            // input contract
            const inputContract = InputBox__factory.connect(inputBoxAddress, signer);
            
            // portals contracts
            const etherPortalContract = EtherPortal__factory.connect(etherPortalAddress, signer);

            const erc20PortalContract = ERC20Portal__factory.connect(erc20PortalAddress, signer);

            const erc721PortalContract = ERC721Portal__factory.connect(erc721PortalAddress, signer);

            return {
                dappContract,
                signer,
                realyContract,
                inputContract,
                etherPortalContract,
                erc20PortalContract,
                erc721PortalContract,
            };
        };
        if (connectedWallet?.provider && connectedChain) {
            connect(connectedChain).then((contracts) => {
                setContracts(contracts);
            });
        }
    }, [connectedWallet, connectedChain, dappAddress]);
    return contracts;
};
