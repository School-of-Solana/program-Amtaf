"use client";

import React, { useEffect, useState } from "react";
import { PublicKey, Connection } from "@solana/web3.js";
import { buildAnchorProvider, getProgram } from "./WalletContextProvider";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import BN from "bn.js";

type Props = {
    escrowPda: PublicKey;
};

export default function EscrowCard({ escrowPda }: Props) {
    const { connection } = useConnection();
    const wallet = useWallet();
    const [escrowState, setEscrowState] = useState<any | null>(null);
    const [loading, setLoading] = useState(false);

    const programId = process.env.NEXT_PUBLIC_PROGRAM_ID!;

    async function fetchState() {
        if (!wallet.publicKey) return;
        const provider = buildAnchorProvider(connection, wallet as any);
        const program = getProgram(provider);
        try {
            const acc = await program.account.escrow.fetch(escrowPda);
            setEscrowState(acc);
        } catch (e) {
            console.error("fetch state err", e);
            setEscrowState(null);
        }
    }

    useEffect(() => {
        fetchState();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [wallet.publicKey]);

    async function handleRelease() {
        if (!wallet.publicKey) throw new Error("connect wallet");
        setLoading(true);
        const provider = buildAnchorProvider(connection, wallet as any);
        const program = getProgram(provider);
        try {
            const tx = await program.methods
                .releaseEscrow()
                .accounts({
                    initializer: wallet.publicKey,
                    receiver: escrowState.receiver,
                    escrow: escrowPda,
                    systemProgram: program.provider.connection._rpcEndpoint ? program.provider.connection._rpcEndpoint : undefined,
                })
                // .signers([]) // client wallet is used by AnchorProvider
                .rpc();
            console.log("release tx", tx);
            await fetchState();
        } catch (err) {
            console.error(err);
            alert("Release failed: " + (err as any).toString());
        } finally {
            setLoading(false);
        }
    }

    async function handleCancel() {
        if (!wallet.publicKey) throw new Error("connect wallet");
        setLoading(true);
        const provider = buildAnchorProvider(connection, wallet as any);
        const program = getProgram(provider);
        try {
            const tx = await program.methods
                .cancelEscrow()
                .accounts({
                    initializer: wallet.publicKey,
                    receiver: escrowState.receiver,
                    escrow: escrowPda,
                    systemProgram: program.provider.connection._rpcEndpoint ? program.provider.connection._rpcEndpoint : undefined,
                })
                .rpc();
            console.log("cancel tx", tx);
            await fetchState();
        } catch (err) {
            console.error(err);
            alert("Cancel failed: " + (err as any).toString());
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="card">
            <div className="flex items-center justify-between mb-3">
                <div>
                    <div className="small">Escrow PDA</div>
                    <div className="mono" style={{ fontSize: 13 }}>{escrowPda.toBase58()}</div>
                </div>
            </div>

            {escrowState ? (
                <>
                    <div className="kv">
                        <div className="small">Initializer</div>
                        <div className="mono">{escrowState.initializer.toBase58()}</div>
                    </div>
                    <div className="kv mt-2">
                        <div className="small">Receiver</div>
                        <div className="mono">{escrowState.receiver.toBase58()}</div>
                    </div>
                    <div className="kv mt-2">
                        <div className="small">Amount (lamports)</div>
                        <div className="mono">{escrowState.amount.toString()}</div>
                    </div>
                    <div className="kv mt-2">
                        <div className="small">Released</div>
                        <div className="mono">{escrowState.isReleased ? "Yes" : "No"}</div>
                    </div>

                    <div className="mt-4 flex gap-3">
                        <button className="btn" onClick={fetchState}>Refresh</button>
                        <button className="btn" onClick={handleRelease} disabled={loading || escrowState.isReleased}>Release</button>
                        <button className="btn" onClick={handleCancel} disabled={loading}>Cancel</button>
                    </div>
                </>
            ) : (
                <div className="small">No escrow state found. Make sure you initialized the PDA and deposited funds.</div>
            )}
        </div>
    );
}
