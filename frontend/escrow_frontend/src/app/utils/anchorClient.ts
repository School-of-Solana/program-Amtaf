import * as anchor from "@coral-xyz/anchor";
import idl from "../../../anchor_project/escrow/target/idl/escrow.json";
import { PublicKey } from "@solana/web3.js";

export const programID = new PublicKey(idl.metadata.address);

export function getProgram(wallet: any, connection: any) {
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });

  anchor.setProvider(provider);

  return new anchor.Program(idl as anchor.Idl, programID, provider);
}
