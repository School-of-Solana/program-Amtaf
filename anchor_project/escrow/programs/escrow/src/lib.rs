use anchor_lang::prelude::*;

pub mod state;
pub mod errors;
pub mod instructions;

use instructions::*;

declare_id!("9JkhmwBvJ4kU9V8Ggu2HXXZkRZsqyZmNpd7HbnChbnkU");

#[program]
pub mod escrow {
    use super::*;

       pub fn _initialize_escrow(ctx: Context<InitializeEscrow>, amount: u64) -> Result<()> {
        initialize_escrow(ctx, amount)
    }

    pub fn _deposit_escrow(ctx: Context<DepositEscrow>) -> Result<()> {
        deposit_escrow(ctx)
    }

    pub fn _release_escrow(ctx: Context<ReleaseEscrow>) -> Result<()> {
        release_escrow(ctx)
    }

    pub fn _cancel_escrow(ctx: Context<CancelEscrow>) -> Result<()> {
        cancel_escrow(ctx)
    }
}

