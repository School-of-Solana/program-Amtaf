//Only initializer or a designated authority can call.

// Check escrow is not released yet.

// Transfer lamports from PDA → receiver.

// Mark is_released = true.
use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke_signed;
use anchor_lang::solana_program::system_instruction::transfer;
use crate::state::*;
use crate::errors::EscrowError;

#[derive(Accounts)]
pub struct ReleaseEscrow<'info>{
    #[account(mut)]
    pub initializer: Signer<'info>,
    /// CHECK: The receiver account is unchecked because
/// we only transfer lamports to it, not read or mutate its data.
    #[account(mut)]
    pub receiver: UncheckedAccount<'info>,
    #[account(
        mut,
        seeds = [ESCROW_SEED.as_bytes(), escrow.initializer.as_ref(),escrow.receiver.as_ref()],
        bump = escrow.bump,
        has_one = initializer @ EscrowError::Unauthorized
    )]
    pub escrow: Account<'info,Escrow>,
    pub system_program: Program<'info,System>

}

pub fn release_escrow(ctx: Context<ReleaseEscrow>)-> Result<()>{
    let escrow = &mut ctx.accounts.escrow;
    let escrow_ai = escrow.to_account_info();
    //let receiver = &ctx.accounts.receiver;
    let receiver_ai = ctx.accounts.receiver.to_account_info();
    let initializer_data = ctx.accounts.initializer.data.borrow();
    //assert!(initializer_data.is_empty(), "Initializer account should be empty");

//Ensuring escrow is not already released
    require!(!escrow.is_released, EscrowError::AlreadyReleased);
//seeds for PDA signing
//     let bump = escrow.bump;
//     let seeds = &[ESCROW_SEED.as_bytes(),
//     escrow.initializer.as_ref(),
//     escrow.receiver.as_ref(),
//     &[bump],
//     ];

//     let signer = &[&seeds[..]];


//     let ix =transfer(&escrow.key(),
//     &receiver_ai.key(),
// escrow.amount,);

// invoke_signed(
//     &ix,
//     &[escrow_ai.clone(),
//     receiver_ai.clone(),
//     ctx.accounts.system_program.to_account_info(),
//     ],
//     signer,
// )?;
 // Manual lamport movement
    let mut escrow_lamports =&mut **escrow_ai.try_borrow_mut_lamports()?;
    let mut receiver_lamports =&mut **receiver_ai.try_borrow_mut_lamports()?;

    require!(*escrow_lamports >= escrow.amount, EscrowError::InsufficientBalance);

    *escrow_lamports -= escrow.amount;
    *receiver_lamports += escrow.amount;


    escrow.is_released = true;

Ok(())
}