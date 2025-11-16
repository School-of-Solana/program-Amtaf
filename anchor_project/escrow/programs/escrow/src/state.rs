use anchor_lang::prelude::*;

pub const ESCROW_SEED: &str = "ESCROW_SEED"; 

#[account]
#[derive(InitSpace)]

pub struct Escrow {
    pub initializer: Pubkey,
    pub receiver: Pubkey,
    pub amount: u64,
    pub bump: u8,
    pub is_released: bool,
}

impl Escrow {
    pub const INIT_SPACE: usize = 32 + 32 + 8 + 1 + 1;
}