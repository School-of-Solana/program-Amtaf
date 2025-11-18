// src/app/components/EscrowPanel.tsx
"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { buildAnchorProvider, getProgram } from "./WalletContextProvider";
import * as anchor from "@coral-xyz/anchor";
import BN from "bn.js";

function lamportsToSol(lamports: number) {
  return lamports / anchor.web3.LAMPORTS_PER_SOL;
}

export default function EscrowPanel() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [status, setStatus] = useState<string | null>(null);
  const [escrowPda, setEscrowPda] = useState<PublicKey | null>(null);
  const [escrowState, setEscrowState] = useState<any>(null);
  const [amountSol, setAmountSol] = useState<number>(0.5);
  const [receiver, setReceiver] = useState<string>("");

  const provider = useMemoedProvider(connection, wallet);

  function useMemoedProvider(conn: any, w: any) {
    return React.useMemo(() => {
      if (!w || !w.publicKey) return null;
      return buildAnchorProvider(conn, w as any);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conn, w?.publicKey]);
  }

  const program = provider ? getProgram(provider) : null;

  // compute PDA given initializer & receiver
  const computePda = useCallback(
    (initializerKey: PublicKey, receiverKey: PublicKey) => {
      const [pda, bump] = PublicKey.findProgramAddressSync(
        [Buffer.from("ESCROW_SEED"), initializerKey.toBuffer(), receiverKey.toBuffer()],
        program!.programId
      );
      return [pda, bump];
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [program]
  );

  async function loadEscrow(pda: PublicKey) {
    if (!program) return;
    try {
      const state = await program.account.escrow.fetch(pda);
      setEscrowState(state);
      setEscrowPda(pda);
    } catch (err) {
      setStatus("No escrow found for that PDA");
      setEscrowState(null);
    }
  }

  async function handleInitialize() {
    if (!program || !wallet.publicKey) {
      setStatus("Connect wallet first");
      return;
    }
    try {
      const receiverKey = new PublicKey(receiver);
      const [pda, bump] = computePda(wallet.publicKey, receiverKey);
      setStatus("Initializing escrow...");
      const tx = await program.methods
        .initializeEscrow(new anchor.BN(amountSol * anchor.web3.LAMPORTS_PER_SOL))
        .accounts({
          initializer: wallet.publicKey,
          receiver: receiverKey,
          escrow: pda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      setStatus(`Initialized — tx: ${tx}`);
      await loadEscrow(pda);
    } catch (err: any) {
      console.error(err);
      setStatus("Init failed: " + (err.message ?? String(err)));
    }
  }

  async function handleDeposit() {
    if (!program || !wallet.publicKey || !escrowPda) {
      setStatus("Connect wallet and load escrow");
      return;
    }
    try {
      setStatus("Depositing...");
      const tx = await program.methods
        .depositEscrow()
        .accounts({
          initializer: wallet.publicKey,
          escrow: escrowPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([]) // wallet adapter signs
        .rpc();
      setStatus("Deposit tx: " + tx);
      await loadEscrow(escrowPda);
    } catch (err: any) {
      console.error(err);
      setStatus("Deposit failed: " + (err.message ?? String(err)));
    }
  }

  async function handleRelease() {
    if (!program || !wallet.publicKey || !escrowPda) {
      setStatus("Connect wallet and load escrow");
      return;
    }
    try {
      setStatus("Releasing funds...");
      const tx = await program.methods
        .releaseEscrow()
        .accounts({
          initializer: wallet.publicKey,
          receiver: escrowState?.receiver ?? wallet.publicKey,
          escrow: escrowPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      setStatus("Release tx: " + tx);
      await loadEscrow(escrowPda);
    } catch (err: any) {
      console.error(err);
      setStatus("Release failed: " + (err.message ?? String(err)));
    }
  }

  async function handleCancel() {
    if (!program || !wallet.publicKey || !escrowPda) {
      setStatus("Connect wallet and load escrow");
      return;
    }
    try {
      setStatus("Cancelling escrow...");
      const tx = await program.methods
        .cancelEscrow()
        .accounts({
          initializer: wallet.publicKey,
          receiver: escrowState?.receiver ?? wallet.publicKey,
          escrow: escrowPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      setStatus("Cancel tx: " + tx);
      await loadEscrow(escrowPda);
    } catch (err: any) {
      console.error(err);
      setStatus("Cancel failed: " + (err.message ?? String(err)));
    }
  }

  // UI: quick load by seeding with current wallet + receiver
  useEffect(() => {
    if (!wallet?.publicKey || !provider) return;
    // if receiver field is set, compute PDA and try load
    if (receiver) {
      try {
        const [pda] = computePda(wallet.publicKey!, new PublicKey(receiver));
        loadEscrow(pda);
      } catch {
        // ignore invalid receiver
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet?.publicKey, receiver, provider]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-[#071429] p-6 rounded-xl border border-[#122033]">
          <h2 className="text-lg font-semibold">Create / Initialize</h2>
          <label className="block mt-4 text-sm">Amount (SOL)</label>
          <input
            value={amountSol}
            onChange={(e) => setAmountSol(Number(e.target.value))}
            type="number"
            step="0.01"
            className="mt-1 w-full p-2 rounded bg-[#041027] outline-none"
          />
          <label className="block mt-4 text-sm">Receiver (pubkey)</label>
          <input
            value={receiver}
            onChange={(e) => setReceiver(e.target.value)}
            className="mt-1 w-full p-2 rounded bg-[#041027] outline-none"
            placeholder="Receiver public key"
          />
          <div className="flex gap-3 mt-4">
            <button onClick={handleInitialize} className="px-4 py-2 rounded bg-[#0b7fff]">
              Initialize
            </button>
            <button
              onClick={() => {
                if (!wallet.publicKey) return setStatus("Connect wallet");
                if (!receiver) return setStatus("Set receiver pubkey");
                const [pda] = computePda(wallet.publicKey, new PublicKey(receiver));
                setEscrowPda(pda);
                loadEscrow(pda);
              }}
              className="px-4 py-2 rounded bg-[#1f2937]"
            >
              Load PDA
            </button>
          </div>
        </div>

        <div className="bg-[#071429] p-6 rounded-xl border border-[#122033]">
          <h2 className="text-lg font-semibold">Escrow Info</h2>
          <div className="mt-3 text-sm">
            <div>PDA: {escrowPda?.toBase58() ?? "—"}</div>
            <div className="mt-2">Initializer: {escrowState?.initializer?.toBase58() ?? "—"}</div>
            <div>Receiver: {escrowState?.receiver?.toBase58() ?? "—"}</div>
            <div>Amount: {escrowState ? lamportsToSol(Number(escrowState.amount)) + " SOL" : "—"}</div>
            <div>Released: {escrowState ? String(escrowState.isReleased) : "—"}</div>
          </div>

          <div className="flex gap-3 mt-4">
            <button onClick={handleDeposit} className="px-4 py-2 rounded bg-[#0ba364]">
              Deposit (initializer)
            </button>
            <button onClick={handleRelease} className="px-4 py-2 rounded bg-[#ffb020]">
              Release (initializer)
            </button>
            <button onClick={handleCancel} className="px-4 py-2 rounded bg-[#ff4d6d]">
              Cancel (initializer)
            </button>
          </div>
        </div>
      </div>

      <div className="bg-[#071429] p-4 rounded border border-[#122033]">
        <div className="text-sm">Status: {status ?? "idle"}</div>
      </div>
    </div>
  );
}
