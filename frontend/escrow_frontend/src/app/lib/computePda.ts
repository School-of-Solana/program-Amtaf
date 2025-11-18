import { PublicKey } from "@solana/web3.js";

export function computeEscrowPda(initializer: PublicKey, receiver: PublicKey, programId: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("ESCROW_SEED"),
      initializer.toBuffer(),
      receiver.toBuffer(),
    ],
    programId
  );
}
