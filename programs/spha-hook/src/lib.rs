//! Always-allow Token-2022 transfer hook.
//! DBC only lets the creator keep mint authority on transfer-hook configs.
//! Execute is a no-op. Initialize writes an empty ExtraAccountMetaList PDA
//! so Token-2022 transfers can resolve remaining accounts.

#![no_std]

use pinocchio::{
    account_info::AccountInfo,
    program_error::ProgramError,
    pubkey::{find_program_address, Pubkey},
    sysvars::{rent::Rent, Sysvar},
    ProgramResult,
};
use pinocchio::instruction::{Seed, Signer};
use pinocchio_system::instructions::CreateAccount;

pinocchio::no_allocator!();
pinocchio::program_entrypoint!(process_instruction, 16);

#[cfg(target_os = "solana")]
#[panic_handler]
fn panic(_info: &core::panic::PanicInfo<'_>) -> ! {
    unsafe { pinocchio::syscalls::abort() }
}

/// `ExecuteInstruction` discriminator from spl-transfer-hook-interface.
const EXECUTE_DISC: [u8; 8] = [105, 37, 101, 197, 75, 251, 102, 26];
const EXTRA_SEED: &[u8] = b"extra-account-metas";
/// ExtraAccountMetaAccountData: u64 disc + u32 length + u32 count (empty list).
const EXTRA_SIZE: u64 = 16;

pub fn process_instruction(program_id: &Pubkey, accounts: &[AccountInfo], data: &[u8]) -> ProgramResult {
    if data.len() >= 8 && data[0..8] == EXECUTE_DISC {
        return Ok(());
    }
    if data.first().copied() != Some(1) {
        return Err(ProgramError::InvalidInstructionData);
    }
    let [payer, extra, mint, _system, ..] = accounts else {
        return Err(ProgramError::NotEnoughAccountKeys);
    };
    if !payer.is_signer() {
        return Err(ProgramError::MissingRequiredSignature);
    }
    let (pda, bump) = find_program_address(&[EXTRA_SEED, mint.key()], program_id);
    if &pda != extra.key() {
        return Err(ProgramError::InvalidSeeds);
    }
    if extra.lamports() == 0 {
        let lamports = Rent::get()?.minimum_balance(EXTRA_SIZE as usize);
        let bump_seed = [bump];
        let seeds = [
            Seed::from(EXTRA_SEED),
            Seed::from(mint.key().as_ref()),
            Seed::from(&bump_seed),
        ];
        let signers = [Signer::from(&seeds)];
        CreateAccount {
            from: payer,
            to: extra,
            lamports,
            space: EXTRA_SIZE,
            owner: program_id,
        }
        .invoke_signed(&signers)?;
    }
    let mut buf = extra.try_borrow_mut_data()?;
    if buf.len() < EXTRA_SIZE as usize {
        return Err(ProgramError::AccountDataTooSmall);
    }
    buf[0..8].copy_from_slice(&EXECUTE_DISC);
    // TLV length of an empty ExtraAccountMetaList (u32 count only).
    buf[8] = 4;
    buf[9] = 0;
    buf[10] = 0;
    buf[11] = 0;
    buf[12] = 0;
    buf[13] = 0;
    buf[14] = 0;
    buf[15] = 0;
    Ok(())
}
