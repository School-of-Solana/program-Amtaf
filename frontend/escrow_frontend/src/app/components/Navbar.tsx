"use client";

import React from "react";
import { ConnectButton } from "./WalletContextProvider";

export default function Navbar() {
    return (
        <div className="nav card p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div style={{
                    width: 48, height: 48, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'linear-gradient(135deg,#7c3aed, #00ffd1)'
                }}>
                    <strong style={{ color: '#030313' }}>ES</strong>
                </div>
                <div>
                    <div style={{ fontWeight: 700 }}>Escrow Dashboard</div>
                    <div className="small">Dark Web3 theme</div>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <div className="small mono">Network: {process.env.NEXT_PUBLIC_CLUSTER?.includes("devnet") ? "Devnet" : "Custom"}</div>
                 <ConnectButton /> 
            </div>
        </div>
    );
}
