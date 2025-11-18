"use client";

import React, { PropsWithChildren, useMemo } from "react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import {
  ConnectionProvider,
  WalletProvider
} from "@solana/wallet-adapter-react";

import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { clusterApiUrl, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import idl from "@/idl/escrow.json";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

// CSS is correctly imported from globals.css now

export const WalletContextProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const endpoint = process.env.NEXT_PUBLIC_CLUSTER ?? clusterApiUrl("devnet");
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

export function buildAnchorProvider(connection: any, wallet: any) {
  return new AnchorProvider(connection, wallet, AnchorProvider.defaultOptions());
}

export function getProgram(provider: AnchorProvider) {
  const programId = new PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID!);
  return new Program(idl as any, programId, provider);
}

export function ConnectButton() {
  return <WalletMultiButton />;
}

export default WalletContextProvider;
