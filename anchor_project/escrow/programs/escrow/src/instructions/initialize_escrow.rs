//Create the PDA and save initializer, receiver, amount, bump.

//Emit InitializeEscrowEvent.

use anchor_lang::prelude::*;
use crate::state::*;


#[derive(Accounts)]
pub struct InitializeEscrow<'info>{
    #[account(mut)]
    pub initializer: Signer<'info>,
     /// CHECK:
    /// The receiver is an unchecked account because we only need its public key
    /// to initialize the escrow. No data or ownership validation is required here.
    pub receiver: UncheckedAccount<'info>,
    #[account(init,
        payer = initializer,
        space = 8 + Escrow::INIT_SPACE,
        seeds = [ESCROW_SEED.as_bytes(), initializer.key().as_ref(), receiver.key().as_ref()],
        bump
    )]
    pub escrow: Account<'info, Escrow>,
    pub system_program: Program<'info, System>,
}

pub fn initialize_escrow(ctx: Context<InitializeEscrow>,
amount: u64,) -> Result<()> {

    let escrow = &mut ctx.accounts.escrow;

    escrow.initializer = ctx.accounts.initializer.key();
    escrow.receiver = ctx.accounts.receiver.key();
    escrow.amount = amount;
    escrow.bump = ctx.bumps.escrow;
    escrow.is_released = false;

    Ok(())
}