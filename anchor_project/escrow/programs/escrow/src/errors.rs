use anchor_lang::prelude::*;

#[error_code]
pub enum EscrowError {
    #[msg("Insufficient balance to deposit")]
    InsufficientBalance,
    #[msg("Unauthorized action")]
    Unauthorized,
    #[msg("Escrow already released")]
    AlreadyReleased,
    #[msg("Escrow not funded yet")]
    NotFunded,

}