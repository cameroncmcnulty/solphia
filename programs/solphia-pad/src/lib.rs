//! Solphia pad: constant-product virtual AMM (same family as Pump.fun).
//! 1B supply @ 6 decimals, 800M sold on the curve, graduate at 85 SOL.
//! One fee: 1.00% of SOL, split 50 creator / 25 owner / 25 treasury.
//! Tokens live on the curve ATA. Only an optional first buy hits the creator.

use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    program::{invoke, invoke_signed},
    program_error::ProgramError,
    pubkey::Pubkey,
    rent::Rent,
    system_instruction,
    sysvar::Sysvar,
};

pub const ID: Pubkey = solana_program::pubkey!("5s26ZJDhyErFMx3ELo9CYXS3Y5BcwZvQ5EceYq8WFv4d");

const DISC_CURVE: &[u8; 8] = b"splhcrv1";
const DISC_GLOBAL: &[u8; 8] = b"splhglb1";

const DECIMALS: u8 = 6;
const TOKEN_SUPPLY: u64 = 1_000_000_000 * 1_000_000;
const CURVE_SALE: u64 = 800_000_000 * 1_000_000;
const VIRTUAL_SOL: u64 = 30 * 1_000_000_000;
const VIRTUAL_TOKENS: u64 = 1_073_000_191 * 1_000_000;
const GRADUATE_SOL: u64 = 85 * 1_000_000_000;
const GRADUATE_FEE: u64 = 10_000_000; // 0.01 SOL
const FEE_BPS: u64 = 100;
const DEV_BPS: u64 = 50;
const OWNER_BPS: u64 = 25;
const REF_BPS: u64 = 25;
const MIN_TRADE: u64 = 10_000_000; // 0.01 SOL
const MAX_TRADE: u64 = 40 * 1_000_000_000;

const CURVE_LEN: usize = 8 + 32 + 32 + 32 + 8 + 8 + 8 + 8 + 1 + 1;
const GLOBAL_LEN: usize = 8 + 32 + 32 + 32 + 1;

entrypoint!(process_instruction);

pub fn process_instruction(program_id: &Pubkey, accounts: &[AccountInfo], data: &[u8]) -> ProgramResult {
    if *program_id != ID {
        return Err(ProgramError::IncorrectProgramId);
    }
    if data.is_empty() {
        return Err(ProgramError::InvalidInstructionData);
    }
    match data[0] {
        0 => init_global(program_id, accounts),
        1 => initialize(program_id, accounts, &data[1..]),
        2 => buy(program_id, accounts, &data[1..]),
        3 => sell(program_id, accounts, &data[1..]),
        _ => Err(ProgramError::InvalidInstructionData),
    }
}

/// Founder treasury / owner until `init_global` overrides on-chain.
const HARDCODED_TREASURY: Pubkey = solana_program::pubkey!("2jNYVsfptvRLrg8V8AoLMVq6pnmpi7BHVo7Hsx5PTpma");

fn init_global(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let acc = &mut accounts.iter();
    let payer = next_account_info(acc)?;
    let global = next_account_info(acc)?;
    let treasury = next_account_info(acc)?;
    let owner = next_account_info(acc)?;
    let system = next_account_info(acc)?;
    if !payer.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }
    let (pda, bump) = Pubkey::find_program_address(&[b"global"], program_id);
    if pda != *global.key {
        return Err(ProgramError::InvalidSeeds);
    }
    if global.lamports() > 0 {
        // Update destinations. Current authority must sign.
        let mut data = global.try_borrow_mut_data()?;
        if data.len() < GLOBAL_LEN || &data[0..8] != DISC_GLOBAL {
            return Err(ProgramError::InvalidAccountData);
        }
        let authority = Pubkey::try_from(&data[8..40]).map_err(|_| ProgramError::InvalidAccountData)?;
        if authority != *payer.key {
            return Err(ProgramError::MissingRequiredSignature);
        }
        data[40..72].copy_from_slice(treasury.key.as_ref());
        data[72..104].copy_from_slice(owner.key.as_ref());
        return Ok(());
    }
    let rent = Rent::get()?;
    let lamports = rent.minimum_balance(GLOBAL_LEN);
    invoke_signed(
        &system_instruction::create_account(payer.key, global.key, lamports, GLOBAL_LEN as u64, program_id),
        &[payer.clone(), global.clone(), system.clone()],
        &[&[b"global", &[bump]]],
    )?;
    let mut data = global.try_borrow_mut_data()?;
    data[0..8].copy_from_slice(DISC_GLOBAL);
    data[8..40].copy_from_slice(payer.key.as_ref());
    data[40..72].copy_from_slice(treasury.key.as_ref());
    data[72..104].copy_from_slice(owner.key.as_ref());
    data[104] = bump;
    Ok(())
}

fn initialize(program_id: &Pubkey, accounts: &[AccountInfo], data: &[u8]) -> ProgramResult {
    if data.len() < 32 {
        return Err(ProgramError::InvalidInstructionData);
    }
    let referrer = Pubkey::try_from(&data[0..32]).map_err(|_| ProgramError::InvalidInstructionData)?;

    let acc = &mut accounts.iter();
    let payer = next_account_info(acc)?;
    let mint = next_account_info(acc)?;
    let curve = next_account_info(acc)?;
    let curve_ata = next_account_info(acc)?;
    let global = next_account_info(acc)?;
    let creator = next_account_info(acc)?;
    let token_program = next_account_info(acc)?;
    let ata_program = next_account_info(acc)?;
    let system = next_account_info(acc)?;
    if !payer.is_signer || !mint.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }
    if *creator.key != *payer.key {
        return Err(ProgramError::InvalidArgument);
    }
    let _ = fee_dest(global, program_id)?;
    let (pda, bump) = Pubkey::find_program_address(&[b"curve", mint.key.as_ref()], program_id);
    if pda != *curve.key {
        return Err(ProgramError::InvalidSeeds);
    }

    let rent = Rent::get()?;
    let lamports = rent.minimum_balance(CURVE_LEN);
    invoke_signed(
        &system_instruction::create_account(payer.key, curve.key, lamports, CURVE_LEN as u64, program_id),
        &[payer.clone(), curve.clone(), system.clone()],
        &[&[b"curve", mint.key.as_ref(), &[bump]]],
    )?;

    invoke(
        &spl_associated_token_account::instruction::create_associated_token_account_idempotent(
            payer.key,
            curve.key,
            mint.key,
            token_program.key,
        ),
        &[payer.clone(), curve_ata.clone(), curve.clone(), mint.clone(), system.clone(), token_program.clone(), ata_program.clone()],
    )?;

    invoke(
        &spl_token::instruction::mint_to(
            token_program.key,
            mint.key,
            curve_ata.key,
            payer.key,
            &[],
            TOKEN_SUPPLY,
        )?,
        &[mint.clone(), curve_ata.clone(), payer.clone(), token_program.clone()],
    )?;
    invoke(
        &spl_token::instruction::set_authority(
            token_program.key,
            mint.key,
            None,
            spl_token::instruction::AuthorityType::MintTokens,
            payer.key,
            &[],
        )?,
        &[mint.clone(), payer.clone(), token_program.clone()],
    )?;
    invoke(
        &spl_token::instruction::set_authority(
            token_program.key,
            mint.key,
            None,
            spl_token::instruction::AuthorityType::FreezeAccount,
            payer.key,
            &[],
        )?,
        &[mint.clone(), payer.clone(), token_program.clone()],
    )?;

    {
        let mut raw = curve.try_borrow_mut_data()?;
        raw[0..8].copy_from_slice(DISC_CURVE);
        raw[8..40].copy_from_slice(mint.key.as_ref());
        raw[40..72].copy_from_slice(creator.key.as_ref());
        raw[72..104].copy_from_slice(referrer.as_ref());
        raw[104..112].copy_from_slice(&VIRTUAL_SOL.to_le_bytes());
        raw[112..120].copy_from_slice(&VIRTUAL_TOKENS.to_le_bytes());
        raw[120..128].copy_from_slice(&0u64.to_le_bytes());
        raw[128..136].copy_from_slice(&0u64.to_le_bytes());
        raw[136] = 0;
        raw[137] = bump;
    }

    Ok(())
}

fn buy(program_id: &Pubkey, accounts: &[AccountInfo], data: &[u8]) -> ProgramResult {
    if data.len() < 16 {
        return Err(ProgramError::InvalidInstructionData);
    }
    let sol_in = u64::from_le_bytes(data[0..8].try_into().unwrap());
    let min_tokens = u64::from_le_bytes(data[8..16].try_into().unwrap());
    if sol_in < MIN_TRADE || sol_in > MAX_TRADE {
        return Err(ProgramError::InvalidArgument);
    }

    let acc = &mut accounts.iter();
    let user = next_account_info(acc)?;
    let mint = next_account_info(acc)?;
    let curve = next_account_info(acc)?;
    let curve_ata = next_account_info(acc)?;
    let user_ata = next_account_info(acc)?;
    let global = next_account_info(acc)?;
    let creator = next_account_info(acc)?;
    let owner = next_account_info(acc)?;
    let treasury = next_account_info(acc)?;
    let token_program = next_account_info(acc)?;
    let system = next_account_info(acc)?;
    let referrer_acc = acc.next();
    if !user.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    let g = fee_dest(global, program_id)?;
    if g.treasury != *treasury.key || g.owner != *owner.key {
        return Err(ProgramError::InvalidArgument);
    }

    let (pda, bump) = Pubkey::find_program_address(&[b"curve", mint.key.as_ref()], program_id);
    if pda != *curve.key {
        return Err(ProgramError::InvalidSeeds);
    }

    let mut st = load_curve(curve)?;
    if st.complete != 0 {
        return Err(ProgramError::InvalidAccountData);
    }
    if st.mint != *mint.key || st.creator != *creator.key {
        return Err(ProgramError::InvalidArgument);
    }

    let fee = sol_in.saturating_mul(FEE_BPS) / 10_000;
    let net = sol_in.saturating_sub(fee);
    if net == 0 {
        return Err(ProgramError::InvalidArgument);
    }
    let tokens_out = quote_buy(st.virtual_sol, st.virtual_tokens, net)?;
    if tokens_out < min_tokens || tokens_out == 0 {
        return Err(ProgramError::InvalidArgument);
    }
    if st.tokens_sold.saturating_add(tokens_out) > CURVE_SALE {
        return Err(ProgramError::InvalidArgument);
    }

    let referred = st.referrer != Pubkey::default();
    let (dev, own, treas, rfer) = split_fee(fee, referred);

    pay_from_user(user, creator, dev, system)?;
    pay_from_user(user, owner, own, system)?;
    pay_from_user(user, treasury, treas, system)?;
    if rfer > 0 {
        let r = referrer_acc.ok_or(ProgramError::NotEnoughAccountKeys)?;
        if *r.key != st.referrer {
            return Err(ProgramError::InvalidArgument);
        }
        pay_from_user(user, r, rfer, system)?;
    }
    pay_from_user(user, curve, net, system)?;

    invoke_signed(
        &spl_token::instruction::transfer(
            token_program.key,
            curve_ata.key,
            user_ata.key,
            curve.key,
            &[],
            tokens_out,
        )?,
        &[curve_ata.clone(), user_ata.clone(), curve.clone(), token_program.clone()],
        &[&[b"curve", mint.key.as_ref(), &[bump]]],
    )?;

    st.virtual_sol = st.virtual_sol.saturating_add(net);
    st.virtual_tokens = st.virtual_tokens.saturating_sub(tokens_out);
    st.real_sol = st.real_sol.saturating_add(net);
    st.tokens_sold = st.tokens_sold.saturating_add(tokens_out);
    if st.real_sol >= GRADUATE_SOL {
        st.complete = 1;
        if st.real_sol > GRADUATE_FEE {
            **curve.try_borrow_mut_lamports()? -= GRADUATE_FEE;
            **treasury.try_borrow_mut_lamports()? += GRADUATE_FEE;
            st.real_sol -= GRADUATE_FEE;
        }
    }
    save_curve(curve, &st)?;
    Ok(())
}

fn sell(program_id: &Pubkey, accounts: &[AccountInfo], data: &[u8]) -> ProgramResult {
    if data.len() < 16 {
        return Err(ProgramError::InvalidInstructionData);
    }
    let tokens_in = u64::from_le_bytes(data[0..8].try_into().unwrap());
    let min_sol = u64::from_le_bytes(data[8..16].try_into().unwrap());
    if tokens_in == 0 {
        return Err(ProgramError::InvalidArgument);
    }

    let acc = &mut accounts.iter();
    let user = next_account_info(acc)?;
    let mint = next_account_info(acc)?;
    let curve = next_account_info(acc)?;
    let curve_ata = next_account_info(acc)?;
    let user_ata = next_account_info(acc)?;
    let global = next_account_info(acc)?;
    let creator = next_account_info(acc)?;
    let owner = next_account_info(acc)?;
    let treasury = next_account_info(acc)?;
    let token_program = next_account_info(acc)?;
    let referrer_acc = acc.next();
    if !user.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    let g = fee_dest(global, program_id)?;
    if g.treasury != *treasury.key || g.owner != *owner.key {
        return Err(ProgramError::InvalidArgument);
    }
    let (pda, bump) = Pubkey::find_program_address(&[b"curve", mint.key.as_ref()], program_id);
    if pda != *curve.key {
        return Err(ProgramError::InvalidSeeds);
    }
    let mut st = load_curve(curve)?;
    if st.complete != 0 {
        return Err(ProgramError::InvalidAccountData);
    }
    if tokens_in > st.tokens_sold {
        return Err(ProgramError::InsufficientFunds);
    }

    let gross = quote_sell(st.virtual_sol, st.virtual_tokens, tokens_in)?;
    if gross == 0 || gross > st.real_sol {
        return Err(ProgramError::InvalidArgument);
    }
    let fee = gross.saturating_mul(FEE_BPS) / 10_000;
    let net = gross.saturating_sub(fee);
    if net < min_sol || net == 0 {
        return Err(ProgramError::InvalidArgument);
    }

    invoke(
        &spl_token::instruction::transfer(
            token_program.key,
            user_ata.key,
            curve_ata.key,
            user.key,
            &[],
            tokens_in,
        )?,
        &[user_ata.clone(), curve_ata.clone(), user.clone(), token_program.clone()],
    )?;

    let referred = st.referrer != Pubkey::default();
    let (dev, own, treas, rfer) = split_fee(fee, referred);
    pay_from_curve(curve, creator, dev)?;
    pay_from_curve(curve, owner, own)?;
    pay_from_curve(curve, treasury, treas)?;
    if rfer > 0 {
        let r = referrer_acc.ok_or(ProgramError::NotEnoughAccountKeys)?;
        if *r.key != st.referrer {
            return Err(ProgramError::InvalidArgument);
        }
        pay_from_curve(curve, r, rfer)?;
    }
    pay_from_curve(curve, user, net)?;

    st.virtual_sol = st.virtual_sol.saturating_sub(gross);
    st.virtual_tokens = st.virtual_tokens.saturating_add(tokens_in);
    st.real_sol = st.real_sol.saturating_sub(gross);
    st.tokens_sold = st.tokens_sold.saturating_sub(tokens_in);
    let _ = bump;
    save_curve(curve, &st)?;
    Ok(())
}

struct Global {
    treasury: Pubkey,
    owner: Pubkey,
}

fn fee_dest(global: &AccountInfo, program_id: &Pubkey) -> Result<Global, ProgramError> {
    let (pda, _) = Pubkey::find_program_address(&[b"global"], program_id);
    if pda != *global.key {
        return Err(ProgramError::InvalidSeeds);
    }
    if global.lamports() == 0 || global.data_len() < GLOBAL_LEN {
        return Ok(Global {
            treasury: HARDCODED_TREASURY,
            owner: HARDCODED_TREASURY,
        });
    }
    let data = global.try_borrow_data()?;
    if &data[0..8] != DISC_GLOBAL {
        return Ok(Global {
            treasury: HARDCODED_TREASURY,
            owner: HARDCODED_TREASURY,
        });
    }
    Ok(Global {
        treasury: Pubkey::try_from(&data[40..72]).map_err(|_| ProgramError::InvalidAccountData)?,
        owner: Pubkey::try_from(&data[72..104]).map_err(|_| ProgramError::InvalidAccountData)?,
    })
}

struct Curve {
    mint: Pubkey,
    creator: Pubkey,
    referrer: Pubkey,
    virtual_sol: u64,
    virtual_tokens: u64,
    real_sol: u64,
    tokens_sold: u64,
    complete: u8,
    bump: u8,
}

fn load_curve(curve: &AccountInfo) -> Result<Curve, ProgramError> {
    let data = curve.try_borrow_data()?;
    if data.len() < CURVE_LEN || &data[0..8] != DISC_CURVE {
        return Err(ProgramError::UninitializedAccount);
    }
    Ok(Curve {
        mint: Pubkey::try_from(&data[8..40]).map_err(|_| ProgramError::InvalidAccountData)?,
        creator: Pubkey::try_from(&data[40..72]).map_err(|_| ProgramError::InvalidAccountData)?,
        referrer: Pubkey::try_from(&data[72..104]).map_err(|_| ProgramError::InvalidAccountData)?,
        virtual_sol: u64::from_le_bytes(data[104..112].try_into().unwrap()),
        virtual_tokens: u64::from_le_bytes(data[112..120].try_into().unwrap()),
        real_sol: u64::from_le_bytes(data[120..128].try_into().unwrap()),
        tokens_sold: u64::from_le_bytes(data[128..136].try_into().unwrap()),
        complete: data[136],
        bump: data[137],
    })
}

fn save_curve(curve: &AccountInfo, st: &Curve) -> ProgramResult {
    let mut data = curve.try_borrow_mut_data()?;
    data[104..112].copy_from_slice(&st.virtual_sol.to_le_bytes());
    data[112..120].copy_from_slice(&st.virtual_tokens.to_le_bytes());
    data[120..128].copy_from_slice(&st.real_sol.to_le_bytes());
    data[128..136].copy_from_slice(&st.tokens_sold.to_le_bytes());
    data[136] = st.complete;
    Ok(())
}

fn quote_buy(virtual_sol: u64, virtual_tokens: u64, net: u64) -> Result<u64, ProgramError> {
    let vs = virtual_sol as u128;
    let vt = virtual_tokens as u128;
    let n = net as u128;
    let out = vt.checked_mul(n).ok_or(ProgramError::InvalidArgument)?
        / vs.checked_add(n).ok_or(ProgramError::InvalidArgument)?;
    Ok(out as u64)
}

fn quote_sell(virtual_sol: u64, virtual_tokens: u64, tokens_in: u64) -> Result<u64, ProgramError> {
    let vs = virtual_sol as u128;
    let vt = virtual_tokens as u128;
    let t = tokens_in as u128;
    let out = vs.checked_mul(t).ok_or(ProgramError::InvalidArgument)?
        / vt.checked_add(t).ok_or(ProgramError::InvalidArgument)?;
    Ok(out as u64)
}

fn split_fee(fee: u64, referred: bool) -> (u64, u64, u64, u64) {
    let dev = fee * DEV_BPS / 100;
    if !referred {
        let owner = fee * OWNER_BPS / 100;
        let treasury = fee.saturating_sub(dev).saturating_sub(owner);
        return (dev, owner, treasury, 0);
    }
    let referral = fee * REF_BPS / 100;
    let owner = fee / 8;
    let treasury = fee.saturating_sub(dev).saturating_sub(referral).saturating_sub(owner);
    (dev, owner, treasury, referral)
}

fn pay_from_user<'a>(from: &AccountInfo<'a>, to: &AccountInfo<'a>, lamports: u64, system: &AccountInfo<'a>) -> ProgramResult {
    if lamports == 0 {
        return Ok(());
    }
    invoke(
        &system_instruction::transfer(from.key, to.key, lamports),
        &[from.clone(), to.clone(), system.clone()],
    )
}

fn pay_from_curve(curve: &AccountInfo, to: &AccountInfo, lamports: u64) -> ProgramResult {
    if lamports == 0 {
        return Ok(());
    }
    **curve.try_borrow_mut_lamports()? -= lamports;
    **to.try_borrow_mut_lamports()? += lamports;
    Ok(())
}
