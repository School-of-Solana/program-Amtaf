//Verify initializer sent enough lamports.

//Use CPI to transfer lamports to PDA.
use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke;
use anchor_lang::solana_program::system_instruction::transfer;
use crate::state::*;
use crate::errors::EscrowError;

#[derive(Accounts)]
pub struct DepositEscrow<'info>{
    #[account(mut)]
    pub initializer: Signer<'info>,
    #[account(mut,
    seeds = [ESCROW_SEED.as_bytes(), escrow.initializer.as_ref(), escrow.receiver.as_ref()],
    bump = escrow.bump,
    has_one = initializer @ EscrowError::Unauthorized
)]
    pub escrow: Account<'info, Escrow>,
    pub system_program: Program<'info,System>

}

pub fn deposit_escrow(ctx:Context<DepositEscrow>)->Result<()>{
    let escrow = &ctx.accounts.escrow;
    let escrow_ai = escrow.to_account_info();
    let initializer_ai = &ctx.accounts.initializer.to_account_info();

    //verify user balance
    let balance = **initializer_ai.lamports.borrow();
    require!(balance >= escrow.amount, EscrowError::InsufficientBalance);

    //Transfer lamport from initialzer tp escrow
    let ix = transfer(&initializer_ai.key(), &escrow_ai.key(), escrow.amount);
    invoke(&ix,&[initializer_ai.clone(),escrow_ai.clone(),ctx.accounts.system_program.to_account_info(),
    ],
)?;
    Ok(())

}