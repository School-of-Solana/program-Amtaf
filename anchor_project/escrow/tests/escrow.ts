import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Escrow } from "../target/types/escrow";
//import { TransactionConfirmationStrategy } from '@solana/web3.js';
import {assert} from "chai";

describe("escrow program", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.local();
  anchor.setProvider(provider);

  const program = anchor.workspace.escrow as Program<Escrow>;
  const initializer = anchor.web3.Keypair.generate();
  let receiver = anchor.web3.Keypair.generate();

  let escrowPda: anchor.web3.PublicKey;
  let bump: number;

  const amount = 2 * anchor.web3.LAMPORTS_PER_SOL;

  before(async()=>{
     const sig = await provider.connection.requestAirdrop(initializer.publicKey, 3 * anchor.web3.LAMPORTS_PER_SOL);
     const latestBlockhash = await provider.connection.getLatestBlockhash();
     await provider.connection.confirmTransaction({signature: sig, ...latestBlockhash},
      "confirmed"
     );
    });

  it("Initialize escrow account", async () =>{
    [escrowPda, bump] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("ESCROW_SEED"),
        initializer.publicKey.toBuffer(),
        receiver.publicKey.toBuffer(),
      ],
      program.programId
    );

  await program.methods
    .initializeEscrow(new anchor.BN(amount))
    .accounts({
      initializer: initializer.publicKey,
      receiver: receiver.publicKey,
      escrow: escrowPda,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([initializer])
    .rpc();

    const escrowState = await program.account.escrow.fetch(escrowPda);
    assert.equal(escrowState.initializer.toBase58(), initializer.publicKey.toBase58());
    assert.equal(escrowState.receiver.toBase58(), receiver.publicKey.toBase58());
    assert.equal(escrowState.amount.toNumber(), amount);
    assert.isFalse(escrowState.isReleased);
        
  });

  it("Deposit to escrow PDA", async () => {
    //Airdop extra sol to intializer so they can deposit
    const sig = await provider.connection.requestAirdrop(
      initializer.publicKey,
      7 * anchor.web3.LAMPORTS_PER_SOL
    );
    const latestBlockhash = await provider.connection.getLatestBlockhash();
    await provider.connection.confirmTransaction(
      {signature: sig, ...latestBlockhash }, "confirmed"
    );
    //fetch balances before deposit
    const beforeEscrowBalance = await provider.connection.getBalance(escrowPda);
    const beforeUserBalance = await provider.connection.getBalance(initializer.publicKey);
    //deposit
    const txSig = await program.methods
      .depositEscrow()
      .accounts({
        initializer: initializer.publicKey,
        escrow: escrowPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([initializer])
      .rpc();

    //confirm transaction properly
    const latestBlockhash2 = await provider.connection.getLatestBlockhash();
    await provider.connection.confirmTransaction(
      {signature: txSig, ...latestBlockhash2},
      "confirmed"
    ); 

    //check balances after deposit
    const afterEscrowbalance = await provider.connection.getBalance(escrowPda);
    const afterUserBalance = await provider.connection.getBalance(initializer.publicKey);
    //check pda received the right amount
    assert.equal(
      afterEscrowbalance - beforeEscrowBalance,amount,
      "Escrow Account didnt receive the right amount"
    );
    //check initializer spent the right amount + fee
    assert.isBelow(beforeUserBalance - afterUserBalance, amount + 5000,
      "initiaalizer should spend the deposit amount plus fees"
    );
  });
   it("Fails when non-initializer tries to release escrow", async () => {
  // Recreate clean escrow
  const freshReceiver = anchor.web3.Keypair.generate();
  const attacker = anchor.web3.Keypair.generate();

  const [newPda] =
    anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("ESCROW_SEED"),
        initializer.publicKey.toBuffer(),
        freshReceiver.publicKey.toBuffer(),
      ],
      program.programId
    );

  // Airdrop initializer
  await provider.connection.requestAirdrop(
    initializer.publicKey,
    2 * anchor.web3.LAMPORTS_PER_SOL
  );

  // Init escrow
  await program.methods
    .initializeEscrow(new anchor.BN(amount))
    .accounts({
      initializer: initializer.publicKey,
      receiver: freshReceiver.publicKey,
      escrow: newPda,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([initializer])
    .rpc();

  await program.methods
    .depositEscrow()
    .accounts({
      initializer: initializer.publicKey,
      escrow: newPda,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([initializer])
    .rpc();

  // Try release as attacker
  try {
    await program.methods
      .releaseEscrow()
      .accounts({
        initializer: attacker.publicKey,
        receiver: freshReceiver.publicKey,
        escrow: newPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([attacker])
      .rpc();

    assert.fail("Release by attacker should fail");
  } catch (err) {
    assert.include(err.toString(), "Unauthorized");
  }
});
  it("Release funds from escrow to receiver", async() => {
    //the initializer has to have transaction fess so we airdrop 
    const sig = await provider.connection.requestAirdrop(
      initializer.publicKey,
      1 * anchor.web3.LAMPORTS_PER_SOL
    );
    const latestBlockhash = await provider.connection.getLatestBlockhash();
    await provider.connection.confirmTransaction({signature: sig, ...latestBlockhash});
    //fetch balance before release
    const beforeReceiverBalance = await provider.connection.getBalance(receiver.publicKey);
    const beforeEscrowBalance = await provider.connection.getBalance(escrowPda);
    //Execute release
    const txSig = await program.methods
      .releaseEscrow()
      .accounts({
        initializer: initializer.publicKey,
        receiver: receiver.publicKey,
        escrow: escrowPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([initializer])
      .rpc();

const latest2 = await provider.connection.getLatestBlockhash();
await provider.connection.confirmTransaction({ signature: txSig, ...latest2 }, "confirmed");      
//fetch balances after release
const afterReceiverBalance = await provider.connection.getBalance(receiver.publicKey);
const afterEscrowBalance = await provider.connection.getBalance(escrowPda);

//checks
assert.equal(
  afterReceiverBalance - beforeReceiverBalance, amount,
  "Receiver didnt receive the escrow amount"
);

assert.equal(
  beforeEscrowBalance - afterEscrowBalance,amount,
  "Escrow PDA should have sent the full amount"
);

const escrowState = await program.account.escrow.fetch(escrowPda);
assert.isTrue(escrowState.isReleased, "Escrow state should be marked as released");

  });
  it("Fails when trying to release escrow twice", async () => {
  // First release should succeed (rebuild escrow if needed)
  let escrowState = await program.account.escrow.fetch(escrowPda);
  if (!escrowState.isReleased) {
    await program.methods
      .releaseEscrow()
      .accounts({
        initializer: initializer.publicKey,
        receiver: receiver.publicKey,
        escrow: escrowPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([initializer])
      .rpc();
  }

  // Second release MUST fail
  try {
    await program.methods
      .releaseEscrow()
      .accounts({
        initializer: initializer.publicKey,
        receiver: receiver.publicKey,
        escrow: escrowPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([initializer])
      .rpc();

    assert.fail("Second release should have thrown an error");
  } catch (err) {
    assert.include(err.toString(), "AlreadyReleased");
  }
});

  it("Fails when non-initializer tries to cancel escrow", async () => {
  // Create a fresh escrow instance for this test
  const fakeReceiver = anchor.web3.Keypair.generate();
  const badActor = anchor.web3.Keypair.generate(); // unauthorized signer

  const [newPda, newBump] =
    anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("ESCROW_SEED"),
        initializer.publicKey.toBuffer(),
        fakeReceiver.publicKey.toBuffer(),
      ],
      program.programId
    );

  // Airdrop initializer so they can fund the escrow
  await provider.connection.requestAirdrop(
    initializer.publicKey,
    2 * anchor.web3.LAMPORTS_PER_SOL
  );

  // Initialize escrow
  await program.methods
    .initializeEscrow(new anchor.BN(amount))
    .accounts({
      initializer: initializer.publicKey,
      receiver: fakeReceiver.publicKey,
      escrow: newPda,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([initializer])
    .rpc();

  // Deposit
  await program.methods
    .depositEscrow()
    .accounts({
      initializer: initializer.publicKey,
      escrow: newPda,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([initializer])
    .rpc();

  // Try cancelling using a different signer
  try {
    await program.methods
      .cancelEscrow()
      .accounts({
        initializer: badActor.publicKey,
        receiver: fakeReceiver.publicKey,
        escrow: newPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([badActor])
      .rpc();

    assert.fail("Non-initializer cancel should fail");
  } catch (err) {
    assert.include(err.toString(), "Unauthorized");
  }
});

  it("Cancels escrow and refunds the initializer (order-independent)", async () => {

  // -------------------------------------------------------------
  // STEP 1 — Fetch escrow state
  // -------------------------------------------------------------
  let escrowState = await program.account.escrow.fetch(escrowPda);

  // -------------------------------------------------------------
  // STEP 2 — If escrow was already released by another test,
  //          recreate it cleanly here
  // -------------------------------------------------------------
  if (escrowState.isReleased) {
    console.log("Escrow already released — creating NEW escrow instance for cancel test.");

    // NEW seeds: use a new random receiver
    const newReceiver = anchor.web3.Keypair.generate();

    [escrowPda, bump] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("ESCROW_SEED"),
        initializer.publicKey.toBuffer(),
        newReceiver.publicKey.toBuffer(),
      ],
      program.programId
    );

    // Airdrop to initializer
    const sig = await provider.connection.requestAirdrop(
      initializer.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    const latest = await provider.connection.getLatestBlockhash();
    await provider.connection.confirmTransaction({ signature: sig, ...latest }, "confirmed");

    // Initialize NEW escrow
    await program.methods
      .initializeEscrow(new anchor.BN(amount))
      .accounts({
        initializer: initializer.publicKey,
        receiver: newReceiver.publicKey,
        escrow: escrowPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([initializer])
      .rpc();

    // Deposit into the NEW PDA
    await program.methods
      .depositEscrow()
      .accounts({
        initializer: initializer.publicKey,
        escrow: escrowPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([initializer])
      .rpc();

    // Update receiver reference in test
    receiver = newReceiver;

    escrowState = await program.account.escrow.fetch(escrowPda);
}


  // -------------------------------------------------------------
  // STEP 3 — Now we can safely run cancel on a valid escrow
  // -------------------------------------------------------------

  const beforeInitBalance = await provider.connection.getBalance(initializer.publicKey);
  const beforeEscrowBalance = await provider.connection.getBalance(escrowPda);

  const txSig = await program.methods
    .cancelEscrow()
    .accounts({
      initializer: initializer.publicKey,
      receiver: receiver.publicKey,
      escrow: escrowPda,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([initializer])
    .rpc();

  const latest2 = await provider.connection.getLatestBlockhash();
  await provider.connection.confirmTransaction({ signature: txSig, ...latest2 }, "confirmed");

  const afterInitBalance = await provider.connection.getBalance(initializer.publicKey);
  const afterEscrowBalance = await provider.connection.getBalance(escrowPda);

  // PDA must send full amount
assert.equal(
  beforeEscrowBalance - afterEscrowBalance,
  amount,
  "Escrow PDA did not send the full amount"
);

// Initializer must receive it (minus fees)
assert.isTrue(
  afterInitBalance > beforeInitBalance,
  "Initializer balance should increase"
);
//   assert.equal(afterEscrowBalance, 0, "Escrow PDA must be empty after cancel");
// 
});
it("Fails when trying to cancel an already released escrow", async () => {

  // Rebuild escrow cleanly
  const freshReceiver = anchor.web3.Keypair.generate();

  const [newPda] =
    anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("ESCROW_SEED"),
        initializer.publicKey.toBuffer(),
        freshReceiver.publicKey.toBuffer(),
      ],
      program.programId
    );

  // Airdrop initializer
  await provider.connection.requestAirdrop(
    initializer.publicKey,
    2 * anchor.web3.LAMPORTS_PER_SOL
  );

  // Initialize escrow
  await program.methods
    .initializeEscrow(new anchor.BN(amount))
    .accounts({
      initializer: initializer.publicKey,
      receiver: freshReceiver.publicKey,
      escrow: newPda,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([initializer])
    .rpc();

  // Deposit
  await program.methods
    .depositEscrow()
    .accounts({
      initializer: initializer.publicKey,
      escrow: newPda,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([initializer])
    .rpc();

  // Release escrow once (valid)
  await program.methods
    .releaseEscrow()
    .accounts({
      initializer: initializer.publicKey,
      receiver: freshReceiver.publicKey,
      escrow: newPda,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([initializer])
    .rpc();

  // Try cancel (invalid: already released)
  try {
    await program.methods
      .cancelEscrow()
      .accounts({
        initializer: initializer.publicKey,
        receiver: freshReceiver.publicKey,
        escrow: newPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([initializer])
      .rpc();

    assert.fail("Cancel after release should fail");
  } catch (err) {
    assert.include(err.toString(), "AlreadyReleased");
  }
});

 


// Happy Paths:
// ✔Initialize escrow account
//   ✔ Deposit to escrow PDA
//     ✔ Release funds from escrow to receiver
//     ✔Cancel escrow and refunds initializer (Order - independent)
  

// Unhappy paths:
// ✔Fails when trying to release escrow twice
//     ✔ Fails when non-initializer tries to cancel escrow
//     ✔Fails when non-initializer tries to release escrow
//     ✔ Fails when trying to cancel escrow twice
//     ✔fails when trying to cancel already released escrow


});