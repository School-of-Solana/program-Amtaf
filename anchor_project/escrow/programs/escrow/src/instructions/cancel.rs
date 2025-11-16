//Allow refund if is_released == false.

// Transfer lamports back to initializer.
/// - Only the initializer can cancel the escrow
/// - Ensure escrow is not already released
/// - Transfer lamports from the escrow PDA back to the initializer
/// - Mark escrow as cancelled (e.g., set is_released = true to prevent reuse)

use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke_signed;
use anchor_lang::solana_program::system_instruction::transfer;
use crate::state::{Escrow, ESCROW_SEED};
use crate::errors::EscrowError;

#[derive(Accounts)]
pub struct CancelEscrow<'info>{
    #[account(mut)]
    pub initializer: Signer<'info>,
    #[account(
        mut,
        seeds = [ESCROW_SEED.as_bytes(), escrow.initializer.as_ref(),escrow.receiver.as_ref()],
        bump = escrow.bump,
        has_one = initializer @ EscrowError :: Unauthorized
    )]
    pub escrow: Account<'info,Escrow>,
    pub system_program: Program<'info,System>,
}

pub fn cancel_escrow(ctx: Context<CancelEscrow>)-> Result<()>{
    let escrow = &mut ctx.accounts.escrow;
    let escrow_ai = escrow.to_account_info();
    let initializer_ai = ctx.accounts.initializer.to_account_info();

    //Ensuring escrow is not released yet
    require!(!escrow.is_released, EscrowError::AlreadyReleased);
    // //seeds for PDA Signing
    // let bump = escrow.bump;
    // let seeds =&[ESCROW_SEED.as_bytes(),
    // escrow.initializer.as_ref(),
    // escrow.receiver.as_ref(),
    // &[bump],
    // ];
    // let signer = &[&seeds[..]];
    // //transfer lamports back to initialiazer

    // let ix = transfer(&escrow_ai.key(),&initializer_ai.key(),escrow.amount);
    // invoke_signed(
    //     &ix,
    //     &[escrow_ai.clone(),
    //     initializer_ai.clone(),
    //     ctx.accounts.system_program.to_account_info(),
    //     ],
    //     signer,
    // )?;
    //
     // Manual lamport transfer
    let mut escrow_lamports =&mut **escrow_ai.try_borrow_mut_lamports()?;
    let mut initializer_lamports =&mut **initializer_ai.try_borrow_mut_lamports()?;

    let amount = escrow.amount;

    require!(*escrow_lamports >= amount, EscrowError::InsufficientBalance);

    *escrow_lamports -= amount;
    *initializer_lamports += amount;

    escrow.is_released = true; 

    Ok(())

}

