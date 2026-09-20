"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; } function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }// src/services/migration.ts






var _web3js = require('@solana/web3.js');

// src/services/program.ts





// src/types.ts
var ActivationType = /* @__PURE__ */ ((ActivationType4) => {
  ActivationType4[ActivationType4["Slot"] = 0] = "Slot";
  ActivationType4[ActivationType4["Timestamp"] = 1] = "Timestamp";
  return ActivationType4;
})(ActivationType || {});
var TokenType = /* @__PURE__ */ ((TokenType2) => {
  TokenType2[TokenType2["SPLToken"] = 0] = "SPLToken";
  TokenType2[TokenType2["Token2022"] = 1] = "Token2022";
  return TokenType2;
})(TokenType || {});
var CollectFeeMode = /* @__PURE__ */ ((CollectFeeMode3) => {
  CollectFeeMode3[CollectFeeMode3["QuoteToken"] = 0] = "QuoteToken";
  CollectFeeMode3[CollectFeeMode3["OutputToken"] = 1] = "OutputToken";
  return CollectFeeMode3;
})(CollectFeeMode || {});
var MigratedCollectFeeMode = /* @__PURE__ */ ((MigratedCollectFeeMode2) => {
  MigratedCollectFeeMode2[MigratedCollectFeeMode2["QuoteToken"] = 0] = "QuoteToken";
  MigratedCollectFeeMode2[MigratedCollectFeeMode2["OutputToken"] = 1] = "OutputToken";
  MigratedCollectFeeMode2[MigratedCollectFeeMode2["Compounding"] = 2] = "Compounding";
  return MigratedCollectFeeMode2;
})(MigratedCollectFeeMode || {});
var DammV2DynamicFeeMode = /* @__PURE__ */ ((DammV2DynamicFeeMode2) => {
  DammV2DynamicFeeMode2[DammV2DynamicFeeMode2["Disabled"] = 0] = "Disabled";
  DammV2DynamicFeeMode2[DammV2DynamicFeeMode2["Enabled"] = 1] = "Enabled";
  return DammV2DynamicFeeMode2;
})(DammV2DynamicFeeMode || {});
var DammV2BaseFeeMode = /* @__PURE__ */ ((DammV2BaseFeeMode2) => {
  DammV2BaseFeeMode2[DammV2BaseFeeMode2["FeeTimeSchedulerLinear"] = 0] = "FeeTimeSchedulerLinear";
  DammV2BaseFeeMode2[DammV2BaseFeeMode2["FeeTimeSchedulerExponential"] = 1] = "FeeTimeSchedulerExponential";
  DammV2BaseFeeMode2[DammV2BaseFeeMode2["RateLimiter"] = 2] = "RateLimiter";
  DammV2BaseFeeMode2[DammV2BaseFeeMode2["FeeMarketCapSchedulerLinear"] = 3] = "FeeMarketCapSchedulerLinear";
  DammV2BaseFeeMode2[DammV2BaseFeeMode2["FeeMarketCapSchedulerExponential"] = 4] = "FeeMarketCapSchedulerExponential";
  return DammV2BaseFeeMode2;
})(DammV2BaseFeeMode || {});
var MigrationOption = /* @__PURE__ */ ((MigrationOption2) => {
  MigrationOption2[MigrationOption2["MET_DAMM"] = 0] = "MET_DAMM";
  MigrationOption2[MigrationOption2["MET_DAMM_V2"] = 1] = "MET_DAMM_V2";
  return MigrationOption2;
})(MigrationOption || {});
var BaseFeeMode = /* @__PURE__ */ ((BaseFeeMode2) => {
  BaseFeeMode2[BaseFeeMode2["FeeSchedulerLinear"] = 0] = "FeeSchedulerLinear";
  BaseFeeMode2[BaseFeeMode2["FeeSchedulerExponential"] = 1] = "FeeSchedulerExponential";
  BaseFeeMode2[BaseFeeMode2["RateLimiter"] = 2] = "RateLimiter";
  return BaseFeeMode2;
})(BaseFeeMode || {});
var MigrationFeeOption = /* @__PURE__ */ ((MigrationFeeOption2) => {
  MigrationFeeOption2[MigrationFeeOption2["FixedBps25"] = 0] = "FixedBps25";
  MigrationFeeOption2[MigrationFeeOption2["FixedBps30"] = 1] = "FixedBps30";
  MigrationFeeOption2[MigrationFeeOption2["FixedBps100"] = 2] = "FixedBps100";
  MigrationFeeOption2[MigrationFeeOption2["FixedBps200"] = 3] = "FixedBps200";
  MigrationFeeOption2[MigrationFeeOption2["FixedBps400"] = 4] = "FixedBps400";
  MigrationFeeOption2[MigrationFeeOption2["FixedBps600"] = 5] = "FixedBps600";
  MigrationFeeOption2[MigrationFeeOption2["Customizable"] = 6] = "Customizable";
  return MigrationFeeOption2;
})(MigrationFeeOption || {});
var TokenDecimal = /* @__PURE__ */ ((TokenDecimal3) => {
  TokenDecimal3[TokenDecimal3["SIX"] = 6] = "SIX";
  TokenDecimal3[TokenDecimal3["SEVEN"] = 7] = "SEVEN";
  TokenDecimal3[TokenDecimal3["EIGHT"] = 8] = "EIGHT";
  TokenDecimal3[TokenDecimal3["NINE"] = 9] = "NINE";
  return TokenDecimal3;
})(TokenDecimal || {});
var TradeDirection = /* @__PURE__ */ ((TradeDirection3) => {
  TradeDirection3[TradeDirection3["BaseToQuote"] = 0] = "BaseToQuote";
  TradeDirection3[TradeDirection3["QuoteToBase"] = 1] = "QuoteToBase";
  return TradeDirection3;
})(TradeDirection || {});
var Rounding = /* @__PURE__ */ ((Rounding2) => {
  Rounding2[Rounding2["Up"] = 0] = "Up";
  Rounding2[Rounding2["Down"] = 1] = "Down";
  return Rounding2;
})(Rounding || {});
var TokenAuthorityOption = /* @__PURE__ */ ((TokenAuthorityOption2) => {
  TokenAuthorityOption2[TokenAuthorityOption2["CreatorUpdateAuthority"] = 0] = "CreatorUpdateAuthority";
  TokenAuthorityOption2[TokenAuthorityOption2["Immutable"] = 1] = "Immutable";
  TokenAuthorityOption2[TokenAuthorityOption2["PartnerUpdateAuthority"] = 2] = "PartnerUpdateAuthority";
  TokenAuthorityOption2[TokenAuthorityOption2["CreatorUpdateAndMintAuthority"] = 3] = "CreatorUpdateAndMintAuthority";
  TokenAuthorityOption2[TokenAuthorityOption2["PartnerUpdateAndMintAuthority"] = 4] = "PartnerUpdateAndMintAuthority";
  return TokenAuthorityOption2;
})(TokenAuthorityOption || {});
var SwapMode = /* @__PURE__ */ ((SwapMode2) => {
  SwapMode2[SwapMode2["ExactIn"] = 0] = "ExactIn";
  SwapMode2[SwapMode2["PartialFill"] = 1] = "PartialFill";
  SwapMode2[SwapMode2["ExactOut"] = 2] = "ExactOut";
  return SwapMode2;
})(SwapMode || {});
var AccountsType = {
  TransferHookBase: {
    transferHookBase: {}
  },
  TransferHookBaseReferral: {
    transferHookBaseReferral: {}
  }
};

// src/constants.ts
var _bnjs = require('bn.js'); var _bnjs2 = _interopRequireDefault(_bnjs);

var MAX_CURVE_POINT = 16;
var OFFSET = 64;
var RESOLUTION = 64;
var ONE_Q64 = new (0, _bnjs2.default)(1).shln(RESOLUTION);
var FEE_DENOMINATOR = 1e9;
var MAX_BASIS_POINT = 1e4;
var U16_MAX = 65535;
var U24_MAX = 16777215;
var U64_MAX = new (0, _bnjs2.default)("18446744073709551615");
var U128_MAX = new (0, _bnjs2.default)("340282366920938463463374607431768211455");
var MIN_SQRT_PRICE = new (0, _bnjs2.default)("4295048016");
var MAX_SQRT_PRICE = new (0, _bnjs2.default)("79226673521066979257578248091");
var MIN_FEE_BPS = 25;
var MAX_FEE_BPS = 9900;
var MIN_FEE_NUMERATOR = 25e5;
var MAX_FEE_NUMERATOR = 99e7;
var MAX_RATE_LIMITER_DURATION_IN_SECONDS = 43200;
var MAX_RATE_LIMITER_DURATION_IN_SLOTS = 108e3;
var DYNAMIC_FEE_FILTER_PERIOD_DEFAULT = 10;
var DYNAMIC_FEE_DECAY_PERIOD_DEFAULT = 120;
var DYNAMIC_FEE_REDUCTION_FACTOR_DEFAULT = 5e3;
var DYNAMIC_FEE_SCALING_FACTOR = new (0, _bnjs2.default)(1e11);
var DYNAMIC_FEE_ROUNDING_OFFSET = new (0, _bnjs2.default)(99999999999);
var BIN_STEP_BPS_DEFAULT = 1;
var BIN_STEP_BPS_U128_DEFAULT = new (0, _bnjs2.default)("1844674407370955");
var MAX_PRICE_CHANGE_BPS_DEFAULT = 1500;
var PROTOCOL_FEE_PERCENT = 20;
var HOST_FEE_PERCENT = 20;
var SWAP_BUFFER_PERCENTAGE = 25;
var MAX_MIGRATION_FEE_PERCENTAGE = 99;
var MAX_CREATOR_MIGRATION_FEE_PERCENTAGE = 100;
var MIN_LOCKED_LIQUIDITY_BPS = 1e3;
var SECONDS_PER_DAY = 86400;
var MAX_LOCK_DURATION_IN_SECONDS = 63072e3;
var PROTOCOL_POOL_CREATION_FEE_PERCENT = 10;
var MIN_POOL_CREATION_FEE = 1e6;
var MAX_POOL_CREATION_FEE = 1e11;
var MIN_MIGRATED_POOL_FEE_BPS = 10;
var MAX_MIGRATED_POOL_FEE_BPS = 1e3;
var DYNAMIC_BONDING_CURVE_PROGRAM_ID = new (0, _web3js.PublicKey)(
  "dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN"
);
var METAPLEX_PROGRAM_ID = new (0, _web3js.PublicKey)(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);
var DAMM_V1_PROGRAM_ID = new (0, _web3js.PublicKey)(
  "Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB"
);
var DAMM_V2_PROGRAM_ID = new (0, _web3js.PublicKey)(
  "cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG"
);
var VAULT_PROGRAM_ID = new (0, _web3js.PublicKey)(
  "24Uqj9JCLxUeoC3hGfh5W3s9FM9uCHDS2SG3LYwBpyTi"
);
var LOCKER_PROGRAM_ID = new (0, _web3js.PublicKey)(
  "LocpQgucEQHbqNABEYvBvwoxCPsSbG91A1QaQhQQqjn"
);
var BASE_ADDRESS = new (0, _web3js.PublicKey)(
  "HWzXGcGHy4tcpYfaRDCyLNzXqBTv3E6BttpCH2vJxArv"
);
var DAMM_V1_MIGRATION_FEE_ADDRESS = [
  new (0, _web3js.PublicKey)("8f848CEy8eY6PhJ3VcemtBDzPPSD4Vq7aJczLZ3o8MmX"),
  // FixedBps25
  new (0, _web3js.PublicKey)("HBxB8Lf14Yj8pqeJ8C4qDb5ryHL7xwpuykz31BLNYr7S"),
  // FixedBps30
  new (0, _web3js.PublicKey)("7v5vBdUQHTNeqk1HnduiXcgbvCyVEZ612HLmYkQoAkik"),
  // FixedBps100
  new (0, _web3js.PublicKey)("EkvP7d5yKxovj884d2DwmBQbrHUWRLGK6bympzrkXGja"),
  // FixedBps200
  new (0, _web3js.PublicKey)("9EZYAJrcqNWNQzP2trzZesP7XKMHA1jEomHzbRsdX8R2"),
  // FixedBps400
  new (0, _web3js.PublicKey)("8cdKo87jZU2R12KY1BUjjRPwyjgdNjLGqSGQyrDshhud")
  // FixedBps600
];
var DAMM_V2_MIGRATION_FEE_ADDRESS = [
  new (0, _web3js.PublicKey)("7F6dnUcRuyM2TwR8myT1dYypFXpPSxqwKNSFNkxyNESd"),
  // FixedBps25
  new (0, _web3js.PublicKey)("2nHK1kju6XjphBLbNxpM5XRGFj7p9U8vvNzyZiha1z6k"),
  // FixedBps30
  new (0, _web3js.PublicKey)("Hv8Lmzmnju6m7kcokVKvwqz7QPmdX9XfKjJsXz8RXcjp"),
  // FixedBps100
  new (0, _web3js.PublicKey)("2c4cYd4reUYVRAB9kUUkrq55VPyy2FNQ3FDL4o12JXmq"),
  // FixedBps200
  new (0, _web3js.PublicKey)("AkmQWebAwFvWk55wBoCr5D62C6VVDTzi84NJuD9H7cFD"),
  // FixedBps400
  new (0, _web3js.PublicKey)("DbCRBj8McvPYHJG1ukj8RE15h2dCNUdTAESG49XpQ44u"),
  // FixedBps600
  new (0, _web3js.PublicKey)("A8gMrEPJkacWkcb3DGwtJwTe16HktSEfvwtuDh2MCtck")
  // Customizable
];
var DEFAULT_MIGRATED_POOL_FEE_PARAMS = {
  collectFeeMode: 0,
  dynamicFee: 0,
  poolFeeBps: 0
};
var DEFAULT_LIQUIDITY_VESTING_INFO_PARAMS = {
  vestingPercentage: 0,
  bpsPerPeriod: 0,
  numberOfPeriods: 0,
  cliffDurationFromMigrationTime: 0,
  totalDuration: 0
};
var DEFAULT_MIGRATED_POOL_MARKET_CAP_FEE_SCHEDULER_PARAMS = {
  numberOfPeriod: 0,
  sqrtPriceStepBps: 0,
  schedulerExpirationDuration: 0,
  reductionFactor: new (0, _bnjs2.default)(0)
};

// src/helpers/common.ts

var _decimaljs = require('decimal.js'); var _decimaljs2 = _interopRequireDefault(_decimaljs);

// src/math/curve.ts


// src/math/safeMath.ts

var SafeMath = class {
  /**
   * Safe addition
   * @param a First number
   * @param b Second number
   * @returns Sum of a and b
   */
  static add(a, b) {
    return a.add(b);
  }
  /**
   * Safe subtraction
   * @param a First number
   * @param b Second number
   * @returns Difference of a and b
   * @throws Error if b > a
   */
  static sub(a, b) {
    if (b.gt(a)) {
      throw new Error("SafeMath: subtraction overflow");
    }
    return a.sub(b);
  }
  /**
   * Safe multiplication
   * @param a First number
   * @param b Second number
   * @returns Product of a and b
   */
  static mul(a, b) {
    return a.mul(b);
  }
  /**
   * Safe division
   * @param a First number
   * @param b Second number
   * @returns Quotient of a and b
   * @throws Error if b is zero
   */
  static div(a, b) {
    if (b.isZero()) {
      throw new Error("SafeMath: division by zero");
    }
    return a.div(b);
  }
  /**
   * Safe modulo
   * @param a First number
   * @param b Second number
   * @returns Remainder of a divided by b
   * @throws Error if b is zero
   */
  static mod(a, b) {
    if (b.isZero()) {
      throw new Error("SafeMath: modulo by zero");
    }
    return a.mod(b);
  }
  /**
   * Safe left shift
   * @param a Number to shift
   * @param b Number of bits to shift
   * @returns a << b
   */
  static shl(a, b) {
    return a.shln(b);
  }
  /**
   * Safe right shift
   * @param a Number to shift
   * @param b Number of bits to shift
   * @returns a >> b
   */
  static shr(a, b) {
    return a.shrn(b);
  }
};
function pow(base, exponent, scaling = true) {
  const ONE = new (0, _bnjs2.default)(1).shln(RESOLUTION);
  if (exponent.isZero()) return ONE;
  if (base.isZero()) return new (0, _bnjs2.default)(0);
  if (base.eq(ONE)) return ONE;
  const isNegative = exponent.isNeg();
  const absExponent = isNegative ? exponent.neg() : exponent;
  let result = ONE;
  let currentBase = base;
  let exp = absExponent;
  while (!exp.isZero()) {
    if (exp.and(new (0, _bnjs2.default)(1)).eq(new (0, _bnjs2.default)(1))) {
      result = SafeMath.div(SafeMath.mul(result, currentBase), ONE);
    }
    currentBase = SafeMath.div(SafeMath.mul(currentBase, currentBase), ONE);
    exp = exp.shrn(1);
  }
  if (isNegative) {
    result = SafeMath.div(ONE.mul(ONE), result);
  }
  return scaling ? result : SafeMath.div(result, ONE);
}

// src/math/utilsMath.ts

function mulDiv(x, y, denominator, rounding) {
  if (denominator.isZero()) {
    throw new Error("MulDiv: division by zero");
  }
  if (denominator.eq(new (0, _bnjs2.default)(1)) || x.isZero() || y.isZero()) {
    return x.mul(y);
  }
  const prod = x.mul(y);
  if (rounding === 0 /* Up */) {
    const numerator = prod.add(denominator.sub(new (0, _bnjs2.default)(1)));
    return numerator.div(denominator);
  } else {
    return prod.div(denominator);
  }
}
function mulShr(x, y, offset) {
  if (offset === 0 || x.isZero() || y.isZero()) {
    return x.mul(y);
  }
  const prod = SafeMath.mul(x, y);
  return SafeMath.shr(prod, offset);
}
function sqrt(value) {
  if (value.isZero()) {
    return new (0, _bnjs2.default)(0);
  }
  if (value.eq(new (0, _bnjs2.default)(1))) {
    return new (0, _bnjs2.default)(1);
  }
  let x = value;
  let y = value.add(new (0, _bnjs2.default)(1)).div(new (0, _bnjs2.default)(2));
  while (y.lt(x)) {
    x = y;
    y = x.add(value.div(x)).div(new (0, _bnjs2.default)(2));
  }
  return x;
}

// src/math/curve.ts
function getInitialLiquidityFromDeltaQuote(quoteAmount, sqrtMinPrice, sqrtPrice) {
  const priceDelta = SafeMath.sub(sqrtPrice, sqrtMinPrice);
  const quoteAmountShifted = SafeMath.shl(quoteAmount, 128);
  return SafeMath.div(quoteAmountShifted, priceDelta);
}
function getInitialLiquidityFromDeltaBase(baseAmount, sqrtMaxPrice, sqrtPrice) {
  const priceDelta = SafeMath.sub(sqrtMaxPrice, sqrtPrice);
  const prod = SafeMath.mul(SafeMath.mul(baseAmount, sqrtPrice), sqrtMaxPrice);
  const liquidity = SafeMath.div(prod, priceDelta);
  return liquidity;
}
function getDeltaAmountBaseUnsigned(lowerSqrtPrice, upperSqrtPrice, liquidity, round) {
  const result = getDeltaAmountBaseUnsigned256(
    lowerSqrtPrice,
    upperSqrtPrice,
    liquidity,
    round
  );
  return result;
}
function getDeltaAmountBaseUnsigned256(lowerSqrtPrice, upperSqrtPrice, liquidity, round) {
  const result = getDeltaAmountBaseUnsignedUnchecked(
    lowerSqrtPrice,
    upperSqrtPrice,
    liquidity,
    round
  );
  return result;
}
function getDeltaAmountBaseUnsignedUnchecked(lowerSqrtPrice, upperSqrtPrice, liquidity, round) {
  const numerator1 = liquidity;
  const numerator2 = SafeMath.sub(upperSqrtPrice, lowerSqrtPrice);
  const denominator = SafeMath.mul(lowerSqrtPrice, upperSqrtPrice);
  if (denominator.isZero()) {
    throw new Error("Denominator cannot be zero");
  }
  const result = mulDiv(numerator1, numerator2, denominator, round);
  return result;
}
function getDeltaAmountQuoteUnsigned(lowerSqrtPrice, upperSqrtPrice, liquidity, round) {
  const result = getDeltaAmountQuoteUnsigned256(
    lowerSqrtPrice,
    upperSqrtPrice,
    liquidity,
    round
  );
  return result;
}
function getDeltaAmountQuoteUnsigned256(lowerSqrtPrice, upperSqrtPrice, liquidity, round) {
  const result = getDeltaAmountQuoteUnsignedUnchecked(
    lowerSqrtPrice,
    upperSqrtPrice,
    liquidity,
    round
  );
  return result;
}
function getDeltaAmountQuoteUnsignedUnchecked(lowerSqrtPrice, upperSqrtPrice, liquidity, round) {
  const deltaSqrtPrice = SafeMath.sub(upperSqrtPrice, lowerSqrtPrice);
  const prod = SafeMath.mul(liquidity, deltaSqrtPrice);
  if (round === 0 /* Up */) {
    const denominator = new (0, _bnjs2.default)(1).shln(RESOLUTION * 2);
    const numerator = SafeMath.add(
      prod,
      SafeMath.sub(denominator, new (0, _bnjs2.default)(1))
    );
    return SafeMath.div(numerator, denominator);
  } else {
    return SafeMath.shr(prod, RESOLUTION * 2);
  }
}
function getNextSqrtPriceFromInput(sqrtPrice, liquidity, amountIn, baseForQuote) {
  if (sqrtPrice.isZero()) {
    throw new Error("sqrt_price must be greater than 0");
  }
  if (liquidity.isZero()) {
    throw new Error("liquidity must be greater than 0");
  }
  if (baseForQuote) {
    return getNextSqrtPriceFromBaseAmountInRoundingUp(
      sqrtPrice,
      liquidity,
      amountIn
    );
  } else {
    return getNextSqrtPriceFromQuoteAmountInRoundingDown(
      sqrtPrice,
      liquidity,
      amountIn
    );
  }
}
function getNextSqrtPriceFromOutput(sqrtPrice, liquidity, amountOut, baseForQuote) {
  if (sqrtPrice.isZero()) {
    throw new Error("sqrt_price must be greater than 0");
  }
  if (liquidity.isZero()) {
    throw new Error("liquidity must be greater than 0");
  }
  if (baseForQuote) {
    return getNextSqrtPriceFromQuoteAmountOutRoundingDown(
      sqrtPrice,
      liquidity,
      amountOut
    );
  } else {
    return getNextSqrtPriceFromBaseAmountOutRoundingUp(
      sqrtPrice,
      liquidity,
      amountOut
    );
  }
}
function getNextSqrtPriceFromQuoteAmountOutRoundingDown(sqrtPrice, liquidity, amount) {
  const qAmount = SafeMath.shl(amount, 128);
  const numerator = SafeMath.add(qAmount, SafeMath.sub(liquidity, new (0, _bnjs2.default)(1)));
  const quotient = SafeMath.div(numerator, liquidity);
  const result = SafeMath.sub(sqrtPrice, quotient);
  return result;
}
function getNextSqrtPriceFromBaseAmountOutRoundingUp(sqrtPrice, liquidity, amount) {
  if (amount.isZero()) {
    return sqrtPrice;
  }
  const product = SafeMath.mul(amount, sqrtPrice);
  const denominator = SafeMath.sub(liquidity, product);
  if (denominator.isZero() || denominator.isNeg()) {
    throw new Error(
      "Invalid denominator: liquidity must be greater than amount * sqrt_price"
    );
  }
  return mulDiv(liquidity, sqrtPrice, denominator, 0 /* Up */);
}
function getNextSqrtPriceFromBaseAmountInRoundingUp(sqrtPrice, liquidity, amount) {
  if (amount.isZero()) {
    return sqrtPrice;
  }
  const product = SafeMath.mul(amount, sqrtPrice);
  if (product.gt(U128_MAX)) {
    const quotient = SafeMath.div(liquidity, sqrtPrice);
    const denominator2 = SafeMath.add(quotient, amount);
    return SafeMath.div(liquidity, denominator2);
  }
  const denominator = SafeMath.add(liquidity, product);
  return mulDiv(liquidity, sqrtPrice, denominator, 0 /* Up */);
}
function getNextSqrtPriceFromQuoteAmountInRoundingDown(sqrtPrice, liquidity, amount) {
  const quotient = SafeMath.div(
    SafeMath.shl(amount, RESOLUTION * 2),
    liquidity
  );
  return SafeMath.add(sqrtPrice, quotient);
}

// src/helpers/common.ts


// src/helpers/utils.ts


var _spltoken = require('@solana/spl-token');

function convertToLamports(amount, tokenDecimal) {
  const valueInLamports = new (0, _decimaljs2.default)(amount).mul(
    _decimaljs2.default.pow(10, tokenDecimal)
  );
  return fromDecimalToBN(valueInLamports);
}
function fromDecimalToBN(value) {
  return new (0, _bnjs2.default)(value.floor().toFixed());
}
function createProgramAccountFilter(owner, offset) {
  const ownerKey = typeof owner === "string" ? new (0, _web3js.PublicKey)(owner) : owner;
  return [
    {
      memcmp: {
        offset,
        bytes: ownerKey.toBase58(),
        encoding: "base58"
      }
    }
  ];
}
function isNativeSol(mint) {
  return mint.toString() === _spltoken.NATIVE_MINT.toString();
}
function isDefaultLockedVesting(lockedVesting) {
  return lockedVesting.amountPerPeriod.eqn(0) && lockedVesting.cliffDurationFromMigrationTime.eqn(0) && lockedVesting.frequency.eqn(0) && lockedVesting.numberOfPeriod.eqn(0) && lockedVesting.cliffUnlockAmount.eqn(0);
}
function convertDecimalToBN(value) {
  return new (0, _bnjs2.default)(value.floor().toFixed());
}
function bpsToFeeNumerator(bps) {
  return new (0, _bnjs2.default)(bps * FEE_DENOMINATOR).divn(MAX_BASIS_POINT);
}
function feeNumeratorToBps(feeNumerator) {
  return feeNumerator.muln(MAX_BASIS_POINT).div(new (0, _bnjs2.default)(FEE_DENOMINATOR)).toNumber();
}

// src/helpers/token.ts



















var getOrCreateATAInstruction = async (connection, tokenMint, owner, payer, allowOwnerOffCurve = true, tokenProgram, commitment = "confirmed") => {
  const toAccount = _spltoken.getAssociatedTokenAddressSync.call(void 0, 
    tokenMint,
    owner,
    allowOwnerOffCurve,
    tokenProgram
  );
  try {
    await _spltoken.getAccount.call(void 0, connection, toAccount, commitment, tokenProgram);
    return { ataPubkey: toAccount, ix: void 0 };
  } catch (e) {
    if (e instanceof _spltoken.TokenAccountNotFoundError || e instanceof _spltoken.TokenInvalidAccountOwnerError) {
      const ix = _spltoken.createAssociatedTokenAccountIdempotentInstruction.call(void 0, 
        payer,
        toAccount,
        owner,
        tokenMint,
        tokenProgram
      );
      return { ataPubkey: toAccount, ix };
    } else {
      console.error("Error::getOrCreateATAInstruction", e);
      throw e;
    }
  }
};
function unwrapSOLInstruction(owner, receiver, allowOwnerOffCurve = true) {
  const wSolATAAccount = _spltoken.getAssociatedTokenAddressSync.call(void 0, 
    _spltoken.NATIVE_MINT,
    owner,
    allowOwnerOffCurve
  );
  if (wSolATAAccount) {
    const closedWrappedSolInstruction = _spltoken.createCloseAccountInstruction.call(void 0, 
      wSolATAAccount,
      receiver,
      owner,
      [],
      _spltoken.TOKEN_PROGRAM_ID
    );
    return closedWrappedSolInstruction;
  }
  return null;
}
function wrapSOLInstruction(from, to, amount) {
  return [
    _web3js.SystemProgram.transfer({
      fromPubkey: from,
      toPubkey: to,
      lamports: amount
    }),
    new (0, _web3js.TransactionInstruction)({
      keys: [
        {
          pubkey: to,
          isSigner: false,
          isWritable: true
        }
      ],
      data: Buffer.from(new Uint8Array([17])),
      programId: _spltoken.TOKEN_PROGRAM_ID
    })
  ];
}
function findAssociatedTokenAddress(walletAddress, tokenMintAddress, tokenProgramId) {
  return _web3js.PublicKey.findProgramAddressSync(
    [
      walletAddress.toBuffer(),
      tokenProgramId.toBuffer(),
      tokenMintAddress.toBuffer()
    ],
    _spltoken.ASSOCIATED_TOKEN_PROGRAM_ID
  )[0];
}
async function getTokenDecimals(connection, mintAddress) {
  const mintPubkey = mintAddress instanceof _web3js.PublicKey ? mintAddress : new (0, _web3js.PublicKey)(mintAddress);
  const tokenProgram = (await connection.getAccountInfo(mintPubkey)).owner;
  const mintInfo = await _spltoken.getMint.call(void 0, 
    connection,
    mintPubkey,
    "confirmed",
    tokenProgram
  );
  return mintInfo.decimals;
}
function getTokenProgram(tokenType) {
  return tokenType === 0 /* SPLToken */ ? _spltoken.TOKEN_PROGRAM_ID : _spltoken.TOKEN_2022_PROGRAM_ID;
}
async function getTokenType(connection, tokenMint) {
  const accountInfo = await connection.getAccountInfo(tokenMint);
  if (!accountInfo) {
    return null;
  }
  return accountInfo.owner.equals(_spltoken.TOKEN_PROGRAM_ID) ? 0 /* SPLToken */ : 1 /* Token2022 */;
}
async function prepareTokenAccountTx(connection, owner, payer, tokenMint, amount, tokenProgram, commitment = "confirmed") {
  const instructions = [];
  const { ataPubkey: tokenAccount, ix: createAtaIx } = await getOrCreateATAInstruction(
    connection,
    tokenMint,
    owner,
    payer,
    true,
    tokenProgram,
    commitment
  );
  createAtaIx && instructions.push(createAtaIx);
  if (tokenMint.equals(_spltoken.NATIVE_MINT)) {
    const wrapIx = wrapSOLInstruction(owner, tokenAccount, amount);
    instructions.push(...wrapIx);
  }
  const transaction = new (0, _web3js.Transaction)();
  if (instructions.length > 0) {
    transaction.add(...instructions);
  }
  return { tokenAccount, transaction };
}
async function cleanUpTokenAccountTx(owner, receiver, tokenMint) {
  if (tokenMint.equals(_spltoken.NATIVE_MINT)) {
    const unwrapIx = unwrapSOLInstruction(owner, receiver);
    if (unwrapIx) {
      return { transaction: new (0, _web3js.Transaction)().add(unwrapIx) };
    }
  }
  return null;
}

// src/math/feeMath.ts


// src/math/poolFees/baseFee.ts


// src/math/poolFees/rateLimiter.ts

function isRateLimiterApplied(currentPoint, activationPoint, tradeDirection, maxLimiterDuration, referenceAmount, feeIncrementBps) {
  if (isZeroRateLimiter(referenceAmount, maxLimiterDuration, feeIncrementBps)) {
    return false;
  }
  if (tradeDirection === 0 /* BaseToQuote */) {
    return false;
  }
  const lastEffectiveRateLimiterPoint = activationPoint.add(maxLimiterDuration);
  return currentPoint.lte(lastEffectiveRateLimiterPoint);
}
function isZeroRateLimiter(referenceAmount, maxLimiterDuration, feeIncrementBps) {
  return referenceAmount.isZero() && maxLimiterDuration.isZero() && feeIncrementBps.isZero();
}
function isNonZeroRateLimiter(referenceAmount, maxLimiterDuration, feeIncrementBps) {
  return !referenceAmount.isZero() && !maxLimiterDuration.isZero() && !feeIncrementBps.isZero();
}
function getMaxIndex(cliffFeeNumerator, feeIncrementBps) {
  if (cliffFeeNumerator.gt(new (0, _bnjs2.default)(MAX_FEE_NUMERATOR))) {
    throw new Error("Cliff fee numerator exceeds maximum fee numerator");
  }
  const deltaNumerator = new (0, _bnjs2.default)(MAX_FEE_NUMERATOR).sub(cliffFeeNumerator);
  const feeIncrementNumerator = toNumerator(
    feeIncrementBps,
    new (0, _bnjs2.default)(FEE_DENOMINATOR)
  );
  if (feeIncrementNumerator.isZero()) {
    throw new Error("Fee increment numerator cannot be zero");
  }
  return deltaNumerator.div(feeIncrementNumerator);
}
function getMaxOutAmountWithMinBaseFee(cliffFeeNumerator, referenceAmount, feeIncrementBps) {
  return getRateLimiterExcludedFeeAmount(
    cliffFeeNumerator,
    referenceAmount,
    feeIncrementBps,
    referenceAmount
  );
}
function getCheckedAmounts(cliffFeeNumerator, referenceAmount, feeIncrementBps) {
  const maxIndex = getMaxIndex(cliffFeeNumerator, feeIncrementBps);
  const x0 = referenceAmount;
  const one = new (0, _bnjs2.default)(1);
  const maxIndexInputAmount = maxIndex.add(one).mul(x0);
  if (maxIndexInputAmount.lte(U64_MAX)) {
    const checkedIncludedFeeAmount = maxIndexInputAmount;
    const checkedOutputAmount = getRateLimiterExcludedFeeAmount(
      cliffFeeNumerator,
      referenceAmount,
      feeIncrementBps,
      checkedIncludedFeeAmount
    );
    return [checkedOutputAmount, checkedIncludedFeeAmount, false];
  } else {
    const checkedExcludedFeeAmount = getRateLimiterExcludedFeeAmount(
      cliffFeeNumerator,
      referenceAmount,
      feeIncrementBps,
      U64_MAX
    );
    return [checkedExcludedFeeAmount, U64_MAX, true];
  }
}
function getFeeNumeratorFromExcludedAmount(cliffFeeNumerator, referenceAmount, feeIncrementBps, excludedFeeAmount) {
  const excludedFeeReferenceAmount = getRateLimiterExcludedFeeAmount(
    cliffFeeNumerator,
    referenceAmount,
    feeIncrementBps,
    referenceAmount
  );
  if (excludedFeeAmount.lte(excludedFeeReferenceAmount)) {
    return cliffFeeNumerator;
  }
  const [checkedExcludedFeeAmount, checkedIncludedFeeAmount, isOverflow] = getCheckedAmounts(cliffFeeNumerator, referenceAmount, feeIncrementBps);
  if (excludedFeeAmount.eq(checkedExcludedFeeAmount)) {
    return getFeeNumeratorFromIncludedAmount(
      cliffFeeNumerator,
      referenceAmount,
      feeIncrementBps,
      checkedIncludedFeeAmount
    );
  }
  let includedFeeAmount;
  if (excludedFeeAmount.lt(checkedExcludedFeeAmount)) {
    const two = new (0, _bnjs2.default)(2);
    const four = new (0, _bnjs2.default)(4);
    const i = toNumerator(feeIncrementBps, new (0, _bnjs2.default)(FEE_DENOMINATOR));
    const x0 = referenceAmount;
    const d = new (0, _bnjs2.default)(FEE_DENOMINATOR);
    const c = cliffFeeNumerator;
    const ex = excludedFeeAmount;
    const x = i;
    const y = two.mul(d).mul(x0).add(i.mul(x0)).sub(two.mul(c).mul(x0));
    const z = two.mul(ex).mul(d).mul(x0);
    const discriminant = y.mul(y).sub(four.mul(x).mul(z));
    const sqrtDiscriminant = sqrt(discriminant);
    includedFeeAmount = y.sub(sqrtDiscriminant).div(two.mul(x));
    const aPlusOne = includedFeeAmount.div(x0);
    const firstExcludedFeeAmount = getRateLimiterExcludedFeeAmount(
      cliffFeeNumerator,
      referenceAmount,
      feeIncrementBps,
      includedFeeAmount
    );
    const excludedFeeRemainingAmount = excludedFeeAmount.sub(
      firstExcludedFeeAmount
    );
    const remainingAmountFeeNumerator = c.add(i.mul(aPlusOne));
    const includedFeeRemainingAmount = mulDiv(
      excludedFeeRemainingAmount,
      new (0, _bnjs2.default)(FEE_DENOMINATOR),
      new (0, _bnjs2.default)(FEE_DENOMINATOR).sub(remainingAmountFeeNumerator),
      0 /* Up */
    );
    const totalInAmount = includedFeeAmount.add(includedFeeRemainingAmount);
    includedFeeAmount = totalInAmount;
  } else {
    if (isOverflow) {
      throw new Error("Math overflow");
    }
    const excludedFeeRemainingAmount = excludedFeeAmount.sub(
      checkedExcludedFeeAmount
    );
    const includedFeeRemainingAmount = mulDiv(
      excludedFeeRemainingAmount,
      new (0, _bnjs2.default)(FEE_DENOMINATOR),
      new (0, _bnjs2.default)(FEE_DENOMINATOR).sub(new (0, _bnjs2.default)(MAX_FEE_NUMERATOR)),
      0 /* Up */
    );
    const totalAmountIn = includedFeeRemainingAmount.add(
      checkedIncludedFeeAmount
    );
    includedFeeAmount = totalAmountIn;
  }
  const tradingFee = includedFeeAmount.sub(excludedFeeAmount);
  const feeNumerator = mulDiv(
    tradingFee,
    new (0, _bnjs2.default)(FEE_DENOMINATOR),
    includedFeeAmount,
    0 /* Up */
  );
  if (feeNumerator.lt(cliffFeeNumerator)) {
    throw new Error(
      "Undetermined error: fee numerator less than cliff fee numerator"
    );
  }
  return feeNumerator;
}
function getRateLimiterExcludedFeeAmount(cliffFeeNumerator, referenceAmount, feeIncrementBps, includedFeeAmount) {
  const feeNumerator = getFeeNumeratorFromIncludedAmount(
    cliffFeeNumerator,
    referenceAmount,
    feeIncrementBps,
    includedFeeAmount
  );
  const tradingFee = mulDiv(
    includedFeeAmount,
    feeNumerator,
    new (0, _bnjs2.default)(FEE_DENOMINATOR),
    0 /* Up */
  );
  return includedFeeAmount.sub(tradingFee);
}
function getFeeNumeratorFromIncludedAmount(cliffFeeNumerator, referenceAmount, feeIncrementBps, includedFeeAmount) {
  if (includedFeeAmount.lte(referenceAmount)) {
    return cliffFeeNumerator;
  }
  const c = cliffFeeNumerator;
  const diff = includedFeeAmount.sub(referenceAmount);
  const a = diff.div(referenceAmount);
  const b = diff.mod(referenceAmount);
  const maxIndex = getMaxIndex(cliffFeeNumerator, feeIncrementBps);
  const i = toNumerator(feeIncrementBps, new (0, _bnjs2.default)(FEE_DENOMINATOR));
  const x0 = referenceAmount;
  const one = new (0, _bnjs2.default)(1);
  const two = new (0, _bnjs2.default)(2);
  let tradingFeeNumerator;
  if (a.lt(maxIndex)) {
    const numerator1 = c.add(c.mul(a)).add(i.mul(a).mul(a.add(one)).div(two));
    const numerator2 = c.add(i.mul(a.add(one)));
    const firstFee = x0.mul(numerator1);
    const secondFee = b.mul(numerator2);
    tradingFeeNumerator = firstFee.add(secondFee);
  } else {
    const numerator1 = c.add(c.mul(maxIndex)).add(i.mul(maxIndex).mul(maxIndex.add(one)).div(two));
    const numerator2 = new (0, _bnjs2.default)(MAX_FEE_NUMERATOR);
    const firstFee = x0.mul(numerator1);
    const d = a.sub(maxIndex);
    const leftAmount = d.mul(x0).add(b);
    const secondFee = leftAmount.mul(numerator2);
    tradingFeeNumerator = firstFee.add(secondFee);
  }
  const denominator = new (0, _bnjs2.default)(FEE_DENOMINATOR);
  const tradingFee = tradingFeeNumerator.add(denominator).sub(one).div(denominator);
  const feeNumerator = mulDiv(
    tradingFee,
    new (0, _bnjs2.default)(FEE_DENOMINATOR),
    includedFeeAmount,
    0 /* Up */
  );
  return feeNumerator;
}
function getRateLimiterMinBaseFeeNumerator(cliffFeeNumerator) {
  return cliffFeeNumerator;
}

// src/math/poolFees/feeScheduler.ts

function getFeeSchedulerMaxBaseFeeNumerator(cliffFeeNumerator) {
  return cliffFeeNumerator;
}
function getFeeSchedulerMinBaseFeeNumerator(cliffFeeNumerator, numberOfPeriod, reductionFactor, feeSchedulerMode) {
  return getBaseFeeNumeratorByPeriod(
    cliffFeeNumerator,
    numberOfPeriod,
    new (0, _bnjs2.default)(numberOfPeriod),
    reductionFactor,
    feeSchedulerMode
  );
}
function getBaseFeeNumeratorByPeriod(cliffFeeNumerator, numberOfPeriod, period, reductionFactor, feeSchedulerMode) {
  const periodValue = _bnjs2.default.min(period, new (0, _bnjs2.default)(numberOfPeriod));
  const periodNumber = periodValue.toNumber();
  if (periodNumber > U16_MAX) {
    throw new Error("Math overflow");
  }
  switch (feeSchedulerMode) {
    case 0 /* FeeSchedulerLinear */: {
      const feeNumerator = getFeeNumeratorOnLinearFeeScheduler(
        cliffFeeNumerator,
        reductionFactor,
        periodNumber
      );
      return feeNumerator;
    }
    case 1 /* FeeSchedulerExponential */: {
      const feeNumerator = getFeeNumeratorOnExponentialFeeScheduler(
        cliffFeeNumerator,
        reductionFactor,
        periodNumber
      );
      return feeNumerator;
    }
    default:
      throw new Error("Invalid fee scheduler mode");
  }
}
function getFeeNumeratorOnLinearFeeScheduler(cliffFeeNumerator, reductionFactor, period) {
  const reduction = SafeMath.mul(new (0, _bnjs2.default)(period), reductionFactor);
  return SafeMath.sub(cliffFeeNumerator, reduction);
}
function getFeeNumeratorOnExponentialFeeScheduler(cliffFeeNumerator, reductionFactor, period) {
  if (period === 0) {
    return cliffFeeNumerator;
  }
  const basisPointMax = new (0, _bnjs2.default)(MAX_BASIS_POINT);
  const ONE_Q642 = new (0, _bnjs2.default)(1).shln(64);
  const bps = SafeMath.div(SafeMath.shl(reductionFactor, 64), basisPointMax);
  const base = SafeMath.sub(ONE_Q642, bps);
  const result = pow(base, new (0, _bnjs2.default)(period));
  return SafeMath.div(SafeMath.mul(cliffFeeNumerator, result), ONE_Q642);
}
function getBaseFeeNumerator(cliffFeeNumerator, numberOfPeriod, periodFrequency, reductionFactor, feeSchedulerMode, currentPoint, activationPoint) {
  if (periodFrequency.isZero()) {
    return cliffFeeNumerator;
  }
  const period = currentPoint.sub(activationPoint).div(periodFrequency);
  return getBaseFeeNumeratorByPeriod(
    cliffFeeNumerator,
    numberOfPeriod,
    period,
    reductionFactor,
    feeSchedulerMode
  );
}

// src/math/poolFees/baseFee.ts
var FeeRateLimiter = class {
  constructor(cliffFeeNumerator, feeIncrementBps, maxLimiterDuration, referenceAmount) {
    this.cliffFeeNumerator = cliffFeeNumerator;
    this.feeIncrementBps = feeIncrementBps;
    this.maxLimiterDuration = maxLimiterDuration;
    this.referenceAmount = referenceAmount;
  }
  validate(collectFeeMode, activationType) {
    return validateFeeRateLimiter(
      this.cliffFeeNumerator,
      new (0, _bnjs2.default)(this.feeIncrementBps),
      this.maxLimiterDuration,
      this.referenceAmount,
      collectFeeMode,
      activationType
    );
  }
  getMinBaseFeeNumerator() {
    return getRateLimiterMinBaseFeeNumerator(this.cliffFeeNumerator);
  }
  getBaseFeeNumeratorFromIncludedFeeAmount(currentPoint, activationPoint, tradeDirection, includedFeeAmount) {
    if (isRateLimiterApplied(
      currentPoint,
      activationPoint,
      tradeDirection,
      this.maxLimiterDuration,
      this.referenceAmount,
      new (0, _bnjs2.default)(this.feeIncrementBps)
    )) {
      return getFeeNumeratorFromIncludedAmount(
        this.cliffFeeNumerator,
        this.referenceAmount,
        new (0, _bnjs2.default)(this.feeIncrementBps),
        includedFeeAmount
      );
    } else {
      return this.cliffFeeNumerator;
    }
  }
  getBaseFeeNumeratorFromExcludedFeeAmount(currentPoint, activationPoint, tradeDirection, excludedFeeAmount) {
    if (isRateLimiterApplied(
      currentPoint,
      activationPoint,
      tradeDirection,
      this.maxLimiterDuration,
      this.referenceAmount,
      new (0, _bnjs2.default)(this.feeIncrementBps)
    )) {
      return getFeeNumeratorFromExcludedAmount(
        this.cliffFeeNumerator,
        this.referenceAmount,
        new (0, _bnjs2.default)(this.feeIncrementBps),
        excludedFeeAmount
      );
    } else {
      return this.cliffFeeNumerator;
    }
  }
};
var FeeScheduler = class {
  constructor(cliffFeeNumerator, numberOfPeriod, periodFrequency, reductionFactor, feeSchedulerMode) {
    this.cliffFeeNumerator = cliffFeeNumerator;
    this.numberOfPeriod = numberOfPeriod;
    this.periodFrequency = periodFrequency;
    this.reductionFactor = reductionFactor;
    this.feeSchedulerMode = feeSchedulerMode;
  }
  validate() {
    return validateFeeScheduler(
      this.numberOfPeriod,
      this.periodFrequency,
      this.reductionFactor,
      this.cliffFeeNumerator,
      this.feeSchedulerMode
    );
  }
  getMinBaseFeeNumerator() {
    return getFeeSchedulerMinBaseFeeNumerator(
      this.cliffFeeNumerator,
      this.numberOfPeriod,
      this.reductionFactor,
      this.feeSchedulerMode
    );
  }
  getBaseFeeNumeratorFromIncludedFeeAmount(currentPoint, activationPoint) {
    return getBaseFeeNumerator(
      this.cliffFeeNumerator,
      this.numberOfPeriod,
      this.periodFrequency,
      this.reductionFactor,
      this.feeSchedulerMode,
      currentPoint,
      activationPoint
    );
  }
  getBaseFeeNumeratorFromExcludedFeeAmount(currentPoint, activationPoint) {
    return getBaseFeeNumerator(
      this.cliffFeeNumerator,
      this.numberOfPeriod,
      this.periodFrequency,
      this.reductionFactor,
      this.feeSchedulerMode,
      currentPoint,
      activationPoint
    );
  }
};
function getBaseFeeHandler(cliffFeeNumerator, firstFactor, secondFactor, thirdFactor, baseFeeMode) {
  switch (baseFeeMode) {
    case 0 /* FeeSchedulerLinear */:
    case 1 /* FeeSchedulerExponential */: {
      const feeScheduler = new FeeScheduler(
        cliffFeeNumerator,
        firstFactor,
        secondFactor,
        thirdFactor,
        baseFeeMode
      );
      return feeScheduler;
    }
    case 2 /* RateLimiter */: {
      const feeRateLimiter = new FeeRateLimiter(
        cliffFeeNumerator,
        firstFactor,
        secondFactor,
        thirdFactor
      );
      return feeRateLimiter;
    }
    default:
      throw new Error("Invalid base fee mode");
  }
}

// src/math/poolFees/dynamicFee.ts

function isDynamicFeeEnabled(dynamicFee) {
  return dynamicFee.initialized !== 0;
}
function getVariableFeeNumerator(dynamicFee, volatilityTracker) {
  if (!isDynamicFeeEnabled(dynamicFee)) {
    return new (0, _bnjs2.default)(0);
  }
  const volatilityTimesBinStep = SafeMath.mul(
    volatilityTracker.volatilityAccumulator,
    new (0, _bnjs2.default)(dynamicFee.binStep)
  );
  const squareVfaBin = SafeMath.mul(
    volatilityTimesBinStep,
    volatilityTimesBinStep
  );
  const vFee = SafeMath.mul(
    squareVfaBin,
    new (0, _bnjs2.default)(dynamicFee.variableFeeControl)
  );
  const scaledVFee = SafeMath.div(
    SafeMath.add(vFee, DYNAMIC_FEE_ROUNDING_OFFSET),
    DYNAMIC_FEE_SCALING_FACTOR
  );
  return scaledVFee;
}

// src/math/feeMath.ts
function toNumerator(bps, feeDenominator) {
  try {
    const numerator = mulDiv(
      bps,
      feeDenominator,
      new (0, _bnjs2.default)(MAX_BASIS_POINT),
      1 /* Down */
    );
    return numerator;
  } catch (error) {
    throw new Error(
      `Type cast failed or calculation overflow in toNumerator ${error}`
    );
  }
}
function getFeeMode(collectFeeMode, tradeDirection, hasReferral) {
  let feesOnInput;
  let feesOnBaseToken;
  if (collectFeeMode === 1 /* OutputToken */) {
    if (tradeDirection === 0 /* BaseToQuote */) {
      feesOnInput = false;
      feesOnBaseToken = false;
    } else {
      feesOnInput = false;
      feesOnBaseToken = true;
    }
  } else {
    if (tradeDirection === 0 /* BaseToQuote */) {
      feesOnInput = false;
      feesOnBaseToken = false;
    } else {
      feesOnInput = true;
      feesOnBaseToken = false;
    }
  }
  return {
    feesOnInput,
    feesOnBaseToken,
    hasReferral
  };
}
function getTotalFeeNumeratorFromIncludedFeeAmount(poolFees, volatilityTracker, currentPoint, activationPoint, includedFeeAmount, tradeDirection) {
  const baseFeeHandler = getBaseFeeHandler(
    poolFees.baseFee.cliffFeeNumerator,
    poolFees.baseFee.firstFactor,
    poolFees.baseFee.secondFactor,
    poolFees.baseFee.thirdFactor,
    poolFees.baseFee.baseFeeMode
  );
  const baseFeeNumerator = baseFeeHandler.getBaseFeeNumeratorFromIncludedFeeAmount(
    currentPoint,
    activationPoint,
    tradeDirection,
    includedFeeAmount
  );
  return getTotalFeeNumerator(
    baseFeeNumerator,
    poolFees.dynamicFee,
    volatilityTracker
  );
}
function getTotalFeeNumeratorFromExcludedFeeAmount(poolFees, volatilityTracker, currentPoint, activationPoint, excludedFeeAmount, tradeDirection) {
  const baseFeeHandler = getBaseFeeHandler(
    poolFees.baseFee.cliffFeeNumerator,
    poolFees.baseFee.firstFactor,
    poolFees.baseFee.secondFactor,
    poolFees.baseFee.thirdFactor,
    poolFees.baseFee.baseFeeMode
  );
  const baseFeeNumerator = baseFeeHandler.getBaseFeeNumeratorFromExcludedFeeAmount(
    currentPoint,
    activationPoint,
    tradeDirection,
    excludedFeeAmount
  );
  return getTotalFeeNumerator(
    baseFeeNumerator,
    poolFees.dynamicFee,
    volatilityTracker
  );
}
function getTotalFeeNumerator(baseFeeNumerator, dynamicFee, volatilityTracker) {
  const variableFeeNumerator = getVariableFeeNumerator(
    dynamicFee,
    volatilityTracker
  );
  const totalFeeNumerator = SafeMath.add(
    variableFeeNumerator,
    baseFeeNumerator
  );
  const maxFeeNumeratorBN = new (0, _bnjs2.default)(MAX_FEE_NUMERATOR);
  const cappedTotalFeeNumerator = totalFeeNumerator.gt(maxFeeNumeratorBN) ? new (0, _bnjs2.default)(MAX_FEE_NUMERATOR) : totalFeeNumerator;
  return cappedTotalFeeNumerator;
}
function getFeeOnAmount(tradeFeeNumerator, amount, poolFees, hasReferral) {
  const [amountAfterFee, tradingFee] = getExcludedFeeAmount(
    tradeFeeNumerator,
    amount
  );
  const protocolFee = mulDiv(
    tradingFee,
    new (0, _bnjs2.default)(PROTOCOL_FEE_PERCENT),
    new (0, _bnjs2.default)(100),
    1 /* Down */
  );
  const updatedTradingFee = SafeMath.sub(tradingFee, protocolFee);
  const referralFee = hasReferral ? mulDiv(
    protocolFee,
    new (0, _bnjs2.default)(HOST_FEE_PERCENT),
    new (0, _bnjs2.default)(100),
    1 /* Down */
  ) : new (0, _bnjs2.default)(0);
  const updatedProtocolFee = SafeMath.sub(protocolFee, referralFee);
  return {
    amount: amountAfterFee,
    protocolFee: updatedProtocolFee,
    referralFee,
    tradingFee: updatedTradingFee
  };
}
function getExcludedFeeAmount(tradeFeeNumerator, includedFeeAmount) {
  const tradingFee = mulDiv(
    includedFeeAmount,
    tradeFeeNumerator,
    new (0, _bnjs2.default)(FEE_DENOMINATOR),
    0 /* Up */
  );
  const excludedFeeAmount = SafeMath.sub(includedFeeAmount, tradingFee);
  return [excludedFeeAmount, tradingFee];
}
function getIncludedFeeAmount(tradeFeeNumerator, excludedFeeAmount) {
  const includedFeeAmount = mulDiv(
    excludedFeeAmount,
    new (0, _bnjs2.default)(FEE_DENOMINATOR),
    SafeMath.sub(new (0, _bnjs2.default)(FEE_DENOMINATOR), tradeFeeNumerator),
    0 /* Up */
  );
  const feeAmount = SafeMath.sub(includedFeeAmount, excludedFeeAmount);
  return [includedFeeAmount, feeAmount];
}
function splitFees(poolFees, feeAmount, hasReferral) {
  const protocolFee = mulDiv(
    feeAmount,
    new (0, _bnjs2.default)(PROTOCOL_FEE_PERCENT),
    new (0, _bnjs2.default)(100),
    1 /* Down */
  );
  const tradingFee = SafeMath.sub(feeAmount, protocolFee);
  const referralFee = hasReferral ? mulDiv(
    protocolFee,
    new (0, _bnjs2.default)(HOST_FEE_PERCENT),
    new (0, _bnjs2.default)(100),
    1 /* Down */
  ) : new (0, _bnjs2.default)(0);
  const protocolFeeAfterReferral = SafeMath.sub(protocolFee, referralFee);
  return [tradingFee, protocolFeeAfterReferral, referralFee];
}

// src/math/swapQuote.ts

function getSwapResult(virtualPool, configState, amountIn, feeMode, tradeDirection, currentPoint, eligibleForFirstSwapWithMinFee) {
  let actualProtocolFee = new (0, _bnjs2.default)(0);
  let actualTradingFee = new (0, _bnjs2.default)(0);
  let actualReferralFee = new (0, _bnjs2.default)(0);
  const baseFeeHandler = getBaseFeeHandler(
    configState.poolFees.baseFee.cliffFeeNumerator,
    configState.poolFees.baseFee.firstFactor,
    configState.poolFees.baseFee.secondFactor,
    configState.poolFees.baseFee.thirdFactor,
    configState.poolFees.baseFee.baseFeeMode
  );
  const tradeFeeNumerator = eligibleForFirstSwapWithMinFee ? baseFeeHandler.getMinBaseFeeNumerator() : getTotalFeeNumeratorFromIncludedFeeAmount(
    configState.poolFees,
    virtualPool.poolState.volatilityTracker,
    currentPoint,
    virtualPool.poolState.activationPoint,
    amountIn,
    tradeDirection
  );
  const actualAmountIn = feeMode.feesOnInput ? (() => {
    const feeResult = getFeeOnAmount(
      tradeFeeNumerator,
      amountIn,
      configState.poolFees,
      feeMode.hasReferral
    );
    actualProtocolFee = feeResult.protocolFee;
    actualTradingFee = feeResult.tradingFee;
    actualReferralFee = feeResult.referralFee;
    return feeResult.amount;
  })() : amountIn;
  const swapAmountFromInput = tradeDirection === 0 /* BaseToQuote */ ? calculateBaseToQuoteFromAmountIn(
    configState,
    virtualPool.poolState.sqrtPrice,
    actualAmountIn
  ) : calculateQuoteToBaseFromAmountIn(
    configState,
    virtualPool.poolState.sqrtPrice,
    actualAmountIn,
    configState.migrationSqrtPrice
  );
  const { outputAmount, nextSqrtPrice, amountLeft } = swapAmountFromInput;
  if (!amountLeft.isZero()) {
    throw new Error("Insufficient Liquidity");
  }
  const actualAmountOut = feeMode.feesOnInput ? outputAmount : (() => {
    const feeResult = getFeeOnAmount(
      tradeFeeNumerator,
      outputAmount,
      configState.poolFees,
      feeMode.hasReferral
    );
    actualTradingFee = feeResult.tradingFee;
    actualProtocolFee = feeResult.protocolFee;
    actualReferralFee = feeResult.referralFee;
    return feeResult.amount;
  })();
  return {
    actualInputAmount: actualAmountIn,
    outputAmount: actualAmountOut,
    nextSqrtPrice,
    tradingFee: actualTradingFee,
    protocolFee: actualProtocolFee,
    referralFee: actualReferralFee
  };
}
function swapQuote(virtualPool, config, swapBaseForQuote, amountIn, slippageBps = 0, hasReferral, currentPoint, eligibleForFirstSwapWithMinFee) {
  if (virtualPool.poolState.quoteReserve.gte(config.migrationQuoteThreshold)) {
    throw new Error("Virtual pool is completed");
  }
  if (amountIn.isZero()) {
    throw new Error("Amount is zero");
  }
  const tradeDirection = swapBaseForQuote ? 0 /* BaseToQuote */ : 1 /* QuoteToBase */;
  const feeMode = getFeeMode(
    config.collectFeeMode,
    tradeDirection,
    hasReferral
  );
  const result = getSwapResult(
    virtualPool,
    config,
    amountIn,
    feeMode,
    tradeDirection,
    currentPoint,
    eligibleForFirstSwapWithMinFee
  );
  let minimumAmountOut;
  if (slippageBps > 0) {
    const slippageFactor = new (0, _bnjs2.default)(1e4 - slippageBps);
    const denominator = new (0, _bnjs2.default)(1e4);
    minimumAmountOut = result.outputAmount.mul(slippageFactor).div(denominator);
  } else {
    minimumAmountOut = result.outputAmount;
  }
  return {
    ...result,
    minimumAmountOut
  };
}
function getSwapResultFromExactInput(virtualPool, config, amountIn, feeMode, tradeDirection, currentPoint, eligibleForFirstSwapWithMinFee) {
  let actualProtocolFee = new (0, _bnjs2.default)(0);
  let actualTradingFee = new (0, _bnjs2.default)(0);
  let actualReferralFee = new (0, _bnjs2.default)(0);
  const baseFeeHandler = getBaseFeeHandler(
    config.poolFees.baseFee.cliffFeeNumerator,
    config.poolFees.baseFee.firstFactor,
    config.poolFees.baseFee.secondFactor,
    config.poolFees.baseFee.thirdFactor,
    config.poolFees.baseFee.baseFeeMode
  );
  const tradeFeeNumerator = eligibleForFirstSwapWithMinFee ? baseFeeHandler.getMinBaseFeeNumerator() : getTotalFeeNumeratorFromIncludedFeeAmount(
    config.poolFees,
    virtualPool.poolState.volatilityTracker,
    currentPoint,
    virtualPool.poolState.activationPoint,
    amountIn,
    tradeDirection
  );
  const actualAmountIn = feeMode.feesOnInput ? (() => {
    const feeResult = getFeeOnAmount(
      tradeFeeNumerator,
      amountIn,
      config.poolFees,
      feeMode.hasReferral
    );
    actualProtocolFee = feeResult.protocolFee;
    actualTradingFee = feeResult.tradingFee;
    actualReferralFee = feeResult.referralFee;
    return feeResult.amount;
  })() : amountIn;
  const swapAmountFromInput = tradeDirection === 0 /* BaseToQuote */ ? calculateBaseToQuoteFromAmountIn(
    config,
    virtualPool.poolState.sqrtPrice,
    actualAmountIn
  ) : calculateQuoteToBaseFromAmountIn(
    config,
    virtualPool.poolState.sqrtPrice,
    actualAmountIn,
    config.migrationSqrtPrice
  );
  const { outputAmount, nextSqrtPrice, amountLeft } = swapAmountFromInput;
  if (!amountLeft.isZero()) {
    throw new Error("Insufficient Liquidity");
  }
  const actualAmountOut = feeMode.feesOnInput ? outputAmount : (() => {
    const feeResult = getFeeOnAmount(
      tradeFeeNumerator,
      outputAmount,
      config.poolFees,
      feeMode.hasReferral
    );
    actualTradingFee = feeResult.tradingFee;
    actualProtocolFee = feeResult.protocolFee;
    actualReferralFee = feeResult.referralFee;
    return feeResult.amount;
  })();
  return {
    amountLeft,
    includedFeeInputAmount: amountIn,
    excludedFeeInputAmount: actualAmountIn,
    outputAmount: actualAmountOut,
    nextSqrtPrice,
    tradingFee: actualTradingFee,
    protocolFee: actualProtocolFee,
    referralFee: actualReferralFee
  };
}
function getSwapResultFromPartialInput(virtualPool, config, amountIn, feeMode, tradeDirection, currentPoint, eligibleForFirstSwapWithMinFee) {
  let actualProtocolFee = new (0, _bnjs2.default)(0);
  let actualTradingFee = new (0, _bnjs2.default)(0);
  let actualReferralFee = new (0, _bnjs2.default)(0);
  const baseFeeHandler = getBaseFeeHandler(
    config.poolFees.baseFee.cliffFeeNumerator,
    config.poolFees.baseFee.firstFactor,
    config.poolFees.baseFee.secondFactor,
    config.poolFees.baseFee.thirdFactor,
    config.poolFees.baseFee.baseFeeMode
  );
  const tradeFeeNumerator = eligibleForFirstSwapWithMinFee ? baseFeeHandler.getMinBaseFeeNumerator() : getTotalFeeNumeratorFromIncludedFeeAmount(
    config.poolFees,
    virtualPool.poolState.volatilityTracker,
    currentPoint,
    virtualPool.poolState.activationPoint,
    amountIn,
    tradeDirection
  );
  let actualAmountIn = feeMode.feesOnInput ? (() => {
    const feeResult = getFeeOnAmount(
      tradeFeeNumerator,
      amountIn,
      config.poolFees,
      feeMode.hasReferral
    );
    actualProtocolFee = feeResult.protocolFee;
    actualTradingFee = feeResult.tradingFee;
    actualReferralFee = feeResult.referralFee;
    return feeResult.amount;
  })() : amountIn;
  const swapAmountFromInput = tradeDirection === 0 /* BaseToQuote */ ? calculateBaseToQuoteFromAmountIn(
    config,
    virtualPool.poolState.sqrtPrice,
    actualAmountIn
  ) : calculateQuoteToBaseFromAmountIn(
    config,
    virtualPool.poolState.sqrtPrice,
    actualAmountIn,
    config.migrationSqrtPrice
  );
  const { outputAmount, nextSqrtPrice, amountLeft } = swapAmountFromInput;
  const includedFeeInputAmount = !amountLeft.isZero() ? (() => {
    actualAmountIn = SafeMath.sub(actualAmountIn, amountLeft);
    if (feeMode.feesOnInput) {
      const tradeFeeNumeratorPartial = eligibleForFirstSwapWithMinFee ? baseFeeHandler.getMinBaseFeeNumerator() : getTotalFeeNumeratorFromExcludedFeeAmount(
        config.poolFees,
        virtualPool.poolState.volatilityTracker,
        currentPoint,
        virtualPool.poolState.activationPoint,
        actualAmountIn,
        tradeDirection
      );
      const [includedFeeAmount, feeAmount] = getIncludedFeeAmount(
        tradeFeeNumeratorPartial,
        actualAmountIn
      );
      const [tradingFee, protocolFee, referralFee] = splitFees(
        config.poolFees,
        feeAmount,
        feeMode.hasReferral
      );
      actualTradingFee = tradingFee;
      actualProtocolFee = protocolFee;
      actualReferralFee = referralFee;
      return includedFeeAmount;
    } else {
      return actualAmountIn;
    }
  })() : amountIn;
  const actualAmountOut = feeMode.feesOnInput ? outputAmount : (() => {
    const feeResult = getFeeOnAmount(
      tradeFeeNumerator,
      outputAmount,
      config.poolFees,
      feeMode.hasReferral
    );
    actualProtocolFee = feeResult.protocolFee;
    actualTradingFee = feeResult.tradingFee;
    actualReferralFee = feeResult.referralFee;
    return feeResult.amount;
  })();
  return {
    amountLeft,
    includedFeeInputAmount,
    excludedFeeInputAmount: actualAmountIn,
    outputAmount: actualAmountOut,
    nextSqrtPrice,
    tradingFee: actualTradingFee,
    protocolFee: actualProtocolFee,
    referralFee: actualReferralFee
  };
}
function calculateBaseToQuoteFromAmountIn(configState, currentSqrtPrice, amountIn) {
  let totalOutputAmount = new (0, _bnjs2.default)(0);
  let currentSqrtPriceLocal = currentSqrtPrice;
  let amountLeft = amountIn;
  for (let i = configState.curve.length - 2; i >= 0; i--) {
    if (configState.curve[i].sqrtPrice.isZero() || configState.curve[i].liquidity.isZero()) {
      continue;
    }
    if (configState.curve[i].sqrtPrice.lt(currentSqrtPriceLocal)) {
      const maxAmountIn = getDeltaAmountBaseUnsigned(
        configState.curve[i].sqrtPrice,
        currentSqrtPriceLocal,
        configState.curve[i + 1].liquidity,
        0 /* Up */
      );
      if (amountLeft.lt(maxAmountIn)) {
        const nextSqrtPrice = getNextSqrtPriceFromInput(
          currentSqrtPriceLocal,
          configState.curve[i + 1].liquidity,
          amountLeft,
          true
        );
        const outputAmount = getDeltaAmountQuoteUnsigned(
          nextSqrtPrice,
          currentSqrtPriceLocal,
          configState.curve[i + 1].liquidity,
          1 /* Down */
        );
        totalOutputAmount = SafeMath.add(
          totalOutputAmount,
          outputAmount
        );
        currentSqrtPriceLocal = nextSqrtPrice;
        amountLeft = new (0, _bnjs2.default)(0);
        break;
      } else {
        const nextSqrtPrice = configState.curve[i].sqrtPrice;
        const outputAmount = getDeltaAmountQuoteUnsigned(
          nextSqrtPrice,
          currentSqrtPriceLocal,
          configState.curve[i + 1].liquidity,
          1 /* Down */
        );
        totalOutputAmount = SafeMath.add(
          totalOutputAmount,
          outputAmount
        );
        currentSqrtPriceLocal = nextSqrtPrice;
        amountLeft = SafeMath.sub(amountLeft, maxAmountIn);
      }
    }
  }
  if (!amountLeft.isZero()) {
    let nextSqrtPrice = getNextSqrtPriceFromInput(
      currentSqrtPriceLocal,
      configState.curve[0].liquidity,
      amountLeft,
      true
    );
    if (nextSqrtPrice.lt(configState.sqrtStartPrice)) {
      nextSqrtPrice = configState.sqrtStartPrice;
      const amountIn2 = getDeltaAmountBaseUnsigned(
        nextSqrtPrice,
        currentSqrtPriceLocal,
        configState.curve[0].liquidity,
        0 /* Up */
      );
      amountLeft = SafeMath.sub(amountLeft, amountIn2);
    } else {
      amountLeft = new (0, _bnjs2.default)(0);
    }
    const outputAmount = getDeltaAmountQuoteUnsigned(
      nextSqrtPrice,
      currentSqrtPriceLocal,
      configState.curve[0].liquidity,
      1 /* Down */
    );
    totalOutputAmount = SafeMath.add(totalOutputAmount, outputAmount);
    currentSqrtPriceLocal = nextSqrtPrice;
  }
  return {
    amountLeft,
    outputAmount: totalOutputAmount,
    nextSqrtPrice: currentSqrtPriceLocal
  };
}
function calculateQuoteToBaseFromAmountIn(configState, currentSqrtPrice, amountIn, stopSqrtPrice) {
  if (amountIn.isZero()) {
    return {
      outputAmount: new (0, _bnjs2.default)(0),
      nextSqrtPrice: currentSqrtPrice,
      amountLeft: new (0, _bnjs2.default)(0)
    };
  }
  let totalOutputAmount = new (0, _bnjs2.default)(0);
  let currentSqrtPriceLocal = currentSqrtPrice;
  let amountLeft = amountIn;
  for (let i = 0; i < configState.curve.length; i++) {
    if (configState.curve[i].sqrtPrice.isZero() || configState.curve[i].liquidity.isZero()) {
      break;
    }
    const referenceSqrtPrice = _bnjs2.default.min(
      stopSqrtPrice,
      configState.curve[i].sqrtPrice
    );
    if (referenceSqrtPrice.gt(currentSqrtPriceLocal)) {
      const maxAmountIn = getDeltaAmountQuoteUnsigned(
        currentSqrtPriceLocal,
        referenceSqrtPrice,
        configState.curve[i].liquidity,
        0 /* Up */
      );
      if (amountLeft.lt(maxAmountIn)) {
        const nextSqrtPrice = getNextSqrtPriceFromInput(
          currentSqrtPriceLocal,
          configState.curve[i].liquidity,
          amountLeft,
          false
        );
        const outputAmount = getDeltaAmountBaseUnsigned(
          currentSqrtPriceLocal,
          nextSqrtPrice,
          configState.curve[i].liquidity,
          1 /* Down */
        );
        totalOutputAmount = SafeMath.add(
          totalOutputAmount,
          outputAmount
        );
        currentSqrtPriceLocal = nextSqrtPrice;
        amountLeft = new (0, _bnjs2.default)(0);
        break;
      } else {
        const nextSqrtPrice = referenceSqrtPrice;
        const outputAmount = getDeltaAmountBaseUnsigned(
          currentSqrtPriceLocal,
          nextSqrtPrice,
          configState.curve[i].liquidity,
          1 /* Down */
        );
        totalOutputAmount = SafeMath.add(
          totalOutputAmount,
          outputAmount
        );
        currentSqrtPriceLocal = nextSqrtPrice;
        amountLeft = SafeMath.sub(amountLeft, maxAmountIn);
        if (nextSqrtPrice.eq(stopSqrtPrice)) {
          break;
        }
      }
    }
  }
  return {
    outputAmount: totalOutputAmount,
    nextSqrtPrice: currentSqrtPriceLocal,
    amountLeft
  };
}
function getSwapResultFromExactOutput(virtualPool, config, amountOut, feeMode, tradeDirection, currentPoint, eligibleForFirstSwapWithMinFee) {
  let actualProtocolFee = new (0, _bnjs2.default)(0);
  let actualTradingFee = new (0, _bnjs2.default)(0);
  let actualReferralFee = new (0, _bnjs2.default)(0);
  const baseFeeHandler = getBaseFeeHandler(
    config.poolFees.baseFee.cliffFeeNumerator,
    config.poolFees.baseFee.firstFactor,
    config.poolFees.baseFee.secondFactor,
    config.poolFees.baseFee.thirdFactor,
    config.poolFees.baseFee.baseFeeMode
  );
  const includedFeeOutAmount = feeMode.feesOnInput ? amountOut : (() => {
    const tradeFeeNumerator = eligibleForFirstSwapWithMinFee ? baseFeeHandler.getMinBaseFeeNumerator() : getTotalFeeNumeratorFromExcludedFeeAmount(
      config.poolFees,
      virtualPool.poolState.volatilityTracker,
      currentPoint,
      virtualPool.poolState.activationPoint,
      amountOut,
      tradeDirection
    );
    const [includedFeeOutAmount2, feeAmount] = getIncludedFeeAmount(
      tradeFeeNumerator,
      amountOut
    );
    const [tradingFee, protocolFee, referralFee] = splitFees(
      config.poolFees,
      feeAmount,
      feeMode.hasReferral
    );
    actualTradingFee = tradingFee;
    actualProtocolFee = protocolFee;
    actualReferralFee = referralFee;
    return includedFeeOutAmount2;
  })();
  const swapAmountFromOutput = (() => {
    switch (tradeDirection) {
      case 0 /* BaseToQuote */:
        return calculateBaseToQuoteFromAmountOut(
          config,
          virtualPool.poolState.sqrtPrice,
          includedFeeOutAmount
        );
      case 1 /* QuoteToBase */:
        return calculateQuoteToBaseFromAmountOut(
          config,
          virtualPool.poolState.sqrtPrice,
          includedFeeOutAmount
        );
    }
  })();
  const { outputAmount: amountIn, nextSqrtPrice } = swapAmountFromOutput;
  if (nextSqrtPrice.gt(config.migrationSqrtPrice)) {
    throw new Error("Insufficient Liquidity");
  }
  const [excludedFeeInputAmount, includedFeeInputAmount] = feeMode.feesOnInput ? (() => {
    const tradeFeeNumerator = eligibleForFirstSwapWithMinFee ? baseFeeHandler.getMinBaseFeeNumerator() : getTotalFeeNumeratorFromExcludedFeeAmount(
      config.poolFees,
      virtualPool.poolState.volatilityTracker,
      currentPoint,
      virtualPool.poolState.activationPoint,
      amountIn,
      tradeDirection
    );
    const [includedFeeInAmount, feeAmount] = getIncludedFeeAmount(
      tradeFeeNumerator,
      amountIn
    );
    const [tradingFee, protocolFee, referralFee] = splitFees(
      config.poolFees,
      feeAmount,
      feeMode.hasReferral
    );
    actualTradingFee = tradingFee;
    actualProtocolFee = protocolFee;
    actualReferralFee = referralFee;
    return [amountIn, includedFeeInAmount];
  })() : [amountIn, amountIn];
  return {
    amountLeft: new (0, _bnjs2.default)(0),
    includedFeeInputAmount,
    excludedFeeInputAmount,
    outputAmount: amountOut,
    nextSqrtPrice,
    tradingFee: actualTradingFee,
    protocolFee: actualProtocolFee,
    referralFee: actualReferralFee
  };
}
function calculateBaseToQuoteFromAmountOut(configState, currentSqrtPrice, outAmount) {
  let currentSqrtPriceLocal = currentSqrtPrice;
  let amountLeft = outAmount;
  let totalAmountIn = new (0, _bnjs2.default)(0);
  for (let i = configState.curve.length - 2; i >= 0; i--) {
    if (configState.curve[i].sqrtPrice.isZero() || configState.curve[i].liquidity.isZero()) {
      continue;
    }
    if (configState.curve[i].sqrtPrice.lt(currentSqrtPriceLocal)) {
      const maxAmountOut = getDeltaAmountQuoteUnsigned(
        configState.curve[i].sqrtPrice,
        currentSqrtPriceLocal,
        configState.curve[i + 1].liquidity,
        1 /* Down */
      );
      if (amountLeft.lt(maxAmountOut)) {
        const nextSqrtPrice = getNextSqrtPriceFromOutput(
          currentSqrtPriceLocal,
          configState.curve[i + 1].liquidity,
          amountLeft,
          true
        );
        const inAmount = getDeltaAmountBaseUnsigned(
          nextSqrtPrice,
          currentSqrtPriceLocal,
          configState.curve[i + 1].liquidity,
          0 /* Up */
        );
        totalAmountIn = SafeMath.add(totalAmountIn, inAmount);
        currentSqrtPriceLocal = nextSqrtPrice;
        amountLeft = new (0, _bnjs2.default)(0);
        break;
      } else {
        const nextSqrtPrice = configState.curve[i].sqrtPrice;
        const inAmount = getDeltaAmountBaseUnsigned(
          nextSqrtPrice,
          currentSqrtPriceLocal,
          configState.curve[i + 1].liquidity,
          0 /* Up */
        );
        totalAmountIn = SafeMath.add(totalAmountIn, inAmount);
        currentSqrtPriceLocal = nextSqrtPrice;
        amountLeft = SafeMath.sub(amountLeft, maxAmountOut);
      }
    }
  }
  if (!amountLeft.isZero()) {
    const maxAmountOut = getDeltaAmountQuoteUnsigned(
      configState.sqrtStartPrice,
      currentSqrtPriceLocal,
      configState.curve[0].liquidity,
      1 /* Down */
    );
    if (amountLeft.gt(maxAmountOut)) {
      throw new Error("Insufficient Liquidity");
    }
    const nextSqrtPrice = getNextSqrtPriceFromOutput(
      currentSqrtPriceLocal,
      configState.curve[0].liquidity,
      amountLeft,
      true
    );
    if (nextSqrtPrice.lt(configState.sqrtStartPrice)) {
      throw new Error("Insufficient Liquidity");
    }
    const inAmount = getDeltaAmountBaseUnsigned(
      nextSqrtPrice,
      currentSqrtPriceLocal,
      configState.curve[0].liquidity,
      0 /* Up */
    );
    totalAmountIn = SafeMath.add(totalAmountIn, inAmount);
    currentSqrtPriceLocal = nextSqrtPrice;
  }
  return {
    outputAmount: totalAmountIn,
    nextSqrtPrice: currentSqrtPriceLocal,
    amountLeft: new (0, _bnjs2.default)(0)
  };
}
function calculateQuoteToBaseFromAmountOut(configState, currentSqrtPrice, outAmount) {
  let totalInAmount = new (0, _bnjs2.default)(0);
  let currentSqrtPriceLocal = currentSqrtPrice;
  let amountLeft = outAmount;
  for (let i = 0; i < configState.curve.length; i++) {
    if (configState.curve[i].sqrtPrice.isZero() || configState.curve[i].liquidity.isZero()) {
      break;
    }
    if (configState.curve[i].sqrtPrice.gt(currentSqrtPriceLocal)) {
      const maxAmountOut = getDeltaAmountBaseUnsigned(
        currentSqrtPriceLocal,
        configState.curve[i].sqrtPrice,
        configState.curve[i].liquidity,
        1 /* Down */
      );
      if (amountLeft.lt(maxAmountOut)) {
        const nextSqrtPrice = getNextSqrtPriceFromOutput(
          currentSqrtPriceLocal,
          configState.curve[i].liquidity,
          amountLeft,
          false
        );
        const inAmount = getDeltaAmountQuoteUnsigned(
          currentSqrtPriceLocal,
          nextSqrtPrice,
          configState.curve[i].liquidity,
          0 /* Up */
        );
        totalInAmount = SafeMath.add(totalInAmount, inAmount);
        currentSqrtPriceLocal = nextSqrtPrice;
        amountLeft = new (0, _bnjs2.default)(0);
        break;
      } else {
        const nextSqrtPrice = configState.curve[i].sqrtPrice;
        const inAmount = getDeltaAmountQuoteUnsigned(
          currentSqrtPriceLocal,
          nextSqrtPrice,
          configState.curve[i].liquidity,
          0 /* Up */
        );
        totalInAmount = SafeMath.add(totalInAmount, inAmount);
        currentSqrtPriceLocal = nextSqrtPrice;
        amountLeft = SafeMath.sub(amountLeft, maxAmountOut);
      }
    }
  }
  if (!amountLeft.isZero()) {
    throw new Error("Not enough liquidity");
  }
  return {
    outputAmount: totalInAmount,
    nextSqrtPrice: currentSqrtPriceLocal,
    amountLeft: new (0, _bnjs2.default)(0)
  };
}
function swapQuoteExactIn(virtualPool, config, swapBaseForQuote, amountIn, slippageBps = 0, hasReferral, currentPoint, eligibleForFirstSwapWithMinFee) {
  if (virtualPool.poolState.quoteReserve.gte(config.migrationQuoteThreshold)) {
    throw new Error("Virtual pool is completed");
  }
  if (amountIn.isZero()) {
    throw new Error("Amount is zero");
  }
  const tradeDirection = swapBaseForQuote ? 0 /* BaseToQuote */ : 1 /* QuoteToBase */;
  const feeMode = getFeeMode(
    config.collectFeeMode,
    tradeDirection,
    hasReferral
  );
  const result = getSwapResultFromExactInput(
    virtualPool,
    config,
    amountIn,
    feeMode,
    tradeDirection,
    currentPoint,
    eligibleForFirstSwapWithMinFee
  );
  let minimumAmountOut;
  if (slippageBps > 0) {
    const slippageFactor = new (0, _bnjs2.default)(1e4 - slippageBps);
    const denominator = new (0, _bnjs2.default)(1e4);
    minimumAmountOut = result.outputAmount.mul(slippageFactor).div(denominator);
  } else {
    minimumAmountOut = result.outputAmount;
  }
  return {
    ...result,
    minimumAmountOut
  };
}
function swapQuotePartialFill(virtualPool, config, swapBaseForQuote, amountIn, slippageBps = 0, hasReferral, currentPoint, eligibleForFirstSwapWithMinFee) {
  if (virtualPool.poolState.quoteReserve.gte(config.migrationQuoteThreshold)) {
    throw new Error("Virtual pool is completed");
  }
  if (amountIn.isZero()) {
    throw new Error("Amount is zero");
  }
  const tradeDirection = swapBaseForQuote ? 0 /* BaseToQuote */ : 1 /* QuoteToBase */;
  const feeMode = getFeeMode(
    config.collectFeeMode,
    tradeDirection,
    hasReferral
  );
  const result = getSwapResultFromPartialInput(
    virtualPool,
    config,
    amountIn,
    feeMode,
    tradeDirection,
    currentPoint,
    eligibleForFirstSwapWithMinFee
  );
  let minimumAmountOut;
  if (slippageBps > 0) {
    const slippageFactor = new (0, _bnjs2.default)(1e4 - slippageBps);
    const denominator = new (0, _bnjs2.default)(1e4);
    minimumAmountOut = result.outputAmount.mul(slippageFactor).div(denominator);
  } else {
    minimumAmountOut = result.outputAmount;
  }
  return {
    ...result,
    minimumAmountOut
  };
}
function swapQuoteExactOut(virtualPool, config, swapBaseForQuote, outAmount, slippageBps = 0, hasReferral, currentPoint, eligibleForFirstSwapWithMinFee) {
  if (virtualPool.poolState.quoteReserve.gte(config.migrationQuoteThreshold)) {
    throw new Error("Virtual pool is completed");
  }
  if (outAmount.isZero()) {
    throw new Error("Amount is zero");
  }
  const tradeDirection = swapBaseForQuote ? 0 /* BaseToQuote */ : 1 /* QuoteToBase */;
  const feeMode = getFeeMode(
    config.collectFeeMode,
    tradeDirection,
    hasReferral
  );
  const result = getSwapResultFromExactOutput(
    virtualPool,
    config,
    outAmount,
    feeMode,
    tradeDirection,
    currentPoint,
    eligibleForFirstSwapWithMinFee
  );
  let maximumAmountIn;
  if (slippageBps > 0) {
    const slippageFactor = new (0, _bnjs2.default)(1e4 + slippageBps);
    const denominator = new (0, _bnjs2.default)(1e4);
    maximumAmountIn = result.includedFeeInputAmount.mul(slippageFactor).div(denominator);
  } else {
    maximumAmountIn = result.includedFeeInputAmount;
  }
  return {
    ...result,
    maximumAmountIn
  };
}

// src/helpers/common.ts
function getFirstKey(key1, key2) {
  const buf1 = key1.toBuffer();
  const buf2 = key2.toBuffer();
  if (Buffer.compare(buf1, buf2) === 1) {
    return buf1;
  }
  return buf2;
}
function getSecondKey(key1, key2) {
  const buf1 = key1.toBuffer();
  const buf2 = key2.toBuffer();
  if (Buffer.compare(buf1, buf2) === 1) {
    return buf2;
  }
  return buf1;
}
async function getAccountData(accountAddress, accountType, program, commitment) {
  const address = accountAddress instanceof _web3js.PublicKey ? accountAddress : new (0, _web3js.PublicKey)(accountAddress);
  return await program.account[accountType].fetchNullable(
    address,
    commitment
  );
}
async function getAccountCreationTimestamp(accountAddress, connection) {
  const address = accountAddress instanceof _web3js.PublicKey ? accountAddress : new (0, _web3js.PublicKey)(accountAddress);
  const signatures = await connection.getSignaturesForAddress(address, {
    limit: 1
  });
  return _optionalChain([signatures, 'access', _ => _[0], 'optionalAccess', _2 => _2.blockTime]) ? new Date(signatures[0].blockTime * 1e3) : void 0;
}
async function getAccountCreationTimestamps(accountAddresses, connection) {
  const timestampPromises = accountAddresses.map(
    (address) => getAccountCreationTimestamp(address, connection)
  );
  return Promise.all(timestampPromises);
}
function getTotalTokenSupply(swapBaseAmount, migrationBaseThreshold, lockedVestingParams) {
  try {
    const totalCirculatingAmount = swapBaseAmount.add(
      migrationBaseThreshold
    );
    const totalLockedVestingAmount = lockedVestingParams.cliffUnlockAmount.add(
      lockedVestingParams.amountPerPeriod.mul(
        lockedVestingParams.numberOfPeriod
      )
    );
    const totalAmount = totalCirculatingAmount.add(totalLockedVestingAmount);
    if (totalAmount.isNeg() || totalAmount.bitLength() > 64) {
      throw new Error("Math overflow");
    }
    return totalAmount;
  } catch (error) {
    throw new Error(`Math overflow: ${error}`);
  }
}
function getPriceFromSqrtPrice(sqrtPrice, tokenBaseDecimal, tokenQuoteDecimal) {
  const sqrtPriceDecimal = new (0, _decimaljs2.default)(sqrtPrice.toString());
  const lamportPrice = sqrtPriceDecimal.mul(sqrtPriceDecimal).div(new (0, _decimaljs2.default)(2).pow(128));
  const tokenPrice = lamportPrice.mul(
    new (0, _decimaljs2.default)(10).pow(tokenBaseDecimal - tokenQuoteDecimal)
  );
  return tokenPrice;
}
var getSqrtPriceFromPrice = (price, tokenADecimal, tokenBDecimal) => {
  const decimalPrice = new (0, _decimaljs2.default)(price);
  const adjustedByDecimals = decimalPrice.div(
    new (0, _decimaljs2.default)(10 ** (tokenADecimal - tokenBDecimal))
  );
  const sqrtValue = _decimaljs2.default.sqrt(adjustedByDecimals);
  const sqrtValueQ64 = sqrtValue.mul(_decimaljs2.default.pow(2, 64));
  return new (0, _bnjs2.default)(sqrtValueQ64.floor().toFixed());
};
var createSqrtPrices = (prices, tokenBaseDecimal, tokenQuoteDecimal) => {
  return prices.map(
    (price) => getSqrtPriceFromPrice(
      price.toString(),
      tokenBaseDecimal,
      tokenQuoteDecimal
    )
  );
};
var getSqrtPriceFromMarketCap = (marketCap, totalSupply, tokenBaseDecimal, tokenQuoteDecimal) => {
  const price = new (0, _decimaljs2.default)(marketCap).div(new (0, _decimaljs2.default)(totalSupply));
  return getSqrtPriceFromPrice(
    price.toString(),
    tokenBaseDecimal,
    tokenQuoteDecimal
  );
};
function getBaseTokenForSwap(sqrtStartPrice, sqrtMigrationPrice, curve) {
  let totalAmount = new (0, _bnjs2.default)(0);
  for (let i = 0; i < curve.length; i++) {
    const lowerSqrtPrice = i === 0 ? sqrtStartPrice : curve[i - 1].sqrtPrice;
    if (curve[i].sqrtPrice.gt(sqrtMigrationPrice)) {
      const deltaAmount = getDeltaAmountBaseUnsigned(
        lowerSqrtPrice,
        sqrtMigrationPrice,
        curve[i].liquidity,
        0 /* Up */
      );
      totalAmount = totalAmount.add(deltaAmount);
      break;
    } else {
      const deltaAmount = getDeltaAmountBaseUnsigned(
        lowerSqrtPrice,
        curve[i].sqrtPrice,
        curve[i].liquidity,
        0 /* Up */
      );
      totalAmount = totalAmount.add(deltaAmount);
    }
  }
  return totalAmount;
}
var getMigrationQuoteAmountFromMigrationQuoteThreshold = (migrationQuoteThreshold, migrationFeePercent) => {
  const migrationQuoteAmount = migrationQuoteThreshold.mul(new (0, _decimaljs2.default)(100).sub(new (0, _decimaljs2.default)(migrationFeePercent))).div(new (0, _decimaljs2.default)(100));
  return migrationQuoteAmount;
};
var getMigrationQuoteThresholdFromMigrationQuoteAmount = (migrationQuoteAmount, migrationFeePercent) => {
  const migrationQuoteThreshold = migrationQuoteAmount.mul(new (0, _decimaljs2.default)(100)).div(new (0, _decimaljs2.default)(100).sub(new (0, _decimaljs2.default)(migrationFeePercent)));
  return migrationQuoteThreshold;
};
function getProtocolMigrationFee(depositBaseAmount, depositQuoteAmount, migrationSqrtPrice, migrationFeeBps, migrationOption) {
  const quoteFeeAmount = mulDiv(
    depositQuoteAmount,
    new (0, _bnjs2.default)(migrationFeeBps),
    new (0, _bnjs2.default)(MAX_BASIS_POINT),
    1 /* Down */
  );
  if (migrationOption === 0 /* MET_DAMM */) {
    const baseFeeAmount = mulDiv(
      depositBaseAmount,
      new (0, _bnjs2.default)(migrationFeeBps),
      new (0, _bnjs2.default)(MAX_BASIS_POINT),
      1 /* Down */
    );
    return [baseFeeAmount, quoteFeeAmount];
  } else if (migrationOption === 1 /* MET_DAMM_V2 */) {
    const feeLiquidity = getInitialLiquidityFromDeltaQuote(
      quoteFeeAmount,
      MIN_SQRT_PRICE,
      migrationSqrtPrice
    );
    const baseFeeAmount = getDeltaAmountBaseUnsigned(
      migrationSqrtPrice,
      MAX_SQRT_PRICE,
      feeLiquidity,
      1 /* Down */
    );
    return [baseFeeAmount, quoteFeeAmount];
  } else {
    throw new Error("Invalid migration option");
  }
}
var getMigrationBaseToken = (migrationQuoteAmount, sqrtMigrationPrice, migrationOption) => {
  if (migrationOption == 0 /* MET_DAMM */) {
    const price = sqrtMigrationPrice.mul(sqrtMigrationPrice);
    const quote = migrationQuoteAmount.shln(128);
    const { div: baseDiv, mod } = quote.divmod(price);
    let div = baseDiv;
    if (!mod.isZero()) {
      div = div.add(new (0, _bnjs2.default)(1));
    }
    return div;
  } else if (migrationOption == 1 /* MET_DAMM_V2 */) {
    const liquidity = getInitialLiquidityFromDeltaQuote(
      migrationQuoteAmount,
      MIN_SQRT_PRICE,
      sqrtMigrationPrice
    );
    const baseAmount = getDeltaAmountBaseUnsigned(
      sqrtMigrationPrice,
      MAX_SQRT_PRICE,
      liquidity,
      0 /* Up */
    );
    return baseAmount;
  } else {
    throw Error("Invalid migration option");
  }
};
var getTotalVestingAmount = (lockedVesting) => {
  const totalVestingAmount = lockedVesting.cliffUnlockAmount.add(
    lockedVesting.amountPerPeriod.mul(lockedVesting.numberOfPeriod)
  );
  return totalVestingAmount;
};
var getLiquidity = (baseAmount, quoteAmount, minSqrtPrice, maxSqrtPrice) => {
  const liquidityFromBase = getInitialLiquidityFromDeltaBase(
    baseAmount,
    maxSqrtPrice,
    minSqrtPrice
  );
  const liquidityFromQuote = getInitialLiquidityFromDeltaQuote(
    quoteAmount,
    minSqrtPrice,
    maxSqrtPrice
  );
  return _bnjs2.default.min(liquidityFromBase, liquidityFromQuote);
};
var getFirstCurve = (migrationSqrtPrice, migrationBaseAmount, swapAmount, migrationQuoteThreshold, migrationFeePercent) => {
  const migrationSqrPriceDecimal = new (0, _decimaljs2.default)(migrationSqrtPrice.toString());
  const migrationBaseAmountDecimal = new (0, _decimaljs2.default)(
    migrationBaseAmount.toString()
  );
  const swapAmountDecimal = new (0, _decimaljs2.default)(swapAmount.toString());
  const migrationFeePercentDecimal = new (0, _decimaljs2.default)(
    migrationFeePercent.toString()
  );
  const denominator = swapAmountDecimal.mul(new (0, _decimaljs2.default)(100).sub(migrationFeePercentDecimal)).div(new (0, _decimaljs2.default)(100));
  const sqrtStartPriceDecimal = migrationSqrPriceDecimal.mul(migrationBaseAmountDecimal).div(denominator);
  const sqrtStartPrice = new (0, _bnjs2.default)(sqrtStartPriceDecimal.floor().toFixed());
  const liquidity = getLiquidity(
    swapAmount,
    migrationQuoteThreshold,
    sqrtStartPrice,
    migrationSqrtPrice
  );
  return {
    sqrtStartPrice,
    curve: [
      {
        sqrtPrice: migrationSqrtPrice,
        liquidity
      }
    ]
  };
};
var getTotalSupplyFromCurve = (migrationQuoteThreshold, sqrtStartPrice, curve, lockedVesting, migrationOption, leftover, migrationFeePercent) => {
  const sqrtMigrationPrice = getMigrationThresholdPrice(
    migrationQuoteThreshold,
    sqrtStartPrice,
    curve
  );
  const swapBaseAmount = getBaseTokenForSwap(
    sqrtStartPrice,
    sqrtMigrationPrice,
    curve
  );
  const swapBaseAmountBuffer = getSwapAmountWithBuffer(
    swapBaseAmount,
    sqrtStartPrice,
    curve
  );
  const migrationQuoteAmount = getMigrationQuoteAmountFromMigrationQuoteThreshold(
    new (0, _decimaljs2.default)(migrationQuoteThreshold.toString()),
    migrationFeePercent
  );
  const migrationBaseAmount = getMigrationBaseToken(
    fromDecimalToBN(migrationQuoteAmount),
    sqrtMigrationPrice,
    migrationOption
  );
  const totalVestingAmount = getTotalVestingAmount(lockedVesting);
  const minimumBaseSupplyWithBuffer = swapBaseAmountBuffer.add(migrationBaseAmount).add(totalVestingAmount).add(leftover);
  return minimumBaseSupplyWithBuffer;
};
var getMigrationThresholdPrice = (migrationThreshold, sqrtStartPrice, curve) => {
  let nextSqrtPrice = sqrtStartPrice;
  if (curve.length === 0) {
    throw Error("Curve is empty");
  }
  const totalAmount = getDeltaAmountQuoteUnsigned(
    nextSqrtPrice,
    curve[0].sqrtPrice,
    curve[0].liquidity,
    0 /* Up */
  );
  if (totalAmount.gt(migrationThreshold)) {
    nextSqrtPrice = getNextSqrtPriceFromInput(
      nextSqrtPrice,
      curve[0].liquidity,
      migrationThreshold,
      false
    );
  } else {
    let amountLeft = migrationThreshold.sub(totalAmount);
    nextSqrtPrice = curve[0].sqrtPrice;
    for (let i = 1; i < curve.length; i++) {
      const maxAmount = getDeltaAmountQuoteUnsigned(
        nextSqrtPrice,
        curve[i].sqrtPrice,
        curve[i].liquidity,
        0 /* Up */
      );
      if (maxAmount.gt(amountLeft)) {
        nextSqrtPrice = getNextSqrtPriceFromInput(
          nextSqrtPrice,
          curve[i].liquidity,
          amountLeft,
          false
        );
        amountLeft = new (0, _bnjs2.default)(0);
        break;
      } else {
        amountLeft = amountLeft.sub(maxAmount);
        nextSqrtPrice = curve[i].sqrtPrice;
      }
    }
    if (!amountLeft.isZero()) {
      const migrationThresholdStr = migrationThreshold.toString();
      const amountLeftStr = amountLeft.toString();
      throw Error(
        `Not enough liquidity, migrationThreshold: ${migrationThresholdStr}  amountLeft: ${amountLeftStr}`
      );
    }
  }
  return nextSqrtPrice;
};
var getCurveBreakdown = (migrationQuoteThreshold, sqrtStartPrice, curve) => {
  if (curve.length === 0) {
    throw Error("Curve is empty");
  }
  const segmentAmounts = [];
  let totalAllocated = new (0, _bnjs2.default)(0);
  let currentSqrtPrice = sqrtStartPrice;
  let finalSqrtPrice = sqrtStartPrice;
  for (let i = 0; i < curve.length; i++) {
    const lowerSqrtPrice = currentSqrtPrice;
    const upperSqrtPrice = curve[i].sqrtPrice;
    const liquidity = curve[i].liquidity;
    const maxSegmentAmount = getDeltaAmountQuoteUnsigned(
      lowerSqrtPrice,
      upperSqrtPrice,
      liquidity,
      0 /* Up */
    );
    if (maxSegmentAmount.gte(migrationQuoteThreshold)) {
      segmentAmounts.push(migrationQuoteThreshold);
      totalAllocated = totalAllocated.add(migrationQuoteThreshold);
      finalSqrtPrice = getNextSqrtPriceFromInput(
        lowerSqrtPrice,
        liquidity,
        migrationQuoteThreshold,
        false
      );
      for (let j = i + 1; j < curve.length; j++) {
        segmentAmounts.push(new (0, _bnjs2.default)(0));
      }
      break;
    } else {
      segmentAmounts.push(maxSegmentAmount);
      totalAllocated = totalAllocated.add(maxSegmentAmount);
      currentSqrtPrice = upperSqrtPrice;
      finalSqrtPrice = upperSqrtPrice;
      if (i === curve.length - 1 && totalAllocated.lt(migrationQuoteThreshold)) {
        const shortfall = migrationQuoteThreshold.sub(totalAllocated);
        throw Error(
          `Not enough liquidity in curve. Total allocated: ${totalAllocated.toString()}, Required: ${migrationQuoteThreshold.toString()}, Shortfall: ${shortfall.toString()}`
        );
      }
    }
  }
  return {
    segmentAmounts,
    finalSqrtPrice,
    totalAmount: totalAllocated
  };
};
var getSwapAmountWithBuffer = (swapBaseAmount, sqrtStartPrice, curve) => {
  const swapAmountBuffer = swapBaseAmount.add(
    swapBaseAmount.mul(new (0, _bnjs2.default)(SWAP_BUFFER_PERCENTAGE)).div(new (0, _bnjs2.default)(100))
  );
  const maxBaseAmountOnCurve = getBaseTokenForSwap(
    sqrtStartPrice,
    MAX_SQRT_PRICE,
    curve
  );
  return _bnjs2.default.min(swapAmountBuffer, maxBaseAmountOnCurve);
};
var getPercentageSupplyOnMigration = (initialMarketCap, migrationMarketCap, lockedVesting, totalLeftover, totalTokenSupply) => {
  const marketCapRatio = initialMarketCap.div(migrationMarketCap);
  const sqrtRatio = _decimaljs2.default.sqrt(marketCapRatio);
  const totalVestingAmount = getTotalVestingAmount(lockedVesting);
  const vestingPercentage = new (0, _decimaljs2.default)(totalVestingAmount.toString()).mul(new (0, _decimaljs2.default)(100)).div(new (0, _decimaljs2.default)(totalTokenSupply.toString()));
  const leftoverPercentage = new (0, _decimaljs2.default)(totalLeftover.toString()).mul(new (0, _decimaljs2.default)(100)).div(new (0, _decimaljs2.default)(totalTokenSupply.toString()));
  const numerator = new (0, _decimaljs2.default)(100).mul(sqrtRatio).sub(vestingPercentage.add(leftoverPercentage).mul(sqrtRatio));
  const denominator = new (0, _decimaljs2.default)(1).add(sqrtRatio);
  return numerator.div(denominator).toNumber();
};
function calculateAdjustedPercentageSupplyOnMigration(initialMarketCap, migrationMarketCap, migrationFee, lockedVesting, totalLeftover, totalTokenSupply) {
  const D = new (0, _decimaljs2.default)(initialMarketCap);
  const M = new (0, _decimaljs2.default)(migrationMarketCap);
  const f = new (0, _decimaljs2.default)(migrationFee.feePercentage).div(100);
  const totalVestingAmount = getTotalVestingAmount(lockedVesting);
  const V = new (0, _decimaljs2.default)(totalVestingAmount.toString()).mul(100).div(new (0, _decimaljs2.default)(totalTokenSupply.toString()));
  const L = new (0, _decimaljs2.default)(totalLeftover.toString()).mul(100).div(new (0, _decimaljs2.default)(totalTokenSupply.toString()));
  const requiredRatio = _decimaljs2.default.sqrt(D.div(M));
  const oneMinusF = new (0, _decimaljs2.default)(1).sub(f);
  const availablePercentage = new (0, _decimaljs2.default)(100).sub(V).sub(L);
  const numerator = requiredRatio.mul(oneMinusF).mul(availablePercentage);
  const denominator = new (0, _decimaljs2.default)(1).add(requiredRatio.mul(oneMinusF));
  const percentageSupplyOnMigration = numerator.div(denominator).toNumber();
  return percentageSupplyOnMigration;
}
var getMigrationQuoteAmount = (migrationMarketCap, percentageSupplyOnMigration) => {
  return migrationMarketCap.mul(percentageSupplyOnMigration).div(new (0, _decimaljs2.default)(100));
};
function getFeeSchedulerParams(startingBaseFeeBps, endingBaseFeeBps, baseFeeMode, numberOfPeriod, totalDuration) {
  if (startingBaseFeeBps == endingBaseFeeBps) {
    if (numberOfPeriod != 0 || totalDuration != 0) {
      throw new Error(
        "numberOfPeriod and totalDuration must both be zero"
      );
    }
    return {
      cliffFeeNumerator: bpsToFeeNumerator(startingBaseFeeBps),
      firstFactor: 0,
      secondFactor: new (0, _bnjs2.default)(0),
      thirdFactor: new (0, _bnjs2.default)(0),
      baseFeeMode: 0 /* FeeSchedulerLinear */
    };
  }
  if (numberOfPeriod <= 0) {
    throw new Error("Total periods must be greater than zero");
  }
  if (startingBaseFeeBps > MAX_FEE_BPS) {
    throw new Error(
      `startingBaseFeeBps (${startingBaseFeeBps} bps) exceeds maximum allowed value of ${MAX_FEE_BPS} bps`
    );
  }
  if (endingBaseFeeBps < MIN_FEE_BPS) {
    throw new Error(
      `endingBaseFeeBps (${endingBaseFeeBps} bps) is less than minimum allowed value of ${MIN_FEE_BPS} bps`
    );
  }
  if (endingBaseFeeBps > startingBaseFeeBps) {
    throw new Error(
      "endingBaseFeeBps bps must be less than or equal to startingBaseFeeBps bps"
    );
  }
  if (numberOfPeriod == 0 || totalDuration == 0) {
    throw new Error(
      "numberOfPeriod and totalDuration must both greater than zero"
    );
  }
  const maxBaseFeeNumerator = bpsToFeeNumerator(startingBaseFeeBps);
  const minBaseFeeNumerator = bpsToFeeNumerator(endingBaseFeeBps);
  const periodFrequency = new (0, _bnjs2.default)(totalDuration / numberOfPeriod);
  let reductionFactor;
  if (baseFeeMode == 0 /* FeeSchedulerLinear */) {
    const totalReduction = maxBaseFeeNumerator.sub(minBaseFeeNumerator);
    reductionFactor = totalReduction.divn(numberOfPeriod);
  } else {
    const ratio = new (0, _decimaljs2.default)(minBaseFeeNumerator.toString()).div(
      new (0, _decimaljs2.default)(maxBaseFeeNumerator.toString())
    );
    const decayBase = ratio.pow(new (0, _decimaljs2.default)(1).div(numberOfPeriod));
    reductionFactor = new (0, _bnjs2.default)(
      new (0, _decimaljs2.default)(MAX_BASIS_POINT).mul(new (0, _decimaljs2.default)(1).sub(decayBase)).floor().toFixed()
    );
  }
  return {
    cliffFeeNumerator: maxBaseFeeNumerator,
    firstFactor: numberOfPeriod,
    secondFactor: periodFrequency,
    thirdFactor: reductionFactor,
    baseFeeMode
  };
}
function calculateFeeSchedulerEndingBaseFeeBps(cliffFeeNumerator, numberOfPeriod, periodFrequency, reductionFactor, baseFeeMode) {
  if (numberOfPeriod === 0 || periodFrequency === 0) {
    return cliffFeeNumerator / FEE_DENOMINATOR * MAX_BASIS_POINT;
  }
  let baseFeeNumerator;
  if (baseFeeMode == 0 /* FeeSchedulerLinear */) {
    baseFeeNumerator = cliffFeeNumerator - numberOfPeriod * reductionFactor;
  } else {
    const decayRate = new (0, _decimaljs2.default)(1).sub(
      new (0, _decimaljs2.default)(reductionFactor).div(MAX_BASIS_POINT)
    );
    baseFeeNumerator = new (0, _decimaljs2.default)(cliffFeeNumerator).mul(decayRate.pow(numberOfPeriod)).toNumber();
  }
  return Math.max(0, baseFeeNumerator / FEE_DENOMINATOR * MAX_BASIS_POINT);
}
function getRateLimiterParams(baseFeeBps, feeIncrementBps, referenceAmount, maxLimiterDuration, tokenQuoteDecimal, activationType) {
  const cliffFeeNumerator = bpsToFeeNumerator(baseFeeBps);
  const feeIncrementNumerator = bpsToFeeNumerator(feeIncrementBps);
  if (baseFeeBps <= 0 || feeIncrementBps <= 0 || referenceAmount <= 0 || maxLimiterDuration <= 0) {
    throw new Error("All rate limiter parameters must be greater than zero");
  }
  if (baseFeeBps > MAX_FEE_BPS) {
    throw new Error(
      `Base fee (${baseFeeBps} bps) exceeds maximum allowed value of ${MAX_FEE_BPS} bps`
    );
  }
  if (baseFeeBps < MIN_FEE_BPS) {
    throw new Error(
      `Base fee (${baseFeeBps} bps) is less than minimum allowed value of ${MIN_FEE_BPS} bps`
    );
  }
  if (feeIncrementBps > MAX_FEE_BPS) {
    throw new Error(
      `Fee increment (${feeIncrementBps} bps) exceeds maximum allowed value of ${MAX_FEE_BPS} bps`
    );
  }
  if (feeIncrementNumerator.gte(new (0, _bnjs2.default)(FEE_DENOMINATOR))) {
    throw new Error(
      "Fee increment numerator must be less than FEE_DENOMINATOR"
    );
  }
  const deltaNumerator = new (0, _bnjs2.default)(MAX_FEE_NUMERATOR).sub(cliffFeeNumerator);
  const maxIndex = deltaNumerator.div(feeIncrementNumerator);
  if (maxIndex.lt(new (0, _bnjs2.default)(1))) {
    throw new Error("Fee increment is too large for the given base fee");
  }
  if (cliffFeeNumerator.lt(new (0, _bnjs2.default)(MIN_FEE_NUMERATOR)) || cliffFeeNumerator.gt(new (0, _bnjs2.default)(MAX_FEE_NUMERATOR))) {
    throw new Error("Base fee must be between 0.01% and 99%");
  }
  const maxDuration = activationType === 0 /* Slot */ ? MAX_RATE_LIMITER_DURATION_IN_SLOTS : MAX_RATE_LIMITER_DURATION_IN_SECONDS;
  if (maxLimiterDuration > maxDuration) {
    throw new Error(
      `Max duration exceeds maximum allowed value of ${maxDuration}`
    );
  }
  const referenceAmountInLamports = convertToLamports(
    referenceAmount,
    tokenQuoteDecimal
  );
  return {
    cliffFeeNumerator,
    firstFactor: feeIncrementBps,
    secondFactor: new (0, _bnjs2.default)(maxLimiterDuration),
    thirdFactor: new (0, _bnjs2.default)(referenceAmountInLamports),
    baseFeeMode: 2 /* RateLimiter */
  };
}
function getDynamicFeeParams(baseFeeBps, maxPriceChangeBps = MAX_PRICE_CHANGE_BPS_DEFAULT) {
  if (maxPriceChangeBps > MAX_PRICE_CHANGE_BPS_DEFAULT) {
    throw new Error(
      `maxPriceChangeBps (${maxPriceChangeBps} bps) must be less than or equal to ${MAX_PRICE_CHANGE_BPS_DEFAULT}`
    );
  }
  const priceRatio = maxPriceChangeBps / MAX_BASIS_POINT + 1;
  const sqrtPriceRatioQ64 = new (0, _bnjs2.default)(
    _decimaljs2.default.sqrt(priceRatio.toString()).mul(_decimaljs2.default.pow(2, 64)).floor().toFixed()
  );
  const deltaBinId = sqrtPriceRatioQ64.sub(ONE_Q64).div(BIN_STEP_BPS_U128_DEFAULT).muln(2);
  const maxVolatilityAccumulator = new (0, _bnjs2.default)(deltaBinId.muln(MAX_BASIS_POINT));
  const squareVfaBin = maxVolatilityAccumulator.mul(new (0, _bnjs2.default)(BIN_STEP_BPS_DEFAULT)).pow(new (0, _bnjs2.default)(2));
  const baseFeeNumerator = new (0, _bnjs2.default)(bpsToFeeNumerator(baseFeeBps));
  const maxDynamicFeeNumerator = baseFeeNumerator.muln(20).divn(100);
  const vFee = maxDynamicFeeNumerator.mul(new (0, _bnjs2.default)(1e11)).sub(new (0, _bnjs2.default)(99999999999));
  const variableFeeControl = vFee.div(squareVfaBin);
  return {
    binStep: BIN_STEP_BPS_DEFAULT,
    binStepU128: BIN_STEP_BPS_U128_DEFAULT,
    filterPeriod: DYNAMIC_FEE_FILTER_PERIOD_DEFAULT,
    decayPeriod: DYNAMIC_FEE_DECAY_PERIOD_DEFAULT,
    reductionFactor: DYNAMIC_FEE_REDUCTION_FACTOR_DEFAULT,
    maxVolatilityAccumulator: maxVolatilityAccumulator.toNumber(),
    variableFeeControl: variableFeeControl.toNumber()
  };
}
function getStartingBaseFeeBpsFromBaseFeeParams(baseFeeParams) {
  if (baseFeeParams.baseFeeMode === 2 /* RateLimiter */) {
    return baseFeeParams.rateLimiterParam.baseFeeBps;
  } else {
    return baseFeeParams.feeSchedulerParam.endingFeeBps;
  }
}
function computeSqrtPriceStepBps(priceMultiple, numberOfPeriod) {
  if (priceMultiple <= 1) {
    throw new Error("priceMultiple must be greater than 1");
  }
  if (numberOfPeriod <= 0) {
    throw new Error("numberOfPeriod must be greater than 0");
  }
  const sqrtPriceStepBps = Math.floor(
    (Math.sqrt(priceMultiple) - 1) * MAX_BASIS_POINT / numberOfPeriod
  );
  if (sqrtPriceStepBps <= 0) {
    throw new Error(
      "Computed sqrtPriceStepBps is 0 \u2014 increase priceMultiple or decrease numberOfPeriod"
    );
  }
  return sqrtPriceStepBps;
}
function getMigratedPoolMarketCapFeeSchedulerParams(startingBaseFeeBps, endingBaseFeeBps, dammV2BaseFeeMode, numberOfPeriod, priceMultiple, schedulerExpirationDuration) {
  if (dammV2BaseFeeMode === 0 /* FeeTimeSchedulerLinear */ || dammV2BaseFeeMode === 1 /* FeeTimeSchedulerExponential */) {
    return DEFAULT_MIGRATED_POOL_MARKET_CAP_FEE_SCHEDULER_PARAMS;
  }
  if (dammV2BaseFeeMode === 2 /* RateLimiter */) {
    throw new Error(
      "RateLimiter is not supported for DAMM v2 migration. Use either FeeMarketCapSchedulerLinear or FeeMarketCapSchedulerExponential instead."
    );
  }
  if (numberOfPeriod <= 0) {
    throw new Error("Total periods must be greater than zero");
  }
  const poolMaxFeeBps = MAX_FEE_BPS;
  if (startingBaseFeeBps <= endingBaseFeeBps) {
    throw new Error(
      `startingBaseFeeBps (${startingBaseFeeBps} bps) must be greater than endingBaseFeeBps (${endingBaseFeeBps} bps)`
    );
  }
  if (priceMultiple <= 1) {
    throw new Error("priceMultiple must be greater than 1");
  }
  if (startingBaseFeeBps > poolMaxFeeBps) {
    throw new Error(
      `startingBaseFeeBps (${startingBaseFeeBps} bps) exceeds maximum allowed value of ${poolMaxFeeBps} bps`
    );
  }
  if (schedulerExpirationDuration == 0) {
    throw new Error("schedulerExpirationDuration must be greater than zero");
  }
  const sqrtPriceStepBps = computeSqrtPriceStepBps(
    priceMultiple,
    numberOfPeriod
  );
  const maxBaseFeeNumerator = bpsToFeeNumerator(startingBaseFeeBps);
  const minBaseFeeNumerator = bpsToFeeNumerator(endingBaseFeeBps);
  let reductionFactor;
  if (dammV2BaseFeeMode === 3 /* FeeMarketCapSchedulerLinear */) {
    const totalReduction = maxBaseFeeNumerator.sub(minBaseFeeNumerator);
    reductionFactor = totalReduction.divn(numberOfPeriod);
  } else if (dammV2BaseFeeMode === 4 /* FeeMarketCapSchedulerExponential */) {
    const ratio = minBaseFeeNumerator.toNumber() / maxBaseFeeNumerator.toNumber();
    const decayBase = Math.pow(ratio, 1 / numberOfPeriod);
    reductionFactor = new (0, _bnjs2.default)(MAX_BASIS_POINT * (1 - decayBase));
  }
  return {
    numberOfPeriod,
    sqrtPriceStepBps,
    schedulerExpirationDuration,
    reductionFactor
  };
}
function getLockedVestingParams(totalLockedVestingAmount, numberOfVestingPeriod, cliffUnlockAmount, totalVestingDuration, cliffDurationFromMigrationTime, tokenBaseDecimal) {
  if (totalLockedVestingAmount == 0) {
    return {
      amountPerPeriod: new (0, _bnjs2.default)(0),
      cliffDurationFromMigrationTime: new (0, _bnjs2.default)(0),
      frequency: new (0, _bnjs2.default)(0),
      numberOfPeriod: new (0, _bnjs2.default)(0),
      cliffUnlockAmount: new (0, _bnjs2.default)(0)
    };
  }
  if (totalLockedVestingAmount == cliffUnlockAmount) {
    return {
      amountPerPeriod: convertToLamports(1, tokenBaseDecimal),
      cliffDurationFromMigrationTime: new (0, _bnjs2.default)(
        cliffDurationFromMigrationTime
      ),
      frequency: new (0, _bnjs2.default)(1),
      numberOfPeriod: new (0, _bnjs2.default)(1),
      cliffUnlockAmount: convertToLamports(
        totalLockedVestingAmount - 1,
        tokenBaseDecimal
      )
    };
  }
  if (numberOfVestingPeriod <= 0) {
    throw new Error("Total periods must be greater than zero");
  }
  if (numberOfVestingPeriod == 0 || totalVestingDuration == 0) {
    throw new Error(
      "numberOfPeriod and totalVestingDuration must both be greater than zero"
    );
  }
  if (cliffUnlockAmount > totalLockedVestingAmount) {
    throw new Error(
      "Cliff unlock amount cannot be greater than total locked vesting amount"
    );
  }
  const amountPerPeriod = (totalLockedVestingAmount - cliffUnlockAmount) / numberOfVestingPeriod;
  const roundedAmountPerPeriod = Math.floor(amountPerPeriod);
  const totalPeriodicAmount = roundedAmountPerPeriod * numberOfVestingPeriod;
  const remainder = totalLockedVestingAmount - (cliffUnlockAmount + totalPeriodicAmount);
  const adjustedCliffUnlockAmount = cliffUnlockAmount + remainder;
  const periodFrequency = new (0, _bnjs2.default)(totalVestingDuration / numberOfVestingPeriod);
  return {
    amountPerPeriod: convertToLamports(
      roundedAmountPerPeriod,
      tokenBaseDecimal
    ),
    cliffDurationFromMigrationTime: new (0, _bnjs2.default)(cliffDurationFromMigrationTime),
    frequency: periodFrequency,
    numberOfPeriod: new (0, _bnjs2.default)(numberOfVestingPeriod),
    cliffUnlockAmount: convertToLamports(
      adjustedCliffUnlockAmount,
      tokenBaseDecimal
    )
  };
}
var getLiquidityVestingInfoParams = (vestingPercentage, bpsPerPeriod, numberOfPeriods, cliffDurationFromMigrationTime, totalDuration) => {
  if (vestingPercentage < 0 || vestingPercentage > 100) {
    throw new Error("vestingPercentage must be between 0 and 100");
  }
  if (vestingPercentage === 0) {
    if (bpsPerPeriod !== 0 || numberOfPeriods !== 0 || cliffDurationFromMigrationTime !== 0 || totalDuration !== 0) {
      throw new Error(
        "If vestingPercentage is 0, all other parameters must be 0"
      );
    }
    return {
      vestingPercentage: 0,
      bpsPerPeriod: 0,
      numberOfPeriods: 0,
      cliffDurationFromMigrationTime: 0,
      frequency: 0
    };
  }
  if (bpsPerPeriod < 0 || bpsPerPeriod > MAX_BASIS_POINT) {
    throw new Error(`bpsPerPeriod must be between 0 and ${MAX_BASIS_POINT}`);
  }
  if (numberOfPeriods <= 0) {
    throw new Error(
      "numberOfPeriods must be greater than zero when vestingPercentage > 0"
    );
  }
  if (cliffDurationFromMigrationTime < 0) {
    throw new Error("cliffDurationFromMigrationTime must be >= 0");
  }
  if (totalDuration <= 0) {
    throw new Error("totalDuration must be greater than zero");
  }
  const frequency = totalDuration / numberOfPeriods;
  if (frequency <= 0) {
    throw new Error(
      "frequency must be greater than zero (totalDuration / numberOfPeriods must be > 0)"
    );
  }
  const totalBps = bpsPerPeriod * numberOfPeriods;
  if (totalBps > MAX_BASIS_POINT) {
    throw new Error(
      `Total BPS (bpsPerPeriod * numberOfPeriods = ${totalBps}) must not exceed ${MAX_BASIS_POINT}`
    );
  }
  const totalVestingDuration = cliffDurationFromMigrationTime + numberOfPeriods * frequency;
  if (totalVestingDuration > MAX_LOCK_DURATION_IN_SECONDS) {
    throw new Error(
      `Total vesting duration (${totalVestingDuration}s) must not exceed ${MAX_LOCK_DURATION_IN_SECONDS}s (2 years)`
    );
  }
  if (cliffDurationFromMigrationTime === 0 && numberOfPeriods === 0) {
    throw new Error(
      "If cliffDurationFromMigrationTime is 0, numberOfPeriods must be > 0"
    );
  }
  return {
    vestingPercentage,
    bpsPerPeriod,
    numberOfPeriods,
    cliffDurationFromMigrationTime,
    frequency: Math.round(frequency)
  };
};
var getTwoCurve = (migrationSqrtPrice, midSqrtPrice, initialSqrtPrice, swapAmount, migrationQuoteThreshold) => {
  const p0 = new (0, _decimaljs2.default)(initialSqrtPrice.toString());
  const p1 = new (0, _decimaljs2.default)(midSqrtPrice.toString());
  const p2 = new (0, _decimaljs2.default)(migrationSqrtPrice.toString());
  const a1 = new (0, _decimaljs2.default)(1).div(p0).sub(new (0, _decimaljs2.default)(1).div(p1));
  const b1 = new (0, _decimaljs2.default)(1).div(p1).sub(new (0, _decimaljs2.default)(1).div(p2));
  const c1 = new (0, _decimaljs2.default)(swapAmount.toString());
  const a2 = p1.sub(p0);
  const b2 = p2.sub(p1);
  const c2 = new (0, _decimaljs2.default)(migrationQuoteThreshold.toString()).mul(
    _decimaljs2.default.pow(2, 128)
  );
  const l0 = c1.mul(b2).sub(c2.mul(b1)).div(a1.mul(b2).sub(a2.mul(b1)));
  const l1 = c1.mul(a2).sub(c2.mul(a1)).div(b1.mul(a2).sub(b2.mul(a1)));
  if (l0.isNeg() || l1.isNeg()) {
    return {
      isOk: false,
      sqrtStartPrice: new (0, _bnjs2.default)(0),
      curve: []
    };
  }
  return {
    isOk: true,
    sqrtStartPrice: initialSqrtPrice,
    curve: [
      {
        sqrtPrice: midSqrtPrice,
        liquidity: new (0, _bnjs2.default)(l0.floor().toFixed())
      },
      {
        sqrtPrice: migrationSqrtPrice,
        liquidity: new (0, _bnjs2.default)(l1.floor().toFixed())
      }
    ]
  };
};
function checkRateLimiterApplied(baseFeeMode, swapBaseForQuote, currentPoint, activationPoint, maxLimiterDuration) {
  return baseFeeMode === 2 /* RateLimiter */ && !swapBaseForQuote && currentPoint.gte(activationPoint) && currentPoint.lte(activationPoint.add(maxLimiterDuration));
}
function getBaseFeeParams(baseFeeParams) {
  if (baseFeeParams.baseFeeMode === 2 /* RateLimiter */) {
    throw new Error(
      "BaseFeeMode.RateLimiter is deprecated. New configs must use FeeSchedulerLinear or FeeSchedulerExponential."
    );
  }
  const { startingFeeBps, endingFeeBps, numberOfPeriod, totalDuration } = baseFeeParams.feeSchedulerParam;
  return getFeeSchedulerParams(
    startingFeeBps,
    endingFeeBps,
    baseFeeParams.baseFeeMode,
    numberOfPeriod,
    totalDuration
  );
}
function getQuoteReserveFromNextSqrtPrice(nextSqrtPrice, config) {
  let totalAmount = new (0, _bnjs2.default)(0);
  for (let i = 0; i < config.curve.length; i++) {
    const lowerSqrtPrice = i === 0 ? config.sqrtStartPrice : config.curve[i - 1].sqrtPrice;
    if (nextSqrtPrice.gt(lowerSqrtPrice)) {
      const upperSqrtPrice = nextSqrtPrice.lt(config.curve[i].sqrtPrice) ? nextSqrtPrice : config.curve[i].sqrtPrice;
      const maxAmountIn = getDeltaAmountQuoteUnsigned(
        lowerSqrtPrice,
        upperSqrtPrice,
        config.curve[i].liquidity,
        0 /* Up */
      );
      totalAmount = totalAmount.add(maxAmountIn);
    }
  }
  return totalAmount;
}
var getTokenomics = (initialMarketCap, migrationMarketCap, totalLockedVestingAmount, totalLeftover, totalTokenSupply) => {
  const marketCapRatio = initialMarketCap.div(migrationMarketCap);
  const sqrtRatio = _decimaljs2.default.sqrt(marketCapRatio);
  const vestingPercentage = new (0, _decimaljs2.default)(totalLockedVestingAmount.toString()).mul(new (0, _decimaljs2.default)(100)).div(new (0, _decimaljs2.default)(totalTokenSupply.toString()));
  const leftoverPercentage = new (0, _decimaljs2.default)(totalLeftover.toString()).mul(new (0, _decimaljs2.default)(100)).div(new (0, _decimaljs2.default)(totalTokenSupply.toString()));
  const percentageSupplyOnMigration = new (0, _decimaljs2.default)(100).mul(sqrtRatio).sub(vestingPercentage.add(leftoverPercentage).mul(sqrtRatio));
  const denominator = new (0, _decimaljs2.default)(1).add(sqrtRatio);
  const migrationSupplyDecimal = percentageSupplyOnMigration.div(denominator).mul(new (0, _decimaljs2.default)(totalTokenSupply.toString())).div(new (0, _decimaljs2.default)(100));
  const migrationSupply = new (0, _bnjs2.default)(migrationSupplyDecimal.floor().toFixed());
  const bondingCurveSupply = totalTokenSupply.sub(migrationSupply).sub(totalLeftover).sub(totalLockedVestingAmount);
  return {
    bondingCurveSupply,
    migrationSupply,
    leftoverSupply: totalLeftover,
    lockedVestingSupply: totalLockedVestingAmount
  };
};
function getMigratedPoolFeeParams(migrationOption, migrationFeeOption, migratedPoolFee, baseFeeParams) {
  const defaultResult = {
    migratedPoolFee: DEFAULT_MIGRATED_POOL_FEE_PARAMS,
    migratedPoolBaseFeeMode: 0 /* FeeTimeSchedulerLinear */,
    migratedPoolMarketCapFeeSchedulerParams: DEFAULT_MIGRATED_POOL_MARKET_CAP_FEE_SCHEDULER_PARAMS,
    migrationFeeOption,
    compoundingFeeBps: 0
  };
  if (migrationOption === 0 /* MET_DAMM */) {
    throw new Error(
      "MigrationOption.MET_DAMM (DAMM v1) is deprecated. New configs must use MigrationOption.MET_DAMM_V2."
    );
  }
  if (migrationOption === 1 /* MET_DAMM_V2 */) {
    const baseFeeMode = _nullishCoalesce(_optionalChain([migratedPoolFee, 'optionalAccess', _3 => _3.baseFeeMode]), () => ( 0)) /* FeeTimeSchedulerLinear */;
    if (_optionalChain([migratedPoolFee, 'optionalAccess', _4 => _4.marketCapFeeSchedulerParams]) && baseFeeParams) {
      const schedulerParams = getMigratedPoolMarketCapFeeSchedulerParams(
        migratedPoolFee.poolFeeBps,
        migratedPoolFee.marketCapFeeSchedulerParams.endingBaseFeeBps,
        baseFeeMode,
        migratedPoolFee.marketCapFeeSchedulerParams.numberOfPeriod,
        migratedPoolFee.marketCapFeeSchedulerParams.priceMultiple,
        migratedPoolFee.marketCapFeeSchedulerParams.schedulerExpirationDuration
      );
      return {
        migratedPoolFee: {
          collectFeeMode: migratedPoolFee.collectFeeMode,
          dynamicFee: migratedPoolFee.dynamicFee,
          poolFeeBps: migratedPoolFee.poolFeeBps
        },
        migratedPoolBaseFeeMode: baseFeeMode,
        migratedPoolMarketCapFeeSchedulerParams: schedulerParams,
        migrationFeeOption: 6 /* Customizable */,
        compoundingFeeBps: _nullishCoalesce(migratedPoolFee.compoundingFeeBps, () => ( 0))
      };
    }
    if (migrationFeeOption === 6 /* Customizable */) {
      return {
        migratedPoolFee: {
          collectFeeMode: _nullishCoalesce(_optionalChain([migratedPoolFee, 'optionalAccess', _5 => _5.collectFeeMode]), () => ( DEFAULT_MIGRATED_POOL_FEE_PARAMS.collectFeeMode)),
          dynamicFee: _nullishCoalesce(_optionalChain([migratedPoolFee, 'optionalAccess', _6 => _6.dynamicFee]), () => ( DEFAULT_MIGRATED_POOL_FEE_PARAMS.dynamicFee)),
          poolFeeBps: _nullishCoalesce(_optionalChain([migratedPoolFee, 'optionalAccess', _7 => _7.poolFeeBps]), () => ( DEFAULT_MIGRATED_POOL_FEE_PARAMS.poolFeeBps))
        },
        migratedPoolBaseFeeMode: baseFeeMode,
        migratedPoolMarketCapFeeSchedulerParams: DEFAULT_MIGRATED_POOL_MARKET_CAP_FEE_SCHEDULER_PARAMS,
        migrationFeeOption: 6 /* Customizable */,
        compoundingFeeBps: _nullishCoalesce(_optionalChain([migratedPoolFee, 'optionalAccess', _8 => _8.compoundingFeeBps]), () => ( 0))
      };
    }
    return {
      migratedPoolFee: DEFAULT_MIGRATED_POOL_FEE_PARAMS,
      migratedPoolBaseFeeMode: baseFeeMode,
      migratedPoolMarketCapFeeSchedulerParams: DEFAULT_MIGRATED_POOL_MARKET_CAP_FEE_SCHEDULER_PARAMS,
      migrationFeeOption,
      compoundingFeeBps: 0
    };
  }
  return defaultResult;
}
async function getCurrentPoint(connection, activationType) {
  const currentSlot = await connection.getSlot();
  if (activationType === 0 /* Slot */) {
    return new (0, _bnjs2.default)(currentSlot);
  } else {
    const currentTime = await connection.getBlockTime(currentSlot);
    return new (0, _bnjs2.default)(currentTime);
  }
}
async function prepareSwapAmountParam(amount, mintAddress, connection) {
  const mintTokenDecimals = await getTokenDecimals(connection, mintAddress);
  return convertToLamports(amount, mintTokenDecimals);
}
function getVestingLockedLiquidityBpsAtNSeconds(vestingInfo, nSeconds) {
  if (!vestingInfo || vestingInfo.vestingPercentage === 0) {
    return 0;
  }
  const totalLiquidity = U128_MAX;
  const totalVestedLiquidity = totalLiquidity.mul(new (0, _bnjs2.default)(vestingInfo.vestingPercentage)).div(new (0, _bnjs2.default)(100));
  const bpsPerPeriod = vestingInfo.bpsPerPeriod;
  const numberOfPeriods = vestingInfo.numberOfPeriods;
  const frequency = vestingInfo.frequency;
  const cliffDuration = vestingInfo.cliffDurationFromMigrationTime;
  const totalBpsAfterCliff = bpsPerPeriod * numberOfPeriods;
  const totalVestingLiquidityAfterCliff = totalVestedLiquidity.mul(new (0, _bnjs2.default)(totalBpsAfterCliff)).div(new (0, _bnjs2.default)(MAX_BASIS_POINT));
  let liquidityPerPeriod = new (0, _bnjs2.default)(0);
  let adjustedFrequency = frequency;
  let adjustedNumberOfPeriods = numberOfPeriods;
  let adjustedCliffDuration = cliffDuration;
  if (numberOfPeriods > 0) {
    liquidityPerPeriod = totalVestingLiquidityAfterCliff.div(
      new (0, _bnjs2.default)(numberOfPeriods)
    );
  }
  if (liquidityPerPeriod.isZero()) {
    adjustedNumberOfPeriods = 0;
    adjustedFrequency = 0;
    adjustedCliffDuration = Math.max(cliffDuration, 1);
  }
  const cliffUnlockLiquidity = totalVestedLiquidity.sub(
    liquidityPerPeriod.mul(new (0, _bnjs2.default)(adjustedNumberOfPeriods))
  );
  const cliffPoint = new (0, _bnjs2.default)(adjustedCliffDuration);
  const currentPoint = new (0, _bnjs2.default)(nSeconds);
  let unlockedLiquidity = new (0, _bnjs2.default)(0);
  if (currentPoint.gte(cliffPoint)) {
    unlockedLiquidity = cliffUnlockLiquidity;
    if (adjustedFrequency > 0 && adjustedNumberOfPeriods > 0) {
      const timeAfterCliff = currentPoint.sub(cliffPoint);
      const periodsElapsed = timeAfterCliff.div(new (0, _bnjs2.default)(adjustedFrequency)).toNumber();
      const actualPeriodsElapsed = Math.min(
        periodsElapsed,
        adjustedNumberOfPeriods
      );
      unlockedLiquidity = unlockedLiquidity.add(
        liquidityPerPeriod.mul(new (0, _bnjs2.default)(actualPeriodsElapsed))
      );
    }
  }
  const lockedLiquidity = totalVestedLiquidity.sub(unlockedLiquidity);
  const liquidityLockedBps = lockedLiquidity.mul(new (0, _bnjs2.default)(MAX_BASIS_POINT)).div(totalLiquidity);
  return liquidityLockedBps.toNumber();
}
function calculateLockedLiquidityBpsAtTime(partnerPermanentLockedLiquidityPercentage, creatorPermanentLockedLiquidityPercentage, partnerLiquidityVestingInfo, creatorLiquidityVestingInfo, elapsedSeconds) {
  const partnerVestedLockedLiquidityBps = getVestingLockedLiquidityBpsAtNSeconds(
    partnerLiquidityVestingInfo,
    elapsedSeconds
  );
  const creatorVestedLockedLiquidityBps = getVestingLockedLiquidityBpsAtNSeconds(
    creatorLiquidityVestingInfo,
    elapsedSeconds
  );
  const partnerPermanentLockedLiquidityBps = partnerPermanentLockedLiquidityPercentage * 100;
  const creatorPermanentLockedLiquidityBps = creatorPermanentLockedLiquidityPercentage * 100;
  const totalLockedLiquidityBpsAtNSeconds = partnerVestedLockedLiquidityBps + partnerPermanentLockedLiquidityBps + creatorVestedLockedLiquidityBps + creatorPermanentLockedLiquidityBps;
  return totalLockedLiquidityBpsAtNSeconds;
}

// src/helpers/pda.ts

var SEED = Object.freeze({
  POOL_AUTHORITY: "pool_authority",
  EVENT_AUTHORITY: "__event_authority",
  POOL: "pool",
  TOKEN_VAULT: "token_vault",
  METADATA: "metadata",
  PARTNER_METADATA: "partner_metadata",
  CLAIM_FEE_OPERATOR: "cf_operator",
  DAMM_V1_MIGRATION_METADATA: "meteora",
  DAMM_V2_MIGRATION_METADATA: "damm_v2",
  LP_MINT: "lp_mint",
  FEE: "fee",
  POSITION: "position",
  POSITION_NFT_ACCOUNT: "position_nft_account",
  LOCK_ESCROW: "lock_escrow",
  VIRTUAL_POOL_METADATA: "virtual_pool_metadata",
  ESCROW: "escrow",
  BASE_LOCKER: "base_locker",
  VAULT: "vault",
  TOKEN_BADGE: "token_badge"
});
function deriveDbcEventAuthority() {
  const [eventAuthority] = _web3js.PublicKey.findProgramAddressSync(
    [Buffer.from(SEED.EVENT_AUTHORITY)],
    DYNAMIC_BONDING_CURVE_PROGRAM_ID
  );
  return eventAuthority;
}
function deriveDammV1EventAuthority() {
  const [eventAuthority] = _web3js.PublicKey.findProgramAddressSync(
    [Buffer.from(SEED.EVENT_AUTHORITY)],
    DAMM_V1_PROGRAM_ID
  );
  return eventAuthority;
}
function deriveDammV2EventAuthority() {
  const [eventAuthority] = _web3js.PublicKey.findProgramAddressSync(
    [Buffer.from(SEED.EVENT_AUTHORITY)],
    DAMM_V2_PROGRAM_ID
  );
  return eventAuthority;
}
function deriveLockerEventAuthority() {
  const [eventAuthority] = _web3js.PublicKey.findProgramAddressSync(
    [Buffer.from(SEED.EVENT_AUTHORITY)],
    LOCKER_PROGRAM_ID
  );
  return eventAuthority;
}
function deriveDbcPoolAuthority() {
  const [poolAuthority] = _web3js.PublicKey.findProgramAddressSync(
    [Buffer.from(SEED.POOL_AUTHORITY)],
    DYNAMIC_BONDING_CURVE_PROGRAM_ID
  );
  return poolAuthority;
}
function deriveDammV1PoolAuthority() {
  const [poolAuthority] = _web3js.PublicKey.findProgramAddressSync(
    [Buffer.from(SEED.POOL_AUTHORITY)],
    DAMM_V1_PROGRAM_ID
  );
  return poolAuthority;
}
function deriveDammV2PoolAuthority() {
  const [poolAuthority] = _web3js.PublicKey.findProgramAddressSync(
    [Buffer.from(SEED.POOL_AUTHORITY)],
    DAMM_V2_PROGRAM_ID
  );
  return poolAuthority;
}
function deriveDbcPoolAddress(quoteMint, baseMint, config) {
  const isQuoteMintBiggerThanBaseMint = new (0, _web3js.PublicKey)(quoteMint).toBuffer().compare(new Uint8Array(new (0, _web3js.PublicKey)(baseMint).toBuffer())) > 0;
  const [pool] = _web3js.PublicKey.findProgramAddressSync(
    [
      Buffer.from(SEED.POOL),
      new (0, _web3js.PublicKey)(config).toBuffer(),
      isQuoteMintBiggerThanBaseMint ? new (0, _web3js.PublicKey)(quoteMint).toBuffer() : new (0, _web3js.PublicKey)(baseMint).toBuffer(),
      isQuoteMintBiggerThanBaseMint ? new (0, _web3js.PublicKey)(baseMint).toBuffer() : new (0, _web3js.PublicKey)(quoteMint).toBuffer()
    ],
    DYNAMIC_BONDING_CURVE_PROGRAM_ID
  );
  return pool;
}
function deriveDammV1PoolAddress(config, tokenAMint, tokenBMint) {
  return _web3js.PublicKey.findProgramAddressSync(
    [
      getFirstKey(tokenAMint, tokenBMint),
      getSecondKey(tokenAMint, tokenBMint),
      config.toBuffer()
    ],
    DAMM_V1_PROGRAM_ID
  )[0];
}
function deriveDammV2PoolAddress(config, tokenAMint, tokenBMint) {
  return _web3js.PublicKey.findProgramAddressSync(
    [
      Buffer.from(SEED.POOL),
      config.toBuffer(),
      getFirstKey(tokenAMint, tokenBMint),
      getSecondKey(tokenAMint, tokenBMint)
    ],
    DAMM_V2_PROGRAM_ID
  )[0];
}
function deriveMintMetadata(mint) {
  const [metadata] = _web3js.PublicKey.findProgramAddressSync(
    [
      Buffer.from(SEED.METADATA),
      METAPLEX_PROGRAM_ID.toBuffer(),
      mint.toBuffer()
    ],
    METAPLEX_PROGRAM_ID
  );
  return metadata;
}
function derivePartnerMetadata(feeClaimer) {
  const [partnerMetadata] = _web3js.PublicKey.findProgramAddressSync(
    [Buffer.from(SEED.PARTNER_METADATA), feeClaimer.toBuffer()],
    DYNAMIC_BONDING_CURVE_PROGRAM_ID
  );
  return partnerMetadata;
}
function deriveDbcPoolMetadata(pool) {
  return _web3js.PublicKey.findProgramAddressSync(
    [Buffer.from(SEED.VIRTUAL_POOL_METADATA), pool.toBuffer()],
    DYNAMIC_BONDING_CURVE_PROGRAM_ID
  )[0];
}
function deriveDammV1MigrationMetadataAddress(virtual_pool) {
  return _web3js.PublicKey.findProgramAddressSync(
    [Buffer.from(SEED.DAMM_V1_MIGRATION_METADATA), virtual_pool.toBuffer()],
    DYNAMIC_BONDING_CURVE_PROGRAM_ID
  )[0];
}
function deriveDammV2MigrationMetadataAddress(virtual_pool) {
  return _web3js.PublicKey.findProgramAddressSync(
    [Buffer.from(SEED.DAMM_V2_MIGRATION_METADATA), virtual_pool.toBuffer()],
    DYNAMIC_BONDING_CURVE_PROGRAM_ID
  )[0];
}
function deriveDbcTokenVaultAddress(pool, mint) {
  const [tokenVault] = _web3js.PublicKey.findProgramAddressSync(
    [Buffer.from(SEED.TOKEN_VAULT), mint.toBuffer(), pool.toBuffer()],
    DYNAMIC_BONDING_CURVE_PROGRAM_ID
  );
  return tokenVault;
}
function deriveDammV1VaultLPAddress(vault, pool) {
  return _web3js.PublicKey.findProgramAddressSync(
    [vault.toBuffer(), pool.toBuffer()],
    DAMM_V1_PROGRAM_ID
  )[0];
}
function deriveDammV2TokenVaultAddress(pool, mint) {
  const [tokenVault] = _web3js.PublicKey.findProgramAddressSync(
    [Buffer.from(SEED.TOKEN_VAULT), mint.toBuffer(), pool.toBuffer()],
    DAMM_V2_PROGRAM_ID
  );
  return tokenVault;
}
function deriveVaultAddress(mint, payer) {
  return _web3js.PublicKey.findProgramAddressSync(
    [Buffer.from(SEED.VAULT), mint.toBuffer(), payer.toBuffer()],
    VAULT_PROGRAM_ID
  )[0];
}
var deriveVaultPdas = (tokenMint, seedBaseKey) => {
  const [vault] = _web3js.PublicKey.findProgramAddressSync(
    [
      Buffer.from(SEED.VAULT),
      tokenMint.toBuffer(),
      (_nullishCoalesce(seedBaseKey, () => ( BASE_ADDRESS))).toBuffer()
    ],
    VAULT_PROGRAM_ID
  );
  const [tokenVault] = _web3js.PublicKey.findProgramAddressSync(
    [Buffer.from(SEED.TOKEN_VAULT), vault.toBuffer()],
    VAULT_PROGRAM_ID
  );
  const [lpMint] = _web3js.PublicKey.findProgramAddressSync(
    [Buffer.from(SEED.LP_MINT), vault.toBuffer()],
    VAULT_PROGRAM_ID
  );
  return {
    vaultPda: vault,
    tokenVaultPda: tokenVault,
    lpMintPda: lpMint
  };
};
function deriveTokenVaultKey(vaultKey) {
  return _web3js.PublicKey.findProgramAddressSync(
    [Buffer.from(SEED.TOKEN_VAULT), vaultKey.toBuffer()],
    VAULT_PROGRAM_ID
  )[0];
}
function deriveVaultLpMintAddress(pool) {
  return _web3js.PublicKey.findProgramAddressSync(
    [Buffer.from(SEED.LP_MINT), pool.toBuffer()],
    VAULT_PROGRAM_ID
  )[0];
}
function deriveDammV1LpMintAddress(pool) {
  return _web3js.PublicKey.findProgramAddressSync(
    [Buffer.from(SEED.LP_MINT), pool.toBuffer()],
    DAMM_V1_PROGRAM_ID
  )[0];
}
function derivePositionAddress(positionNft) {
  return _web3js.PublicKey.findProgramAddressSync(
    [Buffer.from(SEED.POSITION), positionNft.toBuffer()],
    DAMM_V2_PROGRAM_ID
  )[0];
}
function derivePositionNftAccount(positionNftMint) {
  return _web3js.PublicKey.findProgramAddressSync(
    [Buffer.from(SEED.POSITION_NFT_ACCOUNT), positionNftMint.toBuffer()],
    DAMM_V2_PROGRAM_ID
  )[0];
}
function deriveDammV1LockEscrowAddress(dammPool, creator) {
  return _web3js.PublicKey.findProgramAddressSync(
    [
      Buffer.from(SEED.LOCK_ESCROW),
      dammPool.toBuffer(),
      creator.toBuffer()
    ],
    DAMM_V1_PROGRAM_ID
  )[0];
}
function deriveDammV2LockEscrowAddress(dammPool, creator) {
  return _web3js.PublicKey.findProgramAddressSync(
    [
      Buffer.from(SEED.LOCK_ESCROW),
      dammPool.toBuffer(),
      creator.toBuffer()
    ],
    DAMM_V2_PROGRAM_ID
  )[0];
}
function deriveEscrow(base) {
  const [escrow] = _web3js.PublicKey.findProgramAddressSync(
    [Buffer.from(SEED.ESCROW), base.toBuffer()],
    LOCKER_PROGRAM_ID
  );
  return escrow;
}
function deriveDammV1ProtocolFeeAddress(mint, pool) {
  return _web3js.PublicKey.findProgramAddressSync(
    [Buffer.from(SEED.FEE), mint.toBuffer(), pool.toBuffer()],
    DAMM_V1_PROGRAM_ID
  )[0];
}
function deriveBaseKeyForLocker(virtualPool) {
  return _web3js.PublicKey.findProgramAddressSync(
    [Buffer.from(SEED.BASE_LOCKER), virtualPool.toBuffer()],
    DYNAMIC_BONDING_CURVE_PROGRAM_ID
  )[0];
}
function deriveTokenBadgeAddress(tokenMint) {
  return _web3js.PublicKey.findProgramAddressSync(
    [Buffer.from(SEED.TOKEN_BADGE), tokenMint.toBuffer()],
    DYNAMIC_BONDING_CURVE_PROGRAM_ID
  )[0];
}
function getTokenBadgeRemainingAccounts(tokenBadge) {
  if (!tokenBadge) {
    return [];
  }
  return [
    {
      pubkey: tokenBadge,
      isSigner: false,
      isWritable: false
    }
  ];
}

// src/helpers/validation.ts








var DAMM_V2_MIN_FEE_NUMERATOR = 1e5;
var DAMM_V2_MAX_FEE_NUMERATOR = 99e7;
function assertConfigAllowsNewPool(params) {
  if (params.baseFeeMode === 2 /* RateLimiter */) {
    throw new Error(
      "BaseFeeMode.RateLimiter is deprecated. New configs and pools must use FeeSchedulerLinear or FeeSchedulerExponential. Existing rate-limiter pools are unaffected."
    );
  }
  if (params.migrationOption === 0 /* MET_DAMM */) {
    throw new Error(
      "MigrationOption.MET_DAMM (DAMM v1) is deprecated. New configs and pools must use MigrationOption.MET_DAMM_V2. Existing DAMM v1 pools can still migrate."
    );
  }
}
function validatePoolFees(poolFees, collectFeeMode, activationType) {
  if (!poolFees) return false;
  if (poolFees.baseFee) {
    if (poolFees.baseFee.cliffFeeNumerator.lt(new (0, _bnjs2.default)(MIN_FEE_NUMERATOR))) {
      return false;
    }
    if (poolFees.baseFee.baseFeeMode === 0 /* FeeSchedulerLinear */ || poolFees.baseFee.baseFeeMode === 1 /* FeeSchedulerExponential */) {
      if (!validateFeeScheduler(
        poolFees.baseFee.firstFactor,
        new (0, _bnjs2.default)(poolFees.baseFee.secondFactor),
        new (0, _bnjs2.default)(poolFees.baseFee.thirdFactor),
        poolFees.baseFee.cliffFeeNumerator,
        poolFees.baseFee.baseFeeMode
      )) {
        return false;
      }
    }
    if (poolFees.baseFee.baseFeeMode === 2 /* RateLimiter */) {
      if (!validateFeeRateLimiter(
        poolFees.baseFee.cliffFeeNumerator,
        new (0, _bnjs2.default)(poolFees.baseFee.firstFactor),
        new (0, _bnjs2.default)(poolFees.baseFee.secondFactor),
        new (0, _bnjs2.default)(poolFees.baseFee.thirdFactor),
        collectFeeMode,
        activationType
      )) {
        return false;
      }
    }
  }
  if (!validateDynamicFee(_nullishCoalesce(poolFees.dynamicFee, () => ( void 0)))) {
    return false;
  }
  return true;
}
function validateFeeScheduler(numberOfPeriod, periodFrequency, reductionFactor, cliffFeeNumerator, baseFeeMode) {
  if (!periodFrequency.eq(new (0, _bnjs2.default)(0)) || numberOfPeriod !== 0 || !reductionFactor.eq(new (0, _bnjs2.default)(0))) {
    if (numberOfPeriod === 0 || periodFrequency.eq(new (0, _bnjs2.default)(0)) || reductionFactor.eq(new (0, _bnjs2.default)(0))) {
      return false;
    }
  }
  const minFeeNumerator = getFeeSchedulerMinBaseFeeNumerator(
    cliffFeeNumerator,
    numberOfPeriod,
    reductionFactor,
    baseFeeMode
  );
  const maxFeeNumerator = getFeeSchedulerMaxBaseFeeNumerator(cliffFeeNumerator);
  if (minFeeNumerator.lt(new (0, _bnjs2.default)(MIN_FEE_NUMERATOR)) || maxFeeNumerator.gt(new (0, _bnjs2.default)(MAX_FEE_NUMERATOR))) {
    return false;
  }
  return true;
}
function validateFeeRateLimiter(cliffFeeNumerator, feeIncrementBps, maxLimiterDuration, referenceAmount, collectFeeMode, activationType) {
  if (collectFeeMode !== 0 /* QuoteToken */) {
    return false;
  }
  if (cliffFeeNumerator.lt(new (0, _bnjs2.default)(MIN_FEE_NUMERATOR)) || cliffFeeNumerator.gt(new (0, _bnjs2.default)(MAX_FEE_NUMERATOR))) {
    return false;
  }
  const isZeroRateLimiter2 = referenceAmount.eq(new (0, _bnjs2.default)(0)) && maxLimiterDuration.eq(new (0, _bnjs2.default)(0)) && feeIncrementBps.eq(new (0, _bnjs2.default)(0));
  if (isZeroRateLimiter2) {
    return true;
  }
  const isNonZeroRateLimiter2 = referenceAmount.gt(new (0, _bnjs2.default)(0)) && maxLimiterDuration.gt(new (0, _bnjs2.default)(0)) && feeIncrementBps.gt(new (0, _bnjs2.default)(0));
  if (!isNonZeroRateLimiter2) {
    return false;
  }
  const maxLimiterDurationLimit = activationType === 0 /* Slot */ ? new (0, _bnjs2.default)(MAX_RATE_LIMITER_DURATION_IN_SLOTS) : new (0, _bnjs2.default)(MAX_RATE_LIMITER_DURATION_IN_SECONDS);
  if (maxLimiterDuration.gt(maxLimiterDurationLimit)) {
    return false;
  }
  const feeIncrementNumerator = toNumerator(
    feeIncrementBps,
    new (0, _bnjs2.default)(FEE_DENOMINATOR)
  );
  if (feeIncrementNumerator.gte(new (0, _bnjs2.default)(FEE_DENOMINATOR))) {
    return false;
  }
  const minFeeNumerator = getFeeNumeratorFromIncludedAmount(
    cliffFeeNumerator,
    referenceAmount,
    feeIncrementBps,
    new (0, _bnjs2.default)(0)
  );
  const maxFeeNumerator = getFeeNumeratorFromIncludedAmount(
    cliffFeeNumerator,
    referenceAmount,
    feeIncrementBps,
    new (0, _bnjs2.default)(Number.MAX_SAFE_INTEGER)
  );
  return minFeeNumerator.gte(new (0, _bnjs2.default)(MIN_FEE_NUMERATOR)) && maxFeeNumerator.lte(new (0, _bnjs2.default)(MAX_FEE_NUMERATOR));
}
function validateDynamicFee(dynamicFee) {
  if (!dynamicFee) return true;
  if (dynamicFee.binStep !== BIN_STEP_BPS_DEFAULT) return false;
  if (!dynamicFee.binStepU128.eq(BIN_STEP_BPS_U128_DEFAULT)) return false;
  if (dynamicFee.filterPeriod >= dynamicFee.decayPeriod) return false;
  if (dynamicFee.reductionFactor > MAX_BASIS_POINT) return false;
  if (dynamicFee.variableFeeControl > U24_MAX) return false;
  if (dynamicFee.maxVolatilityAccumulator > U24_MAX) return false;
  return true;
}
function validateCollectFeeMode(collectFeeMode) {
  return [0 /* QuoteToken */, 1 /* OutputToken */].includes(
    collectFeeMode
  );
}
function validateMigrationAndTokenType(migrationOption, tokenType) {
  if (migrationOption === 0 /* MET_DAMM */) {
    return tokenType === 0 /* SPLToken */;
  }
  return true;
}
function validateActivationType(activationType) {
  return [0 /* Slot */, 1 /* Timestamp */].includes(
    activationType
  );
}
function validateMigrationFeeOption(migrationFeeOption, migrationOption) {
  const validOptions = [
    0 /* FixedBps25 */,
    1 /* FixedBps30 */,
    2 /* FixedBps100 */,
    3 /* FixedBps200 */,
    4 /* FixedBps400 */,
    5 /* FixedBps600 */
  ];
  if (migrationFeeOption === 6 /* Customizable */) {
    return migrationOption === 1 /* MET_DAMM_V2 */;
  }
  return validOptions.includes(migrationFeeOption);
}
function validateTokenDecimals(tokenDecimal) {
  return tokenDecimal >= 6 /* SIX */ && tokenDecimal <= 9 /* NINE */;
}
function validateLPPercentages(partnerLiquidityPercentage, partnerPermanentLockedLiquidityPercentage, creatorLiquidityPercentage, creatorPermanentLockedLiquidityPercentage, partnerVestingPercentage, creatorVestingPercentage) {
  const totalLPPercentage = partnerLiquidityPercentage + partnerPermanentLockedLiquidityPercentage + creatorLiquidityPercentage + creatorPermanentLockedLiquidityPercentage + partnerVestingPercentage + creatorVestingPercentage;
  return totalLPPercentage === 100;
}
function validateCurve(curve, sqrtStartPrice) {
  if (!curve || curve.length === 0 || curve.length > MAX_CURVE_POINT) {
    return false;
  }
  if (_optionalChain([curve, 'access', _9 => _9[0], 'optionalAccess', _10 => _10.sqrtPrice, 'access', _11 => _11.lte, 'call', _12 => _12(sqrtStartPrice)]) || _optionalChain([curve, 'access', _13 => _13[0], 'optionalAccess', _14 => _14.liquidity, 'access', _15 => _15.lte, 'call', _16 => _16(new (0, _bnjs2.default)(0))]) || _optionalChain([curve, 'access', _17 => _17[0], 'optionalAccess', _18 => _18.sqrtPrice, 'access', _19 => _19.gt, 'call', _20 => _20(new (0, _bnjs2.default)(MAX_SQRT_PRICE))])) {
    return false;
  }
  for (let i = 1; i < curve.length; i++) {
    const currentPoint = curve[i];
    const previousPoint = curve[i - 1];
    if (!currentPoint || !previousPoint) {
      return false;
    }
    if (currentPoint.sqrtPrice.lte(previousPoint.sqrtPrice) || currentPoint.liquidity.lte(new (0, _bnjs2.default)(0))) {
      return false;
    }
  }
  return !_optionalChain([curve, 'access', _21 => _21[curve.length - 1], 'optionalAccess', _22 => _22.sqrtPrice, 'access', _23 => _23.gt, 'call', _24 => _24(new (0, _bnjs2.default)(MAX_SQRT_PRICE))]);
}
function validateTokenSupply(tokenSupply, leftoverReceiver, swapBaseAmount, migrationBaseAmount, lockedVesting, swapBaseAmountBuffer) {
  if (!tokenSupply) return true;
  if (!leftoverReceiver) {
    return false;
  }
  if (!(leftoverReceiver instanceof _web3js.PublicKey)) {
    return false;
  }
  if (leftoverReceiver.equals(_web3js.PublicKey.default)) {
    return false;
  }
  const minimumBaseSupplyWithBuffer = getTotalTokenSupply(
    swapBaseAmountBuffer,
    migrationBaseAmount,
    lockedVesting
  );
  const minimumBaseSupplyWithoutBuffer = getTotalTokenSupply(
    swapBaseAmount,
    migrationBaseAmount,
    lockedVesting
  );
  return !(minimumBaseSupplyWithoutBuffer.gt(
    new (0, _bnjs2.default)(tokenSupply.postMigrationTokenSupply)
  ) || new (0, _bnjs2.default)(tokenSupply.postMigrationTokenSupply).gt(
    new (0, _bnjs2.default)(tokenSupply.preMigrationTokenSupply)
  ) || minimumBaseSupplyWithBuffer.gt(
    new (0, _bnjs2.default)(tokenSupply.preMigrationTokenSupply)
  ));
}
function validateTokenAuthorityOptions(option) {
  return [
    0 /* CreatorUpdateAuthority */,
    1 /* Immutable */,
    2 /* PartnerUpdateAuthority */,
    3 /* CreatorUpdateAndMintAuthority */,
    4 /* PartnerUpdateAndMintAuthority */
  ].includes(option);
}
function hasMintAuthority(option) {
  return option === 3 /* CreatorUpdateAndMintAuthority */ || option === 4 /* PartnerUpdateAndMintAuthority */;
}
function validateTransferHookProgram(transferHookProgram) {
  if (!transferHookProgram) {
    return false;
  }
  if (!(transferHookProgram instanceof _web3js.PublicKey)) {
    return false;
  }
  if (transferHookProgram.equals(_web3js.PublicKey.default)) {
    return false;
  }
  if (transferHookProgram.equals(DYNAMIC_BONDING_CURVE_PROGRAM_ID)) {
    return false;
  }
  if (transferHookProgram.equals(_spltoken.TOKEN_PROGRAM_ID)) {
    return false;
  }
  if (transferHookProgram.equals(_spltoken.TOKEN_2022_PROGRAM_ID)) {
    return false;
  }
  return true;
}
async function validateTransferHookProgramExecutable(connection, transferHookProgram) {
  if (!validateTransferHookProgram(transferHookProgram)) {
    return false;
  }
  const accountInfo = await connection.getAccountInfo(transferHookProgram);
  if (!accountInfo) {
    return false;
  }
  return accountInfo.executable;
}
function validateQuoteMintBasic(quoteMint) {
  if (!quoteMint || quoteMint.equals(_web3js.PublicKey.default)) {
    return false;
  }
  if (quoteMint.equals(_spltoken.NATIVE_MINT_2022)) {
    return false;
  }
  return true;
}
function validatePoolCreationFee(poolCreationFee) {
  if (poolCreationFee.eq(new (0, _bnjs2.default)(0))) {
    return true;
  }
  return poolCreationFee.gte(new (0, _bnjs2.default)(MIN_POOL_CREATION_FEE)) && poolCreationFee.lte(new (0, _bnjs2.default)(MAX_POOL_CREATION_FEE));
}
function validateLiquidityVestingInfo(vestingInfo) {
  const isZero = vestingInfo.vestingPercentage === 0 && vestingInfo.bpsPerPeriod === 0 && vestingInfo.numberOfPeriods === 0 && vestingInfo.cliffDurationFromMigrationTime === 0 && vestingInfo.frequency === 0;
  if (isZero) {
    return true;
  }
  if (vestingInfo.vestingPercentage < 0 || vestingInfo.vestingPercentage > 100) {
    return false;
  }
  const totalBpsAfterCliff = vestingInfo.bpsPerPeriod * vestingInfo.numberOfPeriods;
  if (totalBpsAfterCliff > U16_MAX) {
    return false;
  }
  const totalVestedLiquidity = U128_MAX.mul(
    new (0, _bnjs2.default)(vestingInfo.vestingPercentage)
  ).div(new (0, _bnjs2.default)(100));
  const totalVestingLiquidityAfterCliff = totalVestedLiquidity.mul(new (0, _bnjs2.default)(totalBpsAfterCliff)).div(new (0, _bnjs2.default)(MAX_BASIS_POINT));
  const liquidityPerPeriod = vestingInfo.numberOfPeriods > 0 ? totalVestingLiquidityAfterCliff.div(
    new (0, _bnjs2.default)(vestingInfo.numberOfPeriods)
  ) : new (0, _bnjs2.default)(0);
  let effectiveNumberOfPeriods = vestingInfo.numberOfPeriods;
  let effectiveFrequency = vestingInfo.frequency;
  let effectiveCliffDuration = vestingInfo.cliffDurationFromMigrationTime;
  if (liquidityPerPeriod.gt(new (0, _bnjs2.default)(0))) {
    if (vestingInfo.numberOfPeriods === 0) {
      return false;
    }
    if (vestingInfo.frequency === 0) {
      return false;
    }
  } else {
    effectiveNumberOfPeriods = 0;
    effectiveFrequency = 0;
    effectiveCliffDuration = Math.max(effectiveCliffDuration, 1);
  }
  const totalPeriodicLiquidity = liquidityPerPeriod.mul(
    new (0, _bnjs2.default)(effectiveNumberOfPeriods)
  );
  if (totalPeriodicLiquidity.gt(totalVestedLiquidity)) {
    return false;
  }
  const cliffUnlockLiquidity = totalVestedLiquidity.sub(
    totalPeriodicLiquidity
  );
  const vestingDuration = effectiveCliffDuration + effectiveFrequency * effectiveNumberOfPeriods;
  return vestingDuration <= MAX_LOCK_DURATION_IN_SECONDS && cliffUnlockLiquidity.add(totalPeriodicLiquidity).gt(new (0, _bnjs2.default)(0));
}
function validateMinimumLockedLiquidity(partnerPermanentLockedLiquidityPercentage, creatorPermanentLockedLiquidityPercentage, partnerLiquidityVestingInfo, creatorLiquidityVestingInfo) {
  const lockedBpsAtDay1 = calculateLockedLiquidityBpsAtTime(
    partnerPermanentLockedLiquidityPercentage,
    creatorPermanentLockedLiquidityPercentage,
    partnerLiquidityVestingInfo,
    creatorLiquidityVestingInfo,
    SECONDS_PER_DAY
  );
  return lockedBpsAtDay1 >= MIN_LOCKED_LIQUIDITY_BPS;
}
function validateMigratedCollectFeeMode(collectFeeMode) {
  return Object.values(MigratedCollectFeeMode).includes(collectFeeMode);
}
function validateCompoundingFeeBps(collectFeeMode, compoundingFeeBps) {
  if (collectFeeMode === 2 /* Compounding */) {
    return compoundingFeeBps > 0 && compoundingFeeBps <= MAX_BASIS_POINT;
  }
  return compoundingFeeBps === 0;
}
function validateMigratedPoolFee(migratedPoolFee, migrationOption, migrationFeeOption, migratedPoolMarketCapFeeSchedulerParams, compoundingFeeBps, migratedPoolBaseFeeMode = 0 /* FeeTimeSchedulerLinear */) {
  const effectiveCompoundingFeeBps = _nullishCoalesce(compoundingFeeBps, () => ( 0));
  const isMarketCapFeeSchedulerParamsZero = () => {
    if (!migratedPoolMarketCapFeeSchedulerParams) return true;
    return migratedPoolMarketCapFeeSchedulerParams.numberOfPeriod === 0 && migratedPoolMarketCapFeeSchedulerParams.sqrtPriceStepBps === 0 && migratedPoolMarketCapFeeSchedulerParams.schedulerExpirationDuration === 0 && migratedPoolMarketCapFeeSchedulerParams.reductionFactor.eq(
      new (0, _bnjs2.default)(0)
    );
  };
  const isNone = () => {
    return migratedPoolFee.collectFeeMode === 0 && migratedPoolFee.dynamicFee === 0 && migratedPoolFee.poolFeeBps === 0 && effectiveCompoundingFeeBps === 0 && migratedPoolBaseFeeMode === 0 /* FeeTimeSchedulerLinear */ && isMarketCapFeeSchedulerParamsZero();
  };
  if (migrationOption !== void 0 && migrationFeeOption !== void 0) {
    if (migrationOption === 0 /* MET_DAMM */) {
      return isNone();
    }
    if (migrationOption === 1 /* MET_DAMM_V2 */) {
      if (migrationFeeOption !== 6 /* Customizable */) {
        return isNone();
      }
    }
  }
  if (isNone()) {
    return true;
  }
  if (migratedPoolFee.poolFeeBps < MIN_MIGRATED_POOL_FEE_BPS || migratedPoolFee.poolFeeBps > MAX_MIGRATED_POOL_FEE_BPS) {
    return false;
  }
  if (!validateMigratedCollectFeeMode(migratedPoolFee.collectFeeMode)) {
    return false;
  }
  if (!validateCompoundingFeeBps(
    migratedPoolFee.collectFeeMode,
    effectiveCompoundingFeeBps
  )) {
    return false;
  }
  if (migratedPoolFee.dynamicFee !== 0 /* Disabled */ && migratedPoolFee.dynamicFee !== 1 /* Enabled */) {
    return false;
  }
  if (migrationOption === void 0 || migrationOption === 1 /* MET_DAMM_V2 */) {
    try {
      validateMigratedPoolBaseFeeMode(
        migratedPoolBaseFeeMode,
        _nullishCoalesce(migratedPoolMarketCapFeeSchedulerParams, () => ( {
          numberOfPeriod: 0,
          sqrtPriceStepBps: 0,
          schedulerExpirationDuration: 0,
          reductionFactor: new (0, _bnjs2.default)(0)
        })),
        migrationOption,
        migratedPoolFee.poolFeeBps
      );
    } catch (e2) {
      return false;
    }
  }
  return true;
}
function validateConfigParameters(configParam, options = false) {
  const { isTransferHook, transferHookProgram } = typeof options === "boolean" ? { isTransferHook: options, transferHookProgram: void 0 } : {
    isTransferHook: _nullishCoalesce(options.isTransferHook, () => ( false)),
    transferHookProgram: options.transferHookProgram
  };
  assertConfigAllowsNewPool({
    baseFeeMode: _optionalChain([configParam, 'access', _25 => _25.poolFees, 'optionalAccess', _26 => _26.baseFee, 'optionalAccess', _27 => _27.baseFeeMode]),
    migrationOption: configParam.migrationOption
  });
  if (!configParam.poolFees) {
    throw new Error("Pool fees are required");
  }
  if (!validatePoolFees(
    configParam.poolFees,
    configParam.collectFeeMode,
    configParam.activationType
  )) {
    throw new Error("Invalid pool fees");
  }
  if (!validateCollectFeeMode(configParam.collectFeeMode)) {
    throw new Error("Invalid collect fee mode");
  }
  if (!validateTokenAuthorityOptions(configParam.tokenUpdateAuthority)) {
    throw new Error("Invalid option for token update authority");
  }
  if (!isTransferHook && hasMintAuthority(configParam.tokenUpdateAuthority)) {
    throw new Error(
      "Mint authority token update options are only supported for transfer-hook configs"
    );
  }
  if (isTransferHook && configParam.tokenType !== 1 /* Token2022 */) {
    throw new Error(
      "Transfer-hook configs require tokenType to be Token2022"
    );
  }
  if (isTransferHook && transferHookProgram !== void 0) {
    if (!validateTransferHookProgram(transferHookProgram)) {
      throw new Error(
        "Invalid transfer hook program: cannot be the DBC program, SPL Token, SPL Token-2022, or the default pubkey"
      );
    }
  }
  if (!validateMigrationAndTokenType(
    configParam.migrationOption,
    configParam.tokenType
  )) {
    throw new Error("Token type must be SPL for MeteoraDamm migration");
  }
  if (!validateActivationType(configParam.activationType)) {
    throw new Error("Invalid activation type");
  }
  if (!validateMigrationFeeOption(
    configParam.migrationFeeOption,
    configParam.migrationOption
  )) {
    throw new Error("Invalid migration fee option");
  }
  if (!validateMigrationFee(configParam.migrationFee)) {
    throw new Error("Invalid migration fee");
  }
  if (configParam.creatorTradingFeePercentage < 0 || configParam.creatorTradingFeePercentage > 100) {
    throw new Error(
      "Creator trading fee percentage must be between 0 and 100"
    );
  }
  if (!validateTokenDecimals(configParam.tokenDecimal)) {
    throw new Error("Token decimal must be between 6 and 9");
  }
  const partnerVestingPercentage = _nullishCoalesce(_optionalChain([configParam, 'access', _28 => _28.partnerLiquidityVestingInfo, 'optionalAccess', _29 => _29.vestingPercentage]), () => ( 0));
  const creatorVestingPercentage = _nullishCoalesce(_optionalChain([configParam, 'access', _30 => _30.creatorLiquidityVestingInfo, 'optionalAccess', _31 => _31.vestingPercentage]), () => ( 0));
  if (!validateLPPercentages(
    configParam.partnerLiquidityPercentage,
    configParam.partnerPermanentLockedLiquidityPercentage,
    configParam.creatorLiquidityPercentage,
    configParam.creatorPermanentLockedLiquidityPercentage,
    partnerVestingPercentage,
    creatorVestingPercentage
  )) {
    throw new Error("Sum of LP percentages must equal 100");
  }
  if (!validatePoolCreationFee(configParam.poolCreationFee)) {
    throw new Error(
      `Pool creation fee must be 0 or between ${MIN_POOL_CREATION_FEE} and ${MAX_POOL_CREATION_FEE} lamports`
    );
  }
  if (configParam.migrationOption === 0 /* MET_DAMM */) {
    const isPartnerVestingZero = !configParam.partnerLiquidityVestingInfo || configParam.partnerLiquidityVestingInfo.vestingPercentage === 0 && configParam.partnerLiquidityVestingInfo.bpsPerPeriod === 0 && configParam.partnerLiquidityVestingInfo.numberOfPeriods === 0 && configParam.partnerLiquidityVestingInfo.cliffDurationFromMigrationTime === 0 && configParam.partnerLiquidityVestingInfo.frequency === 0;
    const isCreatorVestingZero = !configParam.creatorLiquidityVestingInfo || configParam.creatorLiquidityVestingInfo.vestingPercentage === 0 && configParam.creatorLiquidityVestingInfo.bpsPerPeriod === 0 && configParam.creatorLiquidityVestingInfo.numberOfPeriods === 0 && configParam.creatorLiquidityVestingInfo.cliffDurationFromMigrationTime === 0 && configParam.creatorLiquidityVestingInfo.frequency === 0;
    if (!isPartnerVestingZero || !isCreatorVestingZero) {
      throw new Error(
        "Liquidity vesting is not supported for MeteoraDamm migration"
      );
    }
  } else if (configParam.migrationOption === 1 /* MET_DAMM_V2 */) {
    if (configParam.partnerLiquidityVestingInfo) {
      if (!validateLiquidityVestingInfo(
        configParam.partnerLiquidityVestingInfo
      )) {
        throw new Error("Invalid partner liquidity vesting info");
      }
    }
    if (configParam.creatorLiquidityVestingInfo) {
      if (!validateLiquidityVestingInfo(
        configParam.creatorLiquidityVestingInfo
      )) {
        throw new Error("Invalid creator liquidity vesting info");
      }
    }
  }
  const sqrtMigrationPrice = getMigrationThresholdPrice(
    configParam.migrationQuoteThreshold,
    configParam.sqrtStartPrice,
    configParam.curve
  );
  if (sqrtMigrationPrice.gte(new (0, _bnjs2.default)(MAX_SQRT_PRICE))) {
    throw new Error("Migration sqrt price exceeds maximum");
  }
  const swapBaseAmountForCurve = getBaseTokenForSwap(
    configParam.sqrtStartPrice,
    sqrtMigrationPrice,
    configParam.curve
  );
  const migrationBaseAmountForCurve = getMigrationBaseToken(
    convertDecimalToBN(
      getMigrationQuoteAmountFromMigrationQuoteThreshold(
        new (0, _decimaljs2.default)(configParam.migrationQuoteThreshold.toString()),
        configParam.migrationFee.feePercentage
      )
    ),
    sqrtMigrationPrice,
    configParam.migrationOption
  );
  if (swapBaseAmountForCurve.lte(new (0, _bnjs2.default)(0)) || migrationBaseAmountForCurve.lte(new (0, _bnjs2.default)(0))) {
    throw new Error(
      "Invalid curve: swap base amount and migration base amount must both be greater than 0"
    );
  }
  if (!validateMinimumLockedLiquidity(
    configParam.partnerPermanentLockedLiquidityPercentage,
    configParam.creatorPermanentLockedLiquidityPercentage,
    configParam.partnerLiquidityVestingInfo,
    configParam.creatorLiquidityVestingInfo
  )) {
    const lockedBpsAtDay1 = calculateLockedLiquidityBpsAtTime(
      configParam.partnerPermanentLockedLiquidityPercentage,
      configParam.creatorPermanentLockedLiquidityPercentage,
      configParam.partnerLiquidityVestingInfo,
      configParam.creatorLiquidityVestingInfo,
      SECONDS_PER_DAY
    );
    throw new Error(
      `Invalid migration locked liquidity. At least ${MIN_LOCKED_LIQUIDITY_BPS} BPS (10%) must be locked at day 1. Current locked liquidity at day 1: ${lockedBpsAtDay1} BPS. Consider increasing permanent locked liquidity percentage or extending vesting duration/cliff.`
    );
  }
  if (configParam.migrationQuoteThreshold.lte(new (0, _bnjs2.default)(0))) {
    throw new Error("Migration quote threshold must be greater than 0");
  }
  if (new (0, _bnjs2.default)(configParam.sqrtStartPrice).lt(new (0, _bnjs2.default)(MIN_SQRT_PRICE)) || new (0, _bnjs2.default)(configParam.sqrtStartPrice).gte(new (0, _bnjs2.default)(MAX_SQRT_PRICE))) {
    throw new Error("Invalid sqrt start price");
  }
  if (configParam.migratedPoolFee) {
    if (!validateMigratedPoolFee(
      configParam.migratedPoolFee,
      configParam.migrationOption,
      configParam.migrationFeeOption,
      configParam.migratedPoolMarketCapFeeSchedulerParams,
      configParam.compoundingFeeBps,
      configParam.migratedPoolBaseFeeMode
    )) {
      throw new Error("Invalid migrated pool fee parameters");
    }
  }
  if (configParam.migrationOption === 1 /* MET_DAMM_V2 */) {
    validateMigratedPoolBaseFeeMode(
      configParam.migratedPoolBaseFeeMode,
      configParam.migratedPoolMarketCapFeeSchedulerParams,
      configParam.migrationOption,
      configParam.migratedPoolFee.poolFeeBps
    );
    validateMarketCapFeeSchedulerRequiresPoolFeeBps(
      configParam.migratedPoolMarketCapFeeSchedulerParams,
      configParam.migratedPoolFee
    );
  }
  if (!validateCurve(configParam.curve, configParam.sqrtStartPrice)) {
    throw new Error("Invalid curve");
  }
  if (!isDefaultLockedVesting(configParam.lockedVesting)) {
    try {
      const totalAmount = configParam.lockedVesting.cliffUnlockAmount.add(
        configParam.lockedVesting.amountPerPeriod.mul(
          new (0, _bnjs2.default)(configParam.lockedVesting.numberOfPeriod)
        )
      );
      if (configParam.lockedVesting.frequency.eq(new (0, _bnjs2.default)(0)) || totalAmount.eq(new (0, _bnjs2.default)(0))) {
        throw new Error("Invalid vesting parameters");
      }
    } catch (error) {
      throw new Error(`Invalid vesting parameters ${error}`);
    }
  }
  if (configParam.tokenSupply) {
    const sqrtMigrationPrice2 = getMigrationThresholdPrice(
      configParam.migrationQuoteThreshold,
      configParam.sqrtStartPrice,
      configParam.curve
    );
    const swapBaseAmount = getBaseTokenForSwap(
      configParam.sqrtStartPrice,
      sqrtMigrationPrice2,
      configParam.curve
    );
    const migrationBaseAmount = getMigrationBaseToken(
      convertDecimalToBN(
        getMigrationQuoteAmountFromMigrationQuoteThreshold(
          new (0, _decimaljs2.default)(configParam.migrationQuoteThreshold.toString()),
          configParam.migrationFee.feePercentage
        )
      ),
      sqrtMigrationPrice2,
      configParam.migrationOption
    );
    const swapBaseAmountBuffer = getSwapAmountWithBuffer(
      swapBaseAmount,
      configParam.sqrtStartPrice,
      configParam.curve
    );
    if (!validateTokenSupply(
      configParam.tokenSupply,
      new (0, _web3js.PublicKey)(configParam.leftoverReceiver),
      swapBaseAmount,
      migrationBaseAmount,
      configParam.lockedVesting,
      swapBaseAmountBuffer
    )) {
      throw new Error("Invalid token supply");
    }
  }
}
function validateBaseTokenType(baseTokenType, poolConfig) {
  return baseTokenType === poolConfig.tokenType;
}
async function validateBalance(connection, owner, inputMint, amountIn, inputTokenAccount) {
  const isSOLInput = isNativeSol(inputMint);
  if (isSOLInput) {
    const balance = await connection.getBalance(owner);
    const requiredBalance = BigInt(amountIn.toString()) + BigInt(1e7);
    if (balance < Number(requiredBalance)) {
      throw new Error(
        `Insufficient SOL balance. Required: ${requiredBalance.toString()} lamports, Found: ${balance} lamports`
      );
    }
  } else {
    try {
      const tokenBalance = await connection.getTokenAccountBalance(inputTokenAccount);
      const balance = new (0, _bnjs2.default)(tokenBalance.value.amount);
      if (balance.lt(amountIn)) {
        throw new Error(
          `Insufficient token balance. Required: ${amountIn.toString()}, Found: ${balance.toString()}`
        );
      }
    } catch (error) {
      throw new Error(
        `Failed to fetch token balance or token account doesn't exist ${error}`
      );
    }
  }
  return true;
}
function validateSwapAmount(amountIn) {
  if (amountIn.lte(new (0, _bnjs2.default)(0))) {
    throw new Error("Swap amount must be greater than 0");
  }
  return true;
}
function validateMigratedPoolBaseFeeMode(migratedPoolBaseFeeMode, migratedPoolMarketCapFeeSchedulerParams, migrationOption, poolFeeBps = MIN_MIGRATED_POOL_FEE_BPS) {
  if (migrationOption !== void 0 && migrationOption !== 1 /* MET_DAMM_V2 */) {
    return true;
  }
  if (migratedPoolBaseFeeMode === 2 /* RateLimiter */) {
    throw new Error(
      "RateLimiter (mode 2) is not supported for DAMM V2 migration. Use FeeTimeSchedulerLinear (0), FeeTimeSchedulerExponential (1), FeeMarketCapSchedulerLinear (3), or FeeMarketCapSchedulerExponential (4) instead."
    );
  }
  const isFixedFeeParams = migratedPoolMarketCapFeeSchedulerParams.numberOfPeriod === 0 && migratedPoolMarketCapFeeSchedulerParams.sqrtPriceStepBps === 0 && migratedPoolMarketCapFeeSchedulerParams.schedulerExpirationDuration === 0 && migratedPoolMarketCapFeeSchedulerParams.reductionFactor.eq(new (0, _bnjs2.default)(0));
  if (migratedPoolBaseFeeMode === 0 /* FeeTimeSchedulerLinear */ || migratedPoolBaseFeeMode === 1 /* FeeTimeSchedulerExponential */) {
    if (!isFixedFeeParams) {
      throw new Error(
        `FeeTimeSchedulerLinear (0) and FeeTimeSchedulerExponential (1) modes only work as fixed fee for migrated pools. All market cap fee scheduler params must be 0: numberOfPeriod, sqrtPriceStepBps, schedulerExpirationDuration, and reductionFactor.`
      );
    }
    return true;
  }
  if (migratedPoolBaseFeeMode === 3 /* FeeMarketCapSchedulerLinear */ || migratedPoolBaseFeeMode === 4 /* FeeMarketCapSchedulerExponential */) {
    if (migratedPoolMarketCapFeeSchedulerParams.numberOfPeriod <= 0 || migratedPoolMarketCapFeeSchedulerParams.sqrtPriceStepBps <= 0 || migratedPoolMarketCapFeeSchedulerParams.schedulerExpirationDuration <= 0 || migratedPoolMarketCapFeeSchedulerParams.reductionFactor.lte(
      new (0, _bnjs2.default)(0)
    )) {
      throw new Error(
        `For FeeMarketCapSchedulerLinear (3) and FeeMarketCapSchedulerExponential (4) modes, if using dynamic fee scheduling, numberOfPeriod, sqrtPriceStepBps, and schedulerExpirationDuration must all be greater than 0, and reductionFactor must be greater than 0.`
      );
    }
    const schedulerMode = migratedPoolBaseFeeMode === 3 /* FeeMarketCapSchedulerLinear */ ? 0 /* FeeSchedulerLinear */ : 1 /* FeeSchedulerExponential */;
    const cliffFeeNumerator = toNumerator(
      new (0, _bnjs2.default)(poolFeeBps),
      new (0, _bnjs2.default)(FEE_DENOMINATOR)
    );
    const minFeeNumerator = getFeeSchedulerMinBaseFeeNumerator(
      cliffFeeNumerator,
      migratedPoolMarketCapFeeSchedulerParams.numberOfPeriod,
      migratedPoolMarketCapFeeSchedulerParams.reductionFactor,
      schedulerMode
    );
    if (minFeeNumerator.lt(new (0, _bnjs2.default)(DAMM_V2_MIN_FEE_NUMERATOR)) || cliffFeeNumerator.gt(new (0, _bnjs2.default)(DAMM_V2_MAX_FEE_NUMERATOR))) {
      throw new Error("Invalid market cap fee scheduler fee bounds");
    }
    return true;
  }
  throw new Error(
    `Unknown migratedPoolBaseFeeMode: ${migratedPoolBaseFeeMode}`
  );
}
function validateMarketCapFeeSchedulerRequiresPoolFeeBps(migratedPoolMarketCapFeeSchedulerParams, migratedPoolFee) {
  const isMarketCapFeeSchedulerConfigured = migratedPoolMarketCapFeeSchedulerParams.numberOfPeriod > 0 || migratedPoolMarketCapFeeSchedulerParams.sqrtPriceStepBps > 0 || migratedPoolMarketCapFeeSchedulerParams.schedulerExpirationDuration > 0 || !migratedPoolMarketCapFeeSchedulerParams.reductionFactor.eq(new (0, _bnjs2.default)(0));
  if (isMarketCapFeeSchedulerConfigured) {
    if (!migratedPoolFee || migratedPoolFee.poolFeeBps === 0) {
      throw new Error(
        "When marketCapFeeSchedulerParams is configured, migratedPoolFee.poolFeeBps is required and must be greater than 0. The poolFeeBps serves as the starting (cliff) fee for the market cap fee scheduler."
      );
    }
  }
  return true;
}
function validateMigrationFee(migrationFee) {
  if (!Number.isInteger(migrationFee.feePercentage) || !Number.isInteger(migrationFee.creatorFeePercentage)) {
    throw new Error(
      "Migration fee percentage and creator fee percentage must be whole numbers (no decimals allowed)"
    );
  }
  if (migrationFee.feePercentage < 0 || migrationFee.feePercentage > MAX_MIGRATION_FEE_PERCENTAGE) {
    throw new Error(
      `Migration fee percentage must be between 0 and ${MAX_MIGRATION_FEE_PERCENTAGE}`
    );
  }
  if (migrationFee.creatorFeePercentage < 0 || migrationFee.creatorFeePercentage > MAX_CREATOR_MIGRATION_FEE_PERCENTAGE) {
    throw new Error(
      `Migration creator fee percentage must be between 0 and ${MAX_CREATOR_MIGRATION_FEE_PERCENTAGE}`
    );
  }
  if (migrationFee.feePercentage === 0 && migrationFee.creatorFeePercentage !== 0) {
    throw new Error(
      "Migration creator fee percentage must be 0 when migration fee percentage is 0"
    );
  }
  return true;
}

// src/helpers/buildCurve.ts


function buildCurve(params) {
  const {
    token,
    fee,
    migration,
    liquidityDistribution,
    lockedVesting,
    activationType,
    percentageSupplyOnMigration,
    migrationQuoteThreshold
  } = params;
  const {
    tokenType,
    tokenBaseDecimal,
    tokenQuoteDecimal,
    tokenAuthorityOption,
    totalTokenSupply,
    leftover
  } = token;
  const {
    baseFeeParams,
    dynamicFeeEnabled,
    collectFeeMode,
    creatorTradingFeePercentage,
    poolCreationFee,
    enableFirstSwapWithMinFee
  } = fee;
  const {
    migrationOption,
    migrationFeeOption,
    migrationFee,
    migratedPoolFee
  } = migration;
  const {
    partnerPermanentLockedLiquidityPercentage,
    partnerLiquidityPercentage,
    partnerLiquidityVestingInfoParams,
    creatorPermanentLockedLiquidityPercentage,
    creatorLiquidityPercentage,
    creatorLiquidityVestingInfoParams
  } = liquidityDistribution;
  const baseFee = getBaseFeeParams(baseFeeParams);
  const {
    totalLockedVestingAmount,
    numberOfVestingPeriod,
    cliffUnlockAmount,
    totalVestingDuration,
    cliffDurationFromMigrationTime
  } = lockedVesting;
  const lockedVestingParams = getLockedVestingParams(
    totalLockedVestingAmount,
    numberOfVestingPeriod,
    cliffUnlockAmount,
    totalVestingDuration,
    cliffDurationFromMigrationTime,
    tokenBaseDecimal
  );
  const partnerVestingParams = _nullishCoalesce(partnerLiquidityVestingInfoParams, () => ( DEFAULT_LIQUIDITY_VESTING_INFO_PARAMS));
  const partnerLiquidityVestingInfo = getLiquidityVestingInfoParams(
    partnerVestingParams.vestingPercentage,
    partnerVestingParams.bpsPerPeriod,
    partnerVestingParams.numberOfPeriods,
    partnerVestingParams.cliffDurationFromMigrationTime,
    partnerVestingParams.totalDuration
  );
  const creatorVestingParams = _nullishCoalesce(creatorLiquidityVestingInfoParams, () => ( DEFAULT_LIQUIDITY_VESTING_INFO_PARAMS));
  const creatorLiquidityVestingInfo = getLiquidityVestingInfoParams(
    creatorVestingParams.vestingPercentage,
    creatorVestingParams.bpsPerPeriod,
    creatorVestingParams.numberOfPeriods,
    creatorVestingParams.cliffDurationFromMigrationTime,
    creatorVestingParams.totalDuration
  );
  const poolCreationFeeInLamports = convertToLamports(
    poolCreationFee,
    9 /* NINE */
  );
  const migratedPoolFeeResult = getMigratedPoolFeeParams(
    migrationOption,
    migrationFeeOption,
    migratedPoolFee,
    baseFeeParams
  );
  const migrationBaseSupply = new (0, _decimaljs2.default)(totalTokenSupply).mul(new (0, _decimaljs2.default)(percentageSupplyOnMigration)).div(new (0, _decimaljs2.default)(100));
  const totalSupply = convertToLamports(totalTokenSupply, tokenBaseDecimal);
  const migrationQuoteAmount = getMigrationQuoteAmountFromMigrationQuoteThreshold(
    new (0, _decimaljs2.default)(migrationQuoteThreshold),
    migrationFee.feePercentage
  );
  const migrationPrice = new (0, _decimaljs2.default)(migrationQuoteAmount.toString()).div(
    new (0, _decimaljs2.default)(migrationBaseSupply.toString())
  );
  const migrationQuoteThresholdInLamport = convertToLamports(
    migrationQuoteThreshold,
    tokenQuoteDecimal
  );
  const totalLeftover = convertToLamports(leftover, tokenBaseDecimal);
  const migrateSqrtPrice = getSqrtPriceFromPrice(
    migrationPrice.toString(),
    tokenBaseDecimal,
    tokenQuoteDecimal
  );
  const migrationQuoteAmountInLamport = fromDecimalToBN(
    migrationQuoteAmount.mul(new (0, _decimaljs2.default)(10 ** tokenQuoteDecimal))
  );
  const migrationBaseAmount = getMigrationBaseToken(
    migrationQuoteAmountInLamport,
    migrateSqrtPrice,
    migrationOption
  );
  const totalVestingAmount = getTotalVestingAmount(lockedVestingParams);
  const swapAmount = totalSupply.sub(migrationBaseAmount).sub(totalVestingAmount).sub(totalLeftover);
  const { sqrtStartPrice, curve } = getFirstCurve(
    migrateSqrtPrice,
    migrationBaseAmount,
    swapAmount,
    migrationQuoteThresholdInLamport,
    migrationFee.feePercentage
  );
  const totalDynamicSupply = getTotalSupplyFromCurve(
    migrationQuoteThresholdInLamport,
    sqrtStartPrice,
    curve,
    lockedVestingParams,
    migrationOption,
    totalLeftover,
    migrationFee.feePercentage
  );
  const remainingAmount = totalSupply.sub(totalDynamicSupply);
  const lastLiquidity = getInitialLiquidityFromDeltaBase(
    remainingAmount,
    MAX_SQRT_PRICE,
    migrateSqrtPrice
  );
  if (!lastLiquidity.isZero()) {
    curve.push({
      sqrtPrice: MAX_SQRT_PRICE,
      liquidity: lastLiquidity
    });
  }
  const instructionParams = {
    poolFees: {
      baseFee: {
        ...baseFee
      },
      dynamicFee: dynamicFeeEnabled ? getDynamicFeeParams(
        baseFeeParams.baseFeeMode === 2 /* RateLimiter */ ? baseFeeParams.rateLimiterParam.baseFeeBps : baseFeeParams.feeSchedulerParam.endingFeeBps
      ) : null
    },
    collectFeeMode,
    migrationOption,
    activationType,
    tokenType,
    tokenDecimal: tokenBaseDecimal,
    partnerLiquidityPercentage,
    partnerPermanentLockedLiquidityPercentage,
    creatorLiquidityPercentage,
    creatorPermanentLockedLiquidityPercentage,
    migrationQuoteThreshold: migrationQuoteThresholdInLamport,
    sqrtStartPrice,
    lockedVesting: lockedVestingParams,
    migrationFeeOption: migratedPoolFeeResult.migrationFeeOption,
    tokenSupply: {
      preMigrationTokenSupply: totalSupply,
      postMigrationTokenSupply: totalSupply
    },
    creatorTradingFeePercentage,
    tokenUpdateAuthority: tokenAuthorityOption,
    migrationFee,
    migratedPoolFee: migratedPoolFeeResult.migratedPoolFee,
    poolCreationFee: poolCreationFeeInLamports,
    partnerLiquidityVestingInfo,
    creatorLiquidityVestingInfo,
    migratedPoolBaseFeeMode: migratedPoolFeeResult.migratedPoolBaseFeeMode,
    migratedPoolMarketCapFeeSchedulerParams: migratedPoolFeeResult.migratedPoolMarketCapFeeSchedulerParams,
    enableFirstSwapWithMinFee,
    compoundingFeeBps: migratedPoolFeeResult.compoundingFeeBps,
    padding: [],
    curve
  };
  return instructionParams;
}
function buildCurveWithMarketCap(params) {
  const {
    token,
    migration,
    lockedVesting,
    initialMarketCap,
    migrationMarketCap
  } = params;
  const { totalTokenSupply, tokenBaseDecimal, leftover } = token;
  const { migrationFee } = migration;
  const {
    totalLockedVestingAmount,
    numberOfVestingPeriod,
    cliffUnlockAmount,
    totalVestingDuration,
    cliffDurationFromMigrationTime
  } = lockedVesting;
  const lockedVestingParams = getLockedVestingParams(
    totalLockedVestingAmount,
    numberOfVestingPeriod,
    cliffUnlockAmount,
    totalVestingDuration,
    cliffDurationFromMigrationTime,
    tokenBaseDecimal
  );
  const totalLeftover = convertToLamports(leftover, tokenBaseDecimal);
  const totalSupply = convertToLamports(totalTokenSupply, tokenBaseDecimal);
  const percentageSupplyOnMigration = migrationFee.feePercentage > 0 ? calculateAdjustedPercentageSupplyOnMigration(
    initialMarketCap,
    migrationMarketCap,
    migrationFee,
    lockedVestingParams,
    totalLeftover,
    totalSupply
  ) : getPercentageSupplyOnMigration(
    new (0, _decimaljs2.default)(initialMarketCap),
    new (0, _decimaljs2.default)(migrationMarketCap),
    lockedVestingParams,
    totalLeftover,
    totalSupply
  );
  const migrationQuoteAmount = getMigrationQuoteAmount(
    new (0, _decimaljs2.default)(migrationMarketCap),
    new (0, _decimaljs2.default)(percentageSupplyOnMigration)
  );
  const migrationQuoteThreshold = getMigrationQuoteThresholdFromMigrationQuoteAmount(
    migrationQuoteAmount,
    new (0, _decimaljs2.default)(migrationFee.feePercentage)
  ).toNumber();
  return buildCurve({
    ...params,
    percentageSupplyOnMigration,
    migrationQuoteThreshold
  });
}
function buildCurveWithTwoSegments(params) {
  const {
    token,
    fee,
    migration,
    liquidityDistribution,
    lockedVesting,
    activationType,
    initialMarketCap,
    migrationMarketCap,
    percentageSupplyOnMigration
  } = params;
  const {
    tokenType,
    tokenBaseDecimal,
    tokenQuoteDecimal,
    tokenAuthorityOption,
    totalTokenSupply,
    leftover
  } = token;
  const {
    baseFeeParams,
    dynamicFeeEnabled,
    collectFeeMode,
    creatorTradingFeePercentage,
    poolCreationFee,
    enableFirstSwapWithMinFee
  } = fee;
  const {
    migrationOption,
    migrationFeeOption,
    migrationFee,
    migratedPoolFee
  } = migration;
  const {
    partnerPermanentLockedLiquidityPercentage,
    partnerLiquidityPercentage,
    partnerLiquidityVestingInfoParams,
    creatorPermanentLockedLiquidityPercentage,
    creatorLiquidityPercentage,
    creatorLiquidityVestingInfoParams
  } = liquidityDistribution;
  const baseFee = getBaseFeeParams(baseFeeParams);
  const {
    totalLockedVestingAmount,
    numberOfVestingPeriod,
    cliffUnlockAmount,
    totalVestingDuration,
    cliffDurationFromMigrationTime
  } = lockedVesting;
  const lockedVestingParams = getLockedVestingParams(
    totalLockedVestingAmount,
    numberOfVestingPeriod,
    cliffUnlockAmount,
    totalVestingDuration,
    cliffDurationFromMigrationTime,
    tokenBaseDecimal
  );
  const partnerVestingParams = _nullishCoalesce(partnerLiquidityVestingInfoParams, () => ( DEFAULT_LIQUIDITY_VESTING_INFO_PARAMS));
  const {
    vestingPercentage: partnerVestingPercentage,
    bpsPerPeriod: partnerBpsPerPeriod,
    numberOfPeriods: partnerNumberOfPeriods,
    cliffDurationFromMigrationTime: partnerCliffDurationFromMigrationTime,
    totalDuration: partnerTotalDuration
  } = partnerVestingParams;
  const partnerLiquidityVestingInfo = getLiquidityVestingInfoParams(
    partnerVestingPercentage,
    partnerBpsPerPeriod,
    partnerNumberOfPeriods,
    partnerCliffDurationFromMigrationTime,
    partnerTotalDuration
  );
  const creatorVestingParams = _nullishCoalesce(creatorLiquidityVestingInfoParams, () => ( DEFAULT_LIQUIDITY_VESTING_INFO_PARAMS));
  const {
    vestingPercentage: creatorVestingPercentage,
    bpsPerPeriod: creatorBpsPerPeriod,
    numberOfPeriods: creatorNumberOfPeriods,
    cliffDurationFromMigrationTime: creatorCliffDurationFromMigrationTime,
    totalDuration: creatorTotalDuration
  } = creatorVestingParams;
  const creatorLiquidityVestingInfo = getLiquidityVestingInfoParams(
    creatorVestingPercentage,
    creatorBpsPerPeriod,
    creatorNumberOfPeriods,
    creatorCliffDurationFromMigrationTime,
    creatorTotalDuration
  );
  const poolCreationFeeInLamports = convertToLamports(
    poolCreationFee,
    9 /* NINE */
  );
  const migratedPoolFeeResult = getMigratedPoolFeeParams(
    migrationOption,
    migrationFeeOption,
    migratedPoolFee,
    baseFeeParams
  );
  const migrationBaseSupply = new (0, _bnjs2.default)(totalTokenSupply).mul(new (0, _bnjs2.default)(percentageSupplyOnMigration)).div(new (0, _bnjs2.default)(100));
  const totalSupply = convertToLamports(totalTokenSupply, tokenBaseDecimal);
  const migrationQuoteAmount = getMigrationQuoteAmount(
    new (0, _decimaljs2.default)(migrationMarketCap),
    new (0, _decimaljs2.default)(percentageSupplyOnMigration)
  );
  const migrationQuoteThreshold = getMigrationQuoteThresholdFromMigrationQuoteAmount(
    migrationQuoteAmount,
    new (0, _decimaljs2.default)(migrationFee.feePercentage)
  );
  const migrationPrice = migrationQuoteAmount.div(
    new (0, _decimaljs2.default)(migrationBaseSupply.toString())
  );
  const migrationQuoteThresholdInLamport = fromDecimalToBN(
    migrationQuoteThreshold.mul(new (0, _decimaljs2.default)(10 ** tokenQuoteDecimal))
  );
  const migrationQuoteAmountInLamport = fromDecimalToBN(
    migrationQuoteAmount.mul(new (0, _decimaljs2.default)(10 ** tokenQuoteDecimal))
  );
  const migrateSqrtPrice = getSqrtPriceFromPrice(
    migrationPrice.toString(),
    tokenBaseDecimal,
    tokenQuoteDecimal
  );
  const migrationBaseAmount = getMigrationBaseToken(
    migrationQuoteAmountInLamport,
    migrateSqrtPrice,
    migrationOption
  );
  const totalVestingAmount = getTotalVestingAmount(lockedVestingParams);
  const totalLeftover = convertToLamports(leftover, tokenBaseDecimal);
  const swapAmount = totalSupply.sub(migrationBaseAmount).sub(totalVestingAmount).sub(totalLeftover);
  const initialSqrtPrice = getSqrtPriceFromMarketCap(
    initialMarketCap,
    totalTokenSupply,
    tokenBaseDecimal,
    tokenQuoteDecimal
  );
  const midSqrtPriceDecimal1 = new (0, _decimaljs2.default)(migrateSqrtPrice.toString()).mul(new (0, _decimaljs2.default)(initialSqrtPrice.toString())).sqrt();
  const midSqrtPrice1 = new (0, _bnjs2.default)(midSqrtPriceDecimal1.floor().toFixed());
  const numerator1 = new (0, _decimaljs2.default)(initialSqrtPrice.toString());
  const numerator2 = _decimaljs2.default.pow(migrateSqrtPrice.toString(), 3);
  const product1 = numerator1.mul(numerator2);
  const midSqrtPriceDecimal2 = _decimaljs2.default.pow(product1, 0.25);
  const midSqrtPrice2 = new (0, _bnjs2.default)(midSqrtPriceDecimal2.floor().toFixed());
  const numerator3 = _decimaljs2.default.pow(initialSqrtPrice.toString(), 3);
  const numerator4 = new (0, _decimaljs2.default)(migrateSqrtPrice.toString());
  const product2 = numerator3.mul(numerator4);
  const midSqrtPriceDecimal3 = _decimaljs2.default.pow(product2, 0.25);
  const midSqrtPrice3 = new (0, _bnjs2.default)(midSqrtPriceDecimal3.floor().toFixed());
  const midPrices = [midSqrtPrice3, midSqrtPrice2, midSqrtPrice1];
  let sqrtStartPrice = new (0, _bnjs2.default)(0);
  let curve = [];
  for (let i = 0; i < midPrices.length; i++) {
    const result = getTwoCurve(
      migrateSqrtPrice,
      midPrices[i],
      initialSqrtPrice,
      swapAmount,
      migrationQuoteThresholdInLamport
    );
    if (result.isOk) {
      curve = result.curve;
      sqrtStartPrice = result.sqrtStartPrice;
      break;
    }
  }
  const totalDynamicSupply = getTotalSupplyFromCurve(
    migrationQuoteThresholdInLamport,
    sqrtStartPrice,
    curve,
    lockedVestingParams,
    migrationOption,
    totalLeftover,
    migrationFee.feePercentage
  );
  if (totalDynamicSupply.gt(totalSupply)) {
    const leftOverDelta = totalDynamicSupply.sub(totalSupply);
    if (!leftOverDelta.lt(totalLeftover)) {
      throw new Error("leftOverDelta must be less than totalLeftover");
    }
  }
  const instructionParams = {
    poolFees: {
      baseFee: {
        ...baseFee
      },
      dynamicFee: dynamicFeeEnabled ? getDynamicFeeParams(
        baseFeeParams.baseFeeMode === 2 /* RateLimiter */ ? baseFeeParams.rateLimiterParam.baseFeeBps : baseFeeParams.feeSchedulerParam.endingFeeBps
      ) : null
    },
    activationType,
    collectFeeMode,
    migrationOption,
    tokenType,
    tokenDecimal: tokenBaseDecimal,
    migrationQuoteThreshold: migrationQuoteThresholdInLamport,
    partnerLiquidityPercentage,
    partnerPermanentLockedLiquidityPercentage,
    creatorLiquidityPercentage,
    creatorPermanentLockedLiquidityPercentage,
    sqrtStartPrice,
    lockedVesting: lockedVestingParams,
    migrationFeeOption: migratedPoolFeeResult.migrationFeeOption,
    tokenSupply: {
      preMigrationTokenSupply: totalSupply,
      postMigrationTokenSupply: totalSupply
    },
    creatorTradingFeePercentage,
    migratedPoolFee: migratedPoolFeeResult.migratedPoolFee,
    poolCreationFee: poolCreationFeeInLamports,
    partnerLiquidityVestingInfo,
    creatorLiquidityVestingInfo,
    migratedPoolBaseFeeMode: migratedPoolFeeResult.migratedPoolBaseFeeMode,
    migratedPoolMarketCapFeeSchedulerParams: migratedPoolFeeResult.migratedPoolMarketCapFeeSchedulerParams,
    enableFirstSwapWithMinFee,
    compoundingFeeBps: migratedPoolFeeResult.compoundingFeeBps,
    padding: [],
    curve,
    tokenUpdateAuthority: tokenAuthorityOption,
    migrationFee
  };
  return instructionParams;
}
function buildCurveWithMidPrice(params) {
  const {
    token,
    fee,
    migration,
    liquidityDistribution,
    lockedVesting,
    activationType,
    initialMarketCap,
    migrationMarketCap,
    midPrice,
    percentageSupplyOnMigration
  } = params;
  const {
    tokenType,
    tokenBaseDecimal,
    tokenQuoteDecimal,
    tokenAuthorityOption,
    totalTokenSupply,
    leftover
  } = token;
  const {
    baseFeeParams,
    dynamicFeeEnabled,
    collectFeeMode,
    creatorTradingFeePercentage,
    poolCreationFee,
    enableFirstSwapWithMinFee
  } = fee;
  const {
    migrationOption,
    migrationFeeOption,
    migrationFee,
    migratedPoolFee
  } = migration;
  const {
    partnerPermanentLockedLiquidityPercentage,
    partnerLiquidityPercentage,
    partnerLiquidityVestingInfoParams,
    creatorPermanentLockedLiquidityPercentage,
    creatorLiquidityPercentage,
    creatorLiquidityVestingInfoParams
  } = liquidityDistribution;
  const baseFee = getBaseFeeParams(baseFeeParams);
  const {
    totalLockedVestingAmount,
    numberOfVestingPeriod,
    cliffUnlockAmount,
    totalVestingDuration,
    cliffDurationFromMigrationTime
  } = lockedVesting;
  const lockedVestingParams = getLockedVestingParams(
    totalLockedVestingAmount,
    numberOfVestingPeriod,
    cliffUnlockAmount,
    totalVestingDuration,
    cliffDurationFromMigrationTime,
    tokenBaseDecimal
  );
  const partnerVestingParams = _nullishCoalesce(partnerLiquidityVestingInfoParams, () => ( DEFAULT_LIQUIDITY_VESTING_INFO_PARAMS));
  const {
    vestingPercentage: partnerVestingPercentage,
    bpsPerPeriod: partnerBpsPerPeriod,
    numberOfPeriods: partnerNumberOfPeriods,
    cliffDurationFromMigrationTime: partnerCliffDurationFromMigrationTime,
    totalDuration: partnerTotalDuration
  } = partnerVestingParams;
  const partnerLiquidityVestingInfo = getLiquidityVestingInfoParams(
    partnerVestingPercentage,
    partnerBpsPerPeriod,
    partnerNumberOfPeriods,
    partnerCliffDurationFromMigrationTime,
    partnerTotalDuration
  );
  const creatorVestingParams = _nullishCoalesce(creatorLiquidityVestingInfoParams, () => ( DEFAULT_LIQUIDITY_VESTING_INFO_PARAMS));
  const {
    vestingPercentage: creatorVestingPercentage,
    bpsPerPeriod: creatorBpsPerPeriod,
    numberOfPeriods: creatorNumberOfPeriods,
    cliffDurationFromMigrationTime: creatorCliffDurationFromMigrationTime,
    totalDuration: creatorTotalDuration
  } = creatorVestingParams;
  const creatorLiquidityVestingInfo = getLiquidityVestingInfoParams(
    creatorVestingPercentage,
    creatorBpsPerPeriod,
    creatorNumberOfPeriods,
    creatorCliffDurationFromMigrationTime,
    creatorTotalDuration
  );
  const poolCreationFeeInLamports = convertToLamports(
    poolCreationFee,
    9 /* NINE */
  );
  const migratedPoolFeeResult = getMigratedPoolFeeParams(
    migrationOption,
    migrationFeeOption,
    migratedPoolFee,
    baseFeeParams
  );
  const migrationBaseSupply = new (0, _bnjs2.default)(totalTokenSupply).mul(new (0, _bnjs2.default)(percentageSupplyOnMigration)).div(new (0, _bnjs2.default)(100));
  const totalSupply = convertToLamports(totalTokenSupply, tokenBaseDecimal);
  const migrationQuoteAmount = getMigrationQuoteAmount(
    new (0, _decimaljs2.default)(migrationMarketCap),
    new (0, _decimaljs2.default)(percentageSupplyOnMigration)
  );
  const migrationQuoteThreshold = getMigrationQuoteThresholdFromMigrationQuoteAmount(
    migrationQuoteAmount,
    new (0, _decimaljs2.default)(migrationFee.feePercentage)
  );
  const migrationPrice = migrationQuoteAmount.div(
    new (0, _decimaljs2.default)(migrationBaseSupply.toString())
  );
  const migrationQuoteThresholdInLamport = fromDecimalToBN(
    migrationQuoteThreshold.mul(new (0, _decimaljs2.default)(10 ** tokenQuoteDecimal))
  );
  const migrationQuoteAmountInLamport = fromDecimalToBN(
    migrationQuoteAmount.mul(new (0, _decimaljs2.default)(10 ** tokenQuoteDecimal))
  );
  const migrateSqrtPrice = getSqrtPriceFromPrice(
    migrationPrice.toString(),
    tokenBaseDecimal,
    tokenQuoteDecimal
  );
  const migrationBaseAmount = getMigrationBaseToken(
    migrationQuoteAmountInLamport,
    migrateSqrtPrice,
    migrationOption
  );
  const totalVestingAmount = getTotalVestingAmount(lockedVestingParams);
  const totalLeftover = convertToLamports(leftover, tokenBaseDecimal);
  const swapAmount = totalSupply.sub(migrationBaseAmount).sub(totalVestingAmount).sub(totalLeftover);
  const initialSqrtPrice = getSqrtPriceFromMarketCap(
    initialMarketCap,
    totalTokenSupply,
    tokenBaseDecimal,
    tokenQuoteDecimal
  );
  const midSqrtPrice = getSqrtPriceFromPrice(
    midPrice.toString(),
    tokenBaseDecimal,
    tokenQuoteDecimal
  );
  let sqrtStartPrice = new (0, _bnjs2.default)(0);
  let curve = [];
  const result = getTwoCurve(
    migrateSqrtPrice,
    midSqrtPrice,
    initialSqrtPrice,
    swapAmount,
    migrationQuoteThresholdInLamport
  );
  curve = result.curve;
  sqrtStartPrice = result.sqrtStartPrice;
  const totalDynamicSupply = getTotalSupplyFromCurve(
    migrationQuoteThresholdInLamport,
    sqrtStartPrice,
    curve,
    lockedVestingParams,
    migrationOption,
    totalLeftover,
    migrationFee.feePercentage
  );
  if (totalDynamicSupply.gt(totalSupply)) {
    const leftOverDelta = totalDynamicSupply.sub(totalSupply);
    if (!leftOverDelta.lt(totalLeftover)) {
      throw new Error("leftOverDelta must be less than totalLeftover");
    }
  }
  const instructionParams = {
    poolFees: {
      baseFee: {
        ...baseFee
      },
      dynamicFee: dynamicFeeEnabled ? getDynamicFeeParams(
        baseFeeParams.baseFeeMode === 2 /* RateLimiter */ ? baseFeeParams.rateLimiterParam.baseFeeBps : baseFeeParams.feeSchedulerParam.endingFeeBps
      ) : null
    },
    activationType,
    collectFeeMode,
    migrationOption,
    tokenType,
    tokenDecimal: tokenBaseDecimal,
    migrationQuoteThreshold: migrationQuoteThresholdInLamport,
    partnerLiquidityPercentage,
    partnerPermanentLockedLiquidityPercentage,
    creatorLiquidityPercentage,
    creatorPermanentLockedLiquidityPercentage,
    sqrtStartPrice,
    lockedVesting: lockedVestingParams,
    migrationFeeOption: migratedPoolFeeResult.migrationFeeOption,
    tokenSupply: {
      preMigrationTokenSupply: totalSupply,
      postMigrationTokenSupply: totalSupply
    },
    creatorTradingFeePercentage,
    migratedPoolFee: migratedPoolFeeResult.migratedPoolFee,
    poolCreationFee: poolCreationFeeInLamports,
    partnerLiquidityVestingInfo,
    creatorLiquidityVestingInfo,
    migratedPoolBaseFeeMode: migratedPoolFeeResult.migratedPoolBaseFeeMode,
    migratedPoolMarketCapFeeSchedulerParams: migratedPoolFeeResult.migratedPoolMarketCapFeeSchedulerParams,
    enableFirstSwapWithMinFee,
    compoundingFeeBps: migratedPoolFeeResult.compoundingFeeBps,
    padding: [],
    curve,
    tokenUpdateAuthority: tokenAuthorityOption,
    migrationFee
  };
  return instructionParams;
}
function buildCurveWithLiquidityWeights(params) {
  const {
    token,
    fee,
    migration,
    liquidityDistribution,
    lockedVesting,
    activationType,
    initialMarketCap,
    migrationMarketCap,
    liquidityWeights
  } = params;
  const {
    tokenType,
    tokenBaseDecimal,
    tokenQuoteDecimal,
    tokenAuthorityOption,
    totalTokenSupply,
    leftover
  } = token;
  const {
    baseFeeParams,
    dynamicFeeEnabled,
    collectFeeMode,
    creatorTradingFeePercentage,
    poolCreationFee,
    enableFirstSwapWithMinFee
  } = fee;
  const {
    migrationOption,
    migrationFeeOption,
    migrationFee,
    migratedPoolFee
  } = migration;
  const {
    partnerPermanentLockedLiquidityPercentage,
    partnerLiquidityPercentage,
    partnerLiquidityVestingInfoParams,
    creatorPermanentLockedLiquidityPercentage,
    creatorLiquidityPercentage,
    creatorLiquidityVestingInfoParams
  } = liquidityDistribution;
  const baseFee = getBaseFeeParams(baseFeeParams);
  const {
    totalLockedVestingAmount,
    numberOfVestingPeriod,
    cliffUnlockAmount,
    totalVestingDuration,
    cliffDurationFromMigrationTime
  } = lockedVesting;
  const lockedVestingParams = getLockedVestingParams(
    totalLockedVestingAmount,
    numberOfVestingPeriod,
    cliffUnlockAmount,
    totalVestingDuration,
    cliffDurationFromMigrationTime,
    tokenBaseDecimal
  );
  const partnerVestingParams = _nullishCoalesce(partnerLiquidityVestingInfoParams, () => ( DEFAULT_LIQUIDITY_VESTING_INFO_PARAMS));
  const {
    vestingPercentage: partnerVestingPercentage,
    bpsPerPeriod: partnerBpsPerPeriod,
    numberOfPeriods: partnerNumberOfPeriods,
    cliffDurationFromMigrationTime: partnerCliffDurationFromMigrationTime,
    totalDuration: partnerTotalDuration
  } = partnerVestingParams;
  const partnerLiquidityVestingInfo = getLiquidityVestingInfoParams(
    partnerVestingPercentage,
    partnerBpsPerPeriod,
    partnerNumberOfPeriods,
    partnerCliffDurationFromMigrationTime,
    partnerTotalDuration
  );
  const creatorVestingParams = _nullishCoalesce(creatorLiquidityVestingInfoParams, () => ( DEFAULT_LIQUIDITY_VESTING_INFO_PARAMS));
  const {
    vestingPercentage: creatorVestingPercentage,
    bpsPerPeriod: creatorBpsPerPeriod,
    numberOfPeriods: creatorNumberOfPeriods,
    cliffDurationFromMigrationTime: creatorCliffDurationFromMigrationTime,
    totalDuration: creatorTotalDuration
  } = creatorVestingParams;
  const creatorLiquidityVestingInfo = getLiquidityVestingInfoParams(
    creatorVestingPercentage,
    creatorBpsPerPeriod,
    creatorNumberOfPeriods,
    creatorCliffDurationFromMigrationTime,
    creatorTotalDuration
  );
  const poolCreationFeeInLamports = convertToLamports(
    poolCreationFee,
    9 /* NINE */
  );
  const migratedPoolFeeResult = getMigratedPoolFeeParams(
    migrationOption,
    migrationFeeOption,
    migratedPoolFee,
    baseFeeParams
  );
  const pMin = getSqrtPriceFromMarketCap(
    initialMarketCap,
    totalTokenSupply,
    tokenBaseDecimal,
    tokenQuoteDecimal
  );
  const pMax = getSqrtPriceFromMarketCap(
    migrationMarketCap,
    totalTokenSupply,
    tokenBaseDecimal,
    tokenQuoteDecimal
  );
  const priceRatio = new (0, _decimaljs2.default)(pMax.toString()).div(
    new (0, _decimaljs2.default)(pMin.toString())
  );
  const qDecimal = priceRatio.pow(new (0, _decimaljs2.default)(1).div(new (0, _decimaljs2.default)(16)));
  const sqrtPrices = [];
  let currentPrice = pMin;
  for (let i = 0; i < 17; i++) {
    sqrtPrices.push(currentPrice);
    currentPrice = convertDecimalToBN(
      qDecimal.mul(new (0, _decimaljs2.default)(currentPrice.toString()))
    );
  }
  const totalSupply = convertToLamports(totalTokenSupply, tokenBaseDecimal);
  const totalLeftover = convertToLamports(leftover, tokenBaseDecimal);
  const totalVestingAmount = getTotalVestingAmount(lockedVestingParams);
  const totalSwapAndMigrationAmount = totalSupply.sub(totalVestingAmount).sub(totalLeftover);
  let sumFactor = new (0, _decimaljs2.default)(0);
  const pmaxWeight = new (0, _decimaljs2.default)(pMax.toString());
  const migrationFeeFactor = new (0, _decimaljs2.default)(100).sub(new (0, _decimaljs2.default)(migrationFee.feePercentage)).div(new (0, _decimaljs2.default)(100));
  for (let i = 1; i < 17; i++) {
    const pi = new (0, _decimaljs2.default)(sqrtPrices[i].toString());
    const piMinus = new (0, _decimaljs2.default)(sqrtPrices[i - 1].toString());
    const k = new (0, _decimaljs2.default)(liquidityWeights[i - 1]);
    const w1 = pi.sub(piMinus).div(pi.mul(piMinus));
    const w2 = pi.sub(piMinus).mul(migrationFeeFactor).div(pmaxWeight.mul(pmaxWeight));
    const weight = k.mul(w1.add(w2));
    sumFactor = sumFactor.add(weight);
  }
  const l1 = new (0, _decimaljs2.default)(totalSwapAndMigrationAmount.toString()).div(
    sumFactor
  );
  const curve = [];
  for (let i = 0; i < 16; i++) {
    const k = new (0, _decimaljs2.default)(liquidityWeights[i]);
    const liquidity = convertDecimalToBN(l1.mul(k));
    const sqrtPrice = i < 15 ? sqrtPrices[i + 1] : pMax;
    curve.push({
      sqrtPrice,
      liquidity
    });
  }
  const swapBaseAmount = getBaseTokenForSwap(pMin, pMax, curve);
  const swapBaseAmountBuffer = getSwapAmountWithBuffer(
    swapBaseAmount,
    pMin,
    curve
  );
  const migrationAmount = totalSwapAndMigrationAmount.sub(swapBaseAmountBuffer);
  const migrationQuoteAmount = migrationAmount.mul(pMax).mul(pMax).shrn(128);
  const migrationQuoteThreshold = getMigrationQuoteThresholdFromMigrationQuoteAmount(
    new (0, _decimaljs2.default)(migrationQuoteAmount.toString()),
    new (0, _decimaljs2.default)(migrationFee.feePercentage)
  );
  const migrationQuoteThresholdInLamport = fromDecimalToBN(
    migrationQuoteThreshold
  );
  const totalDynamicSupply = getTotalSupplyFromCurve(
    migrationQuoteThresholdInLamport,
    pMin,
    curve,
    lockedVestingParams,
    migrationOption,
    totalLeftover,
    migrationFee.feePercentage
  );
  if (totalDynamicSupply.gt(totalSupply)) {
    const leftOverDelta = totalDynamicSupply.sub(totalSupply);
    if (!leftOverDelta.lt(totalLeftover)) {
      throw new Error("leftOverDelta must be less than totalLeftover");
    }
  }
  const instructionParams = {
    poolFees: {
      baseFee: {
        ...baseFee
      },
      dynamicFee: dynamicFeeEnabled ? getDynamicFeeParams(
        baseFeeParams.baseFeeMode === 2 /* RateLimiter */ ? baseFeeParams.rateLimiterParam.baseFeeBps : baseFeeParams.feeSchedulerParam.endingFeeBps
      ) : null
    },
    activationType,
    collectFeeMode,
    migrationOption,
    tokenType,
    tokenDecimal: tokenBaseDecimal,
    migrationQuoteThreshold: migrationQuoteThresholdInLamport,
    partnerLiquidityPercentage,
    partnerPermanentLockedLiquidityPercentage,
    creatorLiquidityPercentage,
    creatorPermanentLockedLiquidityPercentage,
    sqrtStartPrice: pMin,
    lockedVesting: lockedVestingParams,
    migrationFeeOption: migratedPoolFeeResult.migrationFeeOption,
    tokenSupply: {
      preMigrationTokenSupply: totalSupply,
      postMigrationTokenSupply: totalSupply
    },
    creatorTradingFeePercentage,
    migratedPoolFee: migratedPoolFeeResult.migratedPoolFee,
    poolCreationFee: poolCreationFeeInLamports,
    partnerLiquidityVestingInfo,
    creatorLiquidityVestingInfo,
    migratedPoolBaseFeeMode: migratedPoolFeeResult.migratedPoolBaseFeeMode,
    migratedPoolMarketCapFeeSchedulerParams: migratedPoolFeeResult.migratedPoolMarketCapFeeSchedulerParams,
    enableFirstSwapWithMinFee,
    compoundingFeeBps: migratedPoolFeeResult.compoundingFeeBps,
    padding: [],
    curve,
    migrationFee,
    tokenUpdateAuthority: tokenAuthorityOption
  };
  return instructionParams;
}
function buildCurveWithCustomSqrtPrices(params) {
  const {
    token,
    fee,
    migration,
    liquidityDistribution,
    lockedVesting,
    activationType,
    sqrtPrices
  } = params;
  const {
    tokenType,
    tokenBaseDecimal,
    tokenQuoteDecimal,
    tokenAuthorityOption,
    totalTokenSupply,
    leftover
  } = token;
  const {
    baseFeeParams,
    dynamicFeeEnabled,
    collectFeeMode,
    creatorTradingFeePercentage,
    poolCreationFee,
    enableFirstSwapWithMinFee
  } = fee;
  const {
    migrationOption,
    migrationFeeOption,
    migrationFee,
    migratedPoolFee
  } = migration;
  const {
    partnerPermanentLockedLiquidityPercentage,
    partnerLiquidityPercentage,
    partnerLiquidityVestingInfoParams,
    creatorPermanentLockedLiquidityPercentage,
    creatorLiquidityPercentage,
    creatorLiquidityVestingInfoParams
  } = liquidityDistribution;
  let { liquidityWeights } = params;
  if (sqrtPrices.length < 2) {
    throw new Error("sqrtPrices array must have at least 2 elements");
  }
  for (let i = 1; i < sqrtPrices.length; i++) {
    if (sqrtPrices[i].lte(sqrtPrices[i - 1])) {
      throw new Error("sqrtPrices must be in ascending order");
    }
  }
  if (!liquidityWeights) {
    const numSegments2 = sqrtPrices.length - 1;
    liquidityWeights = Array(numSegments2).fill(1);
  } else if (liquidityWeights.length !== sqrtPrices.length - 1) {
    throw new Error(
      "liquidityWeights length must equal sqrtPrices.length - 1"
    );
  }
  const baseFee = getBaseFeeParams(baseFeeParams);
  const {
    totalLockedVestingAmount,
    numberOfVestingPeriod,
    cliffUnlockAmount,
    totalVestingDuration,
    cliffDurationFromMigrationTime
  } = lockedVesting;
  const lockedVestingParams = getLockedVestingParams(
    totalLockedVestingAmount,
    numberOfVestingPeriod,
    cliffUnlockAmount,
    totalVestingDuration,
    cliffDurationFromMigrationTime,
    tokenBaseDecimal
  );
  const partnerVestingParams = _nullishCoalesce(partnerLiquidityVestingInfoParams, () => ( DEFAULT_LIQUIDITY_VESTING_INFO_PARAMS));
  const {
    vestingPercentage: partnerVestingPercentage,
    bpsPerPeriod: partnerBpsPerPeriod,
    numberOfPeriods: partnerNumberOfPeriods,
    cliffDurationFromMigrationTime: partnerCliffDurationFromMigrationTime,
    totalDuration: partnerTotalDuration
  } = partnerVestingParams;
  const partnerLiquidityVestingInfo = getLiquidityVestingInfoParams(
    partnerVestingPercentage,
    partnerBpsPerPeriod,
    partnerNumberOfPeriods,
    partnerCliffDurationFromMigrationTime,
    partnerTotalDuration
  );
  const creatorVestingParams = _nullishCoalesce(creatorLiquidityVestingInfoParams, () => ( DEFAULT_LIQUIDITY_VESTING_INFO_PARAMS));
  const {
    vestingPercentage: creatorVestingPercentage,
    bpsPerPeriod: creatorBpsPerPeriod,
    numberOfPeriods: creatorNumberOfPeriods,
    cliffDurationFromMigrationTime: creatorCliffDurationFromMigrationTime,
    totalDuration: creatorTotalDuration
  } = creatorVestingParams;
  const creatorLiquidityVestingInfo = getLiquidityVestingInfoParams(
    creatorVestingPercentage,
    creatorBpsPerPeriod,
    creatorNumberOfPeriods,
    creatorCliffDurationFromMigrationTime,
    creatorTotalDuration
  );
  const poolCreationFeeInLamports = convertToLamports(
    poolCreationFee,
    9 /* NINE */
  );
  const migratedPoolFeeResult = getMigratedPoolFeeParams(
    migrationOption,
    migrationFeeOption,
    migratedPoolFee,
    baseFeeParams
  );
  const pMin = sqrtPrices[0];
  const pMax = sqrtPrices[sqrtPrices.length - 1];
  const totalSupply = convertToLamports(totalTokenSupply, tokenBaseDecimal);
  const totalLeftover = convertToLamports(leftover, tokenBaseDecimal);
  const totalVestingAmount = getTotalVestingAmount(lockedVestingParams);
  const totalSwapAndMigrationAmount = totalSupply.sub(totalVestingAmount).sub(totalLeftover);
  let sumFactor = new (0, _decimaljs2.default)(0);
  const pmaxWeight = new (0, _decimaljs2.default)(pMax.toString());
  const migrationFeeFactor = new (0, _decimaljs2.default)(100).sub(new (0, _decimaljs2.default)(migrationFee.feePercentage)).div(new (0, _decimaljs2.default)(100));
  const numSegments = sqrtPrices.length - 1;
  for (let i = 0; i < numSegments; i++) {
    const pi = new (0, _decimaljs2.default)(sqrtPrices[i + 1].toString());
    const piMinus = new (0, _decimaljs2.default)(sqrtPrices[i].toString());
    const k = new (0, _decimaljs2.default)(liquidityWeights[i]);
    const w1 = pi.sub(piMinus).div(pi.mul(piMinus));
    const w2 = pi.sub(piMinus).mul(migrationFeeFactor).div(pmaxWeight.mul(pmaxWeight));
    const weight = k.mul(w1.add(w2));
    sumFactor = sumFactor.add(weight);
  }
  const l1 = new (0, _decimaljs2.default)(totalSwapAndMigrationAmount.toString()).div(
    sumFactor
  );
  const curve = [];
  for (let i = 0; i < numSegments; i++) {
    const k = new (0, _decimaljs2.default)(liquidityWeights[i]);
    const liquidity = convertDecimalToBN(l1.mul(k));
    const sqrtPrice = sqrtPrices[i + 1];
    curve.push({
      sqrtPrice,
      liquidity
    });
  }
  const swapBaseAmount = getBaseTokenForSwap(pMin, pMax, curve);
  const swapBaseAmountBuffer = getSwapAmountWithBuffer(
    swapBaseAmount,
    pMin,
    curve
  );
  const migrationAmount = totalSwapAndMigrationAmount.sub(swapBaseAmountBuffer);
  const migrationQuoteAmount = migrationAmount.mul(pMax).mul(pMax).shrn(128);
  const migrationQuoteThreshold = getMigrationQuoteThresholdFromMigrationQuoteAmount(
    new (0, _decimaljs2.default)(migrationQuoteAmount.toString()),
    new (0, _decimaljs2.default)(migrationFee.feePercentage)
  );
  const migrationQuoteThresholdInLamport = fromDecimalToBN(
    migrationQuoteThreshold
  );
  const totalDynamicSupply = getTotalSupplyFromCurve(
    migrationQuoteThresholdInLamport,
    pMin,
    curve,
    lockedVestingParams,
    migrationOption,
    totalLeftover,
    migrationFee.feePercentage
  );
  if (totalDynamicSupply.gt(totalSupply)) {
    const leftOverDelta = totalDynamicSupply.sub(totalSupply);
    if (!leftOverDelta.lt(totalLeftover)) {
      throw new Error("leftOverDelta must be less than totalLeftover");
    }
  }
  const instructionParams = {
    poolFees: {
      baseFee: {
        ...baseFee
      },
      dynamicFee: dynamicFeeEnabled ? getDynamicFeeParams(
        baseFeeParams.baseFeeMode === 2 /* RateLimiter */ ? baseFeeParams.rateLimiterParam.baseFeeBps : baseFeeParams.feeSchedulerParam.endingFeeBps
      ) : null
    },
    activationType,
    collectFeeMode,
    migrationOption,
    tokenType,
    tokenDecimal: tokenBaseDecimal,
    migrationQuoteThreshold: migrationQuoteThresholdInLamport,
    partnerLiquidityPercentage,
    partnerPermanentLockedLiquidityPercentage,
    creatorLiquidityPercentage,
    creatorPermanentLockedLiquidityPercentage,
    sqrtStartPrice: pMin,
    lockedVesting: lockedVestingParams,
    migrationFeeOption: migratedPoolFeeResult.migrationFeeOption,
    tokenSupply: {
      preMigrationTokenSupply: totalSupply,
      postMigrationTokenSupply: totalSupply
    },
    creatorTradingFeePercentage,
    migratedPoolFee: migratedPoolFeeResult.migratedPoolFee,
    poolCreationFee: poolCreationFeeInLamports,
    partnerLiquidityVestingInfo,
    creatorLiquidityVestingInfo,
    migratedPoolBaseFeeMode: migratedPoolFeeResult.migratedPoolBaseFeeMode,
    migratedPoolMarketCapFeeSchedulerParams: migratedPoolFeeResult.migratedPoolMarketCapFeeSchedulerParams,
    enableFirstSwapWithMinFee,
    compoundingFeeBps: migratedPoolFeeResult.compoundingFeeBps,
    padding: [],
    curve,
    migrationFee,
    tokenUpdateAuthority: tokenAuthorityOption
  };
  return instructionParams;
}

// src/helpers/createProgram.ts
var _anchor = require('@coral-xyz/anchor');

// src/idl/dynamic-bonding-curve/idl.json
var idl_default = {
  address: "dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN",
  metadata: {
    name: "dynamic_bonding_curve",
    version: "0.2.1",
    spec: "0.1.0",
    description: "Created with Anchor"
  },
  instructions: [
    {
      name: "claim_creator_trading_fee",
      docs: [
        "Accepts: VirtualPool only."
      ],
      discriminator: [
        82,
        220,
        250,
        189,
        3,
        85,
        107,
        45
      ],
      accounts: [
        {
          name: "pool_authority",
          address: "FhVo3mqL8PW5pH5U2CN4XE33DokiyZnUwuGpH2hmHLuM"
        },
        {
          name: "pool",
          writable: true
        },
        {
          name: "token_a_account",
          docs: [
            "The treasury token a account"
          ],
          writable: true
        },
        {
          name: "token_b_account",
          docs: [
            "The treasury token b account"
          ],
          writable: true
        },
        {
          name: "base_vault",
          docs: [
            "The vault token account for input token"
          ],
          writable: true
        },
        {
          name: "quote_vault",
          docs: [
            "The vault token account for output token"
          ],
          writable: true
        },
        {
          name: "base_mint",
          docs: [
            "The mint of token a"
          ]
        },
        {
          name: "quote_mint",
          docs: [
            "The mint of token b"
          ]
        },
        {
          name: "creator",
          signer: true
        },
        {
          name: "token_base_program",
          docs: [
            "Token a program"
          ]
        },
        {
          name: "token_quote_program",
          docs: [
            "Token b program"
          ]
        },
        {
          name: "event_authority"
        },
        {
          name: "program"
        }
      ],
      args: [
        {
          name: "max_base_amount",
          type: "u64"
        },
        {
          name: "max_quote_amount",
          type: "u64"
        }
      ]
    },
    {
      name: "claim_creator_trading_fee2",
      docs: [
        "Accepts: VirtualPool or TransferHookPool."
      ],
      discriminator: [
        238,
        247,
        213,
        94,
        110,
        145,
        88,
        142
      ],
      accounts: [
        {
          name: "pool_authority",
          address: "FhVo3mqL8PW5pH5U2CN4XE33DokiyZnUwuGpH2hmHLuM"
        },
        {
          name: "pool",
          writable: true
        },
        {
          name: "token_a_account",
          docs: [
            "The treasury token a account"
          ],
          writable: true
        },
        {
          name: "token_b_account",
          docs: [
            "The treasury token b account"
          ],
          writable: true
        },
        {
          name: "base_vault",
          docs: [
            "The vault token account for input token"
          ],
          writable: true
        },
        {
          name: "quote_vault",
          docs: [
            "The vault token account for output token"
          ],
          writable: true
        },
        {
          name: "base_mint",
          docs: [
            "The mint of token a"
          ]
        },
        {
          name: "quote_mint",
          docs: [
            "The mint of token b"
          ]
        },
        {
          name: "creator",
          signer: true
        },
        {
          name: "token_base_program",
          docs: [
            "Token a program"
          ]
        },
        {
          name: "token_quote_program",
          docs: [
            "Token b program"
          ]
        },
        {
          name: "event_authority"
        },
        {
          name: "program"
        }
      ],
      args: [
        {
          name: "max_base_amount",
          type: "u64"
        },
        {
          name: "max_quote_amount",
          type: "u64"
        },
        {
          name: "transfer_hook_accounts_info",
          type: {
            defined: {
              name: "TransferHookAccountsInfo"
            }
          }
        }
      ]
    },
    {
      name: "claim_partner_pool_creation_fee",
      docs: [
        "Accepts: VirtualPool or TransferHookPool."
      ],
      discriminator: [
        250,
        238,
        26,
        4,
        139,
        10,
        101,
        248
      ],
      accounts: [
        {
          name: "config"
        },
        {
          name: "pool",
          writable: true
        },
        {
          name: "fee_claimer",
          signer: true
        },
        {
          name: "fee_receiver",
          writable: true
        },
        {
          name: "event_authority"
        },
        {
          name: "program"
        }
      ],
      args: []
    },
    {
      name: "claim_protocol_fee2",
      docs: [
        "Accepts: VirtualPool or TransferHookPool."
      ],
      discriminator: [
        235,
        194,
        54,
        69,
        65,
        10,
        236,
        112
      ],
      accounts: [
        {
          name: "receiver_token_account",
          docs: [
            "receiver token account for the claimed token. validated through the protocol_fee program"
          ],
          writable: true
        },
        {
          name: "base_mint"
        },
        {
          name: "quote_mint"
        },
        {
          name: "token_base_program"
        },
        {
          name: "token_quote_program"
        },
        {
          name: "config"
        },
        {
          name: "pool",
          writable: true
        },
        {
          name: "base_vault",
          writable: true
        },
        {
          name: "quote_vault",
          writable: true
        },
        {
          name: "pool_authority",
          address: "FhVo3mqL8PW5pH5U2CN4XE33DokiyZnUwuGpH2hmHLuM"
        },
        {
          name: "signer",
          signer: true,
          address: "FkU5rQCWQM131skHCpcEbK8P1JrQGsBgqXe55w525SSF"
        }
      ],
      args: [
        {
          name: "max_amount",
          type: "u64"
        }
      ]
    },
    {
      name: "claim_protocol_pool_creation_fee",
      docs: [
        "Accepts: VirtualPool or TransferHookPool."
      ],
      discriminator: [
        114,
        205,
        83,
        188,
        240,
        153,
        25,
        54
      ],
      accounts: [
        {
          name: "config"
        },
        {
          name: "pool",
          writable: true
        },
        {
          name: "operator"
        },
        {
          name: "signer",
          docs: [
            "Operator"
          ],
          signer: true
        },
        {
          name: "treasury",
          writable: true,
          address: "6aYhxiNGmG8AyU25rh2R7iFu4pBrqnQHpNUGhmsEXRcm"
        },
        {
          name: "event_authority"
        },
        {
          name: "program"
        }
      ],
      args: []
    },
    {
      name: "claim_trading_fee",
      docs: [
        "Accepts: VirtualPool only."
      ],
      discriminator: [
        8,
        236,
        89,
        49,
        152,
        125,
        177,
        81
      ],
      accounts: [
        {
          name: "pool_authority",
          address: "FhVo3mqL8PW5pH5U2CN4XE33DokiyZnUwuGpH2hmHLuM"
        },
        {
          name: "config"
        },
        {
          name: "pool",
          writable: true
        },
        {
          name: "token_a_account",
          docs: [
            "The treasury token a account"
          ],
          writable: true
        },
        {
          name: "token_b_account",
          docs: [
            "The treasury token b account"
          ],
          writable: true
        },
        {
          name: "base_vault",
          docs: [
            "The vault token account for input token"
          ],
          writable: true
        },
        {
          name: "quote_vault",
          docs: [
            "The vault token account for output token"
          ],
          writable: true
        },
        {
          name: "base_mint",
          docs: [
            "The mint of token a"
          ]
        },
        {
          name: "quote_mint",
          docs: [
            "The mint of token b"
          ]
        },
        {
          name: "fee_claimer",
          signer: true
        },
        {
          name: "token_base_program",
          docs: [
            "Token a program"
          ]
        },
        {
          name: "token_quote_program",
          docs: [
            "Token b program"
          ]
        },
        {
          name: "event_authority"
        },
        {
          name: "program"
        }
      ],
      args: [
        {
          name: "max_amount_a",
          type: "u64"
        },
        {
          name: "max_amount_b",
          type: "u64"
        }
      ]
    },
    {
      name: "claim_trading_fee2",
      docs: [
        "Accepts: VirtualPool or TransferHookPool."
      ],
      discriminator: [
        84,
        191,
        71,
        50,
        9,
        162,
        55,
        193
      ],
      accounts: [
        {
          name: "pool_authority",
          address: "FhVo3mqL8PW5pH5U2CN4XE33DokiyZnUwuGpH2hmHLuM"
        },
        {
          name: "config"
        },
        {
          name: "pool",
          writable: true
        },
        {
          name: "token_a_account",
          docs: [
            "The treasury token a account"
          ],
          writable: true
        },
        {
          name: "token_b_account",
          docs: [
            "The treasury token b account"
          ],
          writable: true
        },
        {
          name: "base_vault",
          docs: [
            "The vault token account for input token"
          ],
          writable: true
        },
        {
          name: "quote_vault",
          docs: [
            "The vault token account for output token"
          ],
          writable: true
        },
        {
          name: "base_mint",
          docs: [
            "The mint of token a"
          ]
        },
        {
          name: "quote_mint",
          docs: [
            "The mint of token b"
          ]
        },
        {
          name: "fee_claimer",
          signer: true
        },
        {
          name: "token_base_program",
          docs: [
            "Token a program"
          ]
        },
        {
          name: "token_quote_program",
          docs: [
            "Token b program"
          ]
        },
        {
          name: "event_authority"
        },
        {
          name: "program"
        }
      ],
      args: [
        {
          name: "max_amount_a",
          type: "u64"
        },
        {
          name: "max_amount_b",
          type: "u64"
        },
        {
          name: "transfer_hook_accounts_info",
          type: {
            defined: {
              name: "TransferHookAccountsInfo"
            }
          }
        }
      ]
    },
    {
      name: "close_claim_protocol_fee_operator",
      discriminator: [
        8,
        41,
        87,
        35,
        80,
        48,
        121,
        26
      ],
      accounts: [
        {
          name: "claim_fee_operator",
          writable: true
        },
        {
          name: "rent_receiver",
          writable: true
        },
        {
          name: "signer",
          signer: true
        },
        {
          name: "event_authority"
        },
        {
          name: "program"
        }
      ],
      args: []
    },
    {
      name: "close_operator_account",
      discriminator: [
        171,
        9,
        213,
        74,
        120,
        23,
        3,
        29
      ],
      accounts: [
        {
          name: "operator",
          writable: true
        },
        {
          name: "signer",
          signer: true
        },
        {
          name: "rent_receiver",
          writable: true
        }
      ],
      args: []
    },
    {
      name: "close_token_badge",
      discriminator: [
        108,
        146,
        86,
        110,
        179,
        254,
        10,
        104
      ],
      accounts: [
        {
          name: "token_badge",
          writable: true
        },
        {
          name: "operator"
        },
        {
          name: "signer",
          signer: true
        },
        {
          name: "rent_receiver",
          writable: true
        },
        {
          name: "event_authority"
        },
        {
          name: "program"
        }
      ],
      args: []
    },
    {
      name: "create_config",
      discriminator: [
        201,
        207,
        243,
        114,
        75,
        111,
        47,
        189
      ],
      accounts: [
        {
          name: "config",
          writable: true,
          signer: true
        },
        {
          name: "fee_claimer"
        },
        {
          name: "leftover_receiver"
        },
        {
          name: "quote_mint",
          docs: [
            "quote mint"
          ]
        },
        {
          name: "payer",
          writable: true,
          signer: true
        },
        {
          name: "system_program",
          address: "11111111111111111111111111111111"
        },
        {
          name: "event_authority"
        },
        {
          name: "program"
        }
      ],
      args: [
        {
          name: "config_parameters",
          type: {
            defined: {
              name: "ConfigParameters"
            }
          }
        }
      ]
    },
    {
      name: "create_config_with_transfer_hook",
      discriminator: [
        216,
        37,
        1,
        57,
        88,
        226,
        25,
        41
      ],
      accounts: [
        {
          name: "config",
          writable: true,
          signer: true
        },
        {
          name: "fee_claimer"
        },
        {
          name: "leftover_receiver"
        },
        {
          name: "quote_mint",
          docs: [
            "quote mint"
          ]
        },
        {
          name: "transfer_hook_program"
        },
        {
          name: "payer",
          writable: true,
          signer: true
        },
        {
          name: "system_program",
          address: "11111111111111111111111111111111"
        },
        {
          name: "event_authority"
        },
        {
          name: "program"
        }
      ],
      args: [
        {
          name: "config_parameters",
          type: {
            defined: {
              name: "ConfigParameters"
            }
          }
        }
      ]
    },
    {
      name: "create_locker",
      docs: [
        "PERMISSIONLESS FUNCTIONS ///",
        "create locker",
        "Accepts: VirtualPool or TransferHookPool."
      ],
      discriminator: [
        167,
        90,
        137,
        154,
        75,
        47,
        17,
        84
      ],
      accounts: [
        {
          name: "virtual_pool",
          writable: true
        },
        {
          name: "config"
        },
        {
          name: "pool_authority",
          writable: true,
          address: "FhVo3mqL8PW5pH5U2CN4XE33DokiyZnUwuGpH2hmHLuM"
        },
        {
          name: "base_vault",
          writable: true
        },
        {
          name: "base_mint",
          writable: true
        },
        {
          name: "base",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  98,
                  97,
                  115,
                  101,
                  95,
                  108,
                  111,
                  99,
                  107,
                  101,
                  114
                ]
              },
              {
                kind: "account",
                path: "virtual_pool"
              }
            ]
          }
        },
        {
          name: "creator"
        },
        {
          name: "escrow",
          writable: true
        },
        {
          name: "escrow_token",
          writable: true
        },
        {
          name: "payer",
          writable: true,
          signer: true
        },
        {
          name: "token_program"
        },
        {
          name: "locker_program",
          address: "LocpQgucEQHbqNABEYvBvwoxCPsSbG91A1QaQhQQqjn"
        },
        {
          name: "locker_event_authority"
        },
        {
          name: "system_program",
          docs: [
            "System program."
          ],
          address: "11111111111111111111111111111111"
        }
      ],
      args: []
    },
    {
      name: "create_operator_account",
      discriminator: [
        221,
        64,
        246,
        149,
        240,
        153,
        229,
        163
      ],
      accounts: [
        {
          name: "operator",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  111,
                  112,
                  101,
                  114,
                  97,
                  116,
                  111,
                  114
                ]
              },
              {
                kind: "account",
                path: "whitelisted_address"
              }
            ]
          }
        },
        {
          name: "whitelisted_address"
        },
        {
          name: "signer",
          signer: true
        },
        {
          name: "payer",
          writable: true,
          signer: true
        },
        {
          name: "system_program",
          address: "11111111111111111111111111111111"
        },
        {
          name: "event_authority"
        },
        {
          name: "program"
        }
      ],
      args: [
        {
          name: "permission",
          type: "u128"
        }
      ]
    },
    {
      name: "create_partner_metadata",
      docs: [
        "PARTNER FUNCTIONS ///"
      ],
      discriminator: [
        192,
        168,
        234,
        191,
        188,
        226,
        227,
        255
      ],
      accounts: [
        {
          name: "partner_metadata",
          docs: [
            "Partner metadata"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  97,
                  114,
                  116,
                  110,
                  101,
                  114,
                  95,
                  109,
                  101,
                  116,
                  97,
                  100,
                  97,
                  116,
                  97
                ]
              },
              {
                kind: "account",
                path: "fee_claimer"
              }
            ]
          }
        },
        {
          name: "payer",
          docs: [
            "Payer of the partner metadata."
          ],
          writable: true,
          signer: true
        },
        {
          name: "fee_claimer",
          docs: [
            "Fee claimer for partner"
          ],
          signer: true
        },
        {
          name: "system_program",
          docs: [
            "System program."
          ],
          address: "11111111111111111111111111111111"
        },
        {
          name: "event_authority"
        },
        {
          name: "program"
        }
      ],
      args: [
        {
          name: "metadata",
          type: {
            defined: {
              name: "CreatePartnerMetadataParameters"
            }
          }
        }
      ]
    },
    {
      name: "create_token_badge",
      discriminator: [
        88,
        206,
        0,
        91,
        60,
        175,
        151,
        118
      ],
      accounts: [
        {
          name: "token_badge",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  98,
                  97,
                  100,
                  103,
                  101
                ]
              },
              {
                kind: "account",
                path: "token_mint"
              }
            ]
          }
        },
        {
          name: "token_mint"
        },
        {
          name: "operator"
        },
        {
          name: "signer",
          docs: [
            "Operator"
          ],
          signer: true
        },
        {
          name: "payer",
          writable: true,
          signer: true
        },
        {
          name: "system_program",
          address: "11111111111111111111111111111111"
        },
        {
          name: "event_authority"
        },
        {
          name: "program"
        }
      ],
      args: []
    },
    {
      name: "create_virtual_pool_metadata",
      docs: [
        "Accepts: VirtualPool or TransferHookPool."
      ],
      discriminator: [
        45,
        97,
        187,
        103,
        254,
        109,
        124,
        134
      ],
      accounts: [
        {
          name: "virtual_pool"
        },
        {
          name: "virtual_pool_metadata",
          docs: [
            "Virtual pool metadata"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  118,
                  105,
                  114,
                  116,
                  117,
                  97,
                  108,
                  95,
                  112,
                  111,
                  111,
                  108,
                  95,
                  109,
                  101,
                  116,
                  97,
                  100,
                  97,
                  116,
                  97
                ]
              },
              {
                kind: "account",
                path: "virtual_pool"
              }
            ]
          }
        },
        {
          name: "creator",
          signer: true
        },
        {
          name: "payer",
          docs: [
            "Payer of the virtual pool metadata."
          ],
          writable: true,
          signer: true
        },
        {
          name: "system_program",
          docs: [
            "System program."
          ],
          address: "11111111111111111111111111111111"
        },
        {
          name: "event_authority"
        },
        {
          name: "program"
        }
      ],
      args: [
        {
          name: "metadata",
          type: {
            defined: {
              name: "CreateVirtualPoolMetadataParameters"
            }
          }
        }
      ]
    },
    {
      name: "creator_withdraw_surplus",
      docs: [
        "Accepts: VirtualPool or TransferHookPool."
      ],
      discriminator: [
        165,
        3,
        137,
        7,
        28,
        134,
        76,
        80
      ],
      accounts: [
        {
          name: "pool_authority",
          address: "FhVo3mqL8PW5pH5U2CN4XE33DokiyZnUwuGpH2hmHLuM"
        },
        {
          name: "config"
        },
        {
          name: "virtual_pool",
          writable: true
        },
        {
          name: "token_quote_account",
          docs: [
            "The receiver token account"
          ],
          writable: true
        },
        {
          name: "quote_vault",
          docs: [
            "The vault token account for output token"
          ],
          writable: true
        },
        {
          name: "quote_mint",
          docs: [
            "The mint of quote token"
          ]
        },
        {
          name: "creator",
          signer: true
        },
        {
          name: "token_quote_program",
          docs: [
            "Token b program"
          ]
        },
        {
          name: "event_authority"
        },
        {
          name: "program"
        }
      ],
      args: []
    },
    {
      name: "initialize_virtual_pool_with_spl_token",
      docs: [
        "POOL CREATOR FUNCTIONS ////",
        "Accepts: VirtualPool only."
      ],
      discriminator: [
        140,
        85,
        215,
        176,
        102,
        54,
        104,
        79
      ],
      accounts: [
        {
          name: "config",
          docs: [
            "Which config the pool belongs to."
          ]
        },
        {
          name: "pool_authority",
          address: "FhVo3mqL8PW5pH5U2CN4XE33DokiyZnUwuGpH2hmHLuM"
        },
        {
          name: "creator",
          signer: true
        },
        {
          name: "base_mint",
          writable: true,
          signer: true
        },
        {
          name: "quote_mint",
          relations: [
            "config"
          ]
        },
        {
          name: "pool",
          docs: [
            "Initialize an account to store the pool state"
          ],
          writable: true
        },
        {
          name: "base_vault",
          docs: [
            "Token a vault for the pool"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                kind: "account",
                path: "base_mint"
              },
              {
                kind: "account",
                path: "pool"
              }
            ]
          }
        },
        {
          name: "quote_vault",
          docs: [
            "Token b vault for the pool"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                kind: "account",
                path: "quote_mint"
              },
              {
                kind: "account",
                path: "pool"
              }
            ]
          }
        },
        {
          name: "mint_metadata",
          writable: true
        },
        {
          name: "metadata_program",
          address: "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
        },
        {
          name: "payer",
          docs: [
            "Address paying to create the pool. Can be anyone"
          ],
          writable: true,
          signer: true
        },
        {
          name: "token_quote_program",
          docs: [
            "Program to create mint account and mint tokens"
          ]
        },
        {
          name: "token_program",
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          name: "system_program",
          address: "11111111111111111111111111111111"
        },
        {
          name: "event_authority"
        },
        {
          name: "program"
        }
      ],
      args: [
        {
          name: "params",
          type: {
            defined: {
              name: "InitializePoolParameters"
            }
          }
        }
      ]
    },
    {
      name: "initialize_virtual_pool_with_token2022",
      docs: [
        "Accepts: VirtualPool only."
      ],
      discriminator: [
        169,
        118,
        51,
        78,
        145,
        110,
        220,
        155
      ],
      accounts: [
        {
          name: "config",
          docs: [
            "Which config the pool belongs to."
          ]
        },
        {
          name: "pool_authority",
          address: "FhVo3mqL8PW5pH5U2CN4XE33DokiyZnUwuGpH2hmHLuM"
        },
        {
          name: "creator",
          signer: true
        },
        {
          name: "base_mint",
          docs: [
            "Unique token mint address, initialize in contract"
          ],
          writable: true,
          signer: true
        },
        {
          name: "quote_mint",
          relations: [
            "config"
          ]
        },
        {
          name: "pool",
          docs: [
            "Initialize an account to store the pool state"
          ],
          writable: true
        },
        {
          name: "base_vault",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                kind: "account",
                path: "base_mint"
              },
              {
                kind: "account",
                path: "pool"
              }
            ]
          }
        },
        {
          name: "quote_vault",
          docs: [
            "Token quote vault for the pool"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                kind: "account",
                path: "quote_mint"
              },
              {
                kind: "account",
                path: "pool"
              }
            ]
          }
        },
        {
          name: "payer",
          docs: [
            "Address paying to create the pool. Can be anyone"
          ],
          writable: true,
          signer: true
        },
        {
          name: "token_quote_program",
          docs: [
            "Program to create mint account and mint tokens"
          ]
        },
        {
          name: "token_program",
          docs: [
            "token program for base mint"
          ],
          address: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          name: "system_program",
          address: "11111111111111111111111111111111"
        },
        {
          name: "event_authority"
        },
        {
          name: "program"
        }
      ],
      args: [
        {
          name: "params",
          type: {
            defined: {
              name: "InitializePoolParameters"
            }
          }
        }
      ]
    },
    {
      name: "initialize_virtual_pool_with_token2022_transfer_hook",
      docs: [
        "Accepts: TransferHookPool only."
      ],
      discriminator: [
        182,
        13,
        233,
        177,
        42,
        145,
        135,
        2
      ],
      accounts: [
        {
          name: "config",
          docs: [
            "Transfer hook config \u2014 contains the transfer hook program set by partner"
          ]
        },
        {
          name: "pool_authority",
          address: "FhVo3mqL8PW5pH5U2CN4XE33DokiyZnUwuGpH2hmHLuM"
        },
        {
          name: "creator",
          signer: true
        },
        {
          name: "base_mint",
          docs: [
            "Unique token mint address, initialize in contract"
          ],
          writable: true,
          signer: true
        },
        {
          name: "quote_mint",
          relations: [
            "config"
          ]
        },
        {
          name: "pool",
          writable: true
        },
        {
          name: "base_vault",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                kind: "account",
                path: "base_mint"
              },
              {
                kind: "account",
                path: "pool"
              }
            ]
          }
        },
        {
          name: "quote_vault",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                kind: "account",
                path: "quote_mint"
              },
              {
                kind: "account",
                path: "pool"
              }
            ]
          }
        },
        {
          name: "transfer_hook_program"
        },
        {
          name: "payer",
          writable: true,
          signer: true
        },
        {
          name: "token_quote_program"
        },
        {
          name: "token_program",
          address: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          name: "system_program",
          address: "11111111111111111111111111111111"
        },
        {
          name: "event_authority"
        },
        {
          name: "program"
        }
      ],
      args: [
        {
          name: "params",
          type: {
            defined: {
              name: "InitializePoolParameters"
            }
          }
        }
      ]
    },
    {
      name: "migrate_meteora_damm",
      docs: [
        "Accepts: VirtualPool only."
      ],
      discriminator: [
        27,
        1,
        48,
        22,
        180,
        63,
        118,
        217
      ],
      accounts: [
        {
          name: "virtual_pool",
          docs: [
            "virtual pool"
          ],
          writable: true,
          relations: [
            "migration_metadata"
          ]
        },
        {
          name: "migration_metadata",
          writable: true
        },
        {
          name: "config",
          relations: [
            "virtual_pool"
          ]
        },
        {
          name: "pool_authority",
          writable: true,
          address: "FhVo3mqL8PW5pH5U2CN4XE33DokiyZnUwuGpH2hmHLuM"
        },
        {
          name: "pool",
          writable: true
        },
        {
          name: "damm_config",
          docs: [
            "pool config"
          ]
        },
        {
          name: "lp_mint",
          writable: true
        },
        {
          name: "token_a_mint",
          writable: true
        },
        {
          name: "token_b_mint"
        },
        {
          name: "a_vault",
          writable: true
        },
        {
          name: "b_vault",
          writable: true
        },
        {
          name: "a_token_vault",
          writable: true
        },
        {
          name: "b_token_vault",
          writable: true
        },
        {
          name: "a_vault_lp_mint",
          writable: true
        },
        {
          name: "b_vault_lp_mint",
          writable: true
        },
        {
          name: "a_vault_lp",
          writable: true
        },
        {
          name: "b_vault_lp",
          writable: true
        },
        {
          name: "base_vault",
          writable: true,
          relations: [
            "virtual_pool"
          ]
        },
        {
          name: "quote_vault",
          writable: true,
          relations: [
            "virtual_pool"
          ]
        },
        {
          name: "virtual_pool_lp",
          writable: true
        },
        {
          name: "protocol_token_a_fee",
          writable: true
        },
        {
          name: "protocol_token_b_fee",
          writable: true
        },
        {
          name: "payer",
          writable: true,
          signer: true
        },
        {
          name: "rent"
        },
        {
          name: "mint_metadata",
          writable: true
        },
        {
          name: "metadata_program"
        },
        {
          name: "amm_program",
          address: "Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB"
        },
        {
          name: "vault_program"
        },
        {
          name: "token_program",
          docs: [
            "token_program"
          ],
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          name: "associated_token_program"
        },
        {
          name: "system_program",
          docs: [
            "System program."
          ],
          address: "11111111111111111111111111111111"
        }
      ],
      args: []
    },
    {
      name: "migrate_meteora_damm_claim_lp_token",
      docs: [
        "Accepts: VirtualPool only."
      ],
      discriminator: [
        139,
        133,
        2,
        30,
        91,
        145,
        127,
        154
      ],
      accounts: [
        {
          name: "virtual_pool",
          relations: [
            "migration_metadata"
          ]
        },
        {
          name: "migration_metadata",
          docs: [
            "migration metadata"
          ],
          writable: true
        },
        {
          name: "pool_authority",
          writable: true,
          address: "FhVo3mqL8PW5pH5U2CN4XE33DokiyZnUwuGpH2hmHLuM"
        },
        {
          name: "lp_mint",
          relations: [
            "migration_metadata"
          ]
        },
        {
          name: "source_token",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "account",
                path: "pool_authority"
              },
              {
                kind: "const",
                value: [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                kind: "account",
                path: "migration_metadata"
              }
            ],
            program: {
              kind: "const",
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          name: "destination_token",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "account",
                path: "owner"
              },
              {
                kind: "const",
                value: [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                kind: "account",
                path: "migration_metadata"
              }
            ],
            program: {
              kind: "const",
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          name: "owner"
        },
        {
          name: "sender",
          signer: true
        },
        {
          name: "token_program",
          docs: [
            "token_program"
          ],
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      args: []
    },
    {
      name: "migrate_meteora_damm_lock_lp_token",
      docs: [
        "Accepts: VirtualPool only."
      ],
      discriminator: [
        177,
        55,
        238,
        157,
        251,
        88,
        165,
        42
      ],
      accounts: [
        {
          name: "virtual_pool",
          relations: [
            "migration_metadata"
          ]
        },
        {
          name: "migration_metadata",
          docs: [
            "migration_metadata"
          ],
          writable: true
        },
        {
          name: "pool_authority",
          writable: true,
          address: "FhVo3mqL8PW5pH5U2CN4XE33DokiyZnUwuGpH2hmHLuM"
        },
        {
          name: "pool",
          writable: true,
          relations: [
            "lock_escrow"
          ]
        },
        {
          name: "lp_mint",
          relations: [
            "migration_metadata"
          ]
        },
        {
          name: "lock_escrow",
          writable: true
        },
        {
          name: "owner",
          relations: [
            "lock_escrow"
          ]
        },
        {
          name: "source_tokens",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "account",
                path: "pool_authority"
              },
              {
                kind: "const",
                value: [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                kind: "account",
                path: "migration_metadata"
              }
            ],
            program: {
              kind: "const",
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          name: "escrow_vault",
          writable: true
        },
        {
          name: "amm_program",
          address: "Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB"
        },
        {
          name: "a_vault"
        },
        {
          name: "b_vault"
        },
        {
          name: "a_vault_lp"
        },
        {
          name: "b_vault_lp"
        },
        {
          name: "a_vault_lp_mint"
        },
        {
          name: "b_vault_lp_mint"
        },
        {
          name: "token_program",
          docs: [
            "token_program"
          ],
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      args: []
    },
    {
      name: "migration_damm_v2",
      docs: [
        "Accepts: VirtualPool or TransferHookPool."
      ],
      discriminator: [
        156,
        169,
        230,
        103,
        53,
        228,
        80,
        64
      ],
      accounts: [
        {
          name: "virtual_pool",
          writable: true
        },
        {
          name: "migration_metadata"
        },
        {
          name: "config"
        },
        {
          name: "pool_authority",
          writable: true,
          address: "FhVo3mqL8PW5pH5U2CN4XE33DokiyZnUwuGpH2hmHLuM"
        },
        {
          name: "pool",
          writable: true
        },
        {
          name: "first_position_nft_mint",
          writable: true,
          signer: true
        },
        {
          name: "first_position_nft_account",
          writable: true
        },
        {
          name: "first_position",
          writable: true
        },
        {
          name: "second_position_nft_mint",
          writable: true,
          signer: true,
          optional: true
        },
        {
          name: "second_position_nft_account",
          writable: true,
          optional: true
        },
        {
          name: "second_position",
          writable: true,
          optional: true
        },
        {
          name: "damm_pool_authority"
        },
        {
          name: "amm_program",
          address: "cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG"
        },
        {
          name: "base_mint",
          writable: true
        },
        {
          name: "quote_mint",
          writable: true
        },
        {
          name: "token_a_vault",
          writable: true
        },
        {
          name: "token_b_vault",
          writable: true
        },
        {
          name: "base_vault",
          writable: true
        },
        {
          name: "quote_vault",
          writable: true
        },
        {
          name: "payer",
          writable: true,
          signer: true
        },
        {
          name: "token_base_program"
        },
        {
          name: "token_quote_program"
        },
        {
          name: "token_2022_program"
        },
        {
          name: "damm_event_authority"
        },
        {
          name: "system_program",
          docs: [
            "System program."
          ],
          address: "11111111111111111111111111111111"
        }
      ],
      args: []
    },
    {
      name: "migration_damm_v2_create_metadata",
      docs: [
        "Accepts: VirtualPool or TransferHookPool."
      ],
      discriminator: [
        109,
        189,
        19,
        36,
        195,
        183,
        222,
        82
      ],
      accounts: [
        {
          name: "virtual_pool"
        },
        {
          name: "config"
        },
        {
          name: "migration_metadata"
        },
        {
          name: "payer"
        },
        {
          name: "system_program"
        },
        {
          name: "event_authority"
        },
        {
          name: "program"
        }
      ],
      args: []
    },
    {
      name: "migration_meteora_damm_create_metadata",
      docs: [
        "Accepts: VirtualPool only."
      ],
      discriminator: [
        47,
        94,
        126,
        115,
        221,
        226,
        194,
        133
      ],
      accounts: [
        {
          name: "virtual_pool"
        },
        {
          name: "config",
          relations: [
            "virtual_pool"
          ]
        },
        {
          name: "migration_metadata",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  109,
                  101,
                  116,
                  101,
                  111,
                  114,
                  97
                ]
              },
              {
                kind: "account",
                path: "virtual_pool"
              }
            ]
          }
        },
        {
          name: "payer",
          writable: true,
          signer: true
        },
        {
          name: "system_program",
          address: "11111111111111111111111111111111"
        },
        {
          name: "event_authority"
        },
        {
          name: "program"
        }
      ],
      args: []
    },
    {
      name: "partner_withdraw_surplus",
      docs: [
        "Accepts: VirtualPool or TransferHookPool."
      ],
      discriminator: [
        168,
        173,
        72,
        100,
        201,
        98,
        38,
        92
      ],
      accounts: [
        {
          name: "pool_authority",
          address: "FhVo3mqL8PW5pH5U2CN4XE33DokiyZnUwuGpH2hmHLuM"
        },
        {
          name: "config"
        },
        {
          name: "virtual_pool",
          writable: true
        },
        {
          name: "token_quote_account",
          docs: [
            "The receiver token account"
          ],
          writable: true
        },
        {
          name: "quote_vault",
          docs: [
            "The vault token account for output token"
          ],
          writable: true
        },
        {
          name: "quote_mint",
          docs: [
            "The mint of quote token"
          ]
        },
        {
          name: "fee_claimer",
          signer: true
        },
        {
          name: "token_quote_program",
          docs: [
            "Token b program"
          ]
        },
        {
          name: "event_authority"
        },
        {
          name: "program"
        }
      ],
      args: []
    },
    {
      name: "swap",
      docs: [
        "TRADING BOTS FUNCTIONS ////",
        "Accepts: VirtualPool only."
      ],
      discriminator: [
        248,
        198,
        158,
        145,
        225,
        117,
        135,
        200
      ],
      accounts: [
        {
          name: "pool_authority",
          address: "FhVo3mqL8PW5pH5U2CN4XE33DokiyZnUwuGpH2hmHLuM"
        },
        {
          name: "config"
        },
        {
          name: "pool",
          writable: true
        },
        {
          name: "input_token_account",
          docs: [
            "The user token account for input token"
          ],
          writable: true
        },
        {
          name: "output_token_account",
          docs: [
            "The user token account for output token"
          ],
          writable: true
        },
        {
          name: "base_vault",
          docs: [
            "The vault token account for base token"
          ],
          writable: true
        },
        {
          name: "quote_vault",
          docs: [
            "The vault token account for quote token"
          ],
          writable: true
        },
        {
          name: "base_mint",
          docs: [
            "The mint of base token"
          ]
        },
        {
          name: "quote_mint",
          docs: [
            "The mint of quote token"
          ]
        },
        {
          name: "payer",
          docs: [
            "The user performing the swap"
          ],
          signer: true
        },
        {
          name: "token_base_program",
          docs: [
            "Token base program"
          ]
        },
        {
          name: "token_quote_program",
          docs: [
            "Token quote program"
          ]
        },
        {
          name: "referral_token_account",
          docs: [
            "referral token account"
          ],
          writable: true,
          optional: true
        },
        {
          name: "event_authority"
        },
        {
          name: "program"
        }
      ],
      args: [
        {
          name: "params",
          type: {
            defined: {
              name: "SwapParameters"
            }
          }
        }
      ]
    },
    {
      name: "swap2",
      docs: [
        "Accepts: VirtualPool only."
      ],
      discriminator: [
        65,
        75,
        63,
        76,
        235,
        91,
        91,
        136
      ],
      accounts: [
        {
          name: "pool_authority",
          address: "FhVo3mqL8PW5pH5U2CN4XE33DokiyZnUwuGpH2hmHLuM"
        },
        {
          name: "config"
        },
        {
          name: "pool",
          writable: true
        },
        {
          name: "input_token_account",
          docs: [
            "The user token account for input token"
          ],
          writable: true
        },
        {
          name: "output_token_account",
          docs: [
            "The user token account for output token"
          ],
          writable: true
        },
        {
          name: "base_vault",
          docs: [
            "The vault token account for base token"
          ],
          writable: true
        },
        {
          name: "quote_vault",
          docs: [
            "The vault token account for quote token"
          ],
          writable: true
        },
        {
          name: "base_mint",
          docs: [
            "The mint of base token"
          ]
        },
        {
          name: "quote_mint",
          docs: [
            "The mint of quote token"
          ]
        },
        {
          name: "payer",
          docs: [
            "The user performing the swap"
          ],
          signer: true
        },
        {
          name: "token_base_program",
          docs: [
            "Token base program"
          ]
        },
        {
          name: "token_quote_program",
          docs: [
            "Token quote program"
          ]
        },
        {
          name: "referral_token_account",
          docs: [
            "referral token account"
          ],
          writable: true,
          optional: true
        },
        {
          name: "event_authority"
        },
        {
          name: "program"
        }
      ],
      args: [
        {
          name: "params",
          type: {
            defined: {
              name: "SwapParameters2"
            }
          }
        }
      ]
    },
    {
      name: "swap2_with_transfer_hook",
      docs: [
        "Accepts: TransferHookPool only."
      ],
      discriminator: [
        183,
        93,
        153,
        40,
        24,
        230,
        194,
        151
      ],
      accounts: [
        {
          name: "pool_authority",
          address: "FhVo3mqL8PW5pH5U2CN4XE33DokiyZnUwuGpH2hmHLuM"
        },
        {
          name: "config"
        },
        {
          name: "pool",
          writable: true
        },
        {
          name: "input_token_account",
          docs: [
            "The user token account for input token"
          ],
          writable: true
        },
        {
          name: "output_token_account",
          docs: [
            "The user token account for output token"
          ],
          writable: true
        },
        {
          name: "base_vault",
          docs: [
            "The vault token account for base token"
          ],
          writable: true
        },
        {
          name: "quote_vault",
          docs: [
            "The vault token account for quote token"
          ],
          writable: true
        },
        {
          name: "base_mint",
          docs: [
            "The mint of base token",
            "must be mutable so we can revoke the transfer hook after the last swap is performed"
          ],
          writable: true
        },
        {
          name: "quote_mint",
          docs: [
            "The mint of quote token"
          ]
        },
        {
          name: "payer",
          docs: [
            "The user performing the swap"
          ],
          signer: true
        },
        {
          name: "token_base_program",
          docs: [
            "Token base program"
          ]
        },
        {
          name: "token_quote_program",
          docs: [
            "Token quote program"
          ]
        },
        {
          name: "referral_token_account",
          docs: [
            "referral token account"
          ],
          writable: true,
          optional: true
        },
        {
          name: "event_authority"
        },
        {
          name: "program"
        }
      ],
      args: [
        {
          name: "params",
          type: {
            defined: {
              name: "SwapParameters2"
            }
          }
        },
        {
          name: "transfer_hook_accounts_info",
          type: {
            defined: {
              name: "TransferHookAccountsInfo"
            }
          }
        }
      ]
    },
    {
      name: "transfer_pool_creator",
      docs: [
        "Accepts: VirtualPool or TransferHookPool."
      ],
      discriminator: [
        20,
        7,
        169,
        33,
        58,
        147,
        166,
        33
      ],
      accounts: [
        {
          name: "virtual_pool",
          writable: true
        },
        {
          name: "config"
        },
        {
          name: "creator",
          signer: true
        },
        {
          name: "new_creator"
        },
        {
          name: "event_authority"
        },
        {
          name: "program"
        }
      ],
      args: []
    },
    {
      name: "withdraw_leftover",
      docs: [
        "Accepts: VirtualPool or TransferHookPool."
      ],
      discriminator: [
        20,
        198,
        202,
        237,
        235,
        243,
        183,
        66
      ],
      accounts: [
        {
          name: "pool_authority",
          address: "FhVo3mqL8PW5pH5U2CN4XE33DokiyZnUwuGpH2hmHLuM"
        },
        {
          name: "config"
        },
        {
          name: "virtual_pool",
          writable: true
        },
        {
          name: "token_base_account",
          docs: [
            "The receiver token account, withdraw to ATA"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "account",
                path: "leftover_receiver"
              },
              {
                kind: "account",
                path: "token_base_program"
              },
              {
                kind: "account",
                path: "base_mint"
              }
            ],
            program: {
              kind: "const",
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          name: "base_vault",
          docs: [
            "The vault token account for output token"
          ],
          writable: true
        },
        {
          name: "base_mint",
          docs: [
            "The mint of quote token"
          ]
        },
        {
          name: "leftover_receiver"
        },
        {
          name: "token_base_program",
          docs: [
            "Token base program"
          ]
        },
        {
          name: "event_authority"
        },
        {
          name: "program"
        }
      ],
      args: []
    },
    {
      name: "withdraw_migration_fee",
      docs: [
        "BOTH partner and creator FUNCTIONS ///",
        "Accepts: VirtualPool or TransferHookPool."
      ],
      discriminator: [
        237,
        142,
        45,
        23,
        129,
        6,
        222,
        162
      ],
      accounts: [
        {
          name: "pool_authority",
          address: "FhVo3mqL8PW5pH5U2CN4XE33DokiyZnUwuGpH2hmHLuM"
        },
        {
          name: "config"
        },
        {
          name: "virtual_pool",
          writable: true
        },
        {
          name: "token_quote_account",
          docs: [
            "The receiver token account"
          ],
          writable: true
        },
        {
          name: "quote_vault",
          docs: [
            "The vault token account for output token"
          ],
          writable: true
        },
        {
          name: "quote_mint",
          docs: [
            "The mint of quote token"
          ]
        },
        {
          name: "sender",
          signer: true
        },
        {
          name: "token_quote_program",
          docs: [
            "Token b program"
          ]
        },
        {
          name: "event_authority"
        },
        {
          name: "program"
        }
      ],
      args: [
        {
          name: "flag",
          type: "u8"
        }
      ]
    }
  ],
  accounts: [
    {
      name: "ClaimFeeOperator",
      discriminator: [
        166,
        48,
        134,
        86,
        34,
        200,
        188,
        150
      ]
    },
    {
      name: "ConfigWithTransferHook",
      discriminator: [
        40,
        220,
        194,
        251,
        41,
        199,
        123,
        253
      ]
    },
    {
      name: "MeteoraDammMigrationMetadata",
      discriminator: [
        17,
        155,
        141,
        215,
        207,
        4,
        133,
        156
      ]
    },
    {
      name: "Operator",
      discriminator: [
        219,
        31,
        188,
        145,
        69,
        139,
        204,
        117
      ]
    },
    {
      name: "PartnerMetadata",
      discriminator: [
        68,
        68,
        130,
        19,
        16,
        209,
        98,
        156
      ]
    },
    {
      name: "PoolConfig",
      discriminator: [
        26,
        108,
        14,
        123,
        116,
        230,
        129,
        43
      ]
    },
    {
      name: "TokenBadge",
      discriminator: [
        116,
        219,
        204,
        229,
        249,
        116,
        255,
        150
      ]
    },
    {
      name: "TransferHookPool",
      discriminator: [
        237,
        219,
        184,
        23,
        42,
        189,
        169,
        35
      ]
    },
    {
      name: "VirtualPool",
      discriminator: [
        213,
        224,
        5,
        209,
        98,
        69,
        119,
        92
      ]
    },
    {
      name: "VirtualPoolMetadata",
      discriminator: [
        217,
        37,
        82,
        250,
        43,
        47,
        228,
        254
      ]
    }
  ],
  events: [
    {
      name: "EvtClaimCreatorTradingFee",
      discriminator: [
        154,
        228,
        215,
        202,
        133,
        155,
        214,
        138
      ]
    },
    {
      name: "EvtClaimPoolCreationFee",
      discriminator: [
        149,
        111,
        149,
        44,
        136,
        64,
        175,
        62
      ]
    },
    {
      name: "EvtClaimProtocolFee2",
      discriminator: [
        187,
        133,
        66,
        9,
        205,
        161,
        84,
        13
      ]
    },
    {
      name: "EvtClaimTradingFee",
      discriminator: [
        26,
        83,
        117,
        240,
        92,
        202,
        112,
        254
      ]
    },
    {
      name: "EvtCloseClaimFeeOperator",
      discriminator: [
        111,
        39,
        37,
        55,
        110,
        216,
        194,
        23
      ]
    },
    {
      name: "EvtCloseTokenBadge",
      discriminator: [
        60,
        217,
        34,
        82,
        183,
        10,
        89,
        188
      ]
    },
    {
      name: "EvtCreateClaimFeeOperator",
      discriminator: [
        21,
        6,
        153,
        120,
        68,
        116,
        28,
        177
      ]
    },
    {
      name: "EvtCreateConfig",
      discriminator: [
        131,
        207,
        180,
        174,
        180,
        73,
        165,
        54
      ]
    },
    {
      name: "EvtCreateConfigV2",
      discriminator: [
        163,
        74,
        66,
        187,
        119,
        195,
        26,
        144
      ]
    },
    {
      name: "EvtCreateConfigV2WithTransferHook",
      discriminator: [
        182,
        81,
        135,
        4,
        39,
        46,
        132,
        253
      ]
    },
    {
      name: "EvtCreateMeteoraMigrationMetadata",
      discriminator: [
        99,
        167,
        133,
        63,
        214,
        143,
        175,
        139
      ]
    },
    {
      name: "EvtCreateTokenBadge",
      discriminator: [
        141,
        120,
        134,
        116,
        34,
        28,
        114,
        160
      ]
    },
    {
      name: "EvtCreatorWithdrawSurplus",
      discriminator: [
        152,
        73,
        21,
        15,
        66,
        87,
        53,
        157
      ]
    },
    {
      name: "EvtCurveComplete",
      discriminator: [
        229,
        231,
        86,
        84,
        156,
        134,
        75,
        24
      ]
    },
    {
      name: "EvtCurveCompleteWithTransferHook",
      discriminator: [
        59,
        47,
        109,
        205,
        13,
        31,
        44,
        159
      ]
    },
    {
      name: "EvtInitializePool",
      discriminator: [
        228,
        50,
        246,
        85,
        203,
        66,
        134,
        37
      ]
    },
    {
      name: "EvtInitializePoolWithTransferHook",
      discriminator: [
        213,
        137,
        164,
        53,
        193,
        74,
        15,
        110
      ]
    },
    {
      name: "EvtPartnerClaimPoolCreationFee",
      discriminator: [
        174,
        223,
        44,
        150,
        145,
        98,
        89,
        195
      ]
    },
    {
      name: "EvtPartnerMetadata",
      discriminator: [
        200,
        127,
        6,
        55,
        13,
        32,
        8,
        150
      ]
    },
    {
      name: "EvtPartnerWithdrawSurplus",
      discriminator: [
        195,
        56,
        152,
        9,
        232,
        72,
        35,
        22
      ]
    },
    {
      name: "EvtSwap",
      discriminator: [
        27,
        60,
        21,
        213,
        138,
        170,
        187,
        147
      ]
    },
    {
      name: "EvtSwap2",
      discriminator: [
        189,
        66,
        51,
        168,
        38,
        80,
        117,
        153
      ]
    },
    {
      name: "EvtSwap2WithTransferHook",
      discriminator: [
        134,
        59,
        168,
        120,
        94,
        51,
        114,
        231
      ]
    },
    {
      name: "EvtUpdatePoolCreator",
      discriminator: [
        107,
        225,
        165,
        237,
        91,
        158,
        213,
        220
      ]
    },
    {
      name: "EvtVirtualPoolMetadata",
      discriminator: [
        188,
        18,
        72,
        76,
        195,
        91,
        38,
        74
      ]
    },
    {
      name: "EvtWithdrawLeftover",
      discriminator: [
        191,
        189,
        104,
        143,
        111,
        156,
        94,
        229
      ]
    },
    {
      name: "EvtWithdrawMigrationFee",
      discriminator: [
        26,
        203,
        84,
        85,
        161,
        23,
        100,
        214
      ]
    }
  ],
  errors: [
    {
      code: 6e3,
      name: "MathOverflow",
      msg: "Math operation overflow"
    },
    {
      code: 6001,
      name: "InvalidFee",
      msg: "Invalid fee setup"
    },
    {
      code: 6002,
      name: "ExceededSlippage",
      msg: "Exceeded slippage tolerance"
    },
    {
      code: 6003,
      name: "ExceedMaxFeeBps",
      msg: "Exceeded max fee bps"
    },
    {
      code: 6004,
      name: "InvalidAdmin",
      msg: "Invalid admin"
    },
    {
      code: 6005,
      name: "AmountIsZero",
      msg: "Amount is zero"
    },
    {
      code: 6006,
      name: "TypeCastFailed",
      msg: "Type cast error"
    },
    {
      code: 6007,
      name: "InvalidActivationType",
      msg: "Invalid activation type"
    },
    {
      code: 6008,
      name: "InvalidQuoteMint",
      msg: "Invalid quote mint"
    },
    {
      code: 6009,
      name: "InvalidCollectFeeMode",
      msg: "Invalid collect fee mode"
    },
    {
      code: 6010,
      name: "InvalidMigrationFeeOption",
      msg: "Invalid migration fee option"
    },
    {
      code: 6011,
      name: "InvalidInput",
      msg: "Invalid input"
    },
    {
      code: 6012,
      name: "NotEnoughLiquidity",
      msg: "Not enough liquidity"
    },
    {
      code: 6013,
      name: "PoolIsCompleted",
      msg: "Pool is completed"
    },
    {
      code: 6014,
      name: "PoolIsIncompleted",
      msg: "Pool is incompleted"
    },
    {
      code: 6015,
      name: "InvalidMigrationOption",
      msg: "Invalid migration option"
    },
    {
      code: 6016,
      name: "InvalidTokenDecimals",
      msg: "Invalid token decimals"
    },
    {
      code: 6017,
      name: "InvalidTokenType",
      msg: "Invalid token type"
    },
    {
      code: 6018,
      name: "InvalidFeePercentage",
      msg: "Invalid fee percentage"
    },
    {
      code: 6019,
      name: "InvalidQuoteThreshold",
      msg: "Invalid quote threshold"
    },
    {
      code: 6020,
      name: "InvalidTokenSupply",
      msg: "Invalid token supply"
    },
    {
      code: 6021,
      name: "InvalidCurve",
      msg: "Invalid curve"
    },
    {
      code: 6022,
      name: "NotPermitToDoThisAction",
      msg: "Not permit to do this action"
    },
    {
      code: 6023,
      name: "InvalidOwnerAccount",
      msg: "Invalid owner account"
    },
    {
      code: 6024,
      name: "InvalidConfigAccount",
      msg: "Invalid config account"
    },
    {
      code: 6025,
      name: "SurplusHasBeenWithdraw",
      msg: "Surplus has been withdraw"
    },
    {
      code: 6026,
      name: "LeftoverHasBeenWithdraw",
      msg: "Leftover has been withdraw"
    },
    {
      code: 6027,
      name: "TotalBaseTokenExceedMaxSupply",
      msg: "Total base token is exceeded max supply"
    },
    {
      code: 6028,
      name: "UnsupportNativeMintToken2022",
      msg: "Unsupport native mint token 2022"
    },
    {
      code: 6029,
      name: "InsufficientLiquidityForMigration",
      msg: "Insufficient liquidity for migration"
    },
    {
      code: 6030,
      name: "MissingPoolConfigInRemainingAccount",
      msg: "Missing pool config in remaining account"
    },
    {
      code: 6031,
      name: "InvalidVestingParameters",
      msg: "Invalid vesting parameters"
    },
    {
      code: 6032,
      name: "InvalidLeftoverAddress",
      msg: "Invalid leftover address"
    },
    {
      code: 6033,
      name: "InsufficientLiquidity",
      msg: "Liquidity in bonding curve is insufficient"
    },
    {
      code: 6034,
      name: "InvalidFeeScheduler",
      msg: "Invalid fee scheduler"
    },
    {
      code: 6035,
      name: "InvalidCreatorTradingFeePercentage",
      msg: "Invalid creator trading fee percentage"
    },
    {
      code: 6036,
      name: "InvalidNewCreator",
      msg: "Invalid new creator"
    },
    {
      code: 6037,
      name: "InvalidTokenAuthorityOption",
      msg: "Invalid token authority option"
    },
    {
      code: 6038,
      name: "InvalidAccount",
      msg: "Invalid account for the instruction"
    },
    {
      code: 6039,
      name: "InvalidMigratorFeePercentage",
      msg: "Invalid migrator fee percentage"
    },
    {
      code: 6040,
      name: "MigrationFeeHasBeenWithdraw",
      msg: "Migration fee has been withdraw"
    },
    {
      code: 6041,
      name: "InvalidBaseFeeMode",
      msg: "Invalid base fee mode"
    },
    {
      code: 6042,
      name: "InvalidFeeRateLimiter",
      msg: "Invalid fee rate limiter"
    },
    {
      code: 6043,
      name: "FailToValidateSingleSwapInstruction",
      msg: "Fail to validate single swap instruction in rate limiter"
    },
    {
      code: 6044,
      name: "InvalidMigratedPoolFee",
      msg: "Invalid migrated pool fee params"
    },
    {
      code: 6045,
      name: "UndeterminedError",
      msg: "Undertermined error"
    },
    {
      code: 6046,
      name: "RateLimiterNotSupported",
      msg: "Rate limiter not supported"
    },
    {
      code: 6047,
      name: "AmountLeftIsNotZero",
      msg: "Amount left is not zero"
    },
    {
      code: 6048,
      name: "NextSqrtPriceIsSmallerThanStartSqrtPrice",
      msg: "Next sqrt price is smaller than start sqrt price"
    },
    {
      code: 6049,
      name: "InvalidMinBaseFee",
      msg: "Invalid min base fee"
    },
    {
      code: 6050,
      name: "AccountInvariantViolation",
      msg: "Account invariant violation"
    },
    {
      code: 6051,
      name: "InvalidPoolCreationFee",
      msg: "Invalid pool creation fee"
    },
    {
      code: 6052,
      name: "PoolCreationFeeHasBeenClaimed",
      msg: "Pool creation fee has been claimed"
    },
    {
      code: 6053,
      name: "Unauthorized",
      msg: "Not permit to do this action"
    },
    {
      code: 6054,
      name: "ZeroPoolCreationFee",
      msg: "Pool creation fee is zero"
    },
    {
      code: 6055,
      name: "InvalidMigrationLockedLiquidity",
      msg: "Invalid migration locked liquidity"
    },
    {
      code: 6056,
      name: "InvalidFeeMarketCapScheduler",
      msg: "Invalid fee market cap scheduler"
    },
    {
      code: 6057,
      name: "FirstSwapValidationFailed",
      msg: "Fail to validate first swap with minimum fee"
    },
    {
      code: 6058,
      name: "IncorrectATA",
      msg: "Incorrect ATA"
    },
    {
      code: 6059,
      name: "InsufficientPoolLamports",
      msg: "Pool has insufficient lamports to perform the operation"
    },
    {
      code: 6060,
      name: "InvalidPermission",
      msg: "Invalid permission"
    },
    {
      code: 6061,
      name: "InvalidWithdrawProtocolFeeZapAccounts",
      msg: "Invalid withdraw protocol fee zap accounts"
    },
    {
      code: 6062,
      name: "MintRestrictedFromZap",
      msg: "SOL,USDC protocol fee cannot be withdrawn via zap"
    },
    {
      code: 6063,
      name: "InvalidZapOutParameters",
      msg: "Invalid zap out parameters"
    },
    {
      code: 6064,
      name: "CpiDisabled",
      msg: "CPI disabled"
    },
    {
      code: 6065,
      name: "MissingZapOutInstruction",
      msg: "Missing zap out instruction"
    },
    {
      code: 6066,
      name: "InvalidZapAccounts",
      msg: "Invalid zap accounts"
    },
    {
      code: 6067,
      name: "InvalidCompoundingParameters",
      msg: "Invalid compounding parameters"
    },
    {
      code: 6068,
      name: "InvalidClaimProtocolFeeAccounts",
      msg: "Invalid claim protocol fee accounts"
    },
    {
      code: 6069,
      name: "InvalidInstructionsSysvar",
      msg: "Invalid instructions sysvar account"
    },
    {
      code: 6070,
      name: "InvalidRemainingAccountsLength",
      msg: "Invalid remaining accounts length"
    },
    {
      code: 6071,
      name: "MissingRemainingAccountForTransferHook",
      msg: "Missing remaining account for transfer hook"
    },
    {
      code: 6072,
      name: "NoTransferHookProgram",
      msg: "No transfer hook program"
    },
    {
      code: 6073,
      name: "DuplicatedRemainingAccountTypes",
      msg: "Duplicated remaining account types"
    },
    {
      code: 6074,
      name: "InvalidTransferHookProgram",
      msg: "Invalid transfer hook program"
    },
    {
      code: 6075,
      name: "InvalidPoolAccount",
      msg: "Invalid pool account"
    },
    {
      code: 6076,
      name: "PoolTypeMismatch",
      msg: "Pool type does not match instruction"
    },
    {
      code: 6077,
      name: "InvalidRemainingAccountSliceType",
      msg: "Invalid remaining account slice type for this instruction"
    },
    {
      code: 6078,
      name: "DeprecatedBaseFeeMode",
      msg: "Deprecated base fee mode"
    },
    {
      code: 6079,
      name: "CannotCreateTokenBadgeOnSupportedMint",
      msg: "Cannot create token badge on supported mint"
    },
    {
      code: 6080,
      name: "InvalidTokenBadge",
      msg: "Invalid token badge"
    },
    {
      code: 6081,
      name: "QuoteMintHasNonZeroTransferFee",
      msg: "Quote mint has a non zero transfer fee"
    },
    {
      code: 6082,
      name: "DeprecatedMigrationOption",
      msg: "Deprecated migration option"
    }
  ],
  types: [
    {
      name: "AccountsType",
      repr: {
        kind: "rust"
      },
      type: {
        kind: "enum",
        variants: [
          {
            name: "TransferHookBase"
          },
          {
            name: "TransferHookBaseReferral"
          }
        ]
      }
    },
    {
      name: "BaseFeeConfig",
      serialization: "bytemuck",
      repr: {
        kind: "c"
      },
      type: {
        kind: "struct",
        fields: [
          {
            name: "cliff_fee_numerator",
            type: "u64"
          },
          {
            name: "second_factor",
            type: "u64"
          },
          {
            name: "third_factor",
            type: "u64"
          },
          {
            name: "first_factor",
            type: "u16"
          },
          {
            name: "base_fee_mode",
            type: "u8"
          },
          {
            name: "padding_0",
            type: {
              array: [
                "u8",
                5
              ]
            }
          }
        ]
      }
    },
    {
      name: "BaseFeeParameters",
      type: {
        kind: "struct",
        fields: [
          {
            name: "cliff_fee_numerator",
            type: "u64"
          },
          {
            name: "first_factor",
            type: "u16"
          },
          {
            name: "second_factor",
            type: "u64"
          },
          {
            name: "third_factor",
            type: "u64"
          },
          {
            name: "base_fee_mode",
            type: "u8"
          }
        ]
      }
    },
    {
      name: "ClaimFeeOperator",
      docs: [
        "Parameter that set by the protocol"
      ],
      serialization: "bytemuck",
      repr: {
        kind: "c"
      },
      type: {
        kind: "struct",
        fields: [
          {
            name: "operator",
            docs: [
              "operator"
            ],
            type: "pubkey"
          },
          {
            name: "_padding",
            docs: [
              "Reserve"
            ],
            type: {
              array: [
                "u8",
                128
              ]
            }
          }
        ]
      }
    },
    {
      name: "Config",
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool_fees",
            type: {
              defined: {
                name: "PoolFees"
              }
            }
          },
          {
            name: "activation_duration",
            type: "u64"
          },
          {
            name: "vault_config_key",
            type: "pubkey"
          },
          {
            name: "pool_creator_authority",
            type: "pubkey"
          },
          {
            name: "activation_type",
            type: "u8"
          },
          {
            name: "partner_fee_numerator",
            type: "u64"
          },
          {
            name: "padding",
            type: {
              array: [
                "u8",
                219
              ]
            }
          }
        ]
      }
    },
    {
      name: "ConfigParameters",
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool_fees",
            type: {
              defined: {
                name: "PoolFeeParameters"
              }
            }
          },
          {
            name: "collect_fee_mode",
            type: "u8"
          },
          {
            name: "migration_option",
            type: "u8"
          },
          {
            name: "activation_type",
            type: "u8"
          },
          {
            name: "token_type",
            type: "u8"
          },
          {
            name: "token_decimal",
            type: "u8"
          },
          {
            name: "partner_liquidity_percentage",
            type: "u8"
          },
          {
            name: "partner_permanent_locked_liquidity_percentage",
            type: "u8"
          },
          {
            name: "creator_liquidity_percentage",
            type: "u8"
          },
          {
            name: "creator_permanent_locked_liquidity_percentage",
            type: "u8"
          },
          {
            name: "migration_quote_threshold",
            type: "u64"
          },
          {
            name: "sqrt_start_price",
            type: "u128"
          },
          {
            name: "locked_vesting",
            type: {
              defined: {
                name: "LockedVestingParams"
              }
            }
          },
          {
            name: "migration_fee_option",
            type: "u8"
          },
          {
            name: "token_supply",
            type: {
              option: {
                defined: {
                  name: "TokenSupplyParams"
                }
              }
            }
          },
          {
            name: "creator_trading_fee_percentage",
            type: "u8"
          },
          {
            name: "token_update_authority",
            type: "u8"
          },
          {
            name: "migration_fee",
            type: {
              defined: {
                name: "MigrationFee"
              }
            }
          },
          {
            name: "migrated_pool_fee",
            type: {
              defined: {
                name: "MigratedPoolFee"
              }
            }
          },
          {
            name: "pool_creation_fee",
            docs: [
              "pool creation fee in SOL lamports value"
            ],
            type: "u64"
          },
          {
            name: "partner_liquidity_vesting_info",
            type: {
              defined: {
                name: "LiquidityVestingInfoParams"
              }
            }
          },
          {
            name: "creator_liquidity_vesting_info",
            type: {
              defined: {
                name: "LiquidityVestingInfoParams"
              }
            }
          },
          {
            name: "migrated_pool_base_fee_mode",
            type: "u8"
          },
          {
            name: "migrated_pool_market_cap_fee_scheduler_params",
            type: {
              defined: {
                name: "MigratedPoolMarketCapFeeSchedulerParams"
              }
            }
          },
          {
            name: "enable_first_swap_with_min_fee",
            type: "bool"
          },
          {
            name: "compounding_fee_bps",
            type: "u16"
          },
          {
            name: "padding",
            docs: [
              "padding for future use"
            ],
            type: {
              array: [
                "u8",
                2
              ]
            }
          },
          {
            name: "curve",
            type: {
              vec: {
                defined: {
                  name: "LiquidityDistributionParameters"
                }
              }
            }
          }
        ]
      }
    },
    {
      name: "ConfigWithTransferHook",
      serialization: "bytemuck",
      repr: {
        kind: "c"
      },
      type: {
        kind: "struct",
        fields: [
          {
            name: "config",
            type: {
              defined: {
                name: "PoolConfig"
              }
            }
          },
          {
            name: "transfer_hook_program",
            type: "pubkey"
          },
          {
            name: "padding_0",
            type: {
              array: [
                "u64",
                6
              ]
            }
          }
        ]
      }
    },
    {
      name: "CreatePartnerMetadataParameters",
      type: {
        kind: "struct",
        fields: [
          {
            name: "padding",
            type: {
              array: [
                "u8",
                96
              ]
            }
          },
          {
            name: "name",
            type: "string"
          },
          {
            name: "website",
            type: "string"
          },
          {
            name: "logo",
            type: "string"
          }
        ]
      }
    },
    {
      name: "CreateVirtualPoolMetadataParameters",
      type: {
        kind: "struct",
        fields: [
          {
            name: "padding",
            type: {
              array: [
                "u8",
                96
              ]
            }
          },
          {
            name: "name",
            type: "string"
          },
          {
            name: "website",
            type: "string"
          },
          {
            name: "logo",
            type: "string"
          }
        ]
      }
    },
    {
      name: "DynamicFeeConfig",
      serialization: "bytemuck",
      repr: {
        kind: "c"
      },
      type: {
        kind: "struct",
        fields: [
          {
            name: "initialized",
            type: "u8"
          },
          {
            name: "padding",
            type: {
              array: [
                "u8",
                7
              ]
            }
          },
          {
            name: "max_volatility_accumulator",
            type: "u32"
          },
          {
            name: "variable_fee_control",
            type: "u32"
          },
          {
            name: "bin_step",
            type: "u16"
          },
          {
            name: "filter_period",
            type: "u16"
          },
          {
            name: "decay_period",
            type: "u16"
          },
          {
            name: "reduction_factor",
            type: "u16"
          },
          {
            name: "padding2",
            type: {
              array: [
                "u8",
                8
              ]
            }
          },
          {
            name: "bin_step_u128",
            type: "u128"
          }
        ]
      }
    },
    {
      name: "DynamicFeeParameters",
      type: {
        kind: "struct",
        fields: [
          {
            name: "bin_step",
            type: "u16"
          },
          {
            name: "bin_step_u128",
            type: "u128"
          },
          {
            name: "filter_period",
            type: "u16"
          },
          {
            name: "decay_period",
            type: "u16"
          },
          {
            name: "reduction_factor",
            type: "u16"
          },
          {
            name: "max_volatility_accumulator",
            type: "u32"
          },
          {
            name: "variable_fee_control",
            type: "u32"
          }
        ]
      }
    },
    {
      name: "EvtClaimCreatorTradingFee",
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool",
            type: "pubkey"
          },
          {
            name: "token_base_amount",
            type: "u64"
          },
          {
            name: "token_quote_amount",
            type: "u64"
          }
        ]
      }
    },
    {
      name: "EvtClaimPoolCreationFee",
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool",
            type: "pubkey"
          },
          {
            name: "receiver",
            type: "pubkey"
          },
          {
            name: "creation_fee",
            type: "u64"
          }
        ]
      }
    },
    {
      name: "EvtClaimProtocolFee2",
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool",
            type: "pubkey"
          },
          {
            name: "receiver_token_account",
            type: "pubkey"
          },
          {
            name: "token_mint",
            type: "pubkey"
          },
          {
            name: "amount",
            type: "u64"
          }
        ]
      }
    },
    {
      name: "EvtClaimTradingFee",
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool",
            type: "pubkey"
          },
          {
            name: "token_base_amount",
            type: "u64"
          },
          {
            name: "token_quote_amount",
            type: "u64"
          }
        ]
      }
    },
    {
      name: "EvtCloseClaimFeeOperator",
      docs: [
        "Close claim fee operator"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "claim_fee_operator",
            type: "pubkey"
          },
          {
            name: "operator",
            type: "pubkey"
          }
        ]
      }
    },
    {
      name: "EvtCloseTokenBadge",
      type: {
        kind: "struct",
        fields: [
          {
            name: "token_mint",
            type: "pubkey"
          }
        ]
      }
    },
    {
      name: "EvtCreateClaimFeeOperator",
      docs: [
        "Create claim fee operator"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "operator",
            type: "pubkey"
          }
        ]
      }
    },
    {
      name: "EvtCreateConfig",
      docs: [
        "Create config"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "config",
            type: "pubkey"
          },
          {
            name: "quote_mint",
            type: "pubkey"
          },
          {
            name: "fee_claimer",
            type: "pubkey"
          },
          {
            name: "owner",
            type: "pubkey"
          },
          {
            name: "pool_fees",
            type: {
              defined: {
                name: "PoolFeeParameters"
              }
            }
          },
          {
            name: "collect_fee_mode",
            type: "u8"
          },
          {
            name: "migration_option",
            type: "u8"
          },
          {
            name: "activation_type",
            type: "u8"
          },
          {
            name: "token_decimal",
            type: "u8"
          },
          {
            name: "token_type",
            type: "u8"
          },
          {
            name: "partner_permanent_locked_liquidity_percentage",
            type: "u8"
          },
          {
            name: "partner_liquidity_percentage",
            type: "u8"
          },
          {
            name: "creator_permanent_locked_liquidity_percentage",
            type: "u8"
          },
          {
            name: "creator_liquidity_percentage",
            type: "u8"
          },
          {
            name: "swap_base_amount",
            type: "u64"
          },
          {
            name: "migration_quote_threshold",
            type: "u64"
          },
          {
            name: "migration_base_amount",
            type: "u64"
          },
          {
            name: "sqrt_start_price",
            type: "u128"
          },
          {
            name: "locked_vesting",
            type: {
              defined: {
                name: "LockedVestingParams"
              }
            }
          },
          {
            name: "migration_fee_option",
            type: "u8"
          },
          {
            name: "fixed_token_supply_flag",
            type: "u8"
          },
          {
            name: "pre_migration_token_supply",
            type: "u64"
          },
          {
            name: "post_migration_token_supply",
            type: "u64"
          },
          {
            name: "curve",
            type: {
              vec: {
                defined: {
                  name: "LiquidityDistributionParameters"
                }
              }
            }
          }
        ]
      }
    },
    {
      name: "EvtCreateConfigV2",
      type: {
        kind: "struct",
        fields: [
          {
            name: "config",
            type: "pubkey"
          },
          {
            name: "quote_mint",
            type: "pubkey"
          },
          {
            name: "fee_claimer",
            type: "pubkey"
          },
          {
            name: "leftover_receiver",
            type: "pubkey"
          },
          {
            name: "config_parameters",
            type: {
              defined: {
                name: "ConfigParameters"
              }
            }
          }
        ]
      }
    },
    {
      name: "EvtCreateConfigV2WithTransferHook",
      type: {
        kind: "struct",
        fields: [
          {
            name: "config",
            type: "pubkey"
          },
          {
            name: "quote_mint",
            type: "pubkey"
          },
          {
            name: "fee_claimer",
            type: "pubkey"
          },
          {
            name: "leftover_receiver",
            type: "pubkey"
          },
          {
            name: "config_parameters",
            type: {
              defined: {
                name: "ConfigParameters"
              }
            }
          },
          {
            name: "transfer_hook_program",
            type: "pubkey"
          }
        ]
      }
    },
    {
      name: "EvtCreateMeteoraMigrationMetadata",
      type: {
        kind: "struct",
        fields: [
          {
            name: "virtual_pool",
            type: "pubkey"
          }
        ]
      }
    },
    {
      name: "EvtCreateTokenBadge",
      type: {
        kind: "struct",
        fields: [
          {
            name: "token_mint",
            type: "pubkey"
          }
        ]
      }
    },
    {
      name: "EvtCreatorWithdrawSurplus",
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool",
            type: "pubkey"
          },
          {
            name: "surplus_amount",
            type: "u64"
          }
        ]
      }
    },
    {
      name: "EvtCurveComplete",
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool",
            type: "pubkey"
          },
          {
            name: "config",
            type: "pubkey"
          },
          {
            name: "base_reserve",
            type: "u64"
          },
          {
            name: "quote_reserve",
            type: "u64"
          }
        ]
      }
    },
    {
      name: "EvtCurveCompleteWithTransferHook",
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool",
            type: "pubkey"
          },
          {
            name: "config",
            type: "pubkey"
          },
          {
            name: "base_reserve",
            type: "u64"
          },
          {
            name: "quote_reserve",
            type: "u64"
          }
        ]
      }
    },
    {
      name: "EvtInitializePool",
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool",
            type: "pubkey"
          },
          {
            name: "config",
            type: "pubkey"
          },
          {
            name: "creator",
            type: "pubkey"
          },
          {
            name: "base_mint",
            type: "pubkey"
          },
          {
            name: "pool_type",
            type: "u8"
          },
          {
            name: "activation_point",
            type: "u64"
          }
        ]
      }
    },
    {
      name: "EvtInitializePoolWithTransferHook",
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool",
            type: "pubkey"
          },
          {
            name: "config",
            type: "pubkey"
          },
          {
            name: "creator",
            type: "pubkey"
          },
          {
            name: "base_mint",
            type: "pubkey"
          },
          {
            name: "pool_type",
            type: "u8"
          },
          {
            name: "activation_point",
            type: "u64"
          }
        ]
      }
    },
    {
      name: "EvtPartnerClaimPoolCreationFee",
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool",
            type: "pubkey"
          },
          {
            name: "partner",
            type: "pubkey"
          },
          {
            name: "creation_fee",
            type: "u64"
          },
          {
            name: "fee_receiver",
            type: "pubkey"
          }
        ]
      }
    },
    {
      name: "EvtPartnerMetadata",
      docs: [
        "Create partner metadata"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "partner_metadata",
            type: "pubkey"
          },
          {
            name: "fee_claimer",
            type: "pubkey"
          }
        ]
      }
    },
    {
      name: "EvtPartnerWithdrawSurplus",
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool",
            type: "pubkey"
          },
          {
            name: "surplus_amount",
            type: "u64"
          }
        ]
      }
    },
    {
      name: "EvtSwap",
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool",
            type: "pubkey"
          },
          {
            name: "config",
            type: "pubkey"
          },
          {
            name: "trade_direction",
            type: "u8"
          },
          {
            name: "has_referral",
            type: "bool"
          },
          {
            name: "params",
            type: {
              defined: {
                name: "SwapParameters"
              }
            }
          },
          {
            name: "swap_result",
            type: {
              defined: {
                name: "SwapResult"
              }
            }
          },
          {
            name: "amount_in",
            type: "u64"
          },
          {
            name: "current_timestamp",
            type: "u64"
          }
        ]
      }
    },
    {
      name: "EvtSwap2",
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool",
            type: "pubkey"
          },
          {
            name: "config",
            type: "pubkey"
          },
          {
            name: "trade_direction",
            type: "u8"
          },
          {
            name: "has_referral",
            type: "bool"
          },
          {
            name: "swap_parameters",
            type: {
              defined: {
                name: "SwapParameters2"
              }
            }
          },
          {
            name: "swap_result",
            type: {
              defined: {
                name: "SwapResult2"
              }
            }
          },
          {
            name: "quote_reserve_amount",
            type: "u64"
          },
          {
            name: "migration_threshold",
            type: "u64"
          },
          {
            name: "current_timestamp",
            type: "u64"
          }
        ]
      }
    },
    {
      name: "EvtSwap2WithTransferHook",
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool",
            type: "pubkey"
          },
          {
            name: "config",
            type: "pubkey"
          },
          {
            name: "trade_direction",
            type: "u8"
          },
          {
            name: "has_referral",
            type: "bool"
          },
          {
            name: "swap_parameters",
            type: {
              defined: {
                name: "SwapParameters2"
              }
            }
          },
          {
            name: "swap_result",
            type: {
              defined: {
                name: "SwapResult2"
              }
            }
          },
          {
            name: "quote_reserve_amount",
            type: "u64"
          },
          {
            name: "migration_threshold",
            type: "u64"
          },
          {
            name: "current_timestamp",
            type: "u64"
          }
        ]
      }
    },
    {
      name: "EvtUpdatePoolCreator",
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool",
            type: "pubkey"
          },
          {
            name: "creator",
            type: "pubkey"
          },
          {
            name: "new_creator",
            type: "pubkey"
          }
        ]
      }
    },
    {
      name: "EvtVirtualPoolMetadata",
      type: {
        kind: "struct",
        fields: [
          {
            name: "virtual_pool_metadata",
            type: "pubkey"
          },
          {
            name: "virtual_pool",
            type: "pubkey"
          }
        ]
      }
    },
    {
      name: "EvtWithdrawLeftover",
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool",
            type: "pubkey"
          },
          {
            name: "leftover_receiver",
            type: "pubkey"
          },
          {
            name: "leftover_amount",
            type: "u64"
          }
        ]
      }
    },
    {
      name: "EvtWithdrawMigrationFee",
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool",
            type: "pubkey"
          },
          {
            name: "fee",
            type: "u64"
          },
          {
            name: "flag",
            type: "u8"
          }
        ]
      }
    },
    {
      name: "InitializePoolParameters",
      type: {
        kind: "struct",
        fields: [
          {
            name: "name",
            type: "string"
          },
          {
            name: "symbol",
            type: "string"
          },
          {
            name: "uri",
            type: "string"
          }
        ]
      }
    },
    {
      name: "LiquidityDistributionConfig",
      serialization: "bytemuck",
      repr: {
        kind: "c"
      },
      type: {
        kind: "struct",
        fields: [
          {
            name: "sqrt_price",
            type: "u128"
          },
          {
            name: "liquidity",
            type: "u128"
          }
        ]
      }
    },
    {
      name: "LiquidityDistributionParameters",
      type: {
        kind: "struct",
        fields: [
          {
            name: "sqrt_price",
            type: "u128"
          },
          {
            name: "liquidity",
            type: "u128"
          }
        ]
      }
    },
    {
      name: "LiquidityVestingInfo",
      serialization: "bytemuck",
      repr: {
        kind: "c"
      },
      type: {
        kind: "struct",
        fields: [
          {
            name: "is_initialized",
            type: "u8"
          },
          {
            name: "vesting_percentage",
            type: "u8"
          },
          {
            name: "_padding",
            type: {
              array: [
                "u8",
                2
              ]
            }
          },
          {
            name: "bps_per_period",
            type: "u16"
          },
          {
            name: "number_of_periods",
            type: "u16"
          },
          {
            name: "frequency",
            type: "u32"
          },
          {
            name: "cliff_duration_from_migration_time",
            type: "u32"
          }
        ]
      }
    },
    {
      name: "LiquidityVestingInfoParams",
      type: {
        kind: "struct",
        fields: [
          {
            name: "vesting_percentage",
            type: "u8"
          },
          {
            name: "bps_per_period",
            type: "u16"
          },
          {
            name: "number_of_periods",
            type: "u16"
          },
          {
            name: "cliff_duration_from_migration_time",
            type: "u32"
          },
          {
            name: "frequency",
            type: "u32"
          }
        ]
      }
    },
    {
      name: "LockEscrow",
      docs: [
        "State of lock escrow account"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool",
            type: "pubkey"
          },
          {
            name: "owner",
            type: "pubkey"
          },
          {
            name: "escrow_vault",
            type: "pubkey"
          },
          {
            name: "bump",
            type: "u8"
          },
          {
            name: "total_locked_amount",
            type: "u64"
          },
          {
            name: "lp_per_token",
            type: "u128"
          },
          {
            name: "unclaimed_fee_pending",
            type: "u64"
          },
          {
            name: "a_fee",
            type: "u64"
          },
          {
            name: "b_fee",
            type: "u64"
          }
        ]
      }
    },
    {
      name: "LockedVestingConfig",
      serialization: "bytemuck",
      repr: {
        kind: "c"
      },
      type: {
        kind: "struct",
        fields: [
          {
            name: "amount_per_period",
            type: "u64"
          },
          {
            name: "cliff_duration_from_migration_time",
            type: "u64"
          },
          {
            name: "frequency",
            type: "u64"
          },
          {
            name: "number_of_period",
            type: "u64"
          },
          {
            name: "cliff_unlock_amount",
            type: "u64"
          },
          {
            name: "_padding",
            type: "u64"
          }
        ]
      }
    },
    {
      name: "LockedVestingParams",
      type: {
        kind: "struct",
        fields: [
          {
            name: "amount_per_period",
            type: "u64"
          },
          {
            name: "cliff_duration_from_migration_time",
            type: "u64"
          },
          {
            name: "frequency",
            type: "u64"
          },
          {
            name: "number_of_period",
            type: "u64"
          },
          {
            name: "cliff_unlock_amount",
            type: "u64"
          }
        ]
      }
    },
    {
      name: "MeteoraDammMigrationMetadata",
      serialization: "bytemuck",
      repr: {
        kind: "c"
      },
      type: {
        kind: "struct",
        fields: [
          {
            name: "virtual_pool",
            docs: [
              "pool"
            ],
            type: "pubkey"
          },
          {
            name: "padding_0",
            docs: [
              "!!! BE CAREFUL to use tombstone field, previous is pool creator"
            ],
            type: {
              array: [
                "u8",
                32
              ]
            }
          },
          {
            name: "partner",
            docs: [
              "partner"
            ],
            type: "pubkey"
          },
          {
            name: "lp_mint",
            docs: [
              "lp mint"
            ],
            type: "pubkey"
          },
          {
            name: "partner_locked_liquidity",
            docs: [
              "partner locked liquidity"
            ],
            type: "u64"
          },
          {
            name: "partner_liquidity",
            docs: [
              "partner liquidity"
            ],
            type: "u64"
          },
          {
            name: "creator_locked_liquidity",
            docs: [
              "creator locked liquidity"
            ],
            type: "u64"
          },
          {
            name: "creator_liquidity",
            docs: [
              "creator liquidity"
            ],
            type: "u64"
          },
          {
            name: "_padding_0",
            docs: [
              "padding"
            ],
            type: "u8"
          },
          {
            name: "creator_locked_status",
            docs: [
              "flag to check whether liquidity token is locked for creator"
            ],
            type: "u8"
          },
          {
            name: "partner_locked_status",
            docs: [
              "flag to check whether liquidity token is locked for partner"
            ],
            type: "u8"
          },
          {
            name: "creator_claim_status",
            docs: [
              "flag to check whether creator has claimed liquidity token"
            ],
            type: "u8"
          },
          {
            name: "partner_claim_status",
            docs: [
              "flag to check whether partner has claimed liquidity token"
            ],
            type: "u8"
          },
          {
            name: "_padding",
            docs: [
              "Reserve"
            ],
            type: {
              array: [
                "u8",
                107
              ]
            }
          }
        ]
      }
    },
    {
      name: "MigratedPoolFee",
      type: {
        kind: "struct",
        fields: [
          {
            name: "collect_fee_mode",
            type: "u8"
          },
          {
            name: "dynamic_fee",
            type: "u8"
          },
          {
            name: "pool_fee_bps",
            type: "u16"
          }
        ]
      }
    },
    {
      name: "MigratedPoolMarketCapFeeSchedulerParams",
      type: {
        kind: "struct",
        fields: [
          {
            name: "number_of_period",
            type: "u16"
          },
          {
            name: "sqrt_price_step_bps",
            type: "u16"
          },
          {
            name: "scheduler_expiration_duration",
            type: "u32"
          },
          {
            name: "reduction_factor",
            type: "u64"
          }
        ]
      }
    },
    {
      name: "MigrationFee",
      type: {
        kind: "struct",
        fields: [
          {
            name: "fee_percentage",
            type: "u8"
          },
          {
            name: "creator_fee_percentage",
            type: "u8"
          }
        ]
      }
    },
    {
      name: "Operator",
      serialization: "bytemuck",
      repr: {
        kind: "c"
      },
      type: {
        kind: "struct",
        fields: [
          {
            name: "whitelisted_address",
            type: "pubkey"
          },
          {
            name: "permission",
            type: "u128"
          },
          {
            name: "padding",
            type: {
              array: [
                "u64",
                2
              ]
            }
          }
        ]
      }
    },
    {
      name: "PartnerMetadata",
      docs: [
        "Metadata for a partner."
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "fee_claimer",
            docs: [
              "fee claimer"
            ],
            type: "pubkey"
          },
          {
            name: "padding",
            docs: [
              "padding for future use"
            ],
            type: {
              array: [
                "u128",
                6
              ]
            }
          },
          {
            name: "name",
            docs: [
              "Name of partner."
            ],
            type: "string"
          },
          {
            name: "website",
            docs: [
              "Website of partner."
            ],
            type: "string"
          },
          {
            name: "logo",
            docs: [
              "Logo of partner"
            ],
            type: "string"
          }
        ]
      }
    },
    {
      name: "PoolConfig",
      serialization: "bytemuck",
      repr: {
        kind: "c"
      },
      type: {
        kind: "struct",
        fields: [
          {
            name: "quote_mint",
            docs: [
              "quote mint"
            ],
            type: "pubkey"
          },
          {
            name: "fee_claimer",
            docs: [
              "Address to get the fee"
            ],
            type: "pubkey"
          },
          {
            name: "leftover_receiver",
            docs: [
              "Address to receive extra base token after migration, in case token is fixed supply"
            ],
            type: "pubkey"
          },
          {
            name: "pool_fees",
            docs: [
              "Pool fee"
            ],
            type: {
              defined: {
                name: "PoolFeesConfig"
              }
            }
          },
          {
            name: "partner_liquidity_vesting_info",
            type: {
              defined: {
                name: "LiquidityVestingInfo"
              }
            }
          },
          {
            name: "creator_liquidity_vesting_info",
            type: {
              defined: {
                name: "LiquidityVestingInfo"
              }
            }
          },
          {
            name: "padding_0",
            docs: [
              "Padding for future use"
            ],
            type: {
              array: [
                "u8",
                14
              ]
            }
          },
          {
            name: "padding_1",
            docs: [
              "Previously was protocol and referral fee percent. Beware of tombstone."
            ],
            type: "u16"
          },
          {
            name: "collect_fee_mode",
            docs: [
              "Collect fee mode"
            ],
            type: "u8"
          },
          {
            name: "migration_option",
            docs: [
              "migration option"
            ],
            type: "u8"
          },
          {
            name: "activation_type",
            docs: [
              "whether mode slot or timestamp"
            ],
            type: "u8"
          },
          {
            name: "token_decimal",
            docs: [
              "token decimals"
            ],
            type: "u8"
          },
          {
            name: "version",
            docs: [
              "version"
            ],
            type: "u8"
          },
          {
            name: "token_type",
            docs: [
              "token type of base token"
            ],
            type: "u8"
          },
          {
            name: "quote_token_flag",
            docs: [
              "quote token flag"
            ],
            type: "u8"
          },
          {
            name: "partner_permanent_locked_liquidity_percentage",
            docs: [
              "partner locked liquidity percentage"
            ],
            type: "u8"
          },
          {
            name: "partner_liquidity_percentage",
            docs: [
              "partner liquidity percentage"
            ],
            type: "u8"
          },
          {
            name: "creator_permanent_locked_liquidity_percentage",
            docs: [
              "creator post migration fee percentage"
            ],
            type: "u8"
          },
          {
            name: "creator_liquidity_percentage",
            docs: [
              "creator liquidity percentage"
            ],
            type: "u8"
          },
          {
            name: "migration_fee_option",
            docs: [
              "migration fee option"
            ],
            type: "u8"
          },
          {
            name: "fixed_token_supply_flag",
            docs: [
              "flag to indicate whether token is dynamic supply (0) or fixed supply (1)"
            ],
            type: "u8"
          },
          {
            name: "creator_trading_fee_percentage",
            docs: [
              "creator trading fee percentage"
            ],
            type: "u8"
          },
          {
            name: "token_update_authority",
            docs: [
              "token update authority"
            ],
            type: "u8"
          },
          {
            name: "migration_fee_percentage",
            docs: [
              "migration fee percentage"
            ],
            type: "u8"
          },
          {
            name: "creator_migration_fee_percentage",
            docs: [
              "creator migration fee percentage"
            ],
            type: "u8"
          },
          {
            name: "padding_2",
            type: {
              array: [
                "u8",
                7
              ]
            }
          },
          {
            name: "swap_base_amount",
            docs: [
              "swap base amount"
            ],
            type: "u64"
          },
          {
            name: "migration_quote_threshold",
            docs: [
              "migration quote threshold (in quote token)"
            ],
            type: "u64"
          },
          {
            name: "migration_base_threshold",
            docs: [
              "migration base threshold (in base token)"
            ],
            type: "u64"
          },
          {
            name: "migration_sqrt_price",
            docs: [
              "migration sqrt price"
            ],
            type: "u128"
          },
          {
            name: "locked_vesting_config",
            docs: [
              "locked vesting config"
            ],
            type: {
              defined: {
                name: "LockedVestingConfig"
              }
            }
          },
          {
            name: "pre_migration_token_supply",
            docs: [
              "pre migration token supply"
            ],
            type: "u64"
          },
          {
            name: "post_migration_token_supply",
            docs: [
              "post migration token supply"
            ],
            type: "u64"
          },
          {
            name: "migrated_collect_fee_mode",
            docs: [
              "migrated pool collect fee mode"
            ],
            type: "u8"
          },
          {
            name: "migrated_dynamic_fee",
            docs: [
              "migrated dynamic fee option."
            ],
            type: "u8"
          },
          {
            name: "migrated_pool_fee_bps",
            docs: [
              "migrated pool fee in bps"
            ],
            type: "u16"
          },
          {
            name: "migrated_pool_base_fee_mode",
            type: "u8"
          },
          {
            name: "enable_first_swap_with_min_fee",
            type: "u8"
          },
          {
            name: "migrated_compounding_fee_bps",
            docs: [
              "compounding fee bps for migrated DAMM v2 pool, should only be non-zero if migrated_collect_fee_mode is 2 (Compounding)"
            ],
            type: "u16"
          },
          {
            name: "pool_creation_fee",
            docs: [
              "pool creation fee in lamports value"
            ],
            type: "u64"
          },
          {
            name: "migrated_pool_base_fee_bytes",
            docs: [
              "serialized MigratedPoolMarketCapFeeSchedulerParams, only used when migrated_pool_base_fee_mode is market cap scheduler"
            ],
            type: {
              array: [
                "u8",
                16
              ]
            }
          },
          {
            name: "sqrt_start_price",
            docs: [
              "minimum price"
            ],
            type: "u128"
          },
          {
            name: "curve",
            docs: [
              "curve, only use 20 point firstly, we can extend that latter"
            ],
            type: {
              array: [
                {
                  defined: {
                    name: "LiquidityDistributionConfig"
                  }
                },
                20
              ]
            }
          }
        ]
      }
    },
    {
      name: "PoolFeeParameters",
      docs: [
        "Information regarding fee charges"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "base_fee",
            docs: [
              "Base fee"
            ],
            type: {
              defined: {
                name: "BaseFeeParameters"
              }
            }
          },
          {
            name: "dynamic_fee",
            docs: [
              "dynamic fee"
            ],
            type: {
              option: {
                defined: {
                  name: "DynamicFeeParameters"
                }
              }
            }
          }
        ]
      }
    },
    {
      name: "PoolFees",
      docs: [
        "Information regarding fee charges"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "trade_fee_numerator",
            type: "u64"
          },
          {
            name: "trade_fee_denominator",
            type: "u64"
          },
          {
            name: "protocol_trade_fee_numerator",
            type: "u64"
          },
          {
            name: "protocol_trade_fee_denominator",
            type: "u64"
          }
        ]
      }
    },
    {
      name: "PoolFeesConfig",
      serialization: "bytemuck",
      repr: {
        kind: "c"
      },
      type: {
        kind: "struct",
        fields: [
          {
            name: "base_fee",
            type: {
              defined: {
                name: "BaseFeeConfig"
              }
            }
          },
          {
            name: "dynamic_fee",
            type: {
              defined: {
                name: "DynamicFeeConfig"
              }
            }
          }
        ]
      }
    },
    {
      name: "PoolMetrics",
      serialization: "bytemuck",
      repr: {
        kind: "c"
      },
      type: {
        kind: "struct",
        fields: [
          {
            name: "total_protocol_base_fee",
            type: "u64"
          },
          {
            name: "total_protocol_quote_fee",
            type: "u64"
          },
          {
            name: "total_trading_base_fee",
            type: "u64"
          },
          {
            name: "total_trading_quote_fee",
            type: "u64"
          }
        ]
      }
    },
    {
      name: "PoolState",
      serialization: "bytemuck",
      repr: {
        kind: "c"
      },
      type: {
        kind: "struct",
        fields: [
          {
            name: "volatility_tracker",
            docs: [
              "volatility tracker"
            ],
            type: {
              defined: {
                name: "VolatilityTracker"
              }
            }
          },
          {
            name: "config",
            docs: [
              "config key"
            ],
            type: "pubkey"
          },
          {
            name: "creator",
            docs: [
              "creator"
            ],
            type: "pubkey"
          },
          {
            name: "base_mint",
            docs: [
              "base mint"
            ],
            type: "pubkey"
          },
          {
            name: "base_vault",
            docs: [
              "base vault"
            ],
            type: "pubkey"
          },
          {
            name: "quote_vault",
            docs: [
              "quote vault"
            ],
            type: "pubkey"
          },
          {
            name: "base_reserve",
            docs: [
              "base reserve"
            ],
            type: "u64"
          },
          {
            name: "quote_reserve",
            docs: [
              "quote reserve"
            ],
            type: "u64"
          },
          {
            name: "protocol_base_fee",
            docs: [
              "protocol base fee"
            ],
            type: "u64"
          },
          {
            name: "protocol_quote_fee",
            docs: [
              "protocol quote fee"
            ],
            type: "u64"
          },
          {
            name: "partner_base_fee",
            docs: [
              "partner base fee"
            ],
            type: "u64"
          },
          {
            name: "partner_quote_fee",
            docs: [
              "trading quote fee"
            ],
            type: "u64"
          },
          {
            name: "sqrt_price",
            docs: [
              "current price"
            ],
            type: "u128"
          },
          {
            name: "activation_point",
            docs: [
              "Activation point"
            ],
            type: "u64"
          },
          {
            name: "pool_type",
            docs: [
              "pool type, spl token or token2022"
            ],
            type: "u8"
          },
          {
            name: "is_migrated",
            docs: [
              "is migrated"
            ],
            type: "u8"
          },
          {
            name: "is_partner_withdraw_surplus",
            docs: [
              "is partner withdraw surplus"
            ],
            type: "u8"
          },
          {
            name: "is_protocol_withdraw_surplus",
            docs: [
              "is protocol withdraw surplus"
            ],
            type: "u8"
          },
          {
            name: "migration_progress",
            docs: [
              "migration progress"
            ],
            type: "u8"
          },
          {
            name: "is_withdraw_leftover",
            docs: [
              "is withdraw leftover"
            ],
            type: "u8"
          },
          {
            name: "is_creator_withdraw_surplus",
            docs: [
              "is creator withdraw surplus"
            ],
            type: "u8"
          },
          {
            name: "migration_fee_withdraw_status",
            docs: [
              "migration fee withdraw status",
              "bit 1 (0b010) creator",
              "bit 2 (0b100) partner"
            ],
            type: "u8"
          },
          {
            name: "metrics",
            docs: [
              "pool metrics"
            ],
            type: {
              defined: {
                name: "PoolMetrics"
              }
            }
          },
          {
            name: "finish_curve_timestamp",
            docs: [
              "The time curve is finished"
            ],
            type: "u64"
          },
          {
            name: "creator_base_fee",
            docs: [
              "creator base fee"
            ],
            type: "u64"
          },
          {
            name: "creator_quote_fee",
            docs: [
              "creator quote fee"
            ],
            type: "u64"
          },
          {
            name: "legacy_creation_fee_bits",
            docs: [
              "legacy creation fee bits, we dont use this now"
            ],
            type: "u8"
          },
          {
            name: "creation_fee_bits",
            docs: [
              "pool creation fee claim status"
            ],
            type: "u8"
          },
          {
            name: "has_swap",
            docs: [
              "Cached flag"
            ],
            type: "u8"
          },
          {
            name: "_padding_0",
            docs: [
              "Padding for further use"
            ],
            type: {
              array: [
                "u8",
                5
              ]
            }
          },
          {
            name: "protocol_liquidity_migration_fee_bps",
            type: "u16"
          },
          {
            name: "_padding_1",
            type: {
              array: [
                "u8",
                6
              ]
            }
          },
          {
            name: "protocol_migration_base_fee_amount",
            type: "u64"
          },
          {
            name: "protocol_migration_quote_fee_amount",
            type: "u64"
          },
          {
            name: "_padding_2",
            docs: [
              "Padding for further use"
            ],
            type: {
              array: [
                "u64",
                3
              ]
            }
          }
        ]
      }
    },
    {
      name: "RemainingAccountsSlice",
      type: {
        kind: "struct",
        fields: [
          {
            name: "accounts_type",
            type: {
              defined: {
                name: "AccountsType"
              }
            }
          },
          {
            name: "length",
            type: "u8"
          }
        ]
      }
    },
    {
      name: "SwapParameters",
      type: {
        kind: "struct",
        fields: [
          {
            name: "amount_in",
            type: "u64"
          },
          {
            name: "minimum_amount_out",
            type: "u64"
          }
        ]
      }
    },
    {
      name: "SwapParameters2",
      type: {
        kind: "struct",
        fields: [
          {
            name: "amount_0",
            docs: [
              "When it's exact in, partial fill, this will be amount_in. When it's exact out, this will be amount_out"
            ],
            type: "u64"
          },
          {
            name: "amount_1",
            docs: [
              "When it's exact in, partial fill, this will be minimum_amount_out. When it's exact out, this will be maximum_amount_in"
            ],
            type: "u64"
          },
          {
            name: "swap_mode",
            docs: [
              "Swap mode, refer [SwapMode]"
            ],
            type: "u8"
          }
        ]
      }
    },
    {
      name: "SwapResult",
      docs: [
        "Encodes all results of swapping"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "actual_input_amount",
            type: "u64"
          },
          {
            name: "output_amount",
            type: "u64"
          },
          {
            name: "next_sqrt_price",
            type: "u128"
          },
          {
            name: "trading_fee",
            type: "u64"
          },
          {
            name: "protocol_fee",
            type: "u64"
          },
          {
            name: "referral_fee",
            type: "u64"
          }
        ]
      }
    },
    {
      name: "SwapResult2",
      type: {
        kind: "struct",
        fields: [
          {
            name: "included_fee_input_amount",
            type: "u64"
          },
          {
            name: "excluded_fee_input_amount",
            type: "u64"
          },
          {
            name: "amount_left",
            type: "u64"
          },
          {
            name: "output_amount",
            type: "u64"
          },
          {
            name: "next_sqrt_price",
            type: "u128"
          },
          {
            name: "trading_fee",
            type: "u64"
          },
          {
            name: "protocol_fee",
            type: "u64"
          },
          {
            name: "referral_fee",
            type: "u64"
          }
        ]
      }
    },
    {
      name: "TokenBadge",
      docs: [
        "Parameter that set by the protocol"
      ],
      serialization: "bytemuck",
      repr: {
        kind: "c"
      },
      type: {
        kind: "struct",
        fields: [
          {
            name: "token_mint",
            docs: [
              "token mint"
            ],
            type: "pubkey"
          },
          {
            name: "_padding",
            docs: [
              "Reserve"
            ],
            type: {
              array: [
                "u8",
                128
              ]
            }
          }
        ]
      }
    },
    {
      name: "TokenSupplyParams",
      type: {
        kind: "struct",
        fields: [
          {
            name: "pre_migration_token_supply",
            docs: [
              "pre migration token supply"
            ],
            type: "u64"
          },
          {
            name: "post_migration_token_supply",
            docs: [
              "post migration token supply",
              "because DBC allow user to swap over the migration quote threshold, so in extreme case user may swap more than allowed buffer on curve",
              "that result the total supply in post migration may be increased a bit (between pre_migration_token_supply and post_migration_token_supply)"
            ],
            type: "u64"
          }
        ]
      }
    },
    {
      name: "TransferHookAccountsInfo",
      type: {
        kind: "struct",
        fields: [
          {
            name: "slices",
            type: {
              vec: {
                defined: {
                  name: "RemainingAccountsSlice"
                }
              }
            }
          }
        ]
      }
    },
    {
      name: "TransferHookPool",
      serialization: "bytemuck",
      repr: {
        kind: "c"
      },
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool_state",
            type: {
              defined: {
                name: "PoolState"
              }
            }
          }
        ]
      }
    },
    {
      name: "VirtualPool",
      serialization: "bytemuck",
      repr: {
        kind: "c"
      },
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool_state",
            type: {
              defined: {
                name: "PoolState"
              }
            }
          }
        ]
      }
    },
    {
      name: "VirtualPoolMetadata",
      docs: [
        "Metadata for a virtual pool."
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "virtual_pool",
            docs: [
              "virtual pool"
            ],
            type: "pubkey"
          },
          {
            name: "padding",
            docs: [
              "padding for future use"
            ],
            type: {
              array: [
                "u128",
                6
              ]
            }
          },
          {
            name: "name",
            docs: [
              "Name of project."
            ],
            type: "string"
          },
          {
            name: "website",
            docs: [
              "Website of project."
            ],
            type: "string"
          },
          {
            name: "logo",
            docs: [
              "Logo of project"
            ],
            type: "string"
          }
        ]
      }
    },
    {
      name: "VolatilityTracker",
      serialization: "bytemuck",
      repr: {
        kind: "c"
      },
      type: {
        kind: "struct",
        fields: [
          {
            name: "last_update_timestamp",
            type: "u64"
          },
          {
            name: "padding",
            type: {
              array: [
                "u8",
                8
              ]
            }
          },
          {
            name: "sqrt_price_reference",
            type: "u128"
          },
          {
            name: "volatility_accumulator",
            type: "u128"
          },
          {
            name: "volatility_reference",
            type: "u128"
          }
        ]
      }
    }
  ]
};

// src/idl/dynamic-vault/idl.json
var idl_default2 = {
  address: "24Uqj9JCLxUeoC3hGfh5W3s9FM9uCHDS2SG3LYwBpyTi",
  metadata: {
    name: "vault",
    version: "0.9.4",
    spec: "0.1.0",
    description: "Created with Anchor"
  },
  docs: [
    "Program for vault"
  ],
  instructions: [
    {
      name: "add_strategy",
      docs: [
        "add a strategy"
      ],
      discriminator: [
        64,
        123,
        127,
        227,
        192,
        234,
        198,
        20
      ],
      accounts: [
        {
          name: "vault",
          docs: [
            "vault"
          ],
          writable: true,
          relations: [
            "strategy"
          ]
        },
        {
          name: "strategy",
          docs: [
            "strategy"
          ]
        },
        {
          name: "admin",
          docs: [
            "admin"
          ],
          signer: true,
          relations: [
            "vault"
          ]
        }
      ],
      args: []
    },
    {
      name: "claim_rewards",
      docs: [
        "claim rewards from a strategy"
      ],
      discriminator: [
        4,
        144,
        132,
        71,
        116,
        23,
        151,
        80
      ],
      accounts: [
        {
          name: "vault",
          docs: [
            "vault"
          ]
        },
        {
          name: "strategy",
          docs: [
            "strategy"
          ]
        },
        {
          name: "token_program",
          docs: [
            "token_program"
          ],
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          name: "token_reward_acc",
          docs: [
            "token_reward_acc"
          ],
          writable: true
        },
        {
          name: "operator",
          docs: [
            "operator"
          ],
          signer: true
        }
      ],
      args: []
    },
    {
      name: "deposit",
      docs: [
        "user deposit liquidity to vault"
      ],
      discriminator: [
        242,
        35,
        198,
        137,
        82,
        225,
        242,
        182
      ],
      accounts: [
        {
          name: "vault",
          docs: [
            "vault"
          ],
          writable: true
        },
        {
          name: "token_vault",
          docs: [
            "token_vault"
          ],
          writable: true,
          relations: [
            "vault"
          ]
        },
        {
          name: "lp_mint",
          docs: [
            "lp_mint"
          ],
          writable: true,
          relations: [
            "vault"
          ]
        },
        {
          name: "user_token",
          docs: [
            "user_token"
          ],
          writable: true
        },
        {
          name: "user_lp",
          docs: [
            "user_lp"
          ],
          writable: true
        },
        {
          name: "user",
          docs: [
            "user"
          ],
          signer: true
        },
        {
          name: "token_program",
          docs: [
            "token_program"
          ],
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      args: [
        {
          name: "token_amount",
          type: "u64"
        },
        {
          name: "minimum_lp_token_amount",
          type: "u64"
        }
      ]
    },
    {
      name: "deposit_strategy",
      docs: [
        "deposit liquidity to a strategy"
      ],
      discriminator: [
        246,
        82,
        57,
        226,
        131,
        222,
        253,
        249
      ],
      accounts: [
        {
          name: "vault",
          docs: [
            "vault"
          ],
          writable: true
        },
        {
          name: "strategy",
          docs: [
            "strategy"
          ],
          writable: true
        },
        {
          name: "token_vault",
          docs: [
            "token_vault"
          ],
          writable: true,
          relations: [
            "vault"
          ]
        },
        {
          name: "fee_vault",
          docs: [
            "fee_vault"
          ],
          writable: true,
          relations: [
            "vault"
          ]
        },
        {
          name: "lp_mint",
          docs: [
            "lp_mint"
          ],
          writable: true,
          relations: [
            "vault"
          ]
        },
        {
          name: "strategy_program"
        },
        {
          name: "collateral_vault",
          docs: [
            "collateral_vault"
          ],
          writable: true
        },
        {
          name: "reserve",
          writable: true
        },
        {
          name: "token_program",
          docs: [
            "token_program"
          ],
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          name: "operator",
          docs: [
            "operator"
          ],
          signer: true
        }
      ],
      args: [
        {
          name: "amount",
          type: "u64"
        }
      ]
    },
    {
      name: "enable_vault",
      docs: [
        "enable vault"
      ],
      discriminator: [
        145,
        82,
        241,
        156,
        26,
        154,
        233,
        211
      ],
      accounts: [
        {
          name: "vault",
          docs: [
            "Vault account"
          ],
          writable: true
        },
        {
          name: "admin",
          docs: [
            "Admin account"
          ],
          signer: true,
          relations: [
            "vault"
          ]
        }
      ],
      args: [
        {
          name: "enabled",
          type: "u8"
        }
      ]
    },
    {
      name: "get_unlocked_amount",
      docs: [
        "get unlocked amount"
      ],
      discriminator: [
        22,
        184,
        50,
        213,
        60,
        168,
        181,
        227
      ],
      accounts: [
        {
          name: "vault",
          docs: [
            "Vault account"
          ]
        }
      ],
      args: []
    },
    {
      name: "initialize",
      docs: [
        "initialize new vault"
      ],
      discriminator: [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      accounts: [
        {
          name: "vault",
          docs: [
            "This is base account for all vault",
            "No need base key now because we only allow 1 vault per token now",
            "Vault account"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                kind: "account",
                path: "token_mint"
              },
              {
                kind: "const",
                value: [
                  245,
                  105,
                  223,
                  222,
                  32,
                  35,
                  51,
                  89,
                  141,
                  199,
                  215,
                  75,
                  29,
                  148,
                  184,
                  98,
                  71,
                  121,
                  193,
                  248,
                  47,
                  30,
                  37,
                  166,
                  91,
                  110,
                  78,
                  248,
                  163,
                  190,
                  155,
                  155
                ]
              }
            ]
          }
        },
        {
          name: "payer",
          docs: [
            "Payer can be anyone"
          ],
          writable: true,
          signer: true
        },
        {
          name: "token_vault",
          docs: [
            "Token vault account"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                kind: "account",
                path: "vault"
              }
            ]
          }
        },
        {
          name: "token_mint",
          docs: [
            "Token mint account"
          ]
        },
        {
          name: "lp_mint",
          docs: [
            "LP mint account"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  108,
                  112,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              },
              {
                kind: "account",
                path: "vault"
              }
            ]
          }
        },
        {
          name: "rent",
          docs: [
            "rent"
          ],
          address: "SysvarRent111111111111111111111111111111111"
        },
        {
          name: "token_program",
          docs: [
            "token_program"
          ],
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          name: "system_program",
          docs: [
            "system_program"
          ],
          address: "11111111111111111111111111111111"
        }
      ],
      args: []
    },
    {
      name: "initialize_idle_vault",
      docs: [
        "initialize idle vault the vault that cannot be rebalanced"
      ],
      discriminator: [
        100,
        187,
        43,
        147,
        149,
        180,
        117,
        223
      ],
      accounts: [
        {
          name: "vault",
          docs: [
            "Vault account"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                kind: "account",
                path: "token_mint"
              },
              {
                kind: "const",
                value: [
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0
                ]
              }
            ]
          }
        },
        {
          name: "payer",
          docs: [
            "Payer can be anyone"
          ],
          writable: true,
          signer: true
        },
        {
          name: "token_vault",
          docs: [
            "Token vault account"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                kind: "account",
                path: "vault"
              }
            ]
          }
        },
        {
          name: "token_mint",
          docs: [
            "Token mint account"
          ]
        },
        {
          name: "lp_mint",
          docs: [
            "LP mint"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  108,
                  112,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              },
              {
                kind: "account",
                path: "vault"
              }
            ]
          }
        },
        {
          name: "rent",
          docs: [
            "rent"
          ],
          address: "SysvarRent111111111111111111111111111111111"
        },
        {
          name: "token_program",
          docs: [
            "token_program"
          ],
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          name: "system_program",
          docs: [
            "system_program"
          ],
          address: "11111111111111111111111111111111"
        }
      ],
      args: []
    },
    {
      name: "initialize_strategy",
      docs: [
        "Initialize a strategy and add strategy to vault.strategies index"
      ],
      discriminator: [
        208,
        119,
        144,
        145,
        178,
        57,
        105,
        252
      ],
      accounts: [
        {
          name: "vault",
          docs: [
            "Vault account"
          ],
          writable: true
        },
        {
          name: "strategy_program"
        },
        {
          name: "strategy",
          docs: [
            "Strategy account"
          ],
          writable: true
        },
        {
          name: "reserve",
          writable: true
        },
        {
          name: "collateral_vault",
          docs: [
            "Collateral vault account"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  99,
                  111,
                  108,
                  108,
                  97,
                  116,
                  101,
                  114,
                  97,
                  108,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                kind: "account",
                path: "strategy"
              }
            ]
          }
        },
        {
          name: "collateral_mint",
          docs: [
            "Collateral mint account"
          ]
        },
        {
          name: "admin",
          docs: [
            "Admin account"
          ],
          writable: true,
          signer: true,
          relations: [
            "vault"
          ]
        },
        {
          name: "system_program",
          docs: [
            "System program account"
          ],
          address: "11111111111111111111111111111111"
        },
        {
          name: "rent",
          docs: [
            "Rent account"
          ],
          address: "SysvarRent111111111111111111111111111111111"
        },
        {
          name: "token_program",
          docs: [
            "Token program account"
          ],
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      args: [
        {
          name: "bumps",
          type: {
            defined: {
              name: "StrategyBumps"
            }
          }
        },
        {
          name: "strategy_type",
          type: {
            defined: {
              name: "StrategyType"
            }
          }
        }
      ]
    },
    {
      name: "remove_strategy",
      docs: [
        "remove a strategy"
      ],
      discriminator: [
        185,
        238,
        33,
        91,
        134,
        210,
        97,
        26
      ],
      accounts: [
        {
          name: "vault",
          docs: [
            "Vault account"
          ],
          writable: true
        },
        {
          name: "strategy",
          docs: [
            "Strategy account"
          ],
          writable: true
        },
        {
          name: "strategy_program"
        },
        {
          name: "collateral_vault",
          docs: [
            "Collateral vault account"
          ],
          writable: true
        },
        {
          name: "reserve",
          writable: true
        },
        {
          name: "token_vault",
          docs: [
            "token_vault"
          ],
          writable: true,
          relations: [
            "vault"
          ]
        },
        {
          name: "fee_vault",
          docs: [
            "fee_vault"
          ],
          writable: true,
          relations: [
            "vault"
          ]
        },
        {
          name: "lp_mint",
          docs: [
            "lp_mint"
          ],
          writable: true,
          relations: [
            "vault"
          ]
        },
        {
          name: "token_program",
          docs: [
            "token_program"
          ],
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          name: "admin",
          docs: [
            "admin"
          ],
          signer: true,
          relations: [
            "vault"
          ]
        }
      ],
      args: []
    },
    {
      name: "remove_strategy2",
      docs: [
        "remove a strategy by advance payment"
      ],
      discriminator: [
        138,
        104,
        208,
        148,
        126,
        35,
        195,
        14
      ],
      accounts: [
        {
          name: "vault",
          docs: [
            "Vault account"
          ],
          writable: true
        },
        {
          name: "strategy",
          docs: [
            "Strategy account"
          ],
          writable: true
        },
        {
          name: "strategy_program"
        },
        {
          name: "collateral_vault",
          docs: [
            "Collateral vault account"
          ],
          writable: true
        },
        {
          name: "reserve",
          writable: true
        },
        {
          name: "token_vault",
          docs: [
            "token_vault"
          ],
          writable: true,
          relations: [
            "vault"
          ]
        },
        {
          name: "token_admin_advance_payment",
          docs: [
            "token_advance_payment",
            "the owner of token_advance_payment must be admin"
          ],
          writable: true
        },
        {
          name: "token_vault_advance_payment",
          docs: [
            "token_vault_advance_payment",
            "the account must be different from token_vault and strategy's related token account",
            "the owner of token_advance_payment must be vault"
          ],
          writable: true
        },
        {
          name: "fee_vault",
          docs: [
            "fee_vault"
          ],
          writable: true,
          relations: [
            "vault"
          ]
        },
        {
          name: "lp_mint",
          docs: [
            "lp_mint"
          ],
          writable: true,
          relations: [
            "vault"
          ]
        },
        {
          name: "token_program",
          docs: [
            "token_program"
          ],
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          name: "admin",
          docs: [
            "admin"
          ],
          signer: true,
          relations: [
            "vault"
          ]
        }
      ],
      args: [
        {
          name: "max_admin_pay_amount",
          type: "u64"
        }
      ]
    },
    {
      name: "set_operator",
      docs: [
        "set new operator"
      ],
      discriminator: [
        238,
        153,
        101,
        169,
        243,
        131,
        36,
        1
      ],
      accounts: [
        {
          name: "vault",
          docs: [
            "Vault account"
          ],
          writable: true
        },
        {
          name: "operator"
        },
        {
          name: "admin",
          docs: [
            "admin"
          ],
          signer: true,
          relations: [
            "vault"
          ]
        }
      ],
      args: []
    },
    {
      name: "transfer_admin",
      docs: [
        "transfer admin"
      ],
      discriminator: [
        42,
        242,
        66,
        106,
        228,
        10,
        111,
        156
      ],
      accounts: [
        {
          name: "vault",
          docs: [
            "Vault account"
          ],
          writable: true
        },
        {
          name: "admin",
          docs: [
            "Admin account"
          ],
          signer: true,
          relations: [
            "vault"
          ]
        },
        {
          name: "new_admin",
          docs: [
            "New vault admin"
          ],
          signer: true
        }
      ],
      args: []
    },
    {
      name: "transfer_fee_vault",
      docs: [
        "transfer fee account"
      ],
      discriminator: [
        24,
        18,
        129,
        149,
        149,
        32,
        45,
        105
      ],
      accounts: [
        {
          name: "vault",
          docs: [
            "Vault account"
          ],
          writable: true
        },
        {
          name: "admin",
          docs: [
            "Admin account"
          ],
          signer: true,
          relations: [
            "vault"
          ]
        },
        {
          name: "new_fee_vault",
          docs: [
            "New fee vault account"
          ]
        }
      ],
      args: []
    },
    {
      name: "update_locked_profit_degradation",
      docs: [
        "update locked profit degradation"
      ],
      discriminator: [
        103,
        192,
        9,
        190,
        43,
        209,
        235,
        115
      ],
      accounts: [
        {
          name: "vault",
          docs: [
            "Vault account"
          ],
          writable: true
        },
        {
          name: "admin",
          docs: [
            "Admin account"
          ],
          signer: true,
          relations: [
            "vault"
          ]
        }
      ],
      args: [
        {
          name: "locked_profit_degradation",
          type: "u64"
        }
      ]
    },
    {
      name: "withdraw",
      docs: [
        "user withdraw liquidity from vault"
      ],
      discriminator: [
        183,
        18,
        70,
        156,
        148,
        109,
        161,
        34
      ],
      accounts: [
        {
          name: "vault",
          docs: [
            "vault"
          ],
          writable: true
        },
        {
          name: "token_vault",
          docs: [
            "token_vault"
          ],
          writable: true,
          relations: [
            "vault"
          ]
        },
        {
          name: "lp_mint",
          docs: [
            "lp_mint"
          ],
          writable: true,
          relations: [
            "vault"
          ]
        },
        {
          name: "user_token",
          docs: [
            "user_token"
          ],
          writable: true
        },
        {
          name: "user_lp",
          docs: [
            "user_lp"
          ],
          writable: true
        },
        {
          name: "user",
          docs: [
            "user"
          ],
          signer: true
        },
        {
          name: "token_program",
          docs: [
            "token_program"
          ],
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      args: [
        {
          name: "unmint_amount",
          type: "u64"
        },
        {
          name: "min_out_amount",
          type: "u64"
        }
      ]
    },
    {
      name: "withdraw_directly_from_strategy",
      docs: [
        "user withdraw liquidity from vault, if vault reserve doesn't have enough liquidity, it will withdraw from the strategy firstly"
      ],
      discriminator: [
        201,
        141,
        146,
        46,
        173,
        116,
        198,
        22
      ],
      accounts: [
        {
          name: "vault",
          docs: [
            "vault"
          ],
          writable: true
        },
        {
          name: "strategy",
          docs: [
            "strategy"
          ],
          writable: true
        },
        {
          name: "reserve",
          writable: true
        },
        {
          name: "strategy_program"
        },
        {
          name: "collateral_vault",
          docs: [
            "collateral_vault"
          ],
          writable: true
        },
        {
          name: "token_vault",
          docs: [
            "token_vault"
          ],
          writable: true,
          relations: [
            "vault"
          ]
        },
        {
          name: "lp_mint",
          docs: [
            "lp_mint"
          ],
          writable: true,
          relations: [
            "vault"
          ]
        },
        {
          name: "fee_vault",
          docs: [
            "fee_vault"
          ],
          writable: true,
          relations: [
            "vault"
          ]
        },
        {
          name: "user_token",
          docs: [
            "user_token"
          ],
          writable: true
        },
        {
          name: "user_lp",
          docs: [
            "user_lp"
          ],
          writable: true
        },
        {
          name: "user",
          docs: [
            "user"
          ],
          signer: true
        },
        {
          name: "token_program",
          docs: [
            "token_program"
          ],
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      args: [
        {
          name: "unmint_amount",
          type: "u64"
        },
        {
          name: "min_out_amount",
          type: "u64"
        }
      ]
    },
    {
      name: "withdraw_strategy",
      docs: [
        "withdraw liquidity from a strategy"
      ],
      discriminator: [
        31,
        45,
        162,
        5,
        193,
        217,
        134,
        188
      ],
      accounts: [
        {
          name: "vault",
          docs: [
            "vault"
          ],
          writable: true
        },
        {
          name: "strategy",
          docs: [
            "strategy"
          ],
          writable: true
        },
        {
          name: "token_vault",
          docs: [
            "token_vault"
          ],
          writable: true,
          relations: [
            "vault"
          ]
        },
        {
          name: "fee_vault",
          docs: [
            "fee_vault"
          ],
          writable: true,
          relations: [
            "vault"
          ]
        },
        {
          name: "lp_mint",
          docs: [
            "lp_mint"
          ],
          writable: true,
          relations: [
            "vault"
          ]
        },
        {
          name: "strategy_program"
        },
        {
          name: "collateral_vault",
          docs: [
            "collateral_vault"
          ],
          writable: true
        },
        {
          name: "reserve",
          writable: true
        },
        {
          name: "token_program",
          docs: [
            "token_program"
          ],
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          name: "operator",
          docs: [
            "operator"
          ],
          signer: true
        }
      ],
      args: [
        {
          name: "amount",
          type: "u64"
        }
      ]
    }
  ],
  accounts: [
    {
      name: "Strategy",
      discriminator: [
        174,
        110,
        39,
        119,
        82,
        106,
        169,
        102
      ]
    },
    {
      name: "Vault",
      discriminator: [
        211,
        8,
        232,
        43,
        2,
        152,
        117,
        119
      ]
    }
  ],
  events: [
    {
      name: "AddLiquidity",
      discriminator: [
        31,
        94,
        125,
        90,
        227,
        52,
        61,
        186
      ]
    },
    {
      name: "ClaimReward",
      discriminator: [
        148,
        116,
        134,
        204,
        22,
        171,
        85,
        95
      ]
    },
    {
      name: "PerformanceFee",
      discriminator: [
        28,
        70,
        231,
        223,
        81,
        109,
        239,
        167
      ]
    },
    {
      name: "RemoveLiquidity",
      discriminator: [
        116,
        244,
        97,
        232,
        103,
        31,
        152,
        58
      ]
    },
    {
      name: "ReportLoss",
      discriminator: [
        154,
        36,
        158,
        196,
        32,
        163,
        123,
        126
      ]
    },
    {
      name: "StrategyDeposit",
      discriminator: [
        205,
        53,
        91,
        239,
        34,
        136,
        73,
        47
      ]
    },
    {
      name: "StrategyWithdraw",
      discriminator: [
        120,
        76,
        208,
        95,
        221,
        210,
        229,
        189
      ]
    },
    {
      name: "TotalAmount",
      discriminator: [
        92,
        200,
        122,
        145,
        211,
        203,
        49,
        205
      ]
    }
  ],
  errors: [
    {
      code: 6e3,
      name: "VaultIsDisabled",
      msg: "Vault is disabled"
    },
    {
      code: 6001,
      name: "ExceededSlippage",
      msg: "Exceeded slippage tolerance"
    },
    {
      code: 6002,
      name: "StrategyIsNotExisted",
      msg: "Strategy is not existed"
    },
    {
      code: 6003,
      name: "UnAuthorized",
      msg: "UnAuthorized"
    },
    {
      code: 6004,
      name: "MathOverflow",
      msg: "Math operation overflow"
    },
    {
      code: 6005,
      name: "ProtocolIsNotSupported",
      msg: "Protocol is not supported"
    },
    {
      code: 6006,
      name: "UnMatchReserve",
      msg: "Reserve does not support token mint"
    },
    {
      code: 6007,
      name: "InvalidLockedProfitDegradation",
      msg: "lockedProfitDegradation is invalid"
    },
    {
      code: 6008,
      name: "MaxStrategyReached",
      msg: "Maximum number of strategies have been reached"
    },
    {
      code: 6009,
      name: "StrategyExisted",
      msg: "Strategy existed"
    },
    {
      code: 6010,
      name: "InvalidUnmintAmount",
      msg: "Invalid unmint amount"
    },
    {
      code: 6011,
      name: "InvalidAccountsForStrategy",
      msg: "Invalid accounts for strategy"
    },
    {
      code: 6012,
      name: "InvalidBump",
      msg: "Invalid bump"
    },
    {
      code: 6013,
      name: "AmountMustGreaterThanZero",
      msg: "Amount must be greater than 0"
    },
    {
      code: 6014,
      name: "MangoIsNotSupportedAnymore",
      msg: "Mango is not supported anymore"
    },
    {
      code: 6015,
      name: "StrategyIsNotSupported",
      msg: "Strategy is not supported"
    },
    {
      code: 6016,
      name: "PayAmountIsExceeded",
      msg: "Pay amount is exceeded"
    },
    {
      code: 6017,
      name: "FeeVaultIsNotSet",
      msg: "Fee vault is not set"
    },
    {
      code: 6018,
      name: "LendingAssertionViolation",
      msg: "deposit amount in lending is not matched"
    },
    {
      code: 6019,
      name: "HaveMoneyInLending",
      msg: "Cannot remove strategy because we have some in lending"
    },
    {
      code: 6020,
      name: "InvalidPrecisionLoss",
      msg: "Invalid precision loss"
    },
    {
      code: 6021,
      name: "UndeterminedError",
      msg: "Undetermined error"
    }
  ],
  types: [
    {
      name: "AddLiquidity",
      docs: [
        "AddLiquidity event"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "lp_mint_amount",
            docs: [
              "lp_mint_amount"
            ],
            type: "u64"
          },
          {
            name: "token_amount",
            docs: [
              "token_amount"
            ],
            type: "u64"
          }
        ]
      }
    },
    {
      name: "ClaimReward",
      docs: [
        "ClaimReward event"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "strategy_type",
            docs: [
              "strategy_type"
            ],
            type: {
              defined: {
                name: "StrategyType"
              }
            }
          },
          {
            name: "token_amount",
            docs: [
              "token_amount"
            ],
            type: "u64"
          },
          {
            name: "mint_account",
            docs: [
              "mint_account"
            ],
            type: "pubkey"
          }
        ]
      }
    },
    {
      name: "LockedProfitTracker",
      docs: [
        "LockedProfitTracker struct"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "last_updated_locked_profit",
            docs: [
              "The total locked profit from the last report"
            ],
            type: "u64"
          },
          {
            name: "last_report",
            docs: [
              "The last timestamp (in seconds) rebalancing"
            ],
            type: "u64"
          },
          {
            name: "locked_profit_degradation",
            docs: [
              "Rate per second of degradation"
            ],
            type: "u64"
          }
        ]
      }
    },
    {
      name: "PerformanceFee",
      docs: [
        "PerformanceFee event"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "lp_mint_more",
            docs: [
              "lp_mint_more"
            ],
            type: "u64"
          }
        ]
      }
    },
    {
      name: "RemoveLiquidity",
      docs: [
        "RemoveLiquidity event"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "lp_unmint_amount",
            docs: [
              "lp_unmint_amount"
            ],
            type: "u64"
          },
          {
            name: "token_amount",
            docs: [
              "token_amount"
            ],
            type: "u64"
          }
        ]
      }
    },
    {
      name: "ReportLoss",
      docs: [
        "ReportLoss event"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "strategy",
            docs: [
              "strategy"
            ],
            type: "pubkey"
          },
          {
            name: "loss",
            docs: [
              "loss"
            ],
            type: "u64"
          }
        ]
      }
    },
    {
      name: "Strategy",
      docs: [
        "Strategy struct"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "reserve",
            docs: [
              "Lending pool address, that the strategy will deposit/withdraw balance"
            ],
            type: "pubkey"
          },
          {
            name: "collateral_vault",
            docs: [
              "The token account, that holds the collateral token"
            ],
            type: "pubkey"
          },
          {
            name: "strategy_type",
            docs: [
              "Specify type of strategy"
            ],
            type: {
              defined: {
                name: "StrategyType"
              }
            }
          },
          {
            name: "current_liquidity",
            docs: [
              "The liquidity in strategy at the time vault deposit/withdraw from a lending protocol"
            ],
            type: "u64"
          },
          {
            name: "bumps",
            docs: [
              "Hold some bumps, in case the strategy needs to use other seeds to sign a CPI call."
            ],
            type: {
              array: [
                "u8",
                10
              ]
            }
          },
          {
            name: "vault",
            docs: [
              "Vault address, that the strategy belongs"
            ],
            type: "pubkey"
          },
          {
            name: "is_disable",
            docs: [
              "If we remove strategy by remove_strategy2 endpoint, this account will be never added again"
            ],
            type: "u8"
          }
        ]
      }
    },
    {
      name: "StrategyBumps",
      docs: [
        "Strategy bumps struct"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "strategy_index",
            docs: [
              "strategy_index"
            ],
            type: "u8"
          },
          {
            name: "other_bumps",
            docs: [
              "Bumps of PDAs for the integrated protocol."
            ],
            type: {
              array: [
                "u8",
                10
              ]
            }
          }
        ]
      }
    },
    {
      name: "StrategyDeposit",
      docs: [
        "StrategyDeposit event"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "strategy_type",
            docs: [
              "strategy_type"
            ],
            type: {
              defined: {
                name: "StrategyType"
              }
            }
          },
          {
            name: "token_amount",
            docs: [
              "token_amount"
            ],
            type: "u64"
          }
        ]
      }
    },
    {
      name: "StrategyType",
      docs: [
        "StrategyType struct"
      ],
      type: {
        kind: "enum",
        variants: [
          {
            name: "PortFinanceWithoutLM"
          },
          {
            name: "PortFinanceWithLM"
          },
          {
            name: "SolendWithoutLM"
          },
          {
            name: "Mango"
          },
          {
            name: "SolendWithLM"
          },
          {
            name: "ApricotWithoutLM"
          },
          {
            name: "Francium"
          },
          {
            name: "Tulip"
          },
          {
            name: "Vault"
          },
          {
            name: "Drift"
          },
          {
            name: "Frakt"
          },
          {
            name: "Marginfi"
          },
          {
            name: "Kamino"
          },
          {
            name: "JupLend"
          }
        ]
      }
    },
    {
      name: "StrategyWithdraw",
      docs: [
        "StrategyWithdraw event"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "strategy_type",
            docs: [
              "strategy_type"
            ],
            type: {
              defined: {
                name: "StrategyType"
              }
            }
          },
          {
            name: "collateral_amount",
            docs: [
              "collateral_amount"
            ],
            type: "u64"
          },
          {
            name: "estimated_token_amount",
            docs: [
              "estimated_token_amount"
            ],
            type: "u64"
          }
        ]
      }
    },
    {
      name: "TotalAmount",
      docs: [
        "TotalAmount event"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "total_amount",
            docs: [
              "total_amount"
            ],
            type: "u64"
          }
        ]
      }
    },
    {
      name: "Vault",
      docs: [
        "Vault struct"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "enabled",
            docs: [
              "The flag, if admin set enable = false, then the user can only withdraw and cannot deposit in the vault."
            ],
            type: "u8"
          },
          {
            name: "bumps",
            docs: [
              "Vault nonce, to create vault seeds"
            ],
            type: {
              defined: {
                name: "VaultBumps"
              }
            }
          },
          {
            name: "total_amount",
            docs: [
              "The total liquidity of the vault, including remaining tokens in token_vault and the liquidity in all strategies."
            ],
            type: "u64"
          },
          {
            name: "token_vault",
            docs: [
              "Token account, hold liquidity in vault reserve"
            ],
            type: "pubkey"
          },
          {
            name: "fee_vault",
            docs: [
              "Hold lp token of vault, each time rebalance crank is called, vault calculate performance fee and mint corresponding lp token amount to fee_vault. fee_vault is owned by treasury address"
            ],
            type: "pubkey"
          },
          {
            name: "token_mint",
            docs: [
              "Token mint that vault supports"
            ],
            type: "pubkey"
          },
          {
            name: "lp_mint",
            docs: [
              "Lp mint of vault"
            ],
            type: "pubkey"
          },
          {
            name: "strategies",
            docs: [
              "The list of strategy addresses that vault supports, vault can support up to MAX_STRATEGY strategies at the same time."
            ],
            type: {
              array: [
                "pubkey",
                30
              ]
            }
          },
          {
            name: "base",
            docs: [
              "The base address to create vault seeds"
            ],
            type: "pubkey"
          },
          {
            name: "admin",
            docs: [
              "Admin of vault"
            ],
            type: "pubkey"
          },
          {
            name: "operator",
            docs: [
              "Person who can send the crank. Operator can only send liquidity to strategies that admin defined, and claim reward to account of treasury address"
            ],
            type: "pubkey"
          },
          {
            name: "locked_profit_tracker",
            docs: [
              "Stores information for locked profit."
            ],
            type: {
              defined: {
                name: "LockedProfitTracker"
              }
            }
          }
        ]
      }
    },
    {
      name: "VaultBumps",
      docs: [
        "Vault bumps struct"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "vault_bump",
            docs: [
              "vault_bump"
            ],
            type: "u8"
          },
          {
            name: "token_vault_bump",
            docs: [
              "token_vault_bump"
            ],
            type: "u8"
          }
        ]
      }
    }
  ]
};

// src/idl/damm-v1/idl.json
var idl_default3 = {
  address: "Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB",
  metadata: {
    name: "amm",
    version: "0.5.3",
    spec: "0.1.0",
    description: "Mercurial Dynamic AMM"
  },
  docs: [
    "Program for AMM"
  ],
  instructions: [
    {
      name: "add_balance_liquidity",
      docs: [
        "Deposit tokens to the pool in a balanced ratio."
      ],
      discriminator: [
        168,
        227,
        50,
        62,
        189,
        171,
        84,
        176
      ],
      accounts: [
        {
          name: "pool",
          docs: [
            "Pool account (PDA)"
          ],
          writable: true
        },
        {
          name: "lp_mint",
          docs: [
            "LP token mint of the pool"
          ],
          writable: true,
          relations: [
            "pool"
          ]
        },
        {
          name: "user_pool_lp",
          docs: [
            "user pool lp token account. lp will be burned from this account upon success liquidity removal."
          ],
          writable: true
        },
        {
          name: "a_vault_lp",
          docs: [
            "LP token account of vault A. Used to receive/burn the vault LP upon deposit/withdraw from the vault."
          ],
          writable: true,
          relations: [
            "pool"
          ]
        },
        {
          name: "b_vault_lp",
          docs: [
            "LP token account of vault B. Used to receive/burn the vault LP upon deposit/withdraw from the vault."
          ],
          writable: true,
          relations: [
            "pool"
          ]
        },
        {
          name: "a_vault",
          docs: [
            "Vault account for token a. token a of the pool will be deposit / withdraw from this vault account."
          ],
          writable: true,
          relations: [
            "pool"
          ]
        },
        {
          name: "b_vault",
          docs: [
            "Vault account for token b. token b of the pool will be deposit / withdraw from this vault account."
          ],
          writable: true,
          relations: [
            "pool"
          ]
        },
        {
          name: "a_vault_lp_mint",
          docs: [
            "LP token mint of vault a"
          ],
          writable: true
        },
        {
          name: "b_vault_lp_mint",
          docs: [
            "LP token mint of vault b"
          ],
          writable: true
        },
        {
          name: "a_token_vault",
          docs: [
            "Token vault account of vault A"
          ],
          writable: true
        },
        {
          name: "b_token_vault",
          docs: [
            "Token vault account of vault B"
          ],
          writable: true
        },
        {
          name: "user_a_token",
          docs: [
            "User token A account. Token will be transfer from this account if it is add liquidity operation. Else, token will be transfer into this account."
          ],
          writable: true
        },
        {
          name: "user_b_token",
          docs: [
            "User token B account. Token will be transfer from this account if it is add liquidity operation. Else, token will be transfer into this account."
          ],
          writable: true
        },
        {
          name: "user",
          docs: [
            "User account. Must be owner of user_a_token, and user_b_token."
          ],
          signer: true
        },
        {
          name: "vault_program",
          docs: [
            "Vault program. the pool will deposit/withdraw liquidity from the vault."
          ],
          address: "24Uqj9JCLxUeoC3hGfh5W3s9FM9uCHDS2SG3LYwBpyTi"
        },
        {
          name: "token_program",
          docs: [
            "Token program."
          ],
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      args: [
        {
          name: "pool_token_amount",
          type: "u64"
        },
        {
          name: "maximum_token_a_amount",
          type: "u64"
        },
        {
          name: "maximum_token_b_amount",
          type: "u64"
        }
      ]
    },
    {
      name: "add_imbalance_liquidity",
      docs: [
        "Deposit tokens to the pool in an imbalance ratio. Only supported by pool with stable swap curve."
      ],
      discriminator: [
        79,
        35,
        122,
        84,
        173,
        15,
        93,
        191
      ],
      accounts: [
        {
          name: "pool",
          docs: [
            "Pool account (PDA)"
          ],
          writable: true
        },
        {
          name: "lp_mint",
          docs: [
            "LP token mint of the pool"
          ],
          writable: true,
          relations: [
            "pool"
          ]
        },
        {
          name: "user_pool_lp",
          docs: [
            "user pool lp token account. lp will be burned from this account upon success liquidity removal."
          ],
          writable: true
        },
        {
          name: "a_vault_lp",
          docs: [
            "LP token account of vault A. Used to receive/burn the vault LP upon deposit/withdraw from the vault."
          ],
          writable: true,
          relations: [
            "pool"
          ]
        },
        {
          name: "b_vault_lp",
          docs: [
            "LP token account of vault B. Used to receive/burn the vault LP upon deposit/withdraw from the vault."
          ],
          writable: true,
          relations: [
            "pool"
          ]
        },
        {
          name: "a_vault",
          docs: [
            "Vault account for token a. token a of the pool will be deposit / withdraw from this vault account."
          ],
          writable: true,
          relations: [
            "pool"
          ]
        },
        {
          name: "b_vault",
          docs: [
            "Vault account for token b. token b of the pool will be deposit / withdraw from this vault account."
          ],
          writable: true,
          relations: [
            "pool"
          ]
        },
        {
          name: "a_vault_lp_mint",
          docs: [
            "LP token mint of vault a"
          ],
          writable: true
        },
        {
          name: "b_vault_lp_mint",
          docs: [
            "LP token mint of vault b"
          ],
          writable: true
        },
        {
          name: "a_token_vault",
          docs: [
            "Token vault account of vault A"
          ],
          writable: true
        },
        {
          name: "b_token_vault",
          docs: [
            "Token vault account of vault B"
          ],
          writable: true
        },
        {
          name: "user_a_token",
          docs: [
            "User token A account. Token will be transfer from this account if it is add liquidity operation. Else, token will be transfer into this account."
          ],
          writable: true
        },
        {
          name: "user_b_token",
          docs: [
            "User token B account. Token will be transfer from this account if it is add liquidity operation. Else, token will be transfer into this account."
          ],
          writable: true
        },
        {
          name: "user",
          docs: [
            "User account. Must be owner of user_a_token, and user_b_token."
          ],
          signer: true
        },
        {
          name: "vault_program",
          docs: [
            "Vault program. the pool will deposit/withdraw liquidity from the vault."
          ],
          address: "24Uqj9JCLxUeoC3hGfh5W3s9FM9uCHDS2SG3LYwBpyTi"
        },
        {
          name: "token_program",
          docs: [
            "Token program."
          ],
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      args: [
        {
          name: "minimum_pool_token_amount",
          type: "u64"
        },
        {
          name: "token_a_amount",
          type: "u64"
        },
        {
          name: "token_b_amount",
          type: "u64"
        }
      ]
    },
    {
      name: "bootstrap_liquidity",
      docs: [
        "Bootstrap the pool when liquidity is depleted."
      ],
      discriminator: [
        4,
        228,
        215,
        71,
        225,
        253,
        119,
        206
      ],
      accounts: [
        {
          name: "pool",
          docs: [
            "Pool account (PDA)"
          ],
          writable: true
        },
        {
          name: "lp_mint",
          docs: [
            "LP token mint of the pool"
          ],
          writable: true,
          relations: [
            "pool"
          ]
        },
        {
          name: "user_pool_lp",
          docs: [
            "user pool lp token account. lp will be burned from this account upon success liquidity removal."
          ],
          writable: true
        },
        {
          name: "a_vault_lp",
          docs: [
            "LP token account of vault A. Used to receive/burn the vault LP upon deposit/withdraw from the vault."
          ],
          writable: true,
          relations: [
            "pool"
          ]
        },
        {
          name: "b_vault_lp",
          docs: [
            "LP token account of vault B. Used to receive/burn the vault LP upon deposit/withdraw from the vault."
          ],
          writable: true,
          relations: [
            "pool"
          ]
        },
        {
          name: "a_vault",
          docs: [
            "Vault account for token a. token a of the pool will be deposit / withdraw from this vault account."
          ],
          writable: true,
          relations: [
            "pool"
          ]
        },
        {
          name: "b_vault",
          docs: [
            "Vault account for token b. token b of the pool will be deposit / withdraw from this vault account."
          ],
          writable: true,
          relations: [
            "pool"
          ]
        },
        {
          name: "a_vault_lp_mint",
          docs: [
            "LP token mint of vault a"
          ],
          writable: true
        },
        {
          name: "b_vault_lp_mint",
          docs: [
            "LP token mint of vault b"
          ],
          writable: true
        },
        {
          name: "a_token_vault",
          docs: [
            "Token vault account of vault A"
          ],
          writable: true
        },
        {
          name: "b_token_vault",
          docs: [
            "Token vault account of vault B"
          ],
          writable: true
        },
        {
          name: "user_a_token",
          docs: [
            "User token A account. Token will be transfer from this account if it is add liquidity operation. Else, token will be transfer into this account."
          ],
          writable: true
        },
        {
          name: "user_b_token",
          docs: [
            "User token B account. Token will be transfer from this account if it is add liquidity operation. Else, token will be transfer into this account."
          ],
          writable: true
        },
        {
          name: "user",
          docs: [
            "User account. Must be owner of user_a_token, and user_b_token."
          ],
          signer: true
        },
        {
          name: "vault_program",
          docs: [
            "Vault program. the pool will deposit/withdraw liquidity from the vault."
          ],
          address: "24Uqj9JCLxUeoC3hGfh5W3s9FM9uCHDS2SG3LYwBpyTi"
        },
        {
          name: "token_program",
          docs: [
            "Token program."
          ],
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      args: [
        {
          name: "token_a_amount",
          type: "u64"
        },
        {
          name: "token_b_amount",
          type: "u64"
        }
      ]
    },
    {
      name: "claim_fee",
      docs: [
        "Claim fee"
      ],
      discriminator: [
        169,
        32,
        79,
        137,
        136,
        232,
        70,
        137
      ],
      accounts: [
        {
          name: "pool",
          docs: [
            "Pool account"
          ],
          writable: true,
          relations: [
            "lock_escrow"
          ]
        },
        {
          name: "lp_mint",
          docs: [
            "LP token mint of the pool"
          ],
          writable: true,
          relations: [
            "pool"
          ]
        },
        {
          name: "lock_escrow",
          docs: [
            "Lock account"
          ],
          writable: true
        },
        {
          name: "owner",
          docs: [
            "Owner of lock account"
          ],
          writable: true,
          signer: true,
          relations: [
            "lock_escrow"
          ]
        },
        {
          name: "source_tokens",
          docs: [
            "owner lp token account"
          ],
          writable: true
        },
        {
          name: "escrow_vault",
          docs: [
            "Escrow vault"
          ],
          writable: true,
          relations: [
            "lock_escrow"
          ]
        },
        {
          name: "token_program",
          docs: [
            "Token program."
          ],
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          name: "a_token_vault",
          docs: [
            "Token vault account of vault A"
          ],
          writable: true
        },
        {
          name: "b_token_vault",
          docs: [
            "Token vault account of vault B"
          ],
          writable: true
        },
        {
          name: "a_vault",
          docs: [
            "Vault account for token a. token a of the pool will be deposit / withdraw from this vault account."
          ],
          writable: true,
          relations: [
            "pool"
          ]
        },
        {
          name: "b_vault",
          docs: [
            "Vault account for token b. token b of the pool will be deposit / withdraw from this vault account."
          ],
          writable: true,
          relations: [
            "pool"
          ]
        },
        {
          name: "a_vault_lp",
          docs: [
            "LP token account of vault A. Used to receive/burn the vault LP upon deposit/withdraw from the vault."
          ],
          writable: true,
          relations: [
            "pool"
          ]
        },
        {
          name: "b_vault_lp",
          docs: [
            "LP token account of vault B. Used to receive/burn the vault LP upon deposit/withdraw from the vault."
          ],
          writable: true,
          relations: [
            "pool"
          ]
        },
        {
          name: "a_vault_lp_mint",
          docs: [
            "LP token mint of vault a"
          ],
          writable: true
        },
        {
          name: "b_vault_lp_mint",
          docs: [
            "LP token mint of vault b"
          ],
          writable: true
        },
        {
          name: "user_a_token",
          docs: [
            "User token A account. Token will be transfer from this account if it is add liquidity operation. Else, token will be transfer into this account."
          ],
          writable: true
        },
        {
          name: "user_b_token",
          docs: [
            "User token B account. Token will be transfer from this account if it is add liquidity operation. Else, token will be transfer into this account."
          ],
          writable: true
        },
        {
          name: "vault_program",
          docs: [
            "Vault program. the pool will deposit/withdraw liquidity from the vault."
          ],
          address: "24Uqj9JCLxUeoC3hGfh5W3s9FM9uCHDS2SG3LYwBpyTi"
        }
      ],
      args: [
        {
          name: "max_amount",
          type: "u64"
        }
      ]
    },
    {
      name: "close_config",
      docs: [
        "Close config"
      ],
      discriminator: [
        145,
        9,
        72,
        157,
        95,
        125,
        61,
        85
      ],
      accounts: [
        {
          name: "config",
          writable: true
        },
        {
          name: "admin",
          writable: true,
          signer: true
        },
        {
          name: "rent_receiver",
          writable: true
        }
      ],
      args: []
    },
    {
      name: "close_operator_account",
      docs: [
        "Close operator account"
      ],
      discriminator: [
        171,
        9,
        213,
        74,
        120,
        23,
        3,
        29
      ],
      accounts: [
        {
          name: "operator",
          writable: true
        },
        {
          name: "signer",
          signer: true
        },
        {
          name: "rent_receiver",
          writable: true
        },
        {
          name: "event_authority",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          name: "program"
        }
      ],
      args: []
    },
    {
      name: "create_config",
      docs: [
        "Create config"
      ],
      discriminator: [
        201,
        207,
        243,
        114,
        75,
        111,
        47,
        189
      ],
      accounts: [
        {
          name: "config",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                kind: "arg",
                path: "config_parameters.index"
              }
            ]
          }
        },
        {
          name: "admin",
          writable: true,
          signer: true
        },
        {
          name: "system_program",
          address: "11111111111111111111111111111111"
        }
      ],
      args: [
        {
          name: "config_parameters",
          type: {
            defined: {
              name: "ConfigParameters"
            }
          }
        }
      ]
    },
    {
      name: "create_lock_escrow",
      docs: [
        "Create lock account"
      ],
      discriminator: [
        54,
        87,
        165,
        19,
        69,
        227,
        218,
        224
      ],
      accounts: [
        {
          name: "pool",
          docs: [
            "Pool account"
          ]
        },
        {
          name: "lock_escrow",
          docs: [
            "Lock account"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  108,
                  111,
                  99,
                  107,
                  95,
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                kind: "account",
                path: "pool"
              },
              {
                kind: "account",
                path: "owner"
              }
            ]
          }
        },
        {
          name: "owner"
        },
        {
          name: "lp_mint",
          docs: [
            "LP token mint of the pool"
          ],
          relations: [
            "pool"
          ]
        },
        {
          name: "payer",
          docs: [
            "Payer account"
          ],
          writable: true,
          signer: true
        },
        {
          name: "system_program",
          docs: [
            "System program."
          ],
          address: "11111111111111111111111111111111"
        }
      ],
      args: []
    },
    {
      name: "create_mint_metadata",
      docs: [
        "Create mint metadata account for old pools"
      ],
      discriminator: [
        13,
        70,
        168,
        41,
        250,
        100,
        148,
        90
      ],
      accounts: [
        {
          name: "pool",
          docs: [
            "Pool account"
          ]
        },
        {
          name: "lp_mint",
          docs: [
            "LP mint account of the pool"
          ],
          relations: [
            "pool"
          ]
        },
        {
          name: "a_vault_lp",
          docs: [
            "Vault A LP account of the pool"
          ],
          relations: [
            "pool"
          ]
        },
        {
          name: "mint_metadata",
          writable: true
        },
        {
          name: "metadata_program",
          address: "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
        },
        {
          name: "system_program",
          docs: [
            "System program."
          ],
          address: "11111111111111111111111111111111"
        },
        {
          name: "payer",
          docs: [
            "Payer"
          ],
          writable: true,
          signer: true
        }
      ],
      args: []
    },
    {
      name: "create_operator_account",
      docs: [
        "Create operator account"
      ],
      discriminator: [
        221,
        64,
        246,
        149,
        240,
        153,
        229,
        163
      ],
      accounts: [
        {
          name: "operator",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  111,
                  112,
                  101,
                  114,
                  97,
                  116,
                  111,
                  114
                ]
              },
              {
                kind: "account",
                path: "whitelisted_address"
              }
            ]
          }
        },
        {
          name: "whitelisted_address"
        },
        {
          name: "signer",
          signer: true
        },
        {
          name: "payer",
          writable: true,
          signer: true
        },
        {
          name: "system_program",
          address: "11111111111111111111111111111111"
        },
        {
          name: "event_authority",
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          name: "program"
        }
      ],
      args: [
        {
          name: "permission",
          type: "u128"
        }
      ]
    },
    {
      name: "enable_or_disable_pool",
      docs: [
        "Enable or disable a pool. A disabled pool allow only remove balanced liquidity operation."
      ],
      discriminator: [
        128,
        6,
        228,
        131,
        55,
        161,
        52,
        169
      ],
      accounts: [
        {
          name: "pool",
          docs: [
            "Pool account (PDA)"
          ],
          writable: true
        },
        {
          name: "admin",
          docs: [
            "Admin account. Must be owner of the pool."
          ],
          signer: true
        }
      ],
      args: [
        {
          name: "enable",
          type: "bool"
        }
      ]
    },
    {
      name: "get_pool_info",
      docs: [
        "Get the general information of the pool."
      ],
      discriminator: [
        9,
        48,
        220,
        101,
        22,
        240,
        78,
        200
      ],
      accounts: [
        {
          name: "pool",
          docs: [
            "Pool account (PDA)"
          ]
        },
        {
          name: "lp_mint",
          docs: [
            "LP token mint of the pool"
          ],
          relations: [
            "pool"
          ]
        },
        {
          name: "a_vault_lp",
          docs: [
            "LP token account of vault A. Used to receive/burn the vault LP upon deposit/withdraw from the vault."
          ],
          relations: [
            "pool"
          ]
        },
        {
          name: "b_vault_lp",
          docs: [
            "LP token account of vault B. Used to receive/burn the vault LP upon deposit/withdraw from the vault."
          ],
          relations: [
            "pool"
          ]
        },
        {
          name: "a_vault",
          docs: [
            "Vault account for token a. token a of the pool will be deposit / withdraw from this vault account."
          ],
          relations: [
            "pool"
          ]
        },
        {
          name: "b_vault",
          docs: [
            "Vault account for token b. token b of the pool will be deposit / withdraw from this vault account."
          ],
          relations: [
            "pool"
          ]
        },
        {
          name: "a_vault_lp_mint",
          docs: [
            "LP token mint of vault a"
          ]
        },
        {
          name: "b_vault_lp_mint",
          docs: [
            "LP token mint of vault b"
          ]
        }
      ],
      args: []
    },
    {
      name: "initialize_customizable_permissionless_constant_product_pool",
      docs: [
        "Initialize permissionless pool with customizable params"
      ],
      discriminator: [
        145,
        24,
        172,
        194,
        219,
        125,
        3,
        190
      ],
      accounts: [
        {
          name: "pool",
          docs: [
            "Pool account (PDA address)"
          ],
          writable: true
        },
        {
          name: "lp_mint",
          docs: [
            "LP token mint of the pool"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  108,
                  112,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              },
              {
                kind: "account",
                path: "pool"
              }
            ]
          }
        },
        {
          name: "token_a_mint",
          docs: [
            "Token A mint of the pool. Eg: USDT"
          ]
        },
        {
          name: "token_b_mint",
          docs: [
            "Token B mint of the pool. Eg: USDC"
          ]
        },
        {
          name: "a_vault",
          docs: [
            "Vault account for token A. Token A of the pool will be deposit / withdraw from this vault account."
          ],
          writable: true
        },
        {
          name: "b_vault",
          docs: [
            "Vault account for token B. Token B of the pool will be deposit / withdraw from this vault account."
          ],
          writable: true
        },
        {
          name: "a_token_vault",
          docs: [
            "Token vault account of vault A"
          ],
          writable: true
        },
        {
          name: "b_token_vault",
          docs: [
            "Token vault account of vault B"
          ],
          writable: true
        },
        {
          name: "a_vault_lp_mint",
          docs: [
            "LP token mint of vault A"
          ],
          writable: true
        },
        {
          name: "b_vault_lp_mint",
          docs: [
            "LP token mint of vault B"
          ],
          writable: true
        },
        {
          name: "a_vault_lp",
          docs: [
            "LP token account of vault A. Used to receive/burn the vault LP upon deposit/withdraw from the vault."
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "account",
                path: "a_vault"
              },
              {
                kind: "account",
                path: "pool"
              }
            ]
          }
        },
        {
          name: "b_vault_lp",
          docs: [
            "LP token account of vault B. Used to receive/burn vault LP upon deposit/withdraw from the vault."
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "account",
                path: "b_vault"
              },
              {
                kind: "account",
                path: "pool"
              }
            ]
          }
        },
        {
          name: "payer_token_a",
          docs: [
            "Payer token account for pool token A mint. Used to bootstrap the pool with initial liquidity."
          ],
          writable: true
        },
        {
          name: "payer_token_b",
          docs: [
            "Admin token account for pool token B mint. Used to bootstrap the pool with initial liquidity."
          ],
          writable: true
        },
        {
          name: "payer_pool_lp",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "account",
                path: "payer"
              },
              {
                kind: "const",
                value: [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                kind: "account",
                path: "lp_mint"
              }
            ],
            program: {
              kind: "const",
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          name: "protocol_token_a_fee",
          docs: [
            "Protocol fee token account for token A. Used to receive trading fee."
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  102,
                  101,
                  101
                ]
              },
              {
                kind: "account",
                path: "token_a_mint"
              },
              {
                kind: "account",
                path: "pool"
              }
            ]
          }
        },
        {
          name: "protocol_token_b_fee",
          docs: [
            "Protocol fee token account for token B. Used to receive trading fee."
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  102,
                  101,
                  101
                ]
              },
              {
                kind: "account",
                path: "token_b_mint"
              },
              {
                kind: "account",
                path: "pool"
              }
            ]
          }
        },
        {
          name: "payer",
          docs: [
            "Admin account. This account will be the admin of the pool, and the payer for PDA during initialize pool."
          ],
          writable: true,
          signer: true
        },
        {
          name: "rent",
          docs: [
            "Rent account."
          ],
          address: "SysvarRent111111111111111111111111111111111"
        },
        {
          name: "mint_metadata",
          writable: true
        },
        {
          name: "metadata_program"
        },
        {
          name: "vault_program",
          docs: [
            "Vault program. The pool will deposit/withdraw liquidity from the vault."
          ],
          address: "24Uqj9JCLxUeoC3hGfh5W3s9FM9uCHDS2SG3LYwBpyTi"
        },
        {
          name: "token_program",
          docs: [
            "Token program."
          ],
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          name: "associated_token_program",
          docs: [
            "Associated token program."
          ],
          address: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          name: "system_program",
          docs: [
            "System program."
          ],
          address: "11111111111111111111111111111111"
        }
      ],
      args: [
        {
          name: "token_a_amount",
          type: "u64"
        },
        {
          name: "token_b_amount",
          type: "u64"
        },
        {
          name: "params",
          type: {
            defined: {
              name: "CustomizableParams"
            }
          }
        }
      ]
    },
    {
      name: "initialize_permissioned_pool",
      docs: [
        "Initialize a new permissioned pool."
      ],
      discriminator: [
        77,
        85,
        178,
        157,
        50,
        48,
        212,
        126
      ],
      accounts: [
        {
          name: "pool",
          docs: [
            "Pool account (arbitrary address)"
          ],
          writable: true,
          signer: true
        },
        {
          name: "lp_mint",
          docs: [
            "LP token mint of the pool"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  108,
                  112,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              },
              {
                kind: "account",
                path: "pool"
              }
            ]
          }
        },
        {
          name: "token_a_mint",
          docs: [
            "Token A mint of the pool. Eg: USDT"
          ]
        },
        {
          name: "token_b_mint",
          docs: [
            "Token B mint of the pool. Eg: USDC"
          ]
        },
        {
          name: "a_vault",
          docs: [
            "Vault account for token A. Token A of the pool will be deposit / withdraw from this vault account."
          ],
          writable: true
        },
        {
          name: "b_vault",
          docs: [
            "Vault account for token B. Token B of the pool will be deposit / withdraw from this vault account."
          ],
          writable: true
        },
        {
          name: "a_vault_lp_mint",
          docs: [
            "LP token mint of vault A"
          ],
          writable: true
        },
        {
          name: "b_vault_lp_mint",
          docs: [
            "LP token mint of vault B"
          ],
          writable: true
        },
        {
          name: "a_vault_lp",
          docs: [
            "LP token account of vault A. Used to receive/burn the vault LP upon deposit/withdraw from the vault."
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "account",
                path: "a_vault"
              },
              {
                kind: "account",
                path: "pool"
              }
            ]
          }
        },
        {
          name: "b_vault_lp",
          docs: [
            "LP token account of vault B. Used to receive/burn vault LP upon deposit/withdraw from the vault."
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "account",
                path: "b_vault"
              },
              {
                kind: "account",
                path: "pool"
              }
            ]
          }
        },
        {
          name: "admin_token_a",
          docs: [
            "Admin token account for pool token A mint. Used to bootstrap the pool with initial liquidity."
          ],
          writable: true
        },
        {
          name: "admin_token_b",
          docs: [
            "Admin token account for pool token B mint. Used to bootstrap the pool with initial liquidity."
          ],
          writable: true
        },
        {
          name: "admin_pool_lp",
          docs: [
            "Admin pool LP token account. Used to receive LP during first deposit (initialize pool)",
            "Admin pool LP token account. Used to receive LP during first deposit (initialize pool)"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "account",
                path: "admin"
              },
              {
                kind: "const",
                value: [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                kind: "account",
                path: "lp_mint"
              }
            ],
            program: {
              kind: "const",
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          name: "protocol_token_a_fee",
          docs: [
            "Protocol fee token account for token A. Used to receive trading fee."
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  102,
                  101,
                  101
                ]
              },
              {
                kind: "account",
                path: "token_a_mint"
              },
              {
                kind: "account",
                path: "pool"
              }
            ]
          }
        },
        {
          name: "protocol_token_b_fee",
          docs: [
            "Protocol fee token account for token B. Used to receive trading fee."
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  102,
                  101,
                  101
                ]
              },
              {
                kind: "account",
                path: "token_b_mint"
              },
              {
                kind: "account",
                path: "pool"
              }
            ]
          }
        },
        {
          name: "admin",
          docs: [
            "Admin account. This account will be the admin of the pool, and the payer for PDA during initialize pool."
          ],
          writable: true,
          signer: true
        },
        {
          name: "fee_owner"
        },
        {
          name: "rent",
          docs: [
            "Rent account."
          ],
          address: "SysvarRent111111111111111111111111111111111"
        },
        {
          name: "mint_metadata",
          writable: true
        },
        {
          name: "metadata_program"
        },
        {
          name: "vault_program",
          docs: [
            "Vault program. The pool will deposit/withdraw liquidity from the vault."
          ],
          address: "24Uqj9JCLxUeoC3hGfh5W3s9FM9uCHDS2SG3LYwBpyTi"
        },
        {
          name: "token_program",
          docs: [
            "Token program."
          ],
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          name: "associated_token_program",
          docs: [
            "Associated token program."
          ],
          address: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          name: "system_program",
          docs: [
            "System program."
          ],
          address: "11111111111111111111111111111111"
        }
      ],
      args: [
        {
          name: "curve_type",
          type: {
            defined: {
              name: "CurveType"
            }
          }
        }
      ]
    },
    {
      name: "initialize_permissionless_constant_product_pool_with_config",
      docs: [
        "Initialize permissionless pool with config"
      ],
      discriminator: [
        7,
        166,
        138,
        171,
        206,
        171,
        236,
        244
      ],
      accounts: [
        {
          name: "pool",
          docs: [
            "Pool account (PDA address)"
          ],
          writable: true
        },
        {
          name: "config"
        },
        {
          name: "lp_mint",
          docs: [
            "LP token mint of the pool"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  108,
                  112,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              },
              {
                kind: "account",
                path: "pool"
              }
            ]
          }
        },
        {
          name: "token_a_mint",
          docs: [
            "Token A mint of the pool. Eg: USDT"
          ]
        },
        {
          name: "token_b_mint",
          docs: [
            "Token B mint of the pool. Eg: USDC"
          ]
        },
        {
          name: "a_vault",
          docs: [
            "Vault account for token A. Token A of the pool will be deposit / withdraw from this vault account."
          ],
          writable: true
        },
        {
          name: "b_vault",
          docs: [
            "Vault account for token B. Token B of the pool will be deposit / withdraw from this vault account."
          ],
          writable: true
        },
        {
          name: "a_token_vault",
          docs: [
            "Token vault account of vault A"
          ],
          writable: true
        },
        {
          name: "b_token_vault",
          docs: [
            "Token vault account of vault B"
          ],
          writable: true
        },
        {
          name: "a_vault_lp_mint",
          docs: [
            "LP token mint of vault A"
          ],
          writable: true
        },
        {
          name: "b_vault_lp_mint",
          docs: [
            "LP token mint of vault B"
          ],
          writable: true
        },
        {
          name: "a_vault_lp",
          docs: [
            "LP token account of vault A. Used to receive/burn the vault LP upon deposit/withdraw from the vault."
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "account",
                path: "a_vault"
              },
              {
                kind: "account",
                path: "pool"
              }
            ]
          }
        },
        {
          name: "b_vault_lp",
          docs: [
            "LP token account of vault B. Used to receive/burn vault LP upon deposit/withdraw from the vault."
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "account",
                path: "b_vault"
              },
              {
                kind: "account",
                path: "pool"
              }
            ]
          }
        },
        {
          name: "payer_token_a",
          docs: [
            "Payer token account for pool token A mint. Used to bootstrap the pool with initial liquidity."
          ],
          writable: true
        },
        {
          name: "payer_token_b",
          docs: [
            "Admin token account for pool token B mint. Used to bootstrap the pool with initial liquidity."
          ],
          writable: true
        },
        {
          name: "payer_pool_lp",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "account",
                path: "payer"
              },
              {
                kind: "const",
                value: [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                kind: "account",
                path: "lp_mint"
              }
            ],
            program: {
              kind: "const",
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          name: "protocol_token_a_fee",
          docs: [
            "Protocol fee token account for token A. Used to receive trading fee."
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  102,
                  101,
                  101
                ]
              },
              {
                kind: "account",
                path: "token_a_mint"
              },
              {
                kind: "account",
                path: "pool"
              }
            ]
          }
        },
        {
          name: "protocol_token_b_fee",
          docs: [
            "Protocol fee token account for token B. Used to receive trading fee."
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  102,
                  101,
                  101
                ]
              },
              {
                kind: "account",
                path: "token_b_mint"
              },
              {
                kind: "account",
                path: "pool"
              }
            ]
          }
        },
        {
          name: "payer",
          docs: [
            "Admin account. This account will be the admin of the pool, and the payer for PDA during initialize pool."
          ],
          writable: true,
          signer: true
        },
        {
          name: "rent",
          docs: [
            "Rent account."
          ],
          address: "SysvarRent111111111111111111111111111111111"
        },
        {
          name: "mint_metadata",
          writable: true
        },
        {
          name: "metadata_program"
        },
        {
          name: "vault_program",
          docs: [
            "Vault program. The pool will deposit/withdraw liquidity from the vault."
          ],
          address: "24Uqj9JCLxUeoC3hGfh5W3s9FM9uCHDS2SG3LYwBpyTi"
        },
        {
          name: "token_program",
          docs: [
            "Token program."
          ],
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          name: "associated_token_program",
          docs: [
            "Associated token program."
          ],
          address: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          name: "system_program",
          docs: [
            "System program."
          ],
          address: "11111111111111111111111111111111"
        }
      ],
      args: [
        {
          name: "token_a_amount",
          type: "u64"
        },
        {
          name: "token_b_amount",
          type: "u64"
        }
      ]
    },
    {
      name: "initialize_permissionless_constant_product_pool_with_config2",
      docs: [
        "Initialize permissionless pool with config 2"
      ],
      discriminator: [
        48,
        149,
        220,
        130,
        61,
        11,
        9,
        178
      ],
      accounts: [
        {
          name: "pool",
          docs: [
            "Pool account (PDA address)"
          ],
          writable: true
        },
        {
          name: "config"
        },
        {
          name: "lp_mint",
          docs: [
            "LP token mint of the pool"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  108,
                  112,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              },
              {
                kind: "account",
                path: "pool"
              }
            ]
          }
        },
        {
          name: "token_a_mint",
          docs: [
            "Token A mint of the pool. Eg: USDT"
          ]
        },
        {
          name: "token_b_mint",
          docs: [
            "Token B mint of the pool. Eg: USDC"
          ]
        },
        {
          name: "a_vault",
          docs: [
            "Vault account for token A. Token A of the pool will be deposit / withdraw from this vault account."
          ],
          writable: true
        },
        {
          name: "b_vault",
          docs: [
            "Vault account for token B. Token B of the pool will be deposit / withdraw from this vault account."
          ],
          writable: true
        },
        {
          name: "a_token_vault",
          docs: [
            "Token vault account of vault A"
          ],
          writable: true
        },
        {
          name: "b_token_vault",
          docs: [
            "Token vault account of vault B"
          ],
          writable: true
        },
        {
          name: "a_vault_lp_mint",
          docs: [
            "LP token mint of vault A"
          ],
          writable: true
        },
        {
          name: "b_vault_lp_mint",
          docs: [
            "LP token mint of vault B"
          ],
          writable: true
        },
        {
          name: "a_vault_lp",
          docs: [
            "LP token account of vault A. Used to receive/burn the vault LP upon deposit/withdraw from the vault."
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "account",
                path: "a_vault"
              },
              {
                kind: "account",
                path: "pool"
              }
            ]
          }
        },
        {
          name: "b_vault_lp",
          docs: [
            "LP token account of vault B. Used to receive/burn vault LP upon deposit/withdraw from the vault."
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "account",
                path: "b_vault"
              },
              {
                kind: "account",
                path: "pool"
              }
            ]
          }
        },
        {
          name: "payer_token_a",
          docs: [
            "Payer token account for pool token A mint. Used to bootstrap the pool with initial liquidity."
          ],
          writable: true
        },
        {
          name: "payer_token_b",
          docs: [
            "Admin token account for pool token B mint. Used to bootstrap the pool with initial liquidity."
          ],
          writable: true
        },
        {
          name: "payer_pool_lp",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "account",
                path: "payer"
              },
              {
                kind: "const",
                value: [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                kind: "account",
                path: "lp_mint"
              }
            ],
            program: {
              kind: "const",
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          name: "protocol_token_a_fee",
          docs: [
            "Protocol fee token account for token A. Used to receive trading fee."
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  102,
                  101,
                  101
                ]
              },
              {
                kind: "account",
                path: "token_a_mint"
              },
              {
                kind: "account",
                path: "pool"
              }
            ]
          }
        },
        {
          name: "protocol_token_b_fee",
          docs: [
            "Protocol fee token account for token B. Used to receive trading fee."
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  102,
                  101,
                  101
                ]
              },
              {
                kind: "account",
                path: "token_b_mint"
              },
              {
                kind: "account",
                path: "pool"
              }
            ]
          }
        },
        {
          name: "payer",
          docs: [
            "Admin account. This account will be the admin of the pool, and the payer for PDA during initialize pool."
          ],
          writable: true,
          signer: true
        },
        {
          name: "rent",
          docs: [
            "Rent account."
          ],
          address: "SysvarRent111111111111111111111111111111111"
        },
        {
          name: "mint_metadata",
          writable: true
        },
        {
          name: "metadata_program"
        },
        {
          name: "vault_program",
          docs: [
            "Vault program. The pool will deposit/withdraw liquidity from the vault."
          ],
          address: "24Uqj9JCLxUeoC3hGfh5W3s9FM9uCHDS2SG3LYwBpyTi"
        },
        {
          name: "token_program",
          docs: [
            "Token program."
          ],
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          name: "associated_token_program",
          docs: [
            "Associated token program."
          ],
          address: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          name: "system_program",
          docs: [
            "System program."
          ],
          address: "11111111111111111111111111111111"
        }
      ],
      args: [
        {
          name: "token_a_amount",
          type: "u64"
        },
        {
          name: "token_b_amount",
          type: "u64"
        },
        {
          name: "activation_point",
          type: {
            option: "u64"
          }
        }
      ]
    },
    {
      name: "initialize_permissionless_pool",
      docs: [
        "Initialize a new permissionless pool."
      ],
      discriminator: [
        118,
        173,
        41,
        157,
        173,
        72,
        97,
        103
      ],
      accounts: [
        {
          name: "pool",
          docs: [
            "Pool account (PDA address)"
          ],
          writable: true
        },
        {
          name: "lp_mint",
          docs: [
            "LP token mint of the pool"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  108,
                  112,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              },
              {
                kind: "account",
                path: "pool"
              }
            ]
          }
        },
        {
          name: "token_a_mint",
          docs: [
            "Token A mint of the pool. Eg: USDT"
          ]
        },
        {
          name: "token_b_mint",
          docs: [
            "Token B mint of the pool. Eg: USDC"
          ]
        },
        {
          name: "a_vault",
          docs: [
            "Vault account for token A. Token A of the pool will be deposit / withdraw from this vault account."
          ],
          writable: true
        },
        {
          name: "b_vault",
          docs: [
            "Vault account for token B. Token B of the pool will be deposit / withdraw from this vault account."
          ],
          writable: true
        },
        {
          name: "a_token_vault",
          docs: [
            "Token vault account of vault A"
          ],
          writable: true
        },
        {
          name: "b_token_vault",
          docs: [
            "Token vault account of vault B"
          ],
          writable: true
        },
        {
          name: "a_vault_lp_mint",
          docs: [
            "LP token mint of vault A"
          ],
          writable: true
        },
        {
          name: "b_vault_lp_mint",
          docs: [
            "LP token mint of vault B"
          ],
          writable: true
        },
        {
          name: "a_vault_lp",
          docs: [
            "LP token account of vault A. Used to receive/burn the vault LP upon deposit/withdraw from the vault."
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "account",
                path: "a_vault"
              },
              {
                kind: "account",
                path: "pool"
              }
            ]
          }
        },
        {
          name: "b_vault_lp",
          docs: [
            "LP token account of vault B. Used to receive/burn vault LP upon deposit/withdraw from the vault."
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "account",
                path: "b_vault"
              },
              {
                kind: "account",
                path: "pool"
              }
            ]
          }
        },
        {
          name: "payer_token_a",
          docs: [
            "Payer token account for pool token A mint. Used to bootstrap the pool with initial liquidity."
          ],
          writable: true
        },
        {
          name: "payer_token_b",
          docs: [
            "Admin token account for pool token B mint. Used to bootstrap the pool with initial liquidity."
          ],
          writable: true
        },
        {
          name: "payer_pool_lp",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "account",
                path: "payer"
              },
              {
                kind: "const",
                value: [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                kind: "account",
                path: "lp_mint"
              }
            ],
            program: {
              kind: "const",
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          name: "protocol_token_a_fee",
          docs: [
            "Protocol fee token account for token A. Used to receive trading fee."
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  102,
                  101,
                  101
                ]
              },
              {
                kind: "account",
                path: "token_a_mint"
              },
              {
                kind: "account",
                path: "pool"
              }
            ]
          }
        },
        {
          name: "protocol_token_b_fee",
          docs: [
            "Protocol fee token account for token B. Used to receive trading fee."
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  102,
                  101,
                  101
                ]
              },
              {
                kind: "account",
                path: "token_b_mint"
              },
              {
                kind: "account",
                path: "pool"
              }
            ]
          }
        },
        {
          name: "payer",
          docs: [
            "Admin account. This account will be the admin of the pool, and the payer for PDA during initialize pool."
          ],
          writable: true,
          signer: true
        },
        {
          name: "fee_owner"
        },
        {
          name: "rent",
          docs: [
            "Rent account."
          ],
          address: "SysvarRent111111111111111111111111111111111"
        },
        {
          name: "mint_metadata",
          writable: true
        },
        {
          name: "metadata_program"
        },
        {
          name: "vault_program",
          docs: [
            "Vault program. The pool will deposit/withdraw liquidity from the vault."
          ],
          address: "24Uqj9JCLxUeoC3hGfh5W3s9FM9uCHDS2SG3LYwBpyTi"
        },
        {
          name: "token_program",
          docs: [
            "Token program."
          ],
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          name: "associated_token_program",
          docs: [
            "Associated token program."
          ],
          address: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          name: "system_program",
          docs: [
            "System program."
          ],
          address: "11111111111111111111111111111111"
        }
      ],
      args: [
        {
          name: "curve_type",
          type: {
            defined: {
              name: "CurveType"
            }
          }
        },
        {
          name: "token_a_amount",
          type: "u64"
        },
        {
          name: "token_b_amount",
          type: "u64"
        }
      ]
    },
    {
      name: "initialize_permissionless_pool_with_fee_tier",
      docs: [
        "Initialize a new permissionless pool with customized fee tier"
      ],
      discriminator: [
        6,
        135,
        68,
        147,
        229,
        82,
        169,
        113
      ],
      accounts: [
        {
          name: "pool",
          docs: [
            "Pool account (PDA address)"
          ],
          writable: true
        },
        {
          name: "lp_mint",
          docs: [
            "LP token mint of the pool"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  108,
                  112,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              },
              {
                kind: "account",
                path: "pool"
              }
            ]
          }
        },
        {
          name: "token_a_mint",
          docs: [
            "Token A mint of the pool. Eg: USDT"
          ]
        },
        {
          name: "token_b_mint",
          docs: [
            "Token B mint of the pool. Eg: USDC"
          ]
        },
        {
          name: "a_vault",
          docs: [
            "Vault account for token A. Token A of the pool will be deposit / withdraw from this vault account."
          ],
          writable: true
        },
        {
          name: "b_vault",
          docs: [
            "Vault account for token B. Token B of the pool will be deposit / withdraw from this vault account."
          ],
          writable: true
        },
        {
          name: "a_token_vault",
          docs: [
            "Token vault account of vault A"
          ],
          writable: true
        },
        {
          name: "b_token_vault",
          docs: [
            "Token vault account of vault B"
          ],
          writable: true
        },
        {
          name: "a_vault_lp_mint",
          docs: [
            "LP token mint of vault A"
          ],
          writable: true
        },
        {
          name: "b_vault_lp_mint",
          docs: [
            "LP token mint of vault B"
          ],
          writable: true
        },
        {
          name: "a_vault_lp",
          docs: [
            "LP token account of vault A. Used to receive/burn the vault LP upon deposit/withdraw from the vault."
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "account",
                path: "a_vault"
              },
              {
                kind: "account",
                path: "pool"
              }
            ]
          }
        },
        {
          name: "b_vault_lp",
          docs: [
            "LP token account of vault B. Used to receive/burn vault LP upon deposit/withdraw from the vault."
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "account",
                path: "b_vault"
              },
              {
                kind: "account",
                path: "pool"
              }
            ]
          }
        },
        {
          name: "payer_token_a",
          docs: [
            "Payer token account for pool token A mint. Used to bootstrap the pool with initial liquidity."
          ],
          writable: true
        },
        {
          name: "payer_token_b",
          docs: [
            "Admin token account for pool token B mint. Used to bootstrap the pool with initial liquidity."
          ],
          writable: true
        },
        {
          name: "payer_pool_lp",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "account",
                path: "payer"
              },
              {
                kind: "const",
                value: [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                kind: "account",
                path: "lp_mint"
              }
            ],
            program: {
              kind: "const",
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          name: "protocol_token_a_fee",
          docs: [
            "Protocol fee token account for token A. Used to receive trading fee."
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  102,
                  101,
                  101
                ]
              },
              {
                kind: "account",
                path: "token_a_mint"
              },
              {
                kind: "account",
                path: "pool"
              }
            ]
          }
        },
        {
          name: "protocol_token_b_fee",
          docs: [
            "Protocol fee token account for token B. Used to receive trading fee."
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  102,
                  101,
                  101
                ]
              },
              {
                kind: "account",
                path: "token_b_mint"
              },
              {
                kind: "account",
                path: "pool"
              }
            ]
          }
        },
        {
          name: "payer",
          docs: [
            "Admin account. This account will be the admin of the pool, and the payer for PDA during initialize pool."
          ],
          writable: true,
          signer: true
        },
        {
          name: "fee_owner"
        },
        {
          name: "rent",
          docs: [
            "Rent account."
          ],
          address: "SysvarRent111111111111111111111111111111111"
        },
        {
          name: "mint_metadata",
          writable: true
        },
        {
          name: "metadata_program"
        },
        {
          name: "vault_program",
          docs: [
            "Vault program. The pool will deposit/withdraw liquidity from the vault."
          ],
          address: "24Uqj9JCLxUeoC3hGfh5W3s9FM9uCHDS2SG3LYwBpyTi"
        },
        {
          name: "token_program",
          docs: [
            "Token program."
          ],
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          name: "associated_token_program",
          docs: [
            "Associated token program."
          ],
          address: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          name: "system_program",
          docs: [
            "System program."
          ],
          address: "11111111111111111111111111111111"
        }
      ],
      args: [
        {
          name: "curve_type",
          type: {
            defined: {
              name: "CurveType"
            }
          }
        },
        {
          name: "trade_fee_bps",
          type: "u64"
        },
        {
          name: "token_a_amount",
          type: "u64"
        },
        {
          name: "token_b_amount",
          type: "u64"
        }
      ]
    },
    {
      name: "lock",
      docs: [
        "Lock Lp token"
      ],
      discriminator: [
        21,
        19,
        208,
        43,
        237,
        62,
        255,
        87
      ],
      accounts: [
        {
          name: "pool",
          docs: [
            "Pool account"
          ],
          writable: true,
          relations: [
            "lock_escrow"
          ]
        },
        {
          name: "lp_mint",
          docs: [
            "LP token mint of the pool"
          ],
          relations: [
            "pool"
          ]
        },
        {
          name: "lock_escrow",
          docs: [
            "Lock account"
          ],
          writable: true
        },
        {
          name: "owner",
          docs: [
            "Can be anyone"
          ],
          writable: true,
          signer: true
        },
        {
          name: "source_tokens",
          docs: [
            "owner lp token account"
          ],
          writable: true
        },
        {
          name: "escrow_vault",
          docs: [
            "Escrow vault"
          ],
          writable: true,
          relations: [
            "lock_escrow"
          ]
        },
        {
          name: "token_program",
          docs: [
            "Token program."
          ],
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          name: "a_vault",
          docs: [
            "Vault account for token a. token a of the pool will be deposit / withdraw from this vault account."
          ],
          relations: [
            "pool"
          ]
        },
        {
          name: "b_vault",
          docs: [
            "Vault account for token b. token b of the pool will be deposit / withdraw from this vault account."
          ],
          relations: [
            "pool"
          ]
        },
        {
          name: "a_vault_lp",
          docs: [
            "LP token account of vault A. Used to receive/burn the vault LP upon deposit/withdraw from the vault."
          ],
          relations: [
            "pool"
          ]
        },
        {
          name: "b_vault_lp",
          docs: [
            "LP token account of vault B. Used to receive/burn the vault LP upon deposit/withdraw from the vault."
          ],
          relations: [
            "pool"
          ]
        },
        {
          name: "a_vault_lp_mint",
          docs: [
            "LP token mint of vault a"
          ]
        },
        {
          name: "b_vault_lp_mint",
          docs: [
            "LP token mint of vault b"
          ]
        }
      ],
      args: [
        {
          name: "max_amount",
          type: "u64"
        }
      ]
    },
    {
      name: "override_curve_param",
      docs: [
        "Update swap curve parameters. This function do not allow update of curve type. For example: stable swap curve to constant product curve. Only supported by pool with stable swap curve.",
        "Only amp is allowed to be override. The other attributes of stable swap curve will be ignored."
      ],
      discriminator: [
        98,
        86,
        204,
        51,
        94,
        71,
        69,
        187
      ],
      accounts: [
        {
          name: "pool",
          docs: [
            "Pool account (PDA)"
          ],
          writable: true
        },
        {
          name: "admin",
          docs: [
            "Admin account."
          ],
          signer: true
        }
      ],
      args: [
        {
          name: "curve_type",
          type: {
            defined: {
              name: "CurveType"
            }
          }
        }
      ]
    },
    {
      name: "partner_claim_fee",
      docs: [
        "Partner claim fee"
      ],
      discriminator: [
        57,
        53,
        176,
        30,
        123,
        70,
        52,
        64
      ],
      accounts: [
        {
          name: "pool",
          docs: [
            "Pool account (PDA)"
          ],
          writable: true
        },
        {
          name: "a_vault_lp",
          relations: [
            "pool"
          ]
        },
        {
          name: "protocol_token_a_fee",
          writable: true,
          relations: [
            "pool"
          ]
        },
        {
          name: "protocol_token_b_fee",
          writable: true,
          relations: [
            "pool"
          ]
        },
        {
          name: "partner_token_a",
          writable: true
        },
        {
          name: "partner_token_b",
          writable: true
        },
        {
          name: "token_program",
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          name: "partner_authority",
          signer: true
        }
      ],
      args: [
        {
          name: "max_amount_a",
          type: "u64"
        },
        {
          name: "max_amount_b",
          type: "u64"
        }
      ]
    },
    {
      name: "remove_balance_liquidity",
      docs: [
        "Withdraw tokens from the pool in a balanced ratio. User will still able to withdraw from pool even the pool is disabled. This allow user to exit their liquidity when there's some unforeseen event happen."
      ],
      discriminator: [
        133,
        109,
        44,
        179,
        56,
        238,
        114,
        33
      ],
      accounts: [
        {
          name: "pool",
          docs: [
            "Pool account (PDA)"
          ],
          writable: true
        },
        {
          name: "lp_mint",
          docs: [
            "LP token mint of the pool"
          ],
          writable: true,
          relations: [
            "pool"
          ]
        },
        {
          name: "user_pool_lp",
          docs: [
            "user pool lp token account. lp will be burned from this account upon success liquidity removal."
          ],
          writable: true
        },
        {
          name: "a_vault_lp",
          docs: [
            "LP token account of vault A. Used to receive/burn the vault LP upon deposit/withdraw from the vault."
          ],
          writable: true,
          relations: [
            "pool"
          ]
        },
        {
          name: "b_vault_lp",
          docs: [
            "LP token account of vault B. Used to receive/burn the vault LP upon deposit/withdraw from the vault."
          ],
          writable: true,
          relations: [
            "pool"
          ]
        },
        {
          name: "a_vault",
          docs: [
            "Vault account for token a. token a of the pool will be deposit / withdraw from this vault account."
          ],
          writable: true,
          relations: [
            "pool"
          ]
        },
        {
          name: "b_vault",
          docs: [
            "Vault account for token b. token b of the pool will be deposit / withdraw from this vault account."
          ],
          writable: true,
          relations: [
            "pool"
          ]
        },
        {
          name: "a_vault_lp_mint",
          docs: [
            "LP token mint of vault a"
          ],
          writable: true
        },
        {
          name: "b_vault_lp_mint",
          docs: [
            "LP token mint of vault b"
          ],
          writable: true
        },
        {
          name: "a_token_vault",
          docs: [
            "Token vault account of vault A"
          ],
          writable: true
        },
        {
          name: "b_token_vault",
          docs: [
            "Token vault account of vault B"
          ],
          writable: true
        },
        {
          name: "user_a_token",
          docs: [
            "User token A account. Token will be transfer from this account if it is add liquidity operation. Else, token will be transfer into this account."
          ],
          writable: true
        },
        {
          name: "user_b_token",
          docs: [
            "User token B account. Token will be transfer from this account if it is add liquidity operation. Else, token will be transfer into this account."
          ],
          writable: true
        },
        {
          name: "user",
          docs: [
            "User account. Must be owner of user_a_token, and user_b_token."
          ],
          signer: true
        },
        {
          name: "vault_program",
          docs: [
            "Vault program. the pool will deposit/withdraw liquidity from the vault."
          ],
          address: "24Uqj9JCLxUeoC3hGfh5W3s9FM9uCHDS2SG3LYwBpyTi"
        },
        {
          name: "token_program",
          docs: [
            "Token program."
          ],
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      args: [
        {
          name: "pool_token_amount",
          type: "u64"
        },
        {
          name: "minimum_a_token_out",
          type: "u64"
        },
        {
          name: "minimum_b_token_out",
          type: "u64"
        }
      ]
    },
    {
      name: "remove_liquidity_single_side",
      docs: [
        "Withdraw only single token from the pool. Only supported by pool with stable swap curve."
      ],
      discriminator: [
        84,
        84,
        177,
        66,
        254,
        185,
        10,
        251
      ],
      accounts: [
        {
          name: "pool",
          docs: [
            "Pool account (PDA)"
          ],
          writable: true
        },
        {
          name: "lp_mint",
          docs: [
            "LP token mint of the pool"
          ],
          writable: true,
          relations: [
            "pool"
          ]
        },
        {
          name: "user_pool_lp",
          docs: [
            "User pool lp token account. LP will be burned from this account upon success liquidity removal."
          ],
          writable: true
        },
        {
          name: "a_vault_lp",
          docs: [
            "LP token account of vault A. Used to receive/burn the vault LP upon deposit/withdraw from the vault."
          ],
          writable: true,
          relations: [
            "pool"
          ]
        },
        {
          name: "b_vault_lp",
          docs: [
            "LP token account of vault B. Used to receive/burn the vault LP upon deposit/withdraw from the vault."
          ],
          writable: true,
          relations: [
            "pool"
          ]
        },
        {
          name: "a_vault",
          docs: [
            "Vault account for token A. Token A of the pool will be deposit / withdraw from this vault account."
          ],
          writable: true,
          relations: [
            "pool"
          ]
        },
        {
          name: "b_vault",
          docs: [
            "Vault account for token B. Token B of the pool will be deposit / withdraw from this vault account."
          ],
          writable: true,
          relations: [
            "pool"
          ]
        },
        {
          name: "a_vault_lp_mint",
          docs: [
            "LP token mint of vault A"
          ],
          writable: true
        },
        {
          name: "b_vault_lp_mint",
          docs: [
            "LP token mint of vault B"
          ],
          writable: true
        },
        {
          name: "a_token_vault",
          docs: [
            "Token vault account of vault A"
          ],
          writable: true
        },
        {
          name: "b_token_vault",
          docs: [
            "Token vault account of vault B"
          ],
          writable: true
        },
        {
          name: "user_destination_token",
          docs: [
            "User token account to receive token upon success liquidity removal."
          ],
          writable: true
        },
        {
          name: "user",
          docs: [
            "User account. Must be owner of the user_pool_lp account."
          ],
          signer: true
        },
        {
          name: "vault_program",
          docs: [
            "Vault program. The pool will deposit/withdraw liquidity from the vault."
          ],
          address: "24Uqj9JCLxUeoC3hGfh5W3s9FM9uCHDS2SG3LYwBpyTi"
        },
        {
          name: "token_program",
          docs: [
            "Token program."
          ],
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      args: [
        {
          name: "pool_token_amount",
          type: "u64"
        },
        {
          name: "minimum_out_amount",
          type: "u64"
        }
      ]
    },
    {
      name: "set_pool_fees",
      docs: [
        "Update trading fee charged for liquidity provider, and admin."
      ],
      discriminator: [
        102,
        44,
        158,
        54,
        205,
        37,
        126,
        78
      ],
      accounts: [
        {
          name: "pool",
          docs: [
            "Pool account (PDA)"
          ],
          writable: true
        },
        {
          name: "fee_operator",
          docs: [
            "Fee operator account"
          ],
          signer: true
        }
      ],
      args: [
        {
          name: "fees",
          type: {
            defined: {
              name: "PoolFees"
            }
          }
        },
        {
          name: "new_partner_fee_numerator",
          type: "u64"
        }
      ]
    },
    {
      name: "set_whitelisted_vault",
      docs: [
        "Set whitelisted vault"
      ],
      discriminator: [
        12,
        148,
        94,
        42,
        55,
        57,
        83,
        247
      ],
      accounts: [
        {
          name: "pool",
          writable: true
        },
        {
          name: "admin",
          signer: true
        }
      ],
      args: [
        {
          name: "whitelisted_vault",
          type: "pubkey"
        }
      ]
    },
    {
      name: "swap",
      docs: [
        "Swap token A to B, or vice versa. An amount of trading fee will be charged for liquidity provider, and the admin of the pool."
      ],
      discriminator: [
        248,
        198,
        158,
        145,
        225,
        117,
        135,
        200
      ],
      accounts: [
        {
          name: "pool",
          docs: [
            "Pool account (PDA)"
          ],
          writable: true
        },
        {
          name: "user_source_token",
          docs: [
            "User token account. Token from this account will be transfer into the vault by the pool in exchange for another token of the pool."
          ],
          writable: true
        },
        {
          name: "user_destination_token",
          docs: [
            "User token account. The exchanged token will be transfer into this account from the pool."
          ],
          writable: true
        },
        {
          name: "a_vault",
          docs: [
            "Vault account for token a. token a of the pool will be deposit / withdraw from this vault account."
          ],
          writable: true,
          relations: [
            "pool"
          ]
        },
        {
          name: "b_vault",
          docs: [
            "Vault account for token b. token b of the pool will be deposit / withdraw from this vault account."
          ],
          writable: true,
          relations: [
            "pool"
          ]
        },
        {
          name: "a_token_vault",
          docs: [
            "Token vault account of vault A"
          ],
          writable: true
        },
        {
          name: "b_token_vault",
          docs: [
            "Token vault account of vault B"
          ],
          writable: true
        },
        {
          name: "a_vault_lp_mint",
          docs: [
            "Lp token mint of vault a"
          ],
          writable: true
        },
        {
          name: "b_vault_lp_mint",
          docs: [
            "Lp token mint of vault b"
          ],
          writable: true
        },
        {
          name: "a_vault_lp",
          docs: [
            "LP token account of vault A. Used to receive/burn the vault LP upon deposit/withdraw from the vault."
          ],
          writable: true,
          relations: [
            "pool"
          ]
        },
        {
          name: "b_vault_lp",
          docs: [
            "LP token account of vault B. Used to receive/burn the vault LP upon deposit/withdraw from the vault."
          ],
          writable: true,
          relations: [
            "pool"
          ]
        },
        {
          name: "protocol_token_fee",
          docs: [
            "Protocol fee token account. Used to receive trading fee. It's mint field must matched with user_source_token mint field."
          ],
          writable: true
        },
        {
          name: "user",
          docs: [
            "User account. Must be owner of user_source_token."
          ],
          signer: true
        },
        {
          name: "vault_program",
          docs: [
            "Vault program. the pool will deposit/withdraw liquidity from the vault."
          ],
          address: "24Uqj9JCLxUeoC3hGfh5W3s9FM9uCHDS2SG3LYwBpyTi"
        },
        {
          name: "token_program",
          docs: [
            "Token program."
          ],
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      args: [
        {
          name: "in_amount",
          type: "u64"
        },
        {
          name: "minimum_out_amount",
          type: "u64"
        }
      ]
    },
    {
      name: "update_activation_point",
      docs: [
        "Update activation slot"
      ],
      discriminator: [
        150,
        62,
        125,
        219,
        171,
        220,
        26,
        237
      ],
      accounts: [
        {
          name: "pool",
          docs: [
            "Pool account (PDA)"
          ],
          writable: true
        },
        {
          name: "admin",
          docs: [
            "Admin account."
          ],
          signer: true
        }
      ],
      args: [
        {
          name: "new_activation_point",
          type: "u64"
        }
      ]
    },
    {
      name: "withdraw_protocol_fees",
      docs: [
        "Withdraw protocol fee"
      ],
      discriminator: [
        11,
        68,
        165,
        98,
        18,
        208,
        134,
        73
      ],
      accounts: [
        {
          name: "pool",
          docs: [
            "Pool account (PDA)"
          ]
        },
        {
          name: "a_vault_lp",
          relations: [
            "pool"
          ]
        },
        {
          name: "protocol_token_a_fee",
          writable: true,
          relations: [
            "pool"
          ]
        },
        {
          name: "protocol_token_b_fee",
          writable: true,
          relations: [
            "pool"
          ]
        },
        {
          name: "token_a_mint",
          relations: [
            "pool"
          ]
        },
        {
          name: "token_b_mint",
          relations: [
            "pool"
          ]
        },
        {
          name: "treasury_token_a",
          writable: true
        },
        {
          name: "treasury_token_b",
          writable: true
        },
        {
          name: "operator"
        },
        {
          name: "signer",
          signer: true
        },
        {
          name: "token_program",
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      args: [
        {
          name: "max_amount_a",
          type: "u64"
        },
        {
          name: "max_amount_b",
          type: "u64"
        }
      ]
    },
    {
      name: "zap_protocol_fee",
      discriminator: [
        213,
        155,
        187,
        34,
        56,
        182,
        91,
        240
      ],
      accounts: [
        {
          name: "pool"
        },
        {
          name: "a_vault_lp",
          relations: [
            "pool"
          ]
        },
        {
          name: "protocol_token_fee",
          writable: true
        },
        {
          name: "token_mint"
        },
        {
          name: "receiver_token",
          writable: true
        },
        {
          name: "operator",
          docs: [
            "zap claim fee operator"
          ]
        },
        {
          name: "signer",
          docs: [
            "Operator"
          ],
          signer: true
        },
        {
          name: "token_program",
          docs: [
            "Token program"
          ],
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          name: "sysvar_instructions",
          address: "Sysvar1nstructions1111111111111111111111111"
        }
      ],
      args: [
        {
          name: "max_amount",
          type: "u64"
        }
      ]
    }
  ],
  accounts: [
    {
      name: "Config",
      discriminator: [
        155,
        12,
        170,
        224,
        30,
        250,
        204,
        130
      ]
    },
    {
      name: "LockEscrow",
      discriminator: [
        190,
        106,
        121,
        6,
        200,
        182,
        21,
        75
      ]
    },
    {
      name: "Operator",
      discriminator: [
        219,
        31,
        188,
        145,
        69,
        139,
        204,
        117
      ]
    },
    {
      name: "Pool",
      discriminator: [
        241,
        154,
        109,
        4,
        17,
        177,
        109,
        188
      ]
    },
    {
      name: "Vault",
      discriminator: [
        211,
        8,
        232,
        43,
        2,
        152,
        117,
        119
      ]
    }
  ],
  events: [
    {
      name: "AddLiquidity",
      discriminator: [
        31,
        94,
        125,
        90,
        227,
        52,
        61,
        186
      ]
    },
    {
      name: "BootstrapLiquidity",
      discriminator: [
        121,
        127,
        38,
        136,
        92,
        55,
        14,
        247
      ]
    },
    {
      name: "ClaimFee",
      discriminator: [
        75,
        122,
        154,
        48,
        140,
        74,
        123,
        163
      ]
    },
    {
      name: "CloseConfig",
      discriminator: [
        249,
        181,
        108,
        89,
        4,
        150,
        90,
        174
      ]
    },
    {
      name: "CreateConfig",
      discriminator: [
        199,
        152,
        10,
        19,
        39,
        39,
        157,
        104
      ]
    },
    {
      name: "CreateLockEscrow",
      discriminator: [
        74,
        94,
        106,
        141,
        49,
        17,
        98,
        109
      ]
    },
    {
      name: "Lock",
      discriminator: [
        220,
        183,
        67,
        215,
        153,
        207,
        56,
        234
      ]
    },
    {
      name: "MigrateFeeAccount",
      discriminator: [
        223,
        234,
        232,
        26,
        252,
        105,
        180,
        125
      ]
    },
    {
      name: "OverrideCurveParam",
      discriminator: [
        247,
        20,
        165,
        248,
        75,
        5,
        54,
        246
      ]
    },
    {
      name: "PartnerClaimFees",
      discriminator: [
        135,
        131,
        10,
        94,
        119,
        209,
        202,
        48
      ]
    },
    {
      name: "PoolCreated",
      discriminator: [
        202,
        44,
        41,
        88,
        104,
        220,
        157,
        82
      ]
    },
    {
      name: "PoolEnabled",
      discriminator: [
        2,
        151,
        18,
        83,
        204,
        134,
        92,
        191
      ]
    },
    {
      name: "PoolInfo",
      discriminator: [
        207,
        20,
        87,
        97,
        251,
        212,
        234,
        45
      ]
    },
    {
      name: "RemoveLiquidity",
      discriminator: [
        116,
        244,
        97,
        232,
        103,
        31,
        152,
        58
      ]
    },
    {
      name: "SetPoolFees",
      discriminator: [
        245,
        26,
        198,
        164,
        88,
        18,
        75,
        9
      ]
    },
    {
      name: "Swap",
      discriminator: [
        81,
        108,
        227,
        190,
        205,
        208,
        10,
        196
      ]
    },
    {
      name: "TransferAdmin",
      discriminator: [
        228,
        169,
        131,
        244,
        61,
        56,
        65,
        254
      ]
    },
    {
      name: "WithdrawProtocolFees",
      discriminator: [
        30,
        240,
        207,
        196,
        139,
        239,
        79,
        28
      ]
    }
  ],
  errors: [
    {
      code: 6e3,
      name: "MathOverflow",
      msg: "Math operation overflow"
    },
    {
      code: 6001,
      name: "InvalidFee",
      msg: "Invalid fee setup"
    },
    {
      code: 6002,
      name: "InvalidInvariant",
      msg: "Invalid invariant d"
    },
    {
      code: 6003,
      name: "FeeCalculationFailure",
      msg: "Fee calculation failure"
    },
    {
      code: 6004,
      name: "ExceededSlippage",
      msg: "Exceeded slippage tolerance"
    },
    {
      code: 6005,
      name: "InvalidCalculation",
      msg: "Invalid curve calculation"
    },
    {
      code: 6006,
      name: "ZeroTradingTokens",
      msg: "Given pool token amount results in zero trading tokens"
    },
    {
      code: 6007,
      name: "ConversionError",
      msg: "Math conversion overflow"
    },
    {
      code: 6008,
      name: "FaultyLpMint",
      msg: "LP mint authority must be 'A' vault lp, without freeze authority, and 0 supply"
    },
    {
      code: 6009,
      name: "MismatchedTokenMint",
      msg: "Token mint mismatched"
    },
    {
      code: 6010,
      name: "MismatchedLpMint",
      msg: "LP mint mismatched"
    },
    {
      code: 6011,
      name: "MismatchedOwner",
      msg: "Invalid lp token owner"
    },
    {
      code: 6012,
      name: "InvalidVaultAccount",
      msg: "Invalid vault account"
    },
    {
      code: 6013,
      name: "InvalidVaultLpAccount",
      msg: "Invalid vault lp account"
    },
    {
      code: 6014,
      name: "InvalidPoolLpMintAccount",
      msg: "Invalid pool lp mint account"
    },
    {
      code: 6015,
      name: "PoolDisabled",
      msg: "Pool disabled"
    },
    {
      code: 6016,
      name: "InvalidAdminAccount",
      msg: "Invalid admin account"
    },
    {
      code: 6017,
      name: "InvalidProtocolFeeAccount",
      msg: "Invalid protocol fee account"
    },
    {
      code: 6018,
      name: "SameAdminAccount",
      msg: "Same admin account"
    },
    {
      code: 6019,
      name: "IdenticalSourceDestination",
      msg: "Identical user source and destination token account"
    },
    {
      code: 6020,
      name: "ApyCalculationError",
      msg: "Apy calculation error"
    },
    {
      code: 6021,
      name: "InsufficientSnapshot",
      msg: "Insufficient virtual price snapshot"
    },
    {
      code: 6022,
      name: "NonUpdatableCurve",
      msg: "Current curve is non-updatable"
    },
    {
      code: 6023,
      name: "MisMatchedCurve",
      msg: "New curve is mismatched with old curve"
    },
    {
      code: 6024,
      name: "InvalidAmplification",
      msg: "Amplification is invalid"
    },
    {
      code: 6025,
      name: "UnsupportedOperation",
      msg: "Operation is not supported"
    },
    {
      code: 6026,
      name: "ExceedMaxAChanges",
      msg: "Exceed max amplification changes"
    },
    {
      code: 6027,
      name: "InvalidRemainingAccountsLen",
      msg: "Invalid remaining accounts length"
    },
    {
      code: 6028,
      name: "InvalidRemainingAccounts",
      msg: "Invalid remaining account"
    },
    {
      code: 6029,
      name: "MismatchedDepegMint",
      msg: "Token mint B doesn't matches depeg type token mint"
    },
    {
      code: 6030,
      name: "InvalidApyAccount",
      msg: "Invalid APY account"
    },
    {
      code: 6031,
      name: "InvalidTokenMultiplier",
      msg: "Invalid token multiplier"
    },
    {
      code: 6032,
      name: "InvalidDepegInformation",
      msg: "Invalid depeg information"
    },
    {
      code: 6033,
      name: "UpdateTimeConstraint",
      msg: "Update time constraint violated"
    },
    {
      code: 6034,
      name: "ExceedMaxFeeBps",
      msg: "Exceeded max fee bps"
    },
    {
      code: 6035,
      name: "InvalidAdmin",
      msg: "Invalid admin"
    },
    {
      code: 6036,
      name: "PoolIsNotPermissioned",
      msg: "Pool is not permissioned"
    },
    {
      code: 6037,
      name: "InvalidDepositAmount",
      msg: "Invalid deposit amount"
    },
    {
      code: 6038,
      name: "InvalidFeeOwner",
      msg: "Invalid fee owner"
    },
    {
      code: 6039,
      name: "NonDepletedPool",
      msg: "Pool is not depleted"
    },
    {
      code: 6040,
      name: "AmountNotPeg",
      msg: "Token amount is not 1:1"
    },
    {
      code: 6041,
      name: "AmountIsZero",
      msg: "Amount is zero"
    },
    {
      code: 6042,
      name: "TypeCastFailed",
      msg: "Type cast error"
    },
    {
      code: 6043,
      name: "AmountIsNotEnough",
      msg: "Amount is not enough"
    },
    {
      code: 6044,
      name: "InvalidActivationDuration",
      msg: "Invalid activation duration"
    },
    {
      code: 6045,
      name: "PoolIsNotLaunchPool",
      msg: "Pool is not launch pool"
    },
    {
      code: 6046,
      name: "UnableToModifyActivationPoint",
      msg: "Unable to modify activation point"
    },
    {
      code: 6047,
      name: "InvalidAuthorityToCreateThePool",
      msg: "Invalid authority to create the pool"
    },
    {
      code: 6048,
      name: "InvalidActivationType",
      msg: "Invalid activation type"
    },
    {
      code: 6049,
      name: "InvalidActivationPoint",
      msg: "Invalid activation point"
    },
    {
      code: 6050,
      name: "PreActivationSwapStarted",
      msg: "Pre activation swap window started"
    },
    {
      code: 6051,
      name: "InvalidPoolType",
      msg: "Invalid pool type"
    },
    {
      code: 6052,
      name: "InvalidQuoteMint",
      msg: "Quote token must be SOL,USDC"
    },
    {
      code: 6053,
      name: "InvalidTokenMetadataProgram",
      msg: "Invalid token metadata program"
    },
    {
      code: 6054,
      name: "InvalidPermission",
      msg: "Invalid permission"
    },
    {
      code: 6055,
      name: "InvalidZapOutParameters",
      msg: "Invalid zap out parameters"
    },
    {
      code: 6056,
      name: "IncorrectATA",
      msg: "Incorrect ATA"
    },
    {
      code: 6057,
      name: "InvalidWithdrawProtocolFeeZapAccounts",
      msg: "Invalid withdraw protocol fee zap accounts"
    },
    {
      code: 6058,
      name: "MintRestrictedFromZap",
      msg: "SOL,USDC protocol fee cannot be withdrawn via zap"
    },
    {
      code: 6059,
      name: "CpiDisabled",
      msg: "CPI disabled"
    },
    {
      code: 6060,
      name: "MissingZapOutInstruction",
      msg: "Missing zap out instruction"
    },
    {
      code: 6061,
      name: "InvalidZapAccounts",
      msg: "Invalid zap accounts"
    }
  ],
  types: [
    {
      name: "AddLiquidity",
      docs: [
        "Add liquidity event"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "lp_mint_amount",
            docs: [
              "LP amount user received upon add liquidity."
            ],
            type: "u64"
          },
          {
            name: "token_a_amount",
            docs: [
              "Amount of token A user deposited."
            ],
            type: "u64"
          },
          {
            name: "token_b_amount",
            docs: [
              "Amount of token B user deposited."
            ],
            type: "u64"
          }
        ]
      }
    },
    {
      name: "BootstrapLiquidity",
      docs: [
        "Bootstrap liquidity event"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "lp_mint_amount",
            docs: [
              "LP amount user received upon add liquidity."
            ],
            type: "u64"
          },
          {
            name: "token_a_amount",
            docs: [
              "Amount of token A user deposited."
            ],
            type: "u64"
          },
          {
            name: "token_b_amount",
            docs: [
              "Amount of token B user deposited."
            ],
            type: "u64"
          },
          {
            name: "pool",
            docs: [
              "Pool address"
            ],
            type: "pubkey"
          }
        ]
      }
    },
    {
      name: "Bootstrapping",
      type: {
        kind: "struct",
        fields: [
          {
            name: "activation_point",
            docs: [
              "Activation point, can be slot or timestamp"
            ],
            type: "u64"
          },
          {
            name: "whitelisted_vault",
            docs: [
              "Whitelisted vault to be able to buy pool before activation_point"
            ],
            type: "pubkey"
          },
          {
            name: "pool_creator",
            docs: [
              "Need to store pool creator in lauch pool, so they can modify liquidity before activation_point"
            ],
            type: "pubkey"
          },
          {
            name: "activation_type",
            docs: [
              "Activation type, 0 means by slot, 1 means by timestamp"
            ],
            type: "u8"
          }
        ]
      }
    },
    {
      name: "ClaimFee",
      docs: [
        "Claim fee"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool",
            docs: [
              "Pool address"
            ],
            type: "pubkey"
          },
          {
            name: "owner",
            docs: [
              "Owner of lock escrow"
            ],
            type: "pubkey"
          },
          {
            name: "amount",
            docs: [
              "Lp amount"
            ],
            type: "u64"
          },
          {
            name: "a_fee",
            docs: [
              "A fee"
            ],
            type: "u64"
          },
          {
            name: "b_fee",
            docs: [
              "B fee"
            ],
            type: "u64"
          }
        ]
      }
    },
    {
      name: "CloseConfig",
      docs: [
        "Close config"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "config",
            docs: [
              "Config pubkey"
            ],
            type: "pubkey"
          }
        ]
      }
    },
    {
      name: "Config",
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool_fees",
            type: {
              defined: {
                name: "PoolFees"
              }
            }
          },
          {
            name: "activation_duration",
            type: "u64"
          },
          {
            name: "vault_config_key",
            type: "pubkey"
          },
          {
            name: "pool_creator_authority",
            docs: [
              "Only pool_creator_authority can use the current config to initialize new pool. When it's Pubkey::default, it's a public config."
            ],
            type: "pubkey"
          },
          {
            name: "activation_type",
            docs: [
              "Activation type"
            ],
            type: "u8"
          },
          {
            name: "partner_fee_numerator",
            type: "u64"
          },
          {
            name: "_padding",
            type: {
              array: [
                "u8",
                219
              ]
            }
          }
        ]
      }
    },
    {
      name: "ConfigParameters",
      type: {
        kind: "struct",
        fields: [
          {
            name: "trade_fee_numerator",
            type: "u64"
          },
          {
            name: "protocol_trade_fee_numerator",
            type: "u64"
          },
          {
            name: "activation_duration",
            type: "u64"
          },
          {
            name: "vault_config_key",
            type: "pubkey"
          },
          {
            name: "pool_creator_authority",
            type: "pubkey"
          },
          {
            name: "activation_type",
            type: "u8"
          },
          {
            name: "index",
            type: "u64"
          },
          {
            name: "partner_fee_numerator",
            type: "u64"
          }
        ]
      }
    },
    {
      name: "CreateConfig",
      docs: [
        "Create config"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "trade_fee_numerator",
            docs: [
              "New trade fee numerator"
            ],
            type: "u64"
          },
          {
            name: "protocol_trade_fee_numerator",
            docs: [
              "New protocol fee numerator"
            ],
            type: "u64"
          },
          {
            name: "config",
            docs: [
              "Config pubkey"
            ],
            type: "pubkey"
          }
        ]
      }
    },
    {
      name: "CreateLockEscrow",
      docs: [
        "Create lock escrow"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool",
            docs: [
              "Pool address"
            ],
            type: "pubkey"
          },
          {
            name: "owner",
            docs: [
              "Owner of lock escrow"
            ],
            type: "pubkey"
          }
        ]
      }
    },
    {
      name: "CurveType",
      docs: [
        "Type of the swap curve"
      ],
      type: {
        kind: "enum",
        variants: [
          {
            name: "ConstantProduct"
          },
          {
            name: "Stable",
            fields: [
              {
                name: "amp",
                docs: [
                  "Amplification coefficient"
                ],
                type: "u64"
              },
              {
                name: "token_multiplier",
                docs: [
                  "Multiplier for the pool token. Used to normalized token with different decimal into the same precision."
                ],
                type: {
                  defined: {
                    name: "TokenMultiplier"
                  }
                }
              },
              {
                name: "depeg",
                docs: [
                  "Depeg pool information. Contains functions to allow token amount to be repeg using stake / interest bearing token virtual price"
                ],
                type: {
                  defined: {
                    name: "Depeg"
                  }
                }
              },
              {
                name: "last_amp_updated_timestamp",
                docs: [
                  "The last amp updated timestamp. Used to prevent update_curve_info called infinitely many times within a short period"
                ],
                type: "u64"
              }
            ]
          }
        ]
      }
    },
    {
      name: "CustomizableParams",
      type: {
        kind: "struct",
        fields: [
          {
            name: "trade_fee_numerator",
            docs: [
              "Trading fee."
            ],
            type: "u32"
          },
          {
            name: "activation_point",
            docs: [
              "The pool start trading."
            ],
            type: {
              option: "u64"
            }
          },
          {
            name: "has_alpha_vault",
            docs: [
              "Whether the pool support alpha vault"
            ],
            type: "bool"
          },
          {
            name: "activation_type",
            docs: [
              "Activation type"
            ],
            type: "u8"
          },
          {
            name: "padding",
            docs: [
              "Padding"
            ],
            type: {
              array: [
                "u8",
                90
              ]
            }
          }
        ]
      }
    },
    {
      name: "Depeg",
      docs: [
        "Contains information for depeg pool"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "base_virtual_price",
            docs: [
              "The virtual price of staking / interest bearing token"
            ],
            type: "u64"
          },
          {
            name: "base_cache_updated",
            docs: [
              "The last time base_virtual_price is updated"
            ],
            type: "u64"
          },
          {
            name: "depeg_type",
            docs: [
              "Type of the depeg pool"
            ],
            type: {
              defined: {
                name: "DepegType"
              }
            }
          }
        ]
      }
    },
    {
      name: "DepegType",
      docs: [
        "Type of depeg pool"
      ],
      type: {
        kind: "enum",
        variants: [
          {
            name: "None"
          },
          {
            name: "Marinade"
          },
          {
            name: "Lido"
          },
          {
            name: "SplStake"
          }
        ]
      }
    },
    {
      name: "Lock",
      docs: [
        "Lock"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool",
            docs: [
              "Pool address"
            ],
            type: "pubkey"
          },
          {
            name: "owner",
            docs: [
              "Owner of lock escrow"
            ],
            type: "pubkey"
          },
          {
            name: "amount",
            docs: [
              "Locked amount"
            ],
            type: "u64"
          }
        ]
      }
    },
    {
      name: "LockEscrow",
      docs: [
        "State of lock escrow account"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool",
            docs: [
              "Pool address"
            ],
            type: "pubkey"
          },
          {
            name: "owner",
            docs: [
              "Owner address"
            ],
            type: "pubkey"
          },
          {
            name: "escrow_vault",
            docs: [
              "Vault address, store the lock user lock"
            ],
            type: "pubkey"
          },
          {
            name: "bump",
            docs: [
              "bump, used to sign"
            ],
            type: "u8"
          },
          {
            name: "total_locked_amount",
            docs: [
              "Total locked amount"
            ],
            type: "u64"
          },
          {
            name: "lp_per_token",
            docs: [
              "Lp per token, virtual price of lp token"
            ],
            type: "u128"
          },
          {
            name: "unclaimed_fee_pending",
            docs: [
              "Unclaimed fee pending"
            ],
            type: "u64"
          },
          {
            name: "a_fee",
            docs: [
              "Total a fee claimed so far"
            ],
            type: "u64"
          },
          {
            name: "b_fee",
            docs: [
              "Total b fee claimed so far"
            ],
            type: "u64"
          }
        ]
      }
    },
    {
      name: "LockedProfitTracker",
      docs: [
        "LockedProfitTracker struct"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "last_updated_locked_profit",
            docs: [
              "The total locked profit from the last report"
            ],
            type: "u64"
          },
          {
            name: "last_report",
            docs: [
              "The last timestamp (in seconds) rebalancing"
            ],
            type: "u64"
          },
          {
            name: "locked_profit_degradation",
            docs: [
              "Rate per second of degradation"
            ],
            type: "u64"
          }
        ]
      }
    },
    {
      name: "MigrateFeeAccount",
      docs: [
        "Migrate fee account event"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool",
            docs: [
              "Pool address"
            ],
            type: "pubkey"
          },
          {
            name: "new_admin_token_a_fee",
            docs: [
              "New admin token a fee"
            ],
            type: "pubkey"
          },
          {
            name: "new_admin_token_b_fee",
            docs: [
              "New admin token b fee"
            ],
            type: "pubkey"
          },
          {
            name: "token_a_amount",
            docs: [
              "Transfer token a fee amount"
            ],
            type: "u64"
          },
          {
            name: "token_b_amount",
            docs: [
              "Transfer token b fee amount"
            ],
            type: "u64"
          }
        ]
      }
    },
    {
      name: "Operator",
      serialization: "bytemuck",
      repr: {
        kind: "c"
      },
      type: {
        kind: "struct",
        fields: [
          {
            name: "whitelisted_address",
            type: "pubkey"
          },
          {
            name: "permission",
            type: "u128"
          },
          {
            name: "padding",
            type: {
              array: [
                "u64",
                2
              ]
            }
          }
        ]
      }
    },
    {
      name: "OverrideCurveParam",
      docs: [
        "Override curve param event"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "new_amp",
            docs: [
              "The new amplification for stable curve"
            ],
            type: "u64"
          },
          {
            name: "updated_timestamp",
            docs: [
              "Updated timestamp"
            ],
            type: "u64"
          },
          {
            name: "pool",
            docs: [
              "Pool address"
            ],
            type: "pubkey"
          }
        ]
      }
    },
    {
      name: "Padding",
      docs: [
        "Padding for future pool fields"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "padding_0",
            docs: [
              "Padding 0"
            ],
            type: {
              array: [
                "u8",
                6
              ]
            }
          },
          {
            name: "padding_1",
            docs: [
              "Padding 1"
            ],
            type: {
              array: [
                "u64",
                21
              ]
            }
          },
          {
            name: "padding_2",
            docs: [
              "Padding 2"
            ],
            type: {
              array: [
                "u64",
                21
              ]
            }
          }
        ]
      }
    },
    {
      name: "PartnerClaimFees",
      docs: [
        "Partner claim fees"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool",
            docs: [
              "Pool address"
            ],
            type: "pubkey"
          },
          {
            name: "fee_a",
            docs: [
              "Fee B"
            ],
            type: "u64"
          },
          {
            name: "fee_b",
            docs: [
              "Fee B"
            ],
            type: "u64"
          },
          {
            name: "partner",
            docs: [
              "Partner"
            ],
            type: "pubkey"
          }
        ]
      }
    },
    {
      name: "PartnerInfo",
      type: {
        kind: "struct",
        fields: [
          {
            name: "fee_numerator",
            type: "u64"
          },
          {
            name: "partner_authority",
            type: "pubkey"
          },
          {
            name: "pending_fee_a",
            type: "u64"
          },
          {
            name: "pending_fee_b",
            type: "u64"
          }
        ]
      }
    },
    {
      name: "Pool",
      docs: [
        "State of pool account"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "lp_mint",
            docs: [
              "LP token mint of the pool"
            ],
            type: "pubkey"
          },
          {
            name: "token_a_mint",
            docs: [
              "Token A mint of the pool. Eg: USDT"
            ],
            type: "pubkey"
          },
          {
            name: "token_b_mint",
            docs: [
              "Token B mint of the pool. Eg: USDC"
            ],
            type: "pubkey"
          },
          {
            name: "a_vault",
            docs: [
              "Vault account for token A. Token A of the pool will be deposit / withdraw from this vault account."
            ],
            type: "pubkey"
          },
          {
            name: "b_vault",
            docs: [
              "Vault account for token B. Token B of the pool will be deposit / withdraw from this vault account."
            ],
            type: "pubkey"
          },
          {
            name: "a_vault_lp",
            docs: [
              "LP token account of vault A. Used to receive/burn the vault LP upon deposit/withdraw from the vault."
            ],
            type: "pubkey"
          },
          {
            name: "b_vault_lp",
            docs: [
              "LP token account of vault B. Used to receive/burn the vault LP upon deposit/withdraw from the vault."
            ],
            type: "pubkey"
          },
          {
            name: "a_vault_lp_bump",
            docs: [
              '"A" vault lp bump. Used to create signer seeds.'
            ],
            type: "u8"
          },
          {
            name: "enabled",
            docs: [
              "Flag to determine whether the pool is enabled, or disabled."
            ],
            type: "bool"
          },
          {
            name: "protocol_token_a_fee",
            docs: [
              "Protocol fee token account for token A. Used to receive trading fee."
            ],
            type: "pubkey"
          },
          {
            name: "protocol_token_b_fee",
            docs: [
              "Protocol fee token account for token B. Used to receive trading fee."
            ],
            type: "pubkey"
          },
          {
            name: "fee_last_updated_at",
            docs: [
              "Fee last updated timestamp"
            ],
            type: "u64"
          },
          {
            name: "_padding0",
            type: {
              array: [
                "u8",
                24
              ]
            }
          },
          {
            name: "fees",
            docs: [
              "Store the fee charges setting."
            ],
            type: {
              defined: {
                name: "PoolFees"
              }
            }
          },
          {
            name: "pool_type",
            docs: [
              "Pool type"
            ],
            type: {
              defined: {
                name: "PoolType"
              }
            }
          },
          {
            name: "stake",
            docs: [
              "Stake pubkey of SPL stake pool"
            ],
            type: "pubkey"
          },
          {
            name: "total_locked_lp",
            docs: [
              "Total locked lp token"
            ],
            type: "u64"
          },
          {
            name: "bootstrapping",
            docs: [
              "bootstrapping config"
            ],
            type: {
              defined: {
                name: "Bootstrapping"
              }
            }
          },
          {
            name: "partner_info",
            type: {
              defined: {
                name: "PartnerInfo"
              }
            }
          },
          {
            name: "padding",
            docs: [
              "Padding for future pool field"
            ],
            type: {
              defined: {
                name: "Padding"
              }
            }
          },
          {
            name: "curve_type",
            docs: [
              "The type of the swap curve supported by the pool."
            ],
            type: {
              defined: {
                name: "CurveType"
              }
            }
          }
        ]
      }
    },
    {
      name: "PoolCreated",
      docs: [
        "New pool created event"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "lp_mint",
            docs: [
              "LP token mint of the pool"
            ],
            type: "pubkey"
          },
          {
            name: "token_a_mint",
            docs: [
              "Token A mint of the pool. Eg: USDT"
            ],
            type: "pubkey"
          },
          {
            name: "token_b_mint",
            docs: [
              "Token B mint of the pool. Eg: USDC"
            ],
            type: "pubkey"
          },
          {
            name: "pool_type",
            docs: [
              "Pool type"
            ],
            type: {
              defined: {
                name: "PoolType"
              }
            }
          },
          {
            name: "pool",
            docs: [
              "Pool address"
            ],
            type: "pubkey"
          }
        ]
      }
    },
    {
      name: "PoolEnabled",
      docs: [
        "Pool enabled state change event"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool",
            docs: [
              "Pool address"
            ],
            type: "pubkey"
          },
          {
            name: "enabled",
            docs: [
              "Pool enabled state"
            ],
            type: "bool"
          }
        ]
      }
    },
    {
      name: "PoolFees",
      docs: [
        "Information regarding fee charges"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "trade_fee_numerator",
            docs: [
              "Trade fees are extra token amounts that are held inside the token",
              "accounts during a trade, making the value of liquidity tokens rise.",
              "Trade fee numerator"
            ],
            type: "u64"
          },
          {
            name: "trade_fee_denominator",
            docs: [
              "Trade fee denominator"
            ],
            type: "u64"
          },
          {
            name: "protocol_trade_fee_numerator",
            docs: [
              "Protocol trading fees are extra token amounts that are held inside the token",
              "accounts during a trade, with the equivalent in pool tokens minted to",
              "the protocol of the program.",
              "Protocol trade fee numerator"
            ],
            type: "u64"
          },
          {
            name: "protocol_trade_fee_denominator",
            docs: [
              "Protocol trade fee denominator"
            ],
            type: "u64"
          }
        ]
      }
    },
    {
      name: "PoolInfo",
      docs: [
        "Pool info event"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "token_a_amount",
            docs: [
              "Total token A amount in the pool"
            ],
            type: "u64"
          },
          {
            name: "token_b_amount",
            docs: [
              "Total token B amount in the pool"
            ],
            type: "u64"
          },
          {
            name: "virtual_price",
            docs: [
              "Current virtual price"
            ],
            type: "f64"
          },
          {
            name: "current_timestamp",
            docs: [
              "Current unix timestamp"
            ],
            type: "u64"
          }
        ]
      }
    },
    {
      name: "PoolType",
      docs: [
        "Pool type"
      ],
      type: {
        kind: "enum",
        variants: [
          {
            name: "Permissioned"
          },
          {
            name: "Permissionless"
          }
        ]
      }
    },
    {
      name: "RemoveLiquidity",
      docs: [
        "Remove liquidity event"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "lp_unmint_amount",
            docs: [
              "LP amount burned from user upon add remove liquidity."
            ],
            type: "u64"
          },
          {
            name: "token_a_out_amount",
            docs: [
              "Amount of token A user received."
            ],
            type: "u64"
          },
          {
            name: "token_b_out_amount",
            docs: [
              "Amount of token B user received."
            ],
            type: "u64"
          }
        ]
      }
    },
    {
      name: "SetPoolFees",
      docs: [
        "Set pool fees event"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "trade_fee_numerator",
            docs: [
              "New trade fee numerator"
            ],
            type: "u64"
          },
          {
            name: "trade_fee_denominator",
            docs: [
              "New trade fee denominator"
            ],
            type: "u64"
          },
          {
            name: "protocol_trade_fee_numerator",
            docs: [
              "New protocol fee numerator"
            ],
            type: "u64"
          },
          {
            name: "protocol_trade_fee_denominator",
            docs: [
              "New protocol fee denominator"
            ],
            type: "u64"
          },
          {
            name: "pool",
            docs: [
              "Pool address"
            ],
            type: "pubkey"
          }
        ]
      }
    },
    {
      name: "Swap",
      docs: [
        "Swap event"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "in_amount",
            docs: [
              "Token amount user deposited to the pool for token exchange."
            ],
            type: "u64"
          },
          {
            name: "out_amount",
            docs: [
              "Token amount user received from the pool."
            ],
            type: "u64"
          },
          {
            name: "trade_fee",
            docs: [
              "Trading fee charged for liquidity provider."
            ],
            type: "u64"
          },
          {
            name: "protocol_fee",
            docs: [
              "Trading fee charged for the protocol."
            ],
            type: "u64"
          },
          {
            name: "host_fee",
            docs: [
              "Host fee charged"
            ],
            type: "u64"
          }
        ]
      }
    },
    {
      name: "TokenMultiplier",
      docs: [
        "Multiplier for the pool token. Used to normalized token with different decimal into the same precision."
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "token_a_multiplier",
            docs: [
              "Multiplier for token A of the pool."
            ],
            type: "u64"
          },
          {
            name: "token_b_multiplier",
            docs: [
              "Multiplier for token B of the pool."
            ],
            type: "u64"
          },
          {
            name: "precision_factor",
            docs: [
              "Record the highest token decimal in the pool. For example, Token A is 6 decimal, token B is 9 decimal. This will save value of 9."
            ],
            type: "u8"
          }
        ]
      }
    },
    {
      name: "TransferAdmin",
      docs: [
        "Transfer admin event"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "admin",
            docs: [
              "Old admin of the pool"
            ],
            type: "pubkey"
          },
          {
            name: "new_admin",
            docs: [
              "New admin of the pool"
            ],
            type: "pubkey"
          },
          {
            name: "pool",
            docs: [
              "Pool address"
            ],
            type: "pubkey"
          }
        ]
      }
    },
    {
      name: "Vault",
      docs: [
        "Vault struct"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "enabled",
            docs: [
              "The flag, if admin set enable = false, then the user can only withdraw and cannot deposit in the vault."
            ],
            type: "u8"
          },
          {
            name: "bumps",
            docs: [
              "Vault nonce, to create vault seeds"
            ],
            type: {
              defined: {
                name: "VaultBumps"
              }
            }
          },
          {
            name: "total_amount",
            docs: [
              "The total liquidity of the vault, including remaining tokens in token_vault and the liquidity in all strategies."
            ],
            type: "u64"
          },
          {
            name: "token_vault",
            docs: [
              "Token account, hold liquidity in vault reserve"
            ],
            type: "pubkey"
          },
          {
            name: "fee_vault",
            docs: [
              "Hold lp token of vault, each time rebalance crank is called, vault calculate performance fee and mint corresponding lp token amount to fee_vault. fee_vault is owned by treasury address"
            ],
            type: "pubkey"
          },
          {
            name: "token_mint",
            docs: [
              "Token mint that vault supports"
            ],
            type: "pubkey"
          },
          {
            name: "lp_mint",
            docs: [
              "Lp mint of vault"
            ],
            type: "pubkey"
          },
          {
            name: "strategies",
            docs: [
              "The list of strategy addresses that vault supports, vault can support up to MAX_STRATEGY strategies at the same time."
            ],
            type: {
              array: [
                "pubkey",
                30
              ]
            }
          },
          {
            name: "base",
            docs: [
              "The base address to create vault seeds"
            ],
            type: "pubkey"
          },
          {
            name: "admin",
            docs: [
              "Admin of vault"
            ],
            type: "pubkey"
          },
          {
            name: "operator",
            docs: [
              "Person who can send the crank. Operator can only send liquidity to strategies that admin defined, and claim reward to account of treasury address"
            ],
            type: "pubkey"
          },
          {
            name: "locked_profit_tracker",
            docs: [
              "Stores information for locked profit."
            ],
            type: {
              defined: {
                name: "LockedProfitTracker"
              }
            }
          }
        ]
      }
    },
    {
      name: "VaultBumps",
      docs: [
        "Vault bumps struct"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "vault_bump",
            docs: [
              "vault_bump"
            ],
            type: "u8"
          },
          {
            name: "token_vault_bump",
            docs: [
              "token_vault_bump"
            ],
            type: "u8"
          }
        ]
      }
    },
    {
      name: "WithdrawProtocolFees",
      docs: [
        "Withdraw protocol fees"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool",
            docs: [
              "Pool address"
            ],
            type: "pubkey"
          },
          {
            name: "protocol_a_fee",
            docs: [
              "Protocol A fee being withdrawn"
            ],
            type: "u64"
          },
          {
            name: "protocol_b_fee",
            docs: [
              "Protocol B fee being withdrawn"
            ],
            type: "u64"
          },
          {
            name: "protocol_a_fee_owner",
            docs: [
              "Protocol A fee owner"
            ],
            type: "pubkey"
          },
          {
            name: "protocol_b_fee_owner",
            docs: [
              "Protocol B fee owner"
            ],
            type: "pubkey"
          }
        ]
      }
    }
  ]
};

// src/idl/damm-v2/idl.json
var idl_default4 = {
  address: "cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG",
  metadata: {
    name: "cp_amm",
    version: "0.2.4",
    spec: "0.1.0",
    description: "Created with Anchor"
  },
  instructions: [
    {
      name: "add_liquidity",
      discriminator: [
        181,
        157,
        89,
        67,
        143,
        182,
        52,
        72
      ],
      accounts: [
        {
          name: "pool",
          writable: true,
          relations: [
            "position"
          ]
        },
        {
          name: "position",
          writable: true
        },
        {
          name: "token_a_account",
          docs: [
            "The user token a account"
          ],
          writable: true
        },
        {
          name: "token_b_account",
          docs: [
            "The user token b account"
          ],
          writable: true
        },
        {
          name: "token_a_vault",
          docs: [
            "The vault token account for input token"
          ],
          writable: true,
          relations: [
            "pool"
          ]
        },
        {
          name: "token_b_vault",
          docs: [
            "The vault token account for output token"
          ],
          writable: true,
          relations: [
            "pool"
          ]
        },
        {
          name: "token_a_mint",
          docs: [
            "The mint of token a"
          ],
          relations: [
            "pool"
          ]
        },
        {
          name: "token_b_mint",
          docs: [
            "The mint of token b"
          ],
          relations: [
            "pool"
          ]
        },
        {
          name: "position_nft_account",
          docs: [
            "The token account for nft"
          ]
        },
        {
          name: "signer",
          docs: [
            "Signer"
          ],
          signer: true
        },
        {
          name: "token_a_program",
          docs: [
            "Token a program"
          ]
        },
        {
          name: "token_b_program",
          docs: [
            "Token b program"
          ]
        },
        {
          name: "event_authority"
        },
        {
          name: "program"
        }
      ],
      args: [
        {
          name: "params",
          type: {
            defined: {
              name: "AddLiquidityParameters"
            }
          }
        }
      ]
    },
    {
      name: "claim_position_fee",
      discriminator: [
        180,
        38,
        154,
        17,
        133,
        33,
        162,
        211
      ],
      accounts: [
        {
          name: "pool_authority",
          address: "HLnpSz9h2S4hiLQ43rnSD9XkcUThA7B8hQMKmDaiTLcC"
        },
        {
          name: "pool",
          relations: [
            "position"
          ]
        },
        {
          name: "position",
          writable: true
        },
        {
          name: "token_a_account",
          docs: [
            "The user token a account"
          ],
          writable: true
        },
        {
          name: "token_b_account",
          docs: [
            "The user token b account"
          ],
          writable: true
        },
        {
          name: "token_a_vault",
          docs: [
            "The vault token account for input token"
          ],
          writable: true,
          relations: [
            "pool"
          ]
        },
        {
          name: "token_b_vault",
          docs: [
            "The vault token account for output token"
          ],
          writable: true,
          relations: [
            "pool"
          ]
        },
        {
          name: "token_a_mint",
          docs: [
            "The mint of token a"
          ],
          relations: [
            "pool"
          ]
        },
        {
          name: "token_b_mint",
          docs: [
            "The mint of token b"
          ],
          relations: [
            "pool"
          ]
        },
        {
          name: "position_nft_account",
          docs: [
            "The token account for nft"
          ]
        },
        {
          name: "signer",
          docs: [
            "Signer"
          ],
          signer: true
        },
        {
          name: "token_a_program",
          docs: [
            "Token a program"
          ]
        },
        {
          name: "token_b_program",
          docs: [
            "Token b program"
          ]
        },
        {
          name: "event_authority"
        },
        {
          name: "program"
        }
      ],
      args: []
    },
    {
      name: "claim_protocol_fee2",
      discriminator: [
        235,
        194,
        54,
        69,
        65,
        10,
        236,
        112
      ],
      accounts: [
        {
          name: "receiver_token_account",
          docs: [
            "receiver token account for the claimed token. validated through the protocol_fee program"
          ],
          writable: true
        },
        {
          name: "token_a_mint",
          relations: [
            "pool"
          ]
        },
        {
          name: "token_b_mint",
          relations: [
            "pool"
          ]
        },
        {
          name: "token_a_program"
        },
        {
          name: "token_b_program"
        },
        {
          name: "pool",
          writable: true
        },
        {
          name: "token_a_vault",
          writable: true,
          relations: [
            "pool"
          ]
        },
        {
          name: "token_b_vault",
          writable: true,
          relations: [
            "pool"
          ]
        },
        {
          name: "pool_authority",
          address: "HLnpSz9h2S4hiLQ43rnSD9XkcUThA7B8hQMKmDaiTLcC"
        },
        {
          name: "signer",
          signer: true,
          address: "FkU5rQCWQM131skHCpcEbK8P1JrQGsBgqXe55w525SSF"
        }
      ],
      args: [
        {
          name: "max_amount",
          type: "u64"
        }
      ]
    },
    {
      name: "claim_reward",
      discriminator: [
        149,
        95,
        181,
        242,
        94,
        90,
        158,
        162
      ],
      accounts: [
        {
          name: "pool_authority",
          address: "HLnpSz9h2S4hiLQ43rnSD9XkcUThA7B8hQMKmDaiTLcC"
        },
        {
          name: "pool",
          writable: true,
          relations: [
            "position"
          ]
        },
        {
          name: "position",
          writable: true
        },
        {
          name: "reward_vault",
          docs: [
            "The vault token account for reward token"
          ],
          writable: true
        },
        {
          name: "reward_mint"
        },
        {
          name: "user_token_account",
          writable: true
        },
        {
          name: "position_nft_account",
          docs: [
            "The token account for nft"
          ]
        },
        {
          name: "signer",
          docs: [
            "Signer"
          ],
          signer: true
        },
        {
          name: "token_program"
        },
        {
          name: "event_authority"
        },
        {
          name: "program"
        }
      ],
      args: [
        {
          name: "reward_index",
          type: "u8"
        },
        {
          name: "skip_reward",
          type: "u8"
        }
      ]
    },
    {
      name: "close_config",
      discriminator: [
        145,
        9,
        72,
        157,
        95,
        125,
        61,
        85
      ],
      accounts: [
        {
          name: "config",
          writable: true
        },
        {
          name: "operator"
        },
        {
          name: "signer",
          signer: true
        },
        {
          name: "rent_receiver",
          writable: true
        },
        {
          name: "event_authority"
        },
        {
          name: "program"
        }
      ],
      args: []
    },
    {
      name: "close_operator_account",
      discriminator: [
        171,
        9,
        213,
        74,
        120,
        23,
        3,
        29
      ],
      accounts: [
        {
          name: "operator",
          writable: true
        },
        {
          name: "signer",
          signer: true
        },
        {
          name: "rent_receiver",
          writable: true
        },
        {
          name: "event_authority"
        },
        {
          name: "program"
        }
      ],
      args: []
    },
    {
      name: "close_position",
      discriminator: [
        123,
        134,
        81,
        0,
        49,
        68,
        98,
        98
      ],
      accounts: [
        {
          name: "position_nft_mint",
          docs: [
            "position_nft_mint"
          ],
          writable: true
        },
        {
          name: "position_nft_account",
          docs: [
            "The token account for nft"
          ],
          writable: true
        },
        {
          name: "pool",
          writable: true,
          relations: [
            "position"
          ]
        },
        {
          name: "position",
          writable: true
        },
        {
          name: "pool_authority",
          address: "HLnpSz9h2S4hiLQ43rnSD9XkcUThA7B8hQMKmDaiTLcC"
        },
        {
          name: "rent_receiver",
          writable: true
        },
        {
          name: "owner",
          docs: [
            "Owner of position"
          ],
          signer: true
        },
        {
          name: "token_program",
          docs: [
            "Program to create NFT mint/token account and transfer for token22 account"
          ],
          address: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          name: "event_authority"
        },
        {
          name: "program"
        }
      ],
      args: []
    },
    {
      name: "close_token_badge",
      discriminator: [
        108,
        146,
        86,
        110,
        179,
        254,
        10,
        104
      ],
      accounts: [
        {
          name: "token_badge",
          writable: true
        },
        {
          name: "operator"
        },
        {
          name: "signer",
          signer: true
        },
        {
          name: "rent_receiver",
          writable: true
        },
        {
          name: "event_authority"
        },
        {
          name: "program"
        }
      ],
      args: []
    },
    {
      name: "create_config",
      docs: [
        "OPERATOR FUNCTIONS /////"
      ],
      discriminator: [
        201,
        207,
        243,
        114,
        75,
        111,
        47,
        189
      ],
      accounts: [
        {
          name: "config",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                kind: "arg",
                path: "index"
              }
            ]
          }
        },
        {
          name: "operator"
        },
        {
          name: "signer",
          signer: true
        },
        {
          name: "payer",
          writable: true,
          signer: true
        },
        {
          name: "system_program",
          address: "11111111111111111111111111111111"
        },
        {
          name: "event_authority"
        },
        {
          name: "program"
        }
      ],
      args: [
        {
          name: "index",
          type: "u64"
        },
        {
          name: "config_parameters",
          type: {
            defined: {
              name: "StaticConfigParameters"
            }
          }
        }
      ]
    },
    {
      name: "create_dynamic_config",
      discriminator: [
        81,
        251,
        122,
        78,
        66,
        57,
        208,
        82
      ],
      accounts: [
        {
          name: "config",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                kind: "arg",
                path: "index"
              }
            ]
          }
        },
        {
          name: "operator"
        },
        {
          name: "signer",
          signer: true
        },
        {
          name: "payer",
          writable: true,
          signer: true
        },
        {
          name: "system_program",
          address: "11111111111111111111111111111111"
        },
        {
          name: "event_authority"
        },
        {
          name: "program"
        }
      ],
      args: [
        {
          name: "index",
          type: "u64"
        },
        {
          name: "config_parameters",
          type: {
            defined: {
              name: "DynamicConfigParameters"
            }
          }
        }
      ]
    },
    {
      name: "create_operator_account",
      docs: [
        "ADMIN FUNCTIONS /////"
      ],
      discriminator: [
        221,
        64,
        246,
        149,
        240,
        153,
        229,
        163
      ],
      accounts: [
        {
          name: "operator",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  111,
                  112,
                  101,
                  114,
                  97,
                  116,
                  111,
                  114
                ]
              },
              {
                kind: "account",
                path: "whitelisted_address"
              }
            ]
          }
        },
        {
          name: "whitelisted_address"
        },
        {
          name: "signer",
          signer: true
        },
        {
          name: "payer",
          writable: true,
          signer: true
        },
        {
          name: "system_program",
          address: "11111111111111111111111111111111"
        },
        {
          name: "event_authority"
        },
        {
          name: "program"
        }
      ],
      args: [
        {
          name: "permission",
          type: "u128"
        }
      ]
    },
    {
      name: "create_position",
      discriminator: [
        48,
        215,
        197,
        153,
        96,
        203,
        180,
        133
      ],
      accounts: [
        {
          name: "owner"
        },
        {
          name: "position_nft_mint",
          docs: [
            "position_nft_mint"
          ],
          writable: true,
          signer: true
        },
        {
          name: "position_nft_account",
          docs: [
            "position nft account"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110,
                  95,
                  110,
                  102,
                  116,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                kind: "account",
                path: "position_nft_mint"
              }
            ]
          }
        },
        {
          name: "pool",
          writable: true
        },
        {
          name: "position",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                kind: "account",
                path: "position_nft_mint"
              }
            ]
          }
        },
        {
          name: "pool_authority",
          address: "HLnpSz9h2S4hiLQ43rnSD9XkcUThA7B8hQMKmDaiTLcC"
        },
        {
          name: "payer",
          docs: [
            "Address paying to create the position. Can be anyone"
          ],
          writable: true,
          signer: true
        },
        {
          name: "token_program",
          docs: [
            "Program to create NFT mint/token account and transfer for token22 account"
          ],
          address: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          name: "system_program",
          address: "11111111111111111111111111111111"
        },
        {
          name: "event_authority"
        },
        {
          name: "program"
        }
      ],
      args: []
    },
    {
      name: "create_token_badge",
      discriminator: [
        88,
        206,
        0,
        91,
        60,
        175,
        151,
        118
      ],
      accounts: [
        {
          name: "token_badge",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  98,
                  97,
                  100,
                  103,
                  101
                ]
              },
              {
                kind: "account",
                path: "token_mint"
              }
            ]
          }
        },
        {
          name: "token_mint"
        },
        {
          name: "operator"
        },
        {
          name: "signer",
          signer: true
        },
        {
          name: "payer",
          writable: true,
          signer: true
        },
        {
          name: "system_program",
          address: "11111111111111111111111111111111"
        },
        {
          name: "event_authority"
        },
        {
          name: "program"
        }
      ],
      args: []
    },
    {
      name: "dummy_ix",
      discriminator: [
        234,
        95,
        176,
        185,
        7,
        42,
        35,
        159
      ],
      accounts: [
        {
          name: "pod_aligned_fee_time_scheduler"
        },
        {
          name: "pod_aligned_fee_rate_limiter"
        },
        {
          name: "pod_aligned_fee_market_cap_scheduler"
        }
      ],
      args: [
        {
          name: "_ixs",
          type: {
            defined: {
              name: "DummyParams"
            }
          }
        }
      ]
    },
    {
      name: "fix_config_fee_params",
      discriminator: [
        38,
        30,
        216,
        81,
        250,
        177,
        243,
        254
      ],
      accounts: [
        {
          name: "config",
          writable: true
        },
        {
          name: "operator"
        },
        {
          name: "signer",
          signer: true
        }
      ],
      args: [
        {
          name: "params",
          type: {
            defined: {
              name: "BaseFeeParameters"
            }
          }
        }
      ]
    },
    {
      name: "fix_pool_fee_params",
      discriminator: [
        132,
        98,
        81,
        196,
        44,
        58,
        120,
        193
      ],
      accounts: [
        {
          name: "pool",
          writable: true
        },
        {
          name: "operator"
        },
        {
          name: "signer",
          signer: true
        }
      ],
      args: [
        {
          name: "params",
          type: {
            defined: {
              name: "BaseFeeParameters"
            }
          }
        }
      ]
    },
    {
      name: "fix_pool_layout_version",
      discriminator: [
        166,
        158,
        69,
        35,
        81,
        167,
        200,
        215
      ],
      accounts: [
        {
          name: "pool",
          writable: true
        },
        {
          name: "operator"
        },
        {
          name: "signer",
          signer: true
        }
      ],
      args: []
    },
    {
      name: "fund_reward",
      discriminator: [
        188,
        50,
        249,
        165,
        93,
        151,
        38,
        63
      ],
      accounts: [
        {
          name: "pool",
          writable: true
        },
        {
          name: "reward_vault",
          writable: true
        },
        {
          name: "reward_mint"
        },
        {
          name: "funder_token_account",
          writable: true
        },
        {
          name: "funder",
          signer: true
        },
        {
          name: "token_program"
        },
        {
          name: "event_authority"
        },
        {
          name: "program"
        }
      ],
      args: [
        {
          name: "reward_index",
          type: "u8"
        },
        {
          name: "amount",
          type: "u64"
        },
        {
          name: "carry_forward",
          type: "bool"
        }
      ]
    },
    {
      name: "initialize_customizable_pool",
      discriminator: [
        20,
        161,
        241,
        24,
        189,
        221,
        180,
        2
      ],
      accounts: [
        {
          name: "creator"
        },
        {
          name: "position_nft_mint",
          docs: [
            "position_nft_mint"
          ],
          writable: true,
          signer: true
        },
        {
          name: "position_nft_account",
          docs: [
            "position nft account"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110,
                  95,
                  110,
                  102,
                  116,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                kind: "account",
                path: "position_nft_mint"
              }
            ]
          }
        },
        {
          name: "payer",
          docs: [
            "Address paying to create the pool. Can be anyone"
          ],
          writable: true,
          signer: true
        },
        {
          name: "pool_authority",
          address: "HLnpSz9h2S4hiLQ43rnSD9XkcUThA7B8hQMKmDaiTLcC"
        },
        {
          name: "pool",
          docs: [
            "Initialize an account to store the pool state"
          ],
          writable: true
        },
        {
          name: "position",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                kind: "account",
                path: "position_nft_mint"
              }
            ]
          }
        },
        {
          name: "token_a_mint",
          docs: [
            "Token a mint"
          ]
        },
        {
          name: "token_b_mint",
          docs: [
            "Token b mint"
          ]
        },
        {
          name: "token_a_vault",
          docs: [
            "Token a vault for the pool"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                kind: "account",
                path: "token_a_mint"
              },
              {
                kind: "account",
                path: "pool"
              }
            ]
          }
        },
        {
          name: "token_b_vault",
          docs: [
            "Token b vault for the pool"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                kind: "account",
                path: "token_b_mint"
              },
              {
                kind: "account",
                path: "pool"
              }
            ]
          }
        },
        {
          name: "payer_token_a",
          docs: [
            "payer token a account"
          ],
          writable: true
        },
        {
          name: "payer_token_b",
          docs: [
            "creator token b account"
          ],
          writable: true
        },
        {
          name: "token_a_program",
          docs: [
            "Program to create mint account and mint tokens"
          ]
        },
        {
          name: "token_b_program",
          docs: [
            "Program to create mint account and mint tokens"
          ]
        },
        {
          name: "token_2022_program",
          docs: [
            "Program to create NFT mint/token account and transfer for token22 account"
          ],
          address: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          name: "system_program",
          address: "11111111111111111111111111111111"
        },
        {
          name: "event_authority"
        },
        {
          name: "program"
        }
      ],
      args: [
        {
          name: "params",
          type: {
            defined: {
              name: "InitializeCustomizablePoolParameters"
            }
          }
        }
      ]
    },
    {
      name: "initialize_pool",
      docs: [
        "USER FUNCTIONS ////"
      ],
      discriminator: [
        95,
        180,
        10,
        172,
        84,
        174,
        232,
        40
      ],
      accounts: [
        {
          name: "creator"
        },
        {
          name: "position_nft_mint",
          docs: [
            "position_nft_mint"
          ],
          writable: true,
          signer: true
        },
        {
          name: "position_nft_account",
          docs: [
            "position nft account"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110,
                  95,
                  110,
                  102,
                  116,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                kind: "account",
                path: "position_nft_mint"
              }
            ]
          }
        },
        {
          name: "payer",
          docs: [
            "Address paying to create the pool. Can be anyone"
          ],
          writable: true,
          signer: true
        },
        {
          name: "config",
          docs: [
            "Which config the pool belongs to."
          ]
        },
        {
          name: "pool_authority",
          address: "HLnpSz9h2S4hiLQ43rnSD9XkcUThA7B8hQMKmDaiTLcC"
        },
        {
          name: "pool",
          docs: [
            "Initialize an account to store the pool state"
          ],
          writable: true
        },
        {
          name: "position",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                kind: "account",
                path: "position_nft_mint"
              }
            ]
          }
        },
        {
          name: "token_a_mint",
          docs: [
            "Token a mint"
          ]
        },
        {
          name: "token_b_mint",
          docs: [
            "Token b mint"
          ]
        },
        {
          name: "token_a_vault",
          docs: [
            "Token a vault for the pool"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                kind: "account",
                path: "token_a_mint"
              },
              {
                kind: "account",
                path: "pool"
              }
            ]
          }
        },
        {
          name: "token_b_vault",
          docs: [
            "Token b vault for the pool"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                kind: "account",
                path: "token_b_mint"
              },
              {
                kind: "account",
                path: "pool"
              }
            ]
          }
        },
        {
          name: "payer_token_a",
          docs: [
            "payer token a account"
          ],
          writable: true
        },
        {
          name: "payer_token_b",
          docs: [
            "creator token b account"
          ],
          writable: true
        },
        {
          name: "token_a_program",
          docs: [
            "Program to create mint account and mint tokens"
          ]
        },
        {
          name: "token_b_program",
          docs: [
            "Program to create mint account and mint tokens"
          ]
        },
        {
          name: "token_2022_program",
          docs: [
            "Program to create NFT mint/token account and transfer for token22 account"
          ],
          address: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          name: "system_program",
          address: "11111111111111111111111111111111"
        },
        {
          name: "event_authority"
        },
        {
          name: "program"
        }
      ],
      args: [
        {
          name: "params",
          type: {
            defined: {
              name: "InitializePoolParameters"
            }
          }
        }
      ]
    },
    {
      name: "initialize_pool_with_dynamic_config",
      discriminator: [
        149,
        82,
        72,
        197,
        253,
        252,
        68,
        15
      ],
      accounts: [
        {
          name: "creator"
        },
        {
          name: "position_nft_mint",
          docs: [
            "position_nft_mint"
          ],
          writable: true,
          signer: true
        },
        {
          name: "position_nft_account",
          docs: [
            "position nft account"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110,
                  95,
                  110,
                  102,
                  116,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                kind: "account",
                path: "position_nft_mint"
              }
            ]
          }
        },
        {
          name: "payer",
          docs: [
            "Address paying to create the pool. Can be anyone"
          ],
          writable: true,
          signer: true
        },
        {
          name: "pool_creator_authority",
          signer: true,
          relations: [
            "config"
          ]
        },
        {
          name: "config",
          docs: [
            "Which config the pool belongs to."
          ]
        },
        {
          name: "pool_authority",
          address: "HLnpSz9h2S4hiLQ43rnSD9XkcUThA7B8hQMKmDaiTLcC"
        },
        {
          name: "pool",
          docs: [
            "Initialize an account to store the pool state"
          ],
          writable: true
        },
        {
          name: "position",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                kind: "account",
                path: "position_nft_mint"
              }
            ]
          }
        },
        {
          name: "token_a_mint",
          docs: [
            "Token a mint"
          ]
        },
        {
          name: "token_b_mint",
          docs: [
            "Token b mint"
          ]
        },
        {
          name: "token_a_vault",
          docs: [
            "Token a vault for the pool"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                kind: "account",
                path: "token_a_mint"
              },
              {
                kind: "account",
                path: "pool"
              }
            ]
          }
        },
        {
          name: "token_b_vault",
          docs: [
            "Token b vault for the pool"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                kind: "account",
                path: "token_b_mint"
              },
              {
                kind: "account",
                path: "pool"
              }
            ]
          }
        },
        {
          name: "payer_token_a",
          docs: [
            "payer token a account"
          ],
          writable: true
        },
        {
          name: "payer_token_b",
          docs: [
            "creator token b account"
          ],
          writable: true
        },
        {
          name: "token_a_program",
          docs: [
            "Program to create mint account and mint tokens"
          ]
        },
        {
          name: "token_b_program",
          docs: [
            "Program to create mint account and mint tokens"
          ]
        },
        {
          name: "token_2022_program",
          docs: [
            "Program to create NFT mint/token account and transfer for token22 account"
          ],
          address: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          name: "system_program",
          address: "11111111111111111111111111111111"
        },
        {
          name: "event_authority"
        },
        {
          name: "program"
        }
      ],
      args: [
        {
          name: "params",
          type: {
            defined: {
              name: "InitializeCustomizablePoolParameters"
            }
          }
        }
      ]
    },
    {
      name: "initialize_reward",
      discriminator: [
        95,
        135,
        192,
        196,
        242,
        129,
        230,
        68
      ],
      accounts: [
        {
          name: "pool_authority",
          address: "HLnpSz9h2S4hiLQ43rnSD9XkcUThA7B8hQMKmDaiTLcC"
        },
        {
          name: "pool",
          writable: true
        },
        {
          name: "reward_vault",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  114,
                  101,
                  119,
                  97,
                  114,
                  100,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                kind: "account",
                path: "pool"
              },
              {
                kind: "arg",
                path: "reward_index"
              }
            ]
          }
        },
        {
          name: "reward_mint"
        },
        {
          name: "signer",
          signer: true
        },
        {
          name: "payer",
          writable: true,
          signer: true
        },
        {
          name: "token_program"
        },
        {
          name: "system_program",
          address: "11111111111111111111111111111111"
        },
        {
          name: "event_authority"
        },
        {
          name: "program"
        }
      ],
      args: [
        {
          name: "reward_index",
          type: "u8"
        },
        {
          name: "reward_duration",
          type: "u64"
        },
        {
          name: "funder",
          type: "pubkey"
        }
      ]
    },
    {
      name: "lock_inner_position",
      discriminator: [
        72,
        19,
        49,
        204,
        18,
        122,
        23,
        90
      ],
      accounts: [
        {
          name: "pool",
          relations: [
            "position"
          ]
        },
        {
          name: "position",
          writable: true
        },
        {
          name: "position_nft_account",
          docs: [
            "The token account for nft"
          ]
        },
        {
          name: "signer",
          docs: [
            "Signer"
          ],
          signer: true
        },
        {
          name: "event_authority"
        },
        {
          name: "program"
        }
      ],
      args: [
        {
          name: "params",
          type: {
            defined: {
              name: "VestingParameters"
            }
          }
        }
      ]
    },
    {
      name: "lock_position",
      discriminator: [
        227,
        62,
        2,
        252,
        247,
        10,
        171,
        185
      ],
      accounts: [
        {
          name: "pool",
          relations: [
            "position"
          ]
        },
        {
          name: "position",
          writable: true
        },
        {
          name: "vesting",
          writable: true,
          signer: true
        },
        {
          name: "position_nft_account",
          docs: [
            "The token account for nft"
          ]
        },
        {
          name: "signer",
          docs: [
            "Signer"
          ],
          signer: true
        },
        {
          name: "payer",
          writable: true,
          signer: true
        },
        {
          name: "system_program",
          address: "11111111111111111111111111111111"
        },
        {
          name: "event_authority"
        },
        {
          name: "program"
        }
      ],
      args: [
        {
          name: "params",
          type: {
            defined: {
              name: "VestingParameters"
            }
          }
        }
      ]
    },
    {
      name: "permanent_lock_position",
      discriminator: [
        165,
        176,
        125,
        6,
        231,
        171,
        186,
        213
      ],
      accounts: [
        {
          name: "pool",
          writable: true,
          relations: [
            "position"
          ]
        },
        {
          name: "position",
          writable: true
        },
        {
          name: "position_nft_account",
          docs: [
            "The token account for nft"
          ]
        },
        {
          name: "signer",
          docs: [
            "Signer"
          ],
          signer: true
        },
        {
          name: "event_authority"
        },
        {
          name: "program"
        }
      ],
      args: [
        {
          name: "permanent_lock_liquidity",
          type: "u128"
        }
      ]
    },
    {
      name: "refresh_vesting",
      discriminator: [
        9,
        94,
        216,
        14,
        116,
        204,
        247,
        0
      ],
      accounts: [
        {
          name: "pool",
          relations: [
            "position"
          ]
        },
        {
          name: "position",
          writable: true
        },
        {
          name: "position_nft_account",
          docs: [
            "The token account for nft"
          ]
        },
        {
          name: "owner"
        }
      ],
      args: []
    },
    {
      name: "remove_all_liquidity",
      discriminator: [
        10,
        51,
        61,
        35,
        112,
        105,
        24,
        85
      ],
      accounts: [
        {
          name: "pool_authority",
          address: "HLnpSz9h2S4hiLQ43rnSD9XkcUThA7B8hQMKmDaiTLcC"
        },
        {
          name: "pool",
          writable: true,
          relations: [
            "position"
          ]
        },
        {
          name: "position",
          writable: true
        },
        {
          name: "token_a_account",
          docs: [
            "The user token a account"
          ],
          writable: true
        },
        {
          name: "token_b_account",
          docs: [
            "The user token b account"
          ],
          writable: true
        },
        {
          name: "token_a_vault",
          docs: [
            "The vault token account for input token"
          ],
          writable: true,
          relations: [
            "pool"
          ]
        },
        {
          name: "token_b_vault",
          docs: [
            "The vault token account for output token"
          ],
          writable: true,
          relations: [
            "pool"
          ]
        },
        {
          name: "token_a_mint",
          docs: [
            "The mint of token a"
          ],
          relations: [
            "pool"
          ]
        },
        {
          name: "token_b_mint",
          docs: [
            "The mint of token b"
          ],
          relations: [
            "pool"
          ]
        },
        {
          name: "position_nft_account",
          docs: [
            "The token account for nft"
          ]
        },
        {
          name: "signer",
          docs: [
            "Signer"
          ],
          signer: true
        },
        {
          name: "token_a_program",
          docs: [
            "Token a program"
          ]
        },
        {
          name: "token_b_program",
          docs: [
            "Token b program"
          ]
        },
        {
          name: "event_authority"
        },
        {
          name: "program"
        }
      ],
      args: [
        {
          name: "token_a_amount_threshold",
          type: "u64"
        },
        {
          name: "token_b_amount_threshold",
          type: "u64"
        }
      ]
    },
    {
      name: "remove_liquidity",
      discriminator: [
        80,
        85,
        209,
        72,
        24,
        206,
        177,
        108
      ],
      accounts: [
        {
          name: "pool_authority",
          address: "HLnpSz9h2S4hiLQ43rnSD9XkcUThA7B8hQMKmDaiTLcC"
        },
        {
          name: "pool",
          writable: true,
          relations: [
            "position"
          ]
        },
        {
          name: "position",
          writable: true
        },
        {
          name: "token_a_account",
          docs: [
            "The user token a account"
          ],
          writable: true
        },
        {
          name: "token_b_account",
          docs: [
            "The user token b account"
          ],
          writable: true
        },
        {
          name: "token_a_vault",
          docs: [
            "The vault token account for input token"
          ],
          writable: true,
          relations: [
            "pool"
          ]
        },
        {
          name: "token_b_vault",
          docs: [
            "The vault token account for output token"
          ],
          writable: true,
          relations: [
            "pool"
          ]
        },
        {
          name: "token_a_mint",
          docs: [
            "The mint of token a"
          ],
          relations: [
            "pool"
          ]
        },
        {
          name: "token_b_mint",
          docs: [
            "The mint of token b"
          ],
          relations: [
            "pool"
          ]
        },
        {
          name: "position_nft_account",
          docs: [
            "The token account for nft"
          ]
        },
        {
          name: "signer",
          docs: [
            "Signer"
          ],
          signer: true
        },
        {
          name: "token_a_program",
          docs: [
            "Token a program"
          ]
        },
        {
          name: "token_b_program",
          docs: [
            "Token b program"
          ]
        },
        {
          name: "event_authority"
        },
        {
          name: "program"
        }
      ],
      args: [
        {
          name: "params",
          type: {
            defined: {
              name: "RemoveLiquidityParameters"
            }
          }
        }
      ]
    },
    {
      name: "set_pool_status",
      discriminator: [
        112,
        87,
        135,
        223,
        83,
        204,
        132,
        53
      ],
      accounts: [
        {
          name: "pool",
          writable: true
        },
        {
          name: "operator"
        },
        {
          name: "signer",
          signer: true
        },
        {
          name: "event_authority"
        },
        {
          name: "program"
        }
      ],
      args: [
        {
          name: "status",
          type: "u8"
        }
      ]
    },
    {
      name: "split_position",
      discriminator: [
        172,
        241,
        221,
        138,
        161,
        29,
        253,
        42
      ],
      accounts: [
        {
          name: "pool",
          writable: true,
          relations: [
            "first_position",
            "second_position"
          ]
        },
        {
          name: "first_position",
          docs: [
            "The first position"
          ],
          writable: true
        },
        {
          name: "first_position_nft_account",
          docs: [
            "The token account for position nft"
          ]
        },
        {
          name: "second_position",
          docs: [
            "The second position"
          ],
          writable: true
        },
        {
          name: "second_position_nft_account",
          docs: [
            "The token account for position nft"
          ]
        },
        {
          name: "first_owner",
          docs: [
            "Owner of first position"
          ],
          signer: true
        },
        {
          name: "second_owner",
          docs: [
            "Owner of second position"
          ],
          signer: true
        },
        {
          name: "event_authority"
        },
        {
          name: "program"
        }
      ],
      args: [
        {
          name: "params",
          type: {
            defined: {
              name: "SplitPositionParameters"
            }
          }
        }
      ]
    },
    {
      name: "split_position2",
      discriminator: [
        221,
        147,
        228,
        207,
        140,
        212,
        17,
        119
      ],
      accounts: [
        {
          name: "pool",
          writable: true,
          relations: [
            "first_position",
            "second_position"
          ]
        },
        {
          name: "first_position",
          docs: [
            "The first position"
          ],
          writable: true
        },
        {
          name: "first_position_nft_account",
          docs: [
            "The token account for position nft"
          ]
        },
        {
          name: "second_position",
          docs: [
            "The second position"
          ],
          writable: true
        },
        {
          name: "second_position_nft_account",
          docs: [
            "The token account for position nft"
          ]
        },
        {
          name: "first_owner",
          docs: [
            "Owner of first position"
          ],
          signer: true
        },
        {
          name: "second_owner",
          docs: [
            "Owner of second position"
          ],
          signer: true
        },
        {
          name: "event_authority"
        },
        {
          name: "program"
        }
      ],
      args: [
        {
          name: "numerator",
          type: "u32"
        }
      ]
    },
    {
      name: "swap",
      discriminator: [
        248,
        198,
        158,
        145,
        225,
        117,
        135,
        200
      ],
      accounts: [
        {
          name: "pool_authority",
          address: "HLnpSz9h2S4hiLQ43rnSD9XkcUThA7B8hQMKmDaiTLcC"
        },
        {
          name: "pool",
          docs: [
            "Pool account"
          ],
          writable: true
        },
        {
          name: "input_token_account",
          docs: [
            "The user token account for input token"
          ],
          writable: true
        },
        {
          name: "output_token_account",
          docs: [
            "The user token account for output token"
          ],
          writable: true
        },
        {
          name: "token_a_vault",
          docs: [
            "The vault token account for input token"
          ],
          writable: true,
          relations: [
            "pool"
          ]
        },
        {
          name: "token_b_vault",
          docs: [
            "The vault token account for output token"
          ],
          writable: true,
          relations: [
            "pool"
          ]
        },
        {
          name: "token_a_mint",
          docs: [
            "The mint of token a"
          ]
        },
        {
          name: "token_b_mint",
          docs: [
            "The mint of token b"
          ]
        },
        {
          name: "payer",
          docs: [
            "The user performing the swap"
          ],
          signer: true
        },
        {
          name: "token_a_program",
          docs: [
            "Token a program"
          ]
        },
        {
          name: "token_b_program",
          docs: [
            "Token b program"
          ]
        },
        {
          name: "referral_token_account",
          docs: [
            "referral token account"
          ],
          writable: true,
          optional: true
        },
        {
          name: "event_authority"
        },
        {
          name: "program"
        }
      ],
      args: [
        {
          name: "_params",
          type: {
            defined: {
              name: "SwapParameters"
            }
          }
        }
      ]
    },
    {
      name: "swap2",
      discriminator: [
        65,
        75,
        63,
        76,
        235,
        91,
        91,
        136
      ],
      accounts: [
        {
          name: "pool_authority",
          address: "HLnpSz9h2S4hiLQ43rnSD9XkcUThA7B8hQMKmDaiTLcC"
        },
        {
          name: "pool",
          docs: [
            "Pool account"
          ],
          writable: true
        },
        {
          name: "input_token_account",
          docs: [
            "The user token account for input token"
          ],
          writable: true
        },
        {
          name: "output_token_account",
          docs: [
            "The user token account for output token"
          ],
          writable: true
        },
        {
          name: "token_a_vault",
          docs: [
            "The vault token account for input token"
          ],
          writable: true,
          relations: [
            "pool"
          ]
        },
        {
          name: "token_b_vault",
          docs: [
            "The vault token account for output token"
          ],
          writable: true,
          relations: [
            "pool"
          ]
        },
        {
          name: "token_a_mint",
          docs: [
            "The mint of token a"
          ]
        },
        {
          name: "token_b_mint",
          docs: [
            "The mint of token b"
          ]
        },
        {
          name: "payer",
          docs: [
            "The user performing the swap"
          ],
          signer: true
        },
        {
          name: "token_a_program",
          docs: [
            "Token a program"
          ]
        },
        {
          name: "token_b_program",
          docs: [
            "Token b program"
          ]
        },
        {
          name: "referral_token_account",
          docs: [
            "referral token account"
          ],
          writable: true,
          optional: true
        },
        {
          name: "event_authority"
        },
        {
          name: "program"
        }
      ],
      args: [
        {
          name: "_params",
          type: {
            defined: {
              name: "SwapParameters2"
            }
          }
        }
      ]
    },
    {
      name: "update_delegate_permission",
      discriminator: [
        175,
        165,
        56,
        64,
        0,
        251,
        89,
        47
      ],
      accounts: [
        {
          name: "position",
          writable: true
        },
        {
          name: "position_nft_account",
          docs: [
            "The token account for nft"
          ]
        },
        {
          name: "owner",
          signer: true
        },
        {
          name: "event_authority"
        },
        {
          name: "program"
        }
      ],
      args: [
        {
          name: "permission",
          type: "u32"
        }
      ]
    },
    {
      name: "update_pool_fees",
      discriminator: [
        118,
        217,
        203,
        179,
        60,
        8,
        70,
        89
      ],
      accounts: [
        {
          name: "pool",
          writable: true
        },
        {
          name: "operator"
        },
        {
          name: "signer",
          signer: true
        },
        {
          name: "event_authority"
        },
        {
          name: "program"
        }
      ],
      args: [
        {
          name: "params",
          type: {
            defined: {
              name: "UpdatePoolFeesParameters"
            }
          }
        }
      ]
    },
    {
      name: "update_reward_duration",
      discriminator: [
        138,
        174,
        196,
        169,
        213,
        235,
        254,
        107
      ],
      accounts: [
        {
          name: "pool",
          writable: true
        },
        {
          name: "signer",
          signer: true
        },
        {
          name: "event_authority"
        },
        {
          name: "program"
        }
      ],
      args: [
        {
          name: "reward_index",
          type: "u8"
        },
        {
          name: "new_duration",
          type: "u64"
        }
      ]
    },
    {
      name: "update_reward_funder",
      discriminator: [
        211,
        28,
        48,
        32,
        215,
        160,
        35,
        23
      ],
      accounts: [
        {
          name: "pool",
          writable: true
        },
        {
          name: "signer",
          signer: true
        },
        {
          name: "event_authority"
        },
        {
          name: "program"
        }
      ],
      args: [
        {
          name: "reward_index",
          type: "u8"
        },
        {
          name: "new_funder",
          type: "pubkey"
        }
      ]
    },
    {
      name: "withdraw_dead_liquidity_reward",
      discriminator: [
        121,
        99,
        224,
        91,
        178,
        14,
        22,
        132
      ],
      accounts: [
        {
          name: "pool_authority",
          address: "HLnpSz9h2S4hiLQ43rnSD9XkcUThA7B8hQMKmDaiTLcC"
        },
        {
          name: "pool",
          writable: true
        },
        {
          name: "reward_vault",
          writable: true
        },
        {
          name: "reward_mint"
        },
        {
          name: "funder_token_account",
          writable: true
        },
        {
          name: "funder",
          signer: true
        },
        {
          name: "token_program"
        },
        {
          name: "event_authority"
        },
        {
          name: "program"
        }
      ],
      args: [
        {
          name: "reward_index",
          type: "u8"
        }
      ]
    },
    {
      name: "withdraw_ineligible_reward",
      discriminator: [
        148,
        206,
        42,
        195,
        247,
        49,
        103,
        8
      ],
      accounts: [
        {
          name: "pool_authority",
          address: "HLnpSz9h2S4hiLQ43rnSD9XkcUThA7B8hQMKmDaiTLcC"
        },
        {
          name: "pool",
          writable: true
        },
        {
          name: "reward_vault",
          writable: true
        },
        {
          name: "reward_mint"
        },
        {
          name: "funder_token_account",
          writable: true
        },
        {
          name: "funder",
          signer: true
        },
        {
          name: "token_program"
        },
        {
          name: "event_authority"
        },
        {
          name: "program"
        }
      ],
      args: [
        {
          name: "reward_index",
          type: "u8"
        }
      ]
    }
  ],
  accounts: [
    {
      name: "Config",
      discriminator: [
        155,
        12,
        170,
        224,
        30,
        250,
        204,
        130
      ]
    },
    {
      name: "Operator",
      discriminator: [
        219,
        31,
        188,
        145,
        69,
        139,
        204,
        117
      ]
    },
    {
      name: "PodAlignedFeeMarketCapScheduler",
      discriminator: [
        251,
        130,
        208,
        253,
        245,
        27,
        145,
        203
      ]
    },
    {
      name: "PodAlignedFeeRateLimiter",
      discriminator: [
        160,
        219,
        8,
        251,
        179,
        7,
        16,
        117
      ]
    },
    {
      name: "PodAlignedFeeTimeScheduler",
      discriminator: [
        239,
        132,
        138,
        213,
        67,
        154,
        130,
        70
      ]
    },
    {
      name: "Pool",
      discriminator: [
        241,
        154,
        109,
        4,
        17,
        177,
        109,
        188
      ]
    },
    {
      name: "Position",
      discriminator: [
        170,
        188,
        143,
        228,
        122,
        64,
        247,
        208
      ]
    },
    {
      name: "TokenBadge",
      discriminator: [
        116,
        219,
        204,
        229,
        249,
        116,
        255,
        150
      ]
    },
    {
      name: "Vesting",
      discriminator: [
        100,
        149,
        66,
        138,
        95,
        200,
        128,
        241
      ]
    }
  ],
  events: [
    {
      name: "EvtClaimPositionFee",
      discriminator: [
        198,
        182,
        183,
        52,
        97,
        12,
        49,
        56
      ]
    },
    {
      name: "EvtClaimProtocolFee2",
      discriminator: [
        187,
        133,
        66,
        9,
        205,
        161,
        84,
        13
      ]
    },
    {
      name: "EvtClaimReward",
      discriminator: [
        218,
        86,
        147,
        200,
        235,
        188,
        215,
        231
      ]
    },
    {
      name: "EvtCloseConfig",
      discriminator: [
        36,
        30,
        239,
        45,
        58,
        132,
        14,
        5
      ]
    },
    {
      name: "EvtClosePosition",
      discriminator: [
        20,
        145,
        144,
        68,
        143,
        142,
        214,
        178
      ]
    },
    {
      name: "EvtCreateConfig",
      discriminator: [
        131,
        207,
        180,
        174,
        180,
        73,
        165,
        54
      ]
    },
    {
      name: "EvtCreateDynamicConfig",
      discriminator: [
        231,
        197,
        13,
        164,
        248,
        213,
        133,
        152
      ]
    },
    {
      name: "EvtCreatePosition",
      discriminator: [
        156,
        15,
        119,
        198,
        29,
        181,
        221,
        55
      ]
    },
    {
      name: "EvtCreateTokenBadge",
      discriminator: [
        141,
        120,
        134,
        116,
        34,
        28,
        114,
        160
      ]
    },
    {
      name: "EvtFundReward",
      discriminator: [
        104,
        233,
        237,
        122,
        199,
        191,
        121,
        85
      ]
    },
    {
      name: "EvtInitializePool",
      discriminator: [
        228,
        50,
        246,
        85,
        203,
        66,
        134,
        37
      ]
    },
    {
      name: "EvtInitializeReward",
      discriminator: [
        129,
        91,
        188,
        3,
        246,
        52,
        185,
        249
      ]
    },
    {
      name: "EvtLiquidityChange",
      discriminator: [
        197,
        171,
        78,
        127,
        224,
        211,
        87,
        13
      ]
    },
    {
      name: "EvtLockPosition",
      discriminator: [
        168,
        63,
        108,
        83,
        219,
        82,
        2,
        200
      ]
    },
    {
      name: "EvtPermanentLockPosition",
      discriminator: [
        145,
        143,
        162,
        218,
        218,
        80,
        67,
        11
      ]
    },
    {
      name: "EvtSetPoolStatus",
      discriminator: [
        100,
        213,
        74,
        3,
        95,
        91,
        228,
        146
      ]
    },
    {
      name: "EvtSplitPosition2",
      discriminator: [
        165,
        32,
        203,
        174,
        72,
        100,
        233,
        103
      ]
    },
    {
      name: "EvtSplitPosition3",
      discriminator: [
        232,
        117,
        190,
        218,
        85,
        162,
        207,
        78
      ]
    },
    {
      name: "EvtSwap2",
      discriminator: [
        189,
        66,
        51,
        168,
        38,
        80,
        117,
        153
      ]
    },
    {
      name: "EvtUpdateDelegatePermission",
      discriminator: [
        66,
        188,
        75,
        151,
        150,
        232,
        87,
        93
      ]
    },
    {
      name: "EvtUpdatePoolFees",
      discriminator: [
        76,
        165,
        246,
        102,
        102,
        217,
        156,
        44
      ]
    },
    {
      name: "EvtUpdateRewardDuration",
      discriminator: [
        149,
        135,
        65,
        231,
        129,
        153,
        65,
        57
      ]
    },
    {
      name: "EvtUpdateRewardFunder",
      discriminator: [
        76,
        154,
        208,
        13,
        40,
        115,
        246,
        146
      ]
    },
    {
      name: "EvtWithdrawDeadLiquidityReward",
      discriminator: [
        228,
        66,
        150,
        195,
        42,
        62,
        163,
        13
      ]
    },
    {
      name: "EvtWithdrawIneligibleReward",
      discriminator: [
        248,
        215,
        184,
        78,
        31,
        180,
        179,
        168
      ]
    }
  ],
  errors: [
    {
      code: 6e3,
      name: "MathOverflow",
      msg: "Math operation overflow"
    },
    {
      code: 6001,
      name: "InvalidFee",
      msg: "Invalid fee setup"
    },
    {
      code: 6002,
      name: "ExceededSlippage",
      msg: "Exceeded slippage tolerance"
    },
    {
      code: 6003,
      name: "PoolDisabled",
      msg: "Pool disabled"
    },
    {
      code: 6004,
      name: "ExceedMaxFeeBps",
      msg: "Exceeded max fee bps"
    },
    {
      code: 6005,
      name: "InvalidAdmin",
      msg: "Invalid admin"
    },
    {
      code: 6006,
      name: "AmountIsZero",
      msg: "Amount is zero"
    },
    {
      code: 6007,
      name: "TypeCastFailed",
      msg: "Type cast error"
    },
    {
      code: 6008,
      name: "UnableToModifyActivationPoint",
      msg: "Unable to modify activation point"
    },
    {
      code: 6009,
      name: "InvalidAuthorityToCreateThePool",
      msg: "Invalid authority to create the pool"
    },
    {
      code: 6010,
      name: "InvalidActivationType",
      msg: "Invalid activation type"
    },
    {
      code: 6011,
      name: "InvalidActivationPoint",
      msg: "Invalid activation point"
    },
    {
      code: 6012,
      name: "InvalidQuoteMint",
      msg: "Quote token must be SOL,USDC"
    },
    {
      code: 6013,
      name: "InvalidFeeCurve",
      msg: "Invalid fee curve"
    },
    {
      code: 6014,
      name: "InvalidPriceRange",
      msg: "Invalid Price Range"
    },
    {
      code: 6015,
      name: "PriceRangeViolation",
      msg: "Trade is over price range"
    },
    {
      code: 6016,
      name: "InvalidParameters",
      msg: "Invalid parameters"
    },
    {
      code: 6017,
      name: "InvalidCollectFeeMode",
      msg: "Invalid collect fee mode"
    },
    {
      code: 6018,
      name: "InvalidInput",
      msg: "Invalid input"
    },
    {
      code: 6019,
      name: "CannotCreateTokenBadgeOnSupportedMint",
      msg: "Cannot create token badge on supported mint"
    },
    {
      code: 6020,
      name: "InvalidTokenBadge",
      msg: "Invalid token badge"
    },
    {
      code: 6021,
      name: "InvalidMinimumLiquidity",
      msg: "Invalid minimum liquidity"
    },
    {
      code: 6022,
      name: "InvalidVestingInfo",
      msg: "Invalid vesting information"
    },
    {
      code: 6023,
      name: "InsufficientLiquidity",
      msg: "Insufficient liquidity"
    },
    {
      code: 6024,
      name: "InvalidVestingAccount",
      msg: "Invalid vesting account"
    },
    {
      code: 6025,
      name: "InvalidPoolStatus",
      msg: "Invalid pool status"
    },
    {
      code: 6026,
      name: "UnsupportNativeMintToken2022",
      msg: "Unsupported native mint token2022"
    },
    {
      code: 6027,
      name: "InvalidRewardIndex",
      msg: "Invalid reward index"
    },
    {
      code: 6028,
      name: "InvalidRewardDuration",
      msg: "Invalid reward duration"
    },
    {
      code: 6029,
      name: "RewardInitialized",
      msg: "Reward already initialized"
    },
    {
      code: 6030,
      name: "RewardUninitialized",
      msg: "Reward not initialized"
    },
    {
      code: 6031,
      name: "InvalidRewardVault",
      msg: "Invalid reward vault"
    },
    {
      code: 6032,
      name: "MustWithdrawnIneligibleReward",
      msg: "Must withdraw ineligible reward"
    },
    {
      code: 6033,
      name: "IdenticalRewardDuration",
      msg: "Reward duration is the same"
    },
    {
      code: 6034,
      name: "RewardCampaignInProgress",
      msg: "Reward campaign in progress"
    },
    {
      code: 6035,
      name: "IdenticalFunder",
      msg: "Identical funder"
    },
    {
      code: 6036,
      name: "InvalidFunder",
      msg: "Invalid funder"
    },
    {
      code: 6037,
      name: "RewardNotEnded",
      msg: "Reward not ended"
    },
    {
      code: 6038,
      name: "FeeInverseIsIncorrect",
      msg: "Fee inverse is incorrect"
    },
    {
      code: 6039,
      name: "PositionIsNotEmpty",
      msg: "Position is not empty"
    },
    {
      code: 6040,
      name: "InvalidPoolCreatorAuthority",
      msg: "Invalid pool creator authority"
    },
    {
      code: 6041,
      name: "InvalidConfigType",
      msg: "Invalid config type"
    },
    {
      code: 6042,
      name: "InvalidPoolCreator",
      msg: "Invalid pool creator"
    },
    {
      code: 6043,
      name: "RewardVaultFrozenSkipRequired",
      msg: "Reward vault is frozen, must skip reward to proceed"
    },
    {
      code: 6044,
      name: "InvalidSplitPositionParameters",
      msg: "Invalid parameters for split position"
    },
    {
      code: 6045,
      name: "UnsupportPositionHasVestingLock",
      msg: "Unsupported split position has vesting lock"
    },
    {
      code: 6046,
      name: "SamePosition",
      msg: "Same position"
    },
    {
      code: 6047,
      name: "InvalidBaseFeeMode",
      msg: "Invalid base fee mode"
    },
    {
      code: 6048,
      name: "InvalidFeeRateLimiter",
      msg: "Invalid fee rate limiter"
    },
    {
      code: 6049,
      name: "FailToValidateSingleSwapInstruction",
      msg: "Fail to validate single swap instruction in rate limiter"
    },
    {
      code: 6050,
      name: "InvalidFeeTimeScheduler",
      msg: "Invalid fee scheduler"
    },
    {
      code: 6051,
      name: "UndeterminedError",
      msg: "Undetermined error"
    },
    {
      code: 6052,
      name: "InvalidPoolVersion",
      msg: "Invalid pool version"
    },
    {
      code: 6053,
      name: "InvalidAuthority",
      msg: "Invalid authority to do that action"
    },
    {
      code: 6054,
      name: "InvalidPermission",
      msg: "Invalid permission"
    },
    {
      code: 6055,
      name: "InvalidFeeMarketCapScheduler",
      msg: "Invalid fee market cap scheduler"
    },
    {
      code: 6056,
      name: "CannotUpdateBaseFee",
      msg: "Cannot update base fee"
    },
    {
      code: 6057,
      name: "InvalidDynamicFeeParameters",
      msg: "Invalid dynamic fee parameters"
    },
    {
      code: 6058,
      name: "InvalidUpdatePoolFeesParameters",
      msg: "Invalid update pool fees parameters"
    },
    {
      code: 6059,
      name: "MissingOperatorAccount",
      msg: "Missing operator account"
    },
    {
      code: 6060,
      name: "IncorrectATA",
      msg: "Incorrect ATA"
    },
    {
      code: 6061,
      name: "InvalidZapOutParameters",
      msg: "Invalid zap out parameters"
    },
    {
      code: 6062,
      name: "InvalidWithdrawProtocolFeeZapAccounts",
      msg: "Invalid withdraw protocol fee zap accounts"
    },
    {
      code: 6063,
      name: "MintRestrictedFromZap",
      msg: "SOL,USDC protocol fee cannot be withdrawn via zap"
    },
    {
      code: 6064,
      name: "CpiDisabled",
      msg: "CPI disabled"
    },
    {
      code: 6065,
      name: "MissingZapOutInstruction",
      msg: "Missing zap out instruction"
    },
    {
      code: 6066,
      name: "InvalidZapAccounts",
      msg: "Invalid zap accounts"
    },
    {
      code: 6067,
      name: "InvalidCompoundingFeeBps",
      msg: "Invalid compounding fee bps"
    },
    {
      code: 6068,
      name: "InvalidClaimProtocolFeeAccounts",
      msg: "Invalid claim protocol fee accounts"
    },
    {
      code: 6069,
      name: "TransferFeeExcludedAmountIsZero",
      msg: "Transfer fee excluded amount is zero"
    },
    {
      code: 6070,
      name: "DelegatedAmountNonZero",
      msg: "Delegated amount is not zero"
    },
    {
      code: 6071,
      name: "DeprecatedBaseFeeMode",
      msg: "Deprecated base fee mode"
    },
    {
      code: 6072,
      name: "InvalidConfigPermission",
      msg: "Invalid config permission"
    }
  ],
  types: [
    {
      name: "AddLiquidityParameters",
      type: {
        kind: "struct",
        fields: [
          {
            name: "liquidity_delta",
            docs: [
              "delta liquidity"
            ],
            type: "u128"
          },
          {
            name: "token_a_amount_threshold",
            docs: [
              "maximum token a amount"
            ],
            type: "u64"
          },
          {
            name: "token_b_amount_threshold",
            docs: [
              "maximum token b amount"
            ],
            type: "u64"
          }
        ]
      }
    },
    {
      name: "BaseFeeInfo",
      serialization: "bytemuck",
      repr: {
        kind: "c"
      },
      type: {
        kind: "struct",
        fields: [
          {
            name: "data",
            type: {
              array: [
                "u8",
                32
              ]
            }
          }
        ]
      }
    },
    {
      name: "BaseFeeParameters",
      type: {
        kind: "struct",
        fields: [
          {
            name: "data",
            type: {
              array: [
                "u8",
                27
              ]
            }
          }
        ]
      }
    },
    {
      name: "BaseFeeStruct",
      serialization: "bytemuck",
      repr: {
        kind: "c"
      },
      type: {
        kind: "struct",
        fields: [
          {
            name: "base_fee_info",
            type: {
              defined: {
                name: "BaseFeeInfo"
              }
            }
          },
          {
            name: "padding_1",
            type: "u64"
          }
        ]
      }
    },
    {
      name: "BorshFeeMarketCapScheduler",
      type: {
        kind: "struct",
        fields: [
          {
            name: "cliff_fee_numerator",
            type: "u64"
          },
          {
            name: "number_of_period",
            type: "u16"
          },
          {
            name: "sqrt_price_step_bps",
            type: "u32"
          },
          {
            name: "scheduler_expiration_duration",
            type: "u32"
          },
          {
            name: "reduction_factor",
            type: "u64"
          },
          {
            name: "base_fee_mode",
            type: "u8"
          }
        ]
      }
    },
    {
      name: "BorshFeeRateLimiter",
      docs: [
        "we denote reference_amount = x0, cliff_fee_numerator = c, fee_increment = i",
        "if input_amount <= x0, then fee = input_amount * c",
        "",
        "if input_amount > x0, then input_amount = x0 + (a * x0 + b)",
        "if a < max_index",
        "then fee = x0 * c + x0 * (c + i) + .... + x0 * (c + i*a) + b * (c + i * (a+1))",
        "then fee = x0 * (c + c*a + i*a*(a+1)/2) + b * (c + i * (a+1))",
        "",
        "if a >= max_index",
        "if a = max_index + d, input_amount = x0 + max_index * x0 + (d * x0 + b)",
        "then fee = x0 * (c + c*max_index + i*max_index*(max_index+1)/2) + (d * x0 + b) * MAX_FEE"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "cliff_fee_numerator",
            type: "u64"
          },
          {
            name: "fee_increment_bps",
            type: "u16"
          },
          {
            name: "max_limiter_duration",
            type: "u32"
          },
          {
            name: "max_fee_bps",
            type: "u32"
          },
          {
            name: "reference_amount",
            type: "u64"
          },
          {
            name: "base_fee_mode",
            type: "u8"
          }
        ]
      }
    },
    {
      name: "BorshFeeTimeScheduler",
      type: {
        kind: "struct",
        fields: [
          {
            name: "cliff_fee_numerator",
            type: "u64"
          },
          {
            name: "number_of_period",
            type: "u16"
          },
          {
            name: "period_frequency",
            type: "u64"
          },
          {
            name: "reduction_factor",
            type: "u64"
          },
          {
            name: "base_fee_mode",
            type: "u8"
          }
        ]
      }
    },
    {
      name: "Config",
      serialization: "bytemuck",
      repr: {
        kind: "c"
      },
      type: {
        kind: "struct",
        fields: [
          {
            name: "vault_config_key",
            docs: [
              "Vault config key"
            ],
            type: "pubkey"
          },
          {
            name: "pool_creator_authority",
            docs: [
              "Only pool_creator_authority can use the current config to initialize new pool. When it's Pubkey::default, it's a public config."
            ],
            type: "pubkey"
          },
          {
            name: "pool_fees",
            docs: [
              "Pool fee"
            ],
            type: {
              defined: {
                name: "PoolFeesConfig"
              }
            }
          },
          {
            name: "activation_type",
            docs: [
              "Activation type"
            ],
            type: "u8"
          },
          {
            name: "collect_fee_mode",
            docs: [
              "Collect fee mode"
            ],
            type: "u8"
          },
          {
            name: "config_type",
            docs: [
              "Config type mode, 0 for static, 1 for dynamic"
            ],
            type: "u8"
          },
          {
            name: "_padding_0",
            docs: [
              "padding 0"
            ],
            type: {
              array: [
                "u8",
                5
              ]
            }
          },
          {
            name: "index",
            docs: [
              "config index"
            ],
            type: "u64"
          },
          {
            name: "sqrt_min_price",
            docs: [
              "sqrt min price"
            ],
            type: "u128"
          },
          {
            name: "sqrt_max_price",
            docs: [
              "sqrt max price"
            ],
            type: "u128"
          },
          {
            name: "permission",
            docs: [
              "config permission bitmask"
            ],
            type: "u128"
          },
          {
            name: "_padding_1",
            docs: [
              "Padding for further use"
            ],
            type: {
              array: [
                "u64",
                8
              ]
            }
          }
        ]
      }
    },
    {
      name: "DummyParams",
      type: {
        kind: "struct",
        fields: [
          {
            name: "borsh_fee_time_scheduler_params",
            type: {
              defined: {
                name: "BorshFeeTimeScheduler"
              }
            }
          },
          {
            name: "borsh_fee_rate_limiter_params",
            type: {
              defined: {
                name: "BorshFeeRateLimiter"
              }
            }
          },
          {
            name: "borsh_fee_market_cap_scheduler_params",
            type: {
              defined: {
                name: "BorshFeeMarketCapScheduler"
              }
            }
          }
        ]
      }
    },
    {
      name: "DynamicConfigParameters",
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool_creator_authority",
            type: "pubkey"
          },
          {
            name: "permission",
            type: "u128"
          }
        ]
      }
    },
    {
      name: "DynamicFeeConfig",
      serialization: "bytemuck",
      repr: {
        kind: "c"
      },
      type: {
        kind: "struct",
        fields: [
          {
            name: "initialized",
            type: "u8"
          },
          {
            name: "padding",
            type: {
              array: [
                "u8",
                7
              ]
            }
          },
          {
            name: "max_volatility_accumulator",
            type: "u32"
          },
          {
            name: "variable_fee_control",
            type: "u32"
          },
          {
            name: "bin_step",
            type: "u16"
          },
          {
            name: "filter_period",
            type: "u16"
          },
          {
            name: "decay_period",
            type: "u16"
          },
          {
            name: "reduction_factor",
            type: "u16"
          },
          {
            name: "padding_1",
            type: {
              array: [
                "u8",
                8
              ]
            }
          },
          {
            name: "bin_step_u128",
            type: "u128"
          }
        ]
      }
    },
    {
      name: "DynamicFeeParameters",
      type: {
        kind: "struct",
        fields: [
          {
            name: "bin_step",
            type: "u16"
          },
          {
            name: "bin_step_u128",
            type: "u128"
          },
          {
            name: "filter_period",
            type: "u16"
          },
          {
            name: "decay_period",
            type: "u16"
          },
          {
            name: "reduction_factor",
            type: "u16"
          },
          {
            name: "max_volatility_accumulator",
            type: "u32"
          },
          {
            name: "variable_fee_control",
            type: "u32"
          }
        ]
      }
    },
    {
      name: "DynamicFeeStruct",
      serialization: "bytemuck",
      repr: {
        kind: "c"
      },
      type: {
        kind: "struct",
        fields: [
          {
            name: "initialized",
            type: "u8"
          },
          {
            name: "padding",
            type: {
              array: [
                "u8",
                7
              ]
            }
          },
          {
            name: "max_volatility_accumulator",
            type: "u32"
          },
          {
            name: "variable_fee_control",
            type: "u32"
          },
          {
            name: "bin_step",
            type: "u16"
          },
          {
            name: "filter_period",
            type: "u16"
          },
          {
            name: "decay_period",
            type: "u16"
          },
          {
            name: "reduction_factor",
            type: "u16"
          },
          {
            name: "last_update_timestamp",
            type: "u64"
          },
          {
            name: "bin_step_u128",
            type: "u128"
          },
          {
            name: "sqrt_price_reference",
            type: "u128"
          },
          {
            name: "volatility_accumulator",
            type: "u128"
          },
          {
            name: "volatility_reference",
            type: "u128"
          }
        ]
      }
    },
    {
      name: "EvtClaimPositionFee",
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool",
            type: "pubkey"
          },
          {
            name: "position",
            type: "pubkey"
          },
          {
            name: "owner",
            type: "pubkey"
          },
          {
            name: "fee_a_claimed",
            type: "u64"
          },
          {
            name: "fee_b_claimed",
            type: "u64"
          }
        ]
      }
    },
    {
      name: "EvtClaimProtocolFee2",
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool",
            type: "pubkey"
          },
          {
            name: "receiver_token_account",
            type: "pubkey"
          },
          {
            name: "token_mint",
            type: "pubkey"
          },
          {
            name: "amount",
            type: "u64"
          }
        ]
      }
    },
    {
      name: "EvtClaimReward",
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool",
            type: "pubkey"
          },
          {
            name: "position",
            type: "pubkey"
          },
          {
            name: "owner",
            type: "pubkey"
          },
          {
            name: "mint_reward",
            type: "pubkey"
          },
          {
            name: "reward_index",
            type: "u8"
          },
          {
            name: "total_reward",
            type: "u64"
          }
        ]
      }
    },
    {
      name: "EvtCloseConfig",
      docs: [
        "Close config"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "config",
            docs: [
              "Config pubkey"
            ],
            type: "pubkey"
          },
          {
            name: "admin",
            docs: [
              "admin pk"
            ],
            type: "pubkey"
          }
        ]
      }
    },
    {
      name: "EvtClosePosition",
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool",
            type: "pubkey"
          },
          {
            name: "owner",
            type: "pubkey"
          },
          {
            name: "position",
            type: "pubkey"
          },
          {
            name: "position_nft_mint",
            type: "pubkey"
          }
        ]
      }
    },
    {
      name: "EvtCreateConfig",
      docs: [
        "Create static config"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool_fees",
            type: {
              defined: {
                name: "PoolFeeParameters"
              }
            }
          },
          {
            name: "vault_config_key",
            type: "pubkey"
          },
          {
            name: "pool_creator_authority",
            type: "pubkey"
          },
          {
            name: "activation_type",
            type: "u8"
          },
          {
            name: "sqrt_min_price",
            type: "u128"
          },
          {
            name: "sqrt_max_price",
            type: "u128"
          },
          {
            name: "collect_fee_mode",
            type: "u8"
          },
          {
            name: "index",
            type: "u64"
          },
          {
            name: "config",
            type: "pubkey"
          },
          {
            name: "permission",
            type: "u128"
          }
        ]
      }
    },
    {
      name: "EvtCreateDynamicConfig",
      docs: [
        "Create dynamic config"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "config",
            type: "pubkey"
          },
          {
            name: "pool_creator_authority",
            type: "pubkey"
          },
          {
            name: "index",
            type: "u64"
          },
          {
            name: "permission",
            type: "u128"
          }
        ]
      }
    },
    {
      name: "EvtCreatePosition",
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool",
            type: "pubkey"
          },
          {
            name: "owner",
            type: "pubkey"
          },
          {
            name: "position",
            type: "pubkey"
          },
          {
            name: "position_nft_mint",
            type: "pubkey"
          }
        ]
      }
    },
    {
      name: "EvtCreateTokenBadge",
      docs: [
        "Create token badge"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "token_mint",
            type: "pubkey"
          }
        ]
      }
    },
    {
      name: "EvtFundReward",
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool",
            type: "pubkey"
          },
          {
            name: "funder",
            type: "pubkey"
          },
          {
            name: "mint_reward",
            type: "pubkey"
          },
          {
            name: "reward_index",
            type: "u8"
          },
          {
            name: "amount",
            type: "u64"
          },
          {
            name: "transfer_fee_excluded_amount_in",
            type: "u64"
          },
          {
            name: "reward_duration_end",
            type: "u64"
          },
          {
            name: "pre_reward_rate",
            type: "u128"
          },
          {
            name: "post_reward_rate",
            type: "u128"
          }
        ]
      }
    },
    {
      name: "EvtInitializePool",
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool",
            type: "pubkey"
          },
          {
            name: "token_a_mint",
            type: "pubkey"
          },
          {
            name: "token_b_mint",
            type: "pubkey"
          },
          {
            name: "creator",
            type: "pubkey"
          },
          {
            name: "payer",
            type: "pubkey"
          },
          {
            name: "alpha_vault",
            type: "pubkey"
          },
          {
            name: "pool_fees",
            type: {
              defined: {
                name: "PoolFeeParameters"
              }
            }
          },
          {
            name: "sqrt_min_price",
            type: "u128"
          },
          {
            name: "sqrt_max_price",
            type: "u128"
          },
          {
            name: "activation_type",
            type: "u8"
          },
          {
            name: "collect_fee_mode",
            type: "u8"
          },
          {
            name: "liquidity",
            type: "u128"
          },
          {
            name: "sqrt_price",
            type: "u128"
          },
          {
            name: "activation_point",
            type: "u64"
          },
          {
            name: "token_a_flag",
            type: "u8"
          },
          {
            name: "token_b_flag",
            type: "u8"
          },
          {
            name: "token_a_amount",
            type: "u64"
          },
          {
            name: "token_b_amount",
            type: "u64"
          },
          {
            name: "total_amount_a",
            type: "u64"
          },
          {
            name: "total_amount_b",
            type: "u64"
          },
          {
            name: "pool_type",
            type: "u8"
          }
        ]
      }
    },
    {
      name: "EvtInitializeReward",
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool",
            type: "pubkey"
          },
          {
            name: "reward_mint",
            type: "pubkey"
          },
          {
            name: "funder",
            type: "pubkey"
          },
          {
            name: "creator",
            type: "pubkey"
          },
          {
            name: "reward_index",
            type: "u8"
          },
          {
            name: "reward_duration",
            type: "u64"
          }
        ]
      }
    },
    {
      name: "EvtLiquidityChange",
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool",
            type: "pubkey"
          },
          {
            name: "position",
            type: "pubkey"
          },
          {
            name: "owner",
            type: "pubkey"
          },
          {
            name: "token_a_amount",
            type: "u64"
          },
          {
            name: "token_b_amount",
            type: "u64"
          },
          {
            name: "transfer_fee_included_token_a_amount",
            type: "u64"
          },
          {
            name: "transfer_fee_included_token_b_amount",
            type: "u64"
          },
          {
            name: "reserve_a_amount",
            type: "u64"
          },
          {
            name: "reserve_b_amount",
            type: "u64"
          },
          {
            name: "liquidity_delta",
            type: "u128"
          },
          {
            name: "token_a_amount_threshold",
            type: "u64"
          },
          {
            name: "token_b_amount_threshold",
            type: "u64"
          },
          {
            name: "change_type",
            type: "u8"
          }
        ]
      }
    },
    {
      name: "EvtLockPosition",
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool",
            type: "pubkey"
          },
          {
            name: "position",
            type: "pubkey"
          },
          {
            name: "owner",
            type: "pubkey"
          },
          {
            name: "vesting",
            type: "pubkey"
          },
          {
            name: "cliff_point",
            type: "u64"
          },
          {
            name: "period_frequency",
            type: "u64"
          },
          {
            name: "cliff_unlock_liquidity",
            type: "u128"
          },
          {
            name: "liquidity_per_period",
            type: "u128"
          },
          {
            name: "number_of_period",
            type: "u16"
          }
        ]
      }
    },
    {
      name: "EvtPermanentLockPosition",
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool",
            type: "pubkey"
          },
          {
            name: "position",
            type: "pubkey"
          },
          {
            name: "lock_liquidity_amount",
            type: "u128"
          },
          {
            name: "total_permanent_locked_liquidity",
            type: "u128"
          }
        ]
      }
    },
    {
      name: "EvtSetPoolStatus",
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool",
            type: "pubkey"
          },
          {
            name: "status",
            type: "u8"
          }
        ]
      }
    },
    {
      name: "EvtSplitPosition2",
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool",
            type: "pubkey"
          },
          {
            name: "first_owner",
            type: "pubkey"
          },
          {
            name: "second_owner",
            type: "pubkey"
          },
          {
            name: "first_position",
            type: "pubkey"
          },
          {
            name: "second_position",
            type: "pubkey"
          },
          {
            name: "current_sqrt_price",
            type: "u128"
          },
          {
            name: "amount_splits",
            type: {
              defined: {
                name: "SplitAmountInfo"
              }
            }
          },
          {
            name: "first_position_info",
            type: {
              defined: {
                name: "SplitPositionInfo"
              }
            }
          },
          {
            name: "second_position_info",
            type: {
              defined: {
                name: "SplitPositionInfo"
              }
            }
          },
          {
            name: "split_position_parameters",
            type: {
              defined: {
                name: "SplitPositionParameters2"
              }
            }
          }
        ]
      }
    },
    {
      name: "EvtSplitPosition3",
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool",
            type: "pubkey"
          },
          {
            name: "first_owner",
            type: "pubkey"
          },
          {
            name: "second_owner",
            type: "pubkey"
          },
          {
            name: "first_position",
            type: "pubkey"
          },
          {
            name: "second_position",
            type: "pubkey"
          },
          {
            name: "current_sqrt_price",
            type: "u128"
          },
          {
            name: "amount_splits",
            type: {
              defined: {
                name: "SplitAmountInfo2"
              }
            }
          },
          {
            name: "first_position_info",
            type: {
              defined: {
                name: "SplitPositionInfo2"
              }
            }
          },
          {
            name: "second_position_info",
            type: {
              defined: {
                name: "SplitPositionInfo2"
              }
            }
          },
          {
            name: "split_position_parameters",
            type: {
              defined: {
                name: "SplitPositionParameters3"
              }
            }
          }
        ]
      }
    },
    {
      name: "EvtSwap2",
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool",
            type: "pubkey"
          },
          {
            name: "trade_direction",
            type: "u8"
          },
          {
            name: "collect_fee_mode",
            type: "u8"
          },
          {
            name: "has_referral",
            type: "bool"
          },
          {
            name: "params",
            type: {
              defined: {
                name: "SwapParameters2"
              }
            }
          },
          {
            name: "swap_result",
            type: {
              defined: {
                name: "SwapResult2"
              }
            }
          },
          {
            name: "included_transfer_fee_amount_in",
            type: "u64"
          },
          {
            name: "included_transfer_fee_amount_out",
            type: "u64"
          },
          {
            name: "excluded_transfer_fee_amount_out",
            type: "u64"
          },
          {
            name: "current_timestamp",
            type: "u64"
          },
          {
            name: "reserve_a_amount",
            type: "u64"
          },
          {
            name: "reserve_b_amount",
            type: "u64"
          }
        ]
      }
    },
    {
      name: "EvtUpdateDelegatePermission",
      type: {
        kind: "struct",
        fields: [
          {
            name: "position",
            type: "pubkey"
          },
          {
            name: "owner",
            type: "pubkey"
          },
          {
            name: "permission",
            type: "u32"
          },
          {
            name: "delegate",
            type: {
              option: "pubkey"
            }
          }
        ]
      }
    },
    {
      name: "EvtUpdatePoolFees",
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool",
            type: "pubkey"
          },
          {
            name: "operator",
            type: "pubkey"
          },
          {
            name: "params",
            type: {
              defined: {
                name: "UpdatePoolFeesParameters"
              }
            }
          }
        ]
      }
    },
    {
      name: "EvtUpdateRewardDuration",
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool",
            type: "pubkey"
          },
          {
            name: "reward_index",
            type: "u8"
          },
          {
            name: "old_reward_duration",
            type: "u64"
          },
          {
            name: "new_reward_duration",
            type: "u64"
          }
        ]
      }
    },
    {
      name: "EvtUpdateRewardFunder",
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool",
            type: "pubkey"
          },
          {
            name: "reward_index",
            type: "u8"
          },
          {
            name: "old_funder",
            type: "pubkey"
          },
          {
            name: "new_funder",
            type: "pubkey"
          }
        ]
      }
    },
    {
      name: "EvtWithdrawDeadLiquidityReward",
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool",
            type: "pubkey"
          },
          {
            name: "reward_mint",
            type: "pubkey"
          },
          {
            name: "amount",
            type: "u64"
          }
        ]
      }
    },
    {
      name: "EvtWithdrawIneligibleReward",
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool",
            type: "pubkey"
          },
          {
            name: "reward_mint",
            type: "pubkey"
          },
          {
            name: "amount",
            type: "u64"
          }
        ]
      }
    },
    {
      name: "InitializeCustomizablePoolParameters",
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool_fees",
            docs: [
              "pool fees"
            ],
            type: {
              defined: {
                name: "PoolFeeParameters"
              }
            }
          },
          {
            name: "sqrt_min_price",
            docs: [
              "sqrt min price"
            ],
            type: "u128"
          },
          {
            name: "sqrt_max_price",
            docs: [
              "sqrt max price"
            ],
            type: "u128"
          },
          {
            name: "has_alpha_vault",
            docs: [
              "has alpha vault"
            ],
            type: "bool"
          },
          {
            name: "liquidity",
            docs: [
              "initialize liquidity"
            ],
            type: "u128"
          },
          {
            name: "sqrt_price",
            docs: [
              "The init price of the pool as a sqrt(token_b/token_a) Q64.64 value. Market cap fee scheduler minimum price will be derived from this value"
            ],
            type: "u128"
          },
          {
            name: "activation_type",
            docs: [
              "activation type"
            ],
            type: "u8"
          },
          {
            name: "collect_fee_mode",
            docs: [
              "collect fee mode"
            ],
            type: "u8"
          },
          {
            name: "activation_point",
            docs: [
              "activation point"
            ],
            type: {
              option: "u64"
            }
          }
        ]
      }
    },
    {
      name: "InitializePoolParameters",
      type: {
        kind: "struct",
        fields: [
          {
            name: "liquidity",
            docs: [
              "initialize liquidity"
            ],
            type: "u128"
          },
          {
            name: "sqrt_price",
            docs: [
              "The init price of the pool as a sqrt(token_b/token_a) Q64.64 value"
            ],
            type: "u128"
          },
          {
            name: "activation_point",
            docs: [
              "activation point"
            ],
            type: {
              option: "u64"
            }
          }
        ]
      }
    },
    {
      name: "InnerVesting",
      serialization: "bytemuck",
      repr: {
        kind: "c"
      },
      type: {
        kind: "struct",
        fields: [
          {
            name: "cliff_point",
            type: "u64"
          },
          {
            name: "period_frequency",
            type: "u64"
          },
          {
            name: "cliff_unlock_liquidity",
            type: "u128"
          },
          {
            name: "liquidity_per_period",
            type: "u128"
          },
          {
            name: "total_released_liquidity",
            type: "u128"
          },
          {
            name: "number_of_period",
            type: "u16"
          },
          {
            name: "padding",
            type: {
              array: [
                "u8",
                14
              ]
            }
          }
        ]
      }
    },
    {
      name: "Operator",
      serialization: "bytemuck",
      repr: {
        kind: "c"
      },
      type: {
        kind: "struct",
        fields: [
          {
            name: "whitelisted_address",
            type: "pubkey"
          },
          {
            name: "permission",
            type: "u128"
          },
          {
            name: "padding",
            type: {
              array: [
                "u64",
                2
              ]
            }
          }
        ]
      }
    },
    {
      name: "PodAlignedFeeMarketCapScheduler",
      serialization: "bytemuck",
      repr: {
        kind: "c"
      },
      type: {
        kind: "struct",
        fields: [
          {
            name: "cliff_fee_numerator",
            type: "u64"
          },
          {
            name: "base_fee_mode",
            type: "u8"
          },
          {
            name: "padding",
            type: {
              array: [
                "u8",
                5
              ]
            }
          },
          {
            name: "number_of_period",
            type: "u16"
          },
          {
            name: "sqrt_price_step_bps",
            type: "u32"
          },
          {
            name: "scheduler_expiration_duration",
            type: "u32"
          },
          {
            name: "reduction_factor",
            type: "u64"
          }
        ]
      }
    },
    {
      name: "PodAlignedFeeRateLimiter",
      serialization: "bytemuck",
      repr: {
        kind: "c"
      },
      type: {
        kind: "struct",
        fields: [
          {
            name: "cliff_fee_numerator",
            type: "u64"
          },
          {
            name: "base_fee_mode",
            type: "u8"
          },
          {
            name: "padding",
            type: {
              array: [
                "u8",
                5
              ]
            }
          },
          {
            name: "fee_increment_bps",
            type: "u16"
          },
          {
            name: "max_limiter_duration",
            type: "u32"
          },
          {
            name: "max_fee_bps",
            type: "u32"
          },
          {
            name: "reference_amount",
            type: "u64"
          }
        ]
      }
    },
    {
      name: "PodAlignedFeeTimeScheduler",
      serialization: "bytemuck",
      repr: {
        kind: "c"
      },
      type: {
        kind: "struct",
        fields: [
          {
            name: "cliff_fee_numerator",
            type: "u64"
          },
          {
            name: "base_fee_mode",
            type: "u8"
          },
          {
            name: "padding",
            type: {
              array: [
                "u8",
                5
              ]
            }
          },
          {
            name: "number_of_period",
            type: "u16"
          },
          {
            name: "period_frequency",
            type: "u64"
          },
          {
            name: "reduction_factor",
            type: "u64"
          }
        ]
      }
    },
    {
      name: "Pool",
      serialization: "bytemuck",
      repr: {
        kind: "c"
      },
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool_fees",
            docs: [
              "Pool fee"
            ],
            type: {
              defined: {
                name: "PoolFeesStruct"
              }
            }
          },
          {
            name: "token_a_mint",
            docs: [
              "token a mint"
            ],
            type: "pubkey"
          },
          {
            name: "token_b_mint",
            docs: [
              "token b mint"
            ],
            type: "pubkey"
          },
          {
            name: "token_a_vault",
            docs: [
              "token a vault"
            ],
            type: "pubkey"
          },
          {
            name: "token_b_vault",
            docs: [
              "token b vault"
            ],
            type: "pubkey"
          },
          {
            name: "whitelisted_vault",
            docs: [
              "Whitelisted vault to be able to buy pool before activation_point"
            ],
            type: "pubkey"
          },
          {
            name: "padding_0",
            docs: [
              "padding, previously partner pubkey, be careful when using this field"
            ],
            type: {
              array: [
                "u8",
                32
              ]
            }
          },
          {
            name: "liquidity",
            docs: [
              "liquidity share"
            ],
            type: "u128"
          },
          {
            name: "padding_1",
            docs: [
              "padding, previous reserve amount, be careful to use that field"
            ],
            type: "u128"
          },
          {
            name: "protocol_a_fee",
            docs: [
              "protocol a fee"
            ],
            type: "u64"
          },
          {
            name: "protocol_b_fee",
            docs: [
              "protocol b fee"
            ],
            type: "u64"
          },
          {
            name: "dead_liquidity_fee_checkpoint",
            docs: [
              "Cumulative dead-liquidity fee (Compounding Pool only)"
            ],
            type: "u64"
          },
          {
            name: "padding_2",
            type: {
              array: [
                "u8",
                8
              ]
            }
          },
          {
            name: "sqrt_min_price",
            docs: [
              "min price"
            ],
            type: "u128"
          },
          {
            name: "sqrt_max_price",
            docs: [
              "max price"
            ],
            type: "u128"
          },
          {
            name: "sqrt_price",
            docs: [
              "current price"
            ],
            type: "u128"
          },
          {
            name: "activation_point",
            docs: [
              "Activation point, can be slot or timestamp"
            ],
            type: "u64"
          },
          {
            name: "activation_type",
            docs: [
              "Activation type, 0 means by slot, 1 means by timestamp"
            ],
            type: "u8"
          },
          {
            name: "pool_status",
            docs: [
              "pool status, 0: enable, 1 disable"
            ],
            type: "u8"
          },
          {
            name: "token_a_flag",
            docs: [
              "token a flag"
            ],
            type: "u8"
          },
          {
            name: "token_b_flag",
            docs: [
              "token b flag"
            ],
            type: "u8"
          },
          {
            name: "collect_fee_mode",
            docs: [
              "0 is collect fee in both token, 1 only collect fee only in token b"
            ],
            type: "u8"
          },
          {
            name: "pool_type",
            docs: [
              "pool type"
            ],
            type: "u8"
          },
          {
            name: "fee_version",
            docs: [
              "pool fee version, 0: max_fee is still capped at 50%, 1: max_fee is capped at 99%"
            ],
            type: "u8"
          },
          {
            name: "padding_3",
            docs: [
              "padding"
            ],
            type: "u8"
          },
          {
            name: "fee_a_per_liquidity",
            docs: [
              "cumulative"
            ],
            type: {
              array: [
                "u8",
                32
              ]
            }
          },
          {
            name: "fee_b_per_liquidity",
            docs: [
              "cumulative"
            ],
            type: {
              array: [
                "u8",
                32
              ]
            }
          },
          {
            name: "permanent_lock_liquidity",
            type: "u128"
          },
          {
            name: "metrics",
            docs: [
              "metrics"
            ],
            type: {
              defined: {
                name: "PoolMetrics"
              }
            }
          },
          {
            name: "creator",
            docs: [
              "pool creator"
            ],
            type: "pubkey"
          },
          {
            name: "token_a_amount",
            docs: [
              "token a amount"
            ],
            type: "u64"
          },
          {
            name: "token_b_amount",
            docs: [
              "token b amount"
            ],
            type: "u64"
          },
          {
            name: "layout_version",
            docs: [
              "layout version: version 0: haven't track token_a_amount and token_b_amount, version 1: track token_a_amount and token_b_amount"
            ],
            type: "u8"
          },
          {
            name: "padding_4",
            docs: [
              "Padding for further use"
            ],
            type: {
              array: [
                "u8",
                7
              ]
            }
          },
          {
            name: "padding_5",
            docs: [
              "Padding for further use"
            ],
            type: {
              array: [
                "u64",
                3
              ]
            }
          },
          {
            name: "reward_infos",
            docs: [
              "Farming reward information"
            ],
            type: {
              array: [
                {
                  defined: {
                    name: "RewardInfo"
                  }
                },
                2
              ]
            }
          }
        ]
      }
    },
    {
      name: "PoolFeeParameters",
      docs: [
        "Information regarding fee charges"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "base_fee",
            docs: [
              "Base fee"
            ],
            type: {
              defined: {
                name: "BaseFeeParameters"
              }
            }
          },
          {
            name: "compounding_fee_bps",
            docs: [
              "compounding fee bps, only have value if CollectFeeMode::Compounding"
            ],
            type: "u16"
          },
          {
            name: "padding",
            docs: [
              "padding for future use"
            ],
            type: "u8"
          },
          {
            name: "dynamic_fee",
            docs: [
              "dynamic fee"
            ],
            type: {
              option: {
                defined: {
                  name: "DynamicFeeParameters"
                }
              }
            }
          }
        ]
      }
    },
    {
      name: "PoolFeesConfig",
      serialization: "bytemuck",
      repr: {
        kind: "c"
      },
      type: {
        kind: "struct",
        fields: [
          {
            name: "base_fee",
            type: {
              defined: {
                name: "BaseFeeInfo"
              }
            }
          },
          {
            name: "dynamic_fee",
            type: {
              defined: {
                name: "DynamicFeeConfig"
              }
            }
          },
          {
            name: "protocol_fee_percent",
            type: "u8"
          },
          {
            name: "padding_0",
            type: "u8"
          },
          {
            name: "referral_fee_percent",
            type: "u8"
          },
          {
            name: "padding_1",
            type: {
              array: [
                "u8",
                3
              ]
            }
          },
          {
            name: "compounding_fee_bps",
            docs: [
              "Compounding fee bps, only non-zero if collect_fee_mode is compounding"
            ],
            type: "u16"
          },
          {
            name: "padding_2",
            type: {
              array: [
                "u64",
                5
              ]
            }
          }
        ]
      }
    },
    {
      name: "PoolFeesStruct",
      docs: [
        "Information regarding fee charges",
        "trading_fee = amount * trade_fee_numerator / denominator",
        "protocol_fee = trading_fee * protocol_fee_percentage / 100",
        "referral_fee = protocol_fee * referral_percentage / 100"
      ],
      serialization: "bytemuck",
      repr: {
        kind: "c"
      },
      type: {
        kind: "struct",
        fields: [
          {
            name: "base_fee",
            docs: [
              "Trade fees are extra token amounts that are held inside the token",
              "accounts during a trade, making the value of liquidity tokens rise.",
              "Trade fee numerator"
            ],
            type: {
              defined: {
                name: "BaseFeeStruct"
              }
            }
          },
          {
            name: "protocol_fee_percent",
            docs: [
              "Protocol trading fees are extra token amounts that are held inside the token",
              "accounts during a trade, with the equivalent in pool tokens minted to",
              "the protocol of the program.",
              "Protocol trade fee numerator"
            ],
            type: "u8"
          },
          {
            name: "padding_0",
            docs: [
              "padding for future use"
            ],
            type: "u8"
          },
          {
            name: "referral_fee_percent",
            docs: [
              "referral fee"
            ],
            type: "u8"
          },
          {
            name: "padding_1",
            docs: [
              "padding"
            ],
            type: {
              array: [
                "u8",
                3
              ]
            }
          },
          {
            name: "compounding_fee_bps",
            docs: [
              "compounding fee bps, only non-zero in CollectFeeMode::Compounding"
            ],
            type: "u16"
          },
          {
            name: "dynamic_fee",
            docs: [
              "dynamic fee"
            ],
            type: {
              defined: {
                name: "DynamicFeeStruct"
              }
            }
          },
          {
            name: "init_sqrt_price",
            type: "u128"
          }
        ]
      }
    },
    {
      name: "PoolMetrics",
      serialization: "bytemuck",
      repr: {
        kind: "c"
      },
      type: {
        kind: "struct",
        fields: [
          {
            name: "total_lp_a_fee",
            type: "u128"
          },
          {
            name: "total_lp_b_fee",
            type: "u128"
          },
          {
            name: "total_protocol_a_fee",
            type: "u64"
          },
          {
            name: "total_protocol_b_fee",
            type: "u64"
          },
          {
            name: "padding_0",
            type: {
              array: [
                "u64",
                2
              ]
            }
          },
          {
            name: "total_position",
            type: "u64"
          },
          {
            name: "padding",
            type: "u64"
          }
        ]
      }
    },
    {
      name: "Position",
      serialization: "bytemuck",
      repr: {
        kind: "c"
      },
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool",
            type: "pubkey"
          },
          {
            name: "nft_mint",
            docs: [
              "nft mint"
            ],
            type: "pubkey"
          },
          {
            name: "fee_a_per_token_checkpoint",
            docs: [
              "fee a checkpoint"
            ],
            type: {
              array: [
                "u8",
                32
              ]
            }
          },
          {
            name: "fee_b_per_token_checkpoint",
            docs: [
              "fee b checkpoint"
            ],
            type: {
              array: [
                "u8",
                32
              ]
            }
          },
          {
            name: "fee_a_pending",
            docs: [
              "fee a pending"
            ],
            type: "u64"
          },
          {
            name: "fee_b_pending",
            docs: [
              "fee b pending"
            ],
            type: "u64"
          },
          {
            name: "unlocked_liquidity",
            docs: [
              "unlock liquidity"
            ],
            type: "u128"
          },
          {
            name: "vested_liquidity",
            docs: [
              "vesting liquidity"
            ],
            type: "u128"
          },
          {
            name: "permanent_locked_liquidity",
            docs: [
              "permanent locked liquidity"
            ],
            type: "u128"
          },
          {
            name: "metrics",
            docs: [
              "metrics"
            ],
            type: {
              defined: {
                name: "PositionMetrics"
              }
            }
          },
          {
            name: "reward_infos",
            docs: [
              "Farming reward information"
            ],
            type: {
              array: [
                {
                  defined: {
                    name: "UserRewardInfo"
                  }
                },
                2
              ]
            }
          },
          {
            name: "inner_vesting",
            docs: [
              "inner vesting info"
            ],
            type: {
              defined: {
                name: "InnerVesting"
              }
            }
          },
          {
            name: "delegate_permission",
            docs: [
              "delegate permission bitmask (paired with SPL token Approve)"
            ],
            type: "u32"
          },
          {
            name: "padding",
            docs: [
              "padding for future usage"
            ],
            type: {
              array: [
                "u8",
                12
              ]
            }
          }
        ]
      }
    },
    {
      name: "PositionMetrics",
      serialization: "bytemuck",
      repr: {
        kind: "c"
      },
      type: {
        kind: "struct",
        fields: [
          {
            name: "total_claimed_a_fee",
            type: "u64"
          },
          {
            name: "total_claimed_b_fee",
            type: "u64"
          }
        ]
      }
    },
    {
      name: "RemoveLiquidityParameters",
      type: {
        kind: "struct",
        fields: [
          {
            name: "liquidity_delta",
            docs: [
              "delta liquidity"
            ],
            type: "u128"
          },
          {
            name: "token_a_amount_threshold",
            docs: [
              "minimum token a amount"
            ],
            type: "u64"
          },
          {
            name: "token_b_amount_threshold",
            docs: [
              "minimum token b amount"
            ],
            type: "u64"
          }
        ]
      }
    },
    {
      name: "RewardInfo",
      docs: [
        "Stores the state relevant for tracking liquidity mining rewards"
      ],
      serialization: "bytemuck",
      repr: {
        kind: "c"
      },
      type: {
        kind: "struct",
        fields: [
          {
            name: "initialized",
            docs: [
              "Indicates if the reward has been initialized"
            ],
            type: "u8"
          },
          {
            name: "reward_token_flag",
            docs: [
              "reward token flag"
            ],
            type: "u8"
          },
          {
            name: "_padding_0",
            docs: [
              "padding"
            ],
            type: {
              array: [
                "u8",
                6
              ]
            }
          },
          {
            name: "dead_liquidity_reward_checkpoint",
            docs: [
              "Cumulative dead-liquidity reward (Compounding Pool only)"
            ],
            type: "u64"
          },
          {
            name: "mint",
            docs: [
              "Reward token mint."
            ],
            type: "pubkey"
          },
          {
            name: "vault",
            docs: [
              "Reward vault token account."
            ],
            type: "pubkey"
          },
          {
            name: "funder",
            docs: [
              "Authority account that allows to fund rewards"
            ],
            type: "pubkey"
          },
          {
            name: "reward_duration",
            docs: [
              "reward duration"
            ],
            type: "u64"
          },
          {
            name: "reward_duration_end",
            docs: [
              "reward duration end"
            ],
            type: "u64"
          },
          {
            name: "reward_rate",
            docs: [
              "reward rate"
            ],
            type: "u128"
          },
          {
            name: "reward_per_token_stored",
            docs: [
              "Reward per token stored"
            ],
            type: {
              array: [
                "u8",
                32
              ]
            }
          },
          {
            name: "last_update_time",
            docs: [
              "The last time reward states were updated."
            ],
            type: "u64"
          },
          {
            name: "cumulative_seconds_with_empty_liquidity_reward",
            docs: [
              "Accumulated seconds when the farm distributed rewards but the bin was empty.",
              "These rewards will be carried over to the next reward time window."
            ],
            type: "u64"
          }
        ]
      }
    },
    {
      name: "SplitAmountInfo",
      type: {
        kind: "struct",
        fields: [
          {
            name: "permanent_locked_liquidity",
            type: "u128"
          },
          {
            name: "unlocked_liquidity",
            type: "u128"
          },
          {
            name: "fee_a",
            type: "u64"
          },
          {
            name: "fee_b",
            type: "u64"
          },
          {
            name: "reward_0",
            type: "u64"
          },
          {
            name: "reward_1",
            type: "u64"
          }
        ]
      }
    },
    {
      name: "SplitAmountInfo2",
      type: {
        kind: "struct",
        fields: [
          {
            name: "permanent_locked_liquidity",
            type: "u128"
          },
          {
            name: "unlocked_liquidity",
            type: "u128"
          },
          {
            name: "vested_liquidity",
            type: "u128"
          },
          {
            name: "fee_a",
            type: "u64"
          },
          {
            name: "fee_b",
            type: "u64"
          },
          {
            name: "reward_0",
            type: "u64"
          },
          {
            name: "reward_1",
            type: "u64"
          }
        ]
      }
    },
    {
      name: "SplitPositionInfo",
      type: {
        kind: "struct",
        fields: [
          {
            name: "liquidity",
            type: "u128"
          },
          {
            name: "fee_a",
            type: "u64"
          },
          {
            name: "fee_b",
            type: "u64"
          },
          {
            name: "reward_0",
            type: "u64"
          },
          {
            name: "reward_1",
            type: "u64"
          }
        ]
      }
    },
    {
      name: "SplitPositionInfo2",
      type: {
        kind: "struct",
        fields: [
          {
            name: "unlocked_liquidity",
            type: "u128"
          },
          {
            name: "permanent_locked_liquidity",
            type: "u128"
          },
          {
            name: "vested_liquidity",
            type: "u128"
          },
          {
            name: "fee_a",
            type: "u64"
          },
          {
            name: "fee_b",
            type: "u64"
          },
          {
            name: "reward_0",
            type: "u64"
          },
          {
            name: "reward_1",
            type: "u64"
          }
        ]
      }
    },
    {
      name: "SplitPositionParameters",
      type: {
        kind: "struct",
        fields: [
          {
            name: "unlocked_liquidity_percentage",
            docs: [
              "Percentage of unlocked liquidity to split to the second position"
            ],
            type: "u8"
          },
          {
            name: "permanent_locked_liquidity_percentage",
            docs: [
              "Percentage of permanent locked liquidity to split to the second position"
            ],
            type: "u8"
          },
          {
            name: "fee_a_percentage",
            docs: [
              "Percentage of fee A pending to split to the second position"
            ],
            type: "u8"
          },
          {
            name: "fee_b_percentage",
            docs: [
              "Percentage of fee B pending to split to the second position"
            ],
            type: "u8"
          },
          {
            name: "reward_0_percentage",
            docs: [
              "Percentage of reward 0 pending to split to the second position"
            ],
            type: "u8"
          },
          {
            name: "reward_1_percentage",
            docs: [
              "Percentage of reward 1 pending to split to the second position"
            ],
            type: "u8"
          },
          {
            name: "inner_vesting_liquidity_percentage",
            docs: [
              "Percentage of inner vesting liquidity"
            ],
            type: "u8"
          },
          {
            name: "padding",
            docs: [
              "padding for future"
            ],
            type: {
              array: [
                "u8",
                15
              ]
            }
          }
        ]
      }
    },
    {
      name: "SplitPositionParameters2",
      type: {
        kind: "struct",
        fields: [
          {
            name: "unlocked_liquidity_numerator",
            type: "u32"
          },
          {
            name: "permanent_locked_liquidity_numerator",
            type: "u32"
          },
          {
            name: "fee_a_numerator",
            type: "u32"
          },
          {
            name: "fee_b_numerator",
            type: "u32"
          },
          {
            name: "reward_0_numerator",
            type: "u32"
          },
          {
            name: "reward_1_numerator",
            type: "u32"
          }
        ]
      }
    },
    {
      name: "SplitPositionParameters3",
      type: {
        kind: "struct",
        fields: [
          {
            name: "unlocked_liquidity_numerator",
            type: "u32"
          },
          {
            name: "permanent_locked_liquidity_numerator",
            type: "u32"
          },
          {
            name: "fee_a_numerator",
            type: "u32"
          },
          {
            name: "fee_b_numerator",
            type: "u32"
          },
          {
            name: "reward_0_numerator",
            type: "u32"
          },
          {
            name: "reward_1_numerator",
            type: "u32"
          },
          {
            name: "inner_vesting_liquidity_numerator",
            type: "u32"
          }
        ]
      }
    },
    {
      name: "StaticConfigParameters",
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool_fees",
            type: {
              defined: {
                name: "PoolFeeParameters"
              }
            }
          },
          {
            name: "sqrt_min_price",
            type: "u128"
          },
          {
            name: "sqrt_max_price",
            type: "u128"
          },
          {
            name: "vault_config_key",
            type: "pubkey"
          },
          {
            name: "pool_creator_authority",
            type: "pubkey"
          },
          {
            name: "activation_type",
            type: "u8"
          },
          {
            name: "collect_fee_mode",
            type: "u8"
          },
          {
            name: "permission",
            type: "u128"
          }
        ]
      }
    },
    {
      name: "SwapParameters",
      type: {
        kind: "struct",
        fields: [
          {
            name: "amount_in",
            type: "u64"
          },
          {
            name: "minimum_amount_out",
            type: "u64"
          }
        ]
      }
    },
    {
      name: "SwapParameters2",
      type: {
        kind: "struct",
        fields: [
          {
            name: "amount_0",
            docs: [
              "When it's exact in, partial fill, this will be amount_in. When it's exact out, this will be amount_out"
            ],
            type: "u64"
          },
          {
            name: "amount_1",
            docs: [
              "When it's exact in, partial fill, this will be minimum_amount_out. When it's exact out, this will be maximum_amount_in"
            ],
            type: "u64"
          },
          {
            name: "swap_mode",
            docs: [
              "Swap mode, refer [SwapMode]"
            ],
            type: "u8"
          }
        ]
      }
    },
    {
      name: "SwapResult2",
      type: {
        kind: "struct",
        fields: [
          {
            name: "included_fee_input_amount",
            type: "u64"
          },
          {
            name: "excluded_fee_input_amount",
            type: "u64"
          },
          {
            name: "amount_left",
            type: "u64"
          },
          {
            name: "output_amount",
            type: "u64"
          },
          {
            name: "next_sqrt_price",
            type: "u128"
          },
          {
            name: "claiming_fee",
            type: "u64"
          },
          {
            name: "protocol_fee",
            type: "u64"
          },
          {
            name: "compounding_fee",
            type: "u64"
          },
          {
            name: "referral_fee",
            type: "u64"
          }
        ]
      }
    },
    {
      name: "TokenBadge",
      docs: [
        "Parameter that set by the protocol"
      ],
      serialization: "bytemuck",
      repr: {
        kind: "c"
      },
      type: {
        kind: "struct",
        fields: [
          {
            name: "token_mint",
            docs: [
              "token mint"
            ],
            type: "pubkey"
          },
          {
            name: "_padding",
            docs: [
              "Reserve"
            ],
            type: {
              array: [
                "u8",
                128
              ]
            }
          }
        ]
      }
    },
    {
      name: "UpdatePoolFeesParameters",
      type: {
        kind: "struct",
        fields: [
          {
            name: "cliff_fee_numerator",
            docs: [
              "Base fee update mode:",
              "- None: skip base fee update",
              "- Some: update new cliff_fee_numerator if base fee is static"
            ],
            type: {
              option: "u64"
            }
          },
          {
            name: "dynamic_fee",
            docs: [
              "Dynamic fee update mode:",
              "- None: skip dynamic fee update",
              "- Some(with default value): disable dynamic fee",
              "- Some(with non default value): enable dynamic fee if disabled or update dynamic fee if enabled"
            ],
            type: {
              option: {
                defined: {
                  name: "DynamicFeeParameters"
                }
              }
            }
          },
          {
            name: "compounding_fee_bps",
            docs: [
              "Compounding fee update mode:",
              "- None: skip compounding fee update",
              "- Some: update compounding_fee_bps; pool must use CollectFeeMode::Compounding"
            ],
            type: {
              option: "u16"
            }
          }
        ]
      }
    },
    {
      name: "UserRewardInfo",
      serialization: "bytemuck",
      repr: {
        kind: "c"
      },
      type: {
        kind: "struct",
        fields: [
          {
            name: "reward_per_token_checkpoint",
            docs: [
              "The latest update reward checkpoint"
            ],
            type: {
              array: [
                "u8",
                32
              ]
            }
          },
          {
            name: "reward_pendings",
            docs: [
              "Current pending rewards"
            ],
            type: "u64"
          },
          {
            name: "total_claimed_rewards",
            docs: [
              "Total claimed rewards"
            ],
            type: "u64"
          }
        ]
      }
    },
    {
      name: "Vesting",
      serialization: "bytemuck",
      repr: {
        kind: "c"
      },
      type: {
        kind: "struct",
        fields: [
          {
            name: "position",
            type: "pubkey"
          },
          {
            name: "inner_vesting",
            type: {
              defined: {
                name: "InnerVesting"
              }
            }
          },
          {
            name: "padding2",
            type: {
              array: [
                "u128",
                4
              ]
            }
          }
        ]
      }
    },
    {
      name: "VestingParameters",
      type: {
        kind: "struct",
        fields: [
          {
            name: "cliff_point",
            type: {
              option: "u64"
            }
          },
          {
            name: "period_frequency",
            type: "u64"
          },
          {
            name: "cliff_unlock_liquidity",
            type: "u128"
          },
          {
            name: "liquidity_per_period",
            type: "u128"
          },
          {
            name: "number_of_period",
            type: "u16"
          }
        ]
      }
    }
  ],
  constants: [
    {
      name: "BIN_STEP_BPS_DEFAULT",
      type: "u16",
      value: "1"
    },
    {
      name: "BIN_STEP_U128_DEFAULT_LE_BYTES",
      type: {
        array: [
          "u8",
          16
        ]
      },
      value: "[203, 16, 199, 186, 184, 141, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0]"
    },
    {
      name: "CURRENT_POOL_VERSION",
      type: "u8",
      value: "1"
    },
    {
      name: "CUSTOMIZABLE_POOL_PREFIX",
      type: "bytes",
      value: "[99, 112, 111, 111, 108]"
    },
    {
      name: "FEE_DENOMINATOR",
      docs: [
        "Default fee denominator. DO NOT simply update it as it will break logic that depends on it as default value."
      ],
      type: "u64",
      value: "1000000000"
    },
    {
      name: "MAX_BASIS_POINT",
      docs: [
        "Max basis point. 100% in pct"
      ],
      type: "u16",
      value: "10000"
    },
    {
      name: "MAX_FEE_NUMERATOR_V0",
      type: "u64",
      value: "500000000"
    },
    {
      name: "MAX_FEE_NUMERATOR_V1",
      type: "u64",
      value: "990000000"
    },
    {
      name: "MAX_SQRT_PRICE_LE_BYTES",
      type: {
        array: [
          "u8",
          16
        ]
      },
      value: "[155, 87, 105, 78, 169, 26, 92, 132, 177, 196, 254, 255, 0, 0, 0, 0]"
    },
    {
      name: "MIN_FEE_NUMERATOR",
      type: "u64",
      value: "100000"
    },
    {
      name: "MIN_SQRT_PRICE_LE_BYTES",
      type: {
        array: [
          "u8",
          16
        ]
      },
      value: "[80, 59, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]"
    },
    {
      name: "POOL_AUTHORITY_PREFIX",
      type: "bytes",
      value: "[112, 111, 111, 108, 95, 97, 117, 116, 104, 111, 114, 105, 116, 121]"
    },
    {
      name: "POOL_PREFIX",
      type: "bytes",
      value: "[112, 111, 111, 108]"
    },
    {
      name: "POSITION_NFT_ACCOUNT_PREFIX",
      type: "bytes",
      value: "[112, 111, 115, 105, 116, 105, 111, 110, 95, 110, 102, 116, 95, 97, 99, 99, 111, 117, 110, 116]"
    },
    {
      name: "POSITION_PREFIX",
      type: "bytes",
      value: "[112, 111, 115, 105, 116, 105, 111, 110]"
    },
    {
      name: "SPLIT_POSITION_DENOMINATOR",
      type: "u32",
      value: "1000000000"
    },
    {
      name: "TOKEN_VAULT_PREFIX",
      type: "bytes",
      value: "[116, 111, 107, 101, 110, 95, 118, 97, 117, 108, 116]"
    }
  ]
};

// src/helpers/createProgram.ts
function createDbcProgram(connection, commitment = "confirmed") {
  const provider = new (0, _anchor.AnchorProvider)(connection, null, {
    commitment
  });
  const program = new (0, _anchor.Program)(
    idl_default,
    provider
  );
  return { program };
}
function createDynamicVaultProgram(connection, commitment = "confirmed") {
  const provider = new (0, _anchor.AnchorProvider)(connection, null, {
    commitment
  });
  const program = new (0, _anchor.Program)(idl_default2, provider);
  return program;
}
function createDammV1Program(connection, commitment = "confirmed") {
  const provider = new (0, _anchor.AnchorProvider)(connection, null, {
    commitment
  });
  const program = new (0, _anchor.Program)(idl_default3, provider);
  return program;
}
function createDammV2Program(connection, commitment = "confirmed") {
  const provider = new (0, _anchor.AnchorProvider)(connection, null, {
    commitment
  });
  const program = new (0, _anchor.Program)(idl_default4, provider);
  return program;
}

// src/helpers/instructions.ts





async function createInitializePermissionlessDynamicVaultIx(mint, payer, vaultProgram) {
  const vaultKey = deriveVaultAddress(mint, BASE_ADDRESS);
  const tokenVaultKey = deriveTokenVaultKey(vaultKey);
  const lpMintKey = deriveVaultLpMintAddress(vaultKey);
  const ix = await vaultProgram.methods.initialize().accountsPartial({
    vault: vaultKey,
    tokenVault: tokenVaultKey,
    tokenMint: mint,
    lpMint: lpMintKey,
    payer,
    rent: _web3js.SYSVAR_RENT_PUBKEY,
    tokenProgram: _spltoken.TOKEN_PROGRAM_ID,
    systemProgram: _web3js.SystemProgram.programId
  }).instruction();
  return {
    instruction: ix,
    vaultKey,
    tokenVaultKey,
    lpMintKey
  };
}
async function createLockEscrowIx(payer, pool, lpMint, escrowOwner, lockEscrowKey, dammV1Program) {
  const ix = await dammV1Program.methods.createLockEscrow().accountsPartial({
    pool,
    lpMint,
    owner: escrowOwner,
    lockEscrow: lockEscrowKey,
    payer,
    systemProgram: _web3js.SystemProgram.programId
  }).instruction();
  return ix;
}

// src/services/program.ts











// src/services/state.ts





var StateService = class {
  constructor(connection, commitment) {
    const { program } = createDbcProgram(connection, commitment);
    this.program = program;
    this.commitment = commitment;
  }
  getProgram() {
    return this.program;
  }
  /**
   * Fetch virtual pools across both the standard and transfer-hook account variants.
   */
  async fetchVirtualPools(filters) {
    const [pools, transferHookPools] = await Promise.all([
      this.program.account.virtualPool.all(filters),
      this.program.account.transferHookPool.all(filters)
    ]);
    return [...pools, ...transferHookPools];
  }
  /**
   * Fetch pool configs across both the standard and transfer-hook account variants.
   */
  async fetchPoolConfigs(filters) {
    const [configs, transferHookConfigs] = await Promise.all([
      this.program.account.poolConfig.all(filters),
      this.program.account.configWithTransferHook.all(filters)
    ]);
    return [
      ...configs,
      ...transferHookConfigs.map((account) => ({
        publicKey: account.publicKey,
        account: account.account.config
      }))
    ];
  }
  /**
   * Fetch a pool config account.
   */
  async getPoolConfig(configAddress) {
    const address = configAddress instanceof _web3js.PublicKey ? configAddress : new (0, _web3js.PublicKey)(configAddress);
    try {
      const poolConfig = await this.program.account.poolConfig.fetchNullable(
        address,
        this.commitment
      );
      if (poolConfig) {
        return poolConfig;
      }
    } catch (e3) {
    }
    const configWithTransferHook = await this.program.account.configWithTransferHook.fetchNullable(
      address,
      this.commitment
    );
    return _nullishCoalesce(_optionalChain([configWithTransferHook, 'optionalAccess', _32 => _32.config]), () => ( null));
  }
  /**
   * Fetch all pool config accounts.
   */
  async getPoolConfigs() {
    return this.fetchPoolConfigs();
  }
  /**
   * Fetch all pool configs owned by a wallet.
   */
  async getPoolConfigsByOwner(owner) {
    const filters = createProgramAccountFilter(owner, 72);
    return this.fetchPoolConfigs(filters);
  }
  /**
   * Fetch a virtual pool account.
   */
  async getPool(poolAddress) {
    const address = poolAddress instanceof _web3js.PublicKey ? poolAddress : new (0, _web3js.PublicKey)(poolAddress);
    try {
      const virtualPool = await this.program.account.virtualPool.fetchNullable(
        address,
        this.commitment
      );
      if (virtualPool) {
        return virtualPool;
      }
    } catch (e4) {
    }
    return await this.program.account.transferHookPool.fetchNullable(
      address,
      this.commitment
    );
  }
  /**
   * Fetch all virtual pool accounts.
   */
  async getPools() {
    return this.fetchVirtualPools();
  }
  /**
   * Fetch all virtual pools that use a config.
   */
  async getPoolsByConfig(configAddress) {
    const filters = createProgramAccountFilter(configAddress, 72);
    return this.fetchVirtualPools(filters);
  }
  /**
   * Fetch all virtual pools created by a wallet.
   */
  async getPoolsByCreator(creatorAddress) {
    const filters = createProgramAccountFilter(creatorAddress, 104);
    return this.fetchVirtualPools(filters);
  }
  /**
   * Fetch the first virtual pool that uses a base mint.
   */
  async getPoolByBaseMint(baseMint) {
    const filters = createProgramAccountFilter(baseMint, 136);
    const pools = await this.fetchVirtualPools(filters);
    return pools.length > 0 ? pools[0] : null;
  }
  /**
   * Fetch the migration quote threshold for a pool.
   */
  async getPoolMigrationQuoteThreshold(poolAddress) {
    const pool = await this.getPool(poolAddress);
    if (!pool) {
      throw new Error(`Pool not found: ${poolAddress.toString()}`);
    }
    const configAddress = pool.poolState.config;
    const config = await this.getPoolConfig(configAddress);
    return config.migrationQuoteThreshold;
  }
  /**
   * Return quote-token curve progress as a ratio between 0 and 1.
   */
  async getPoolQuoteTokenCurveProgress(poolAddress) {
    const pool = await this.getPool(poolAddress);
    if (!pool) {
      throw new Error(`Pool not found: ${poolAddress.toString()}`);
    }
    const config = await this.getPoolConfig(pool.poolState.config);
    const quoteReserve = pool.poolState.quoteReserve;
    const migrationThreshold = config.migrationQuoteThreshold;
    const quoteReserveDecimal = new (0, _decimaljs2.default)(quoteReserve.toString());
    const thresholdDecimal = new (0, _decimaljs2.default)(migrationThreshold.toString());
    const progress = quoteReserveDecimal.div(thresholdDecimal).toNumber();
    return Math.min(Math.max(progress, 0), 1);
  }
  /**
   * Return base-token curve progress as a ratio between 0 and 1.
   */
  async getPoolBaseTokenCurveProgress(poolAddress) {
    const pool = await this.getPool(poolAddress);
    if (!pool) {
      throw new Error(`Pool not found: ${poolAddress.toString()}`);
    }
    const config = await this.getPoolConfig(pool.poolState.config);
    const baseSold = new (0, _decimaljs2.default)(
      getBaseTokenForSwap(
        config.sqrtStartPrice,
        pool.poolState.sqrtPrice,
        config.curve
      ).toString()
    );
    const totalBaseCouldBeSold = new (0, _decimaljs2.default)(
      getBaseTokenForSwap(
        config.sqrtStartPrice,
        config.migrationSqrtPrice,
        config.curve
      ).toString()
    );
    const progress = baseSold.div(totalBaseCouldBeSold).toNumber();
    return Math.min(Math.max(progress, 0), 1);
  }
  /**
   * Fetch metadata accounts for a virtual pool.
   */
  async getPoolMetadata(poolAddress) {
    const filters = createProgramAccountFilter(poolAddress, 8);
    const accounts = await this.program.account.virtualPoolMetadata.all(filters);
    return accounts.map((account) => account.account);
  }
  /**
   * Fetch metadata accounts for a partner.
   */
  async getPartnerMetadata(partnerAddress) {
    const filters = createProgramAccountFilter(partnerAddress, 8);
    const accounts = await this.program.account.partnerMetadata.all(filters);
    return accounts.map((account) => account.account);
  }
  /**
   * Fetch current unclaimed fees and lifetime trading fee metrics for a pool.
   */
  async getPoolFeeMetrics(poolAddress) {
    const pool = await this.getPool(poolAddress);
    if (!pool) {
      throw new Error(`Pool not found: ${poolAddress.toString()}`);
    }
    return {
      current: {
        partnerBaseFee: pool.poolState.partnerBaseFee,
        partnerQuoteFee: pool.poolState.partnerQuoteFee,
        creatorBaseFee: pool.poolState.creatorBaseFee,
        creatorQuoteFee: pool.poolState.creatorQuoteFee
      },
      total: {
        totalTradingBaseFee: pool.poolState.metrics.totalTradingBaseFee,
        totalTradingQuoteFee: pool.poolState.metrics.totalTradingQuoteFee
      }
    };
  }
  /**
   * Calculate claimed, unclaimed, and total trading fees split by creator and partner.
   */
  async getPoolFeeBreakdown(poolAddress) {
    const pool = await this.getPool(poolAddress);
    if (!pool) {
      throw new Error(`Pool not found: ${poolAddress.toString()}`);
    }
    const config = await this.getPoolConfig(pool.poolState.config);
    if (!config) {
      throw new Error(
        `Config not found: ${pool.poolState.config.toString()}`
      );
    }
    const creatorTradingFeePercentage = config.creatorTradingFeePercentage;
    const totalTradingBaseFee = pool.poolState.metrics.totalTradingBaseFee;
    const totalTradingQuoteFee = pool.poolState.metrics.totalTradingQuoteFee;
    let creatorTotalTradingBaseFee = new (0, _bnjs2.default)(0);
    let creatorTotalTradingQuoteFee = new (0, _bnjs2.default)(0);
    let partnerTotalTradingBaseFee = totalTradingBaseFee;
    let partnerTotalTradingQuoteFee = totalTradingQuoteFee;
    if (creatorTradingFeePercentage > 0) {
      creatorTotalTradingBaseFee = totalTradingBaseFee.mul(new (0, _bnjs2.default)(creatorTradingFeePercentage)).div(new (0, _bnjs2.default)(100));
      creatorTotalTradingQuoteFee = totalTradingQuoteFee.mul(new (0, _bnjs2.default)(creatorTradingFeePercentage)).div(new (0, _bnjs2.default)(100));
      partnerTotalTradingBaseFee = totalTradingBaseFee.sub(
        creatorTotalTradingBaseFee
      );
      partnerTotalTradingQuoteFee = totalTradingQuoteFee.sub(
        creatorTotalTradingQuoteFee
      );
    }
    const creatorUnclaimedBaseFee = pool.poolState.creatorBaseFee;
    const creatorUnclaimedQuoteFee = pool.poolState.creatorQuoteFee;
    const partnerUnclaimedBaseFee = pool.poolState.partnerBaseFee;
    const partnerUnclaimedQuoteFee = pool.poolState.partnerQuoteFee;
    const creatorClaimedBaseFee = creatorTotalTradingBaseFee.sub(
      creatorUnclaimedBaseFee
    );
    const creatorClaimedQuoteFee = creatorTotalTradingQuoteFee.sub(
      creatorUnclaimedQuoteFee
    );
    const partnerClaimedBaseFee = partnerTotalTradingBaseFee.sub(
      partnerUnclaimedBaseFee
    );
    const partnerClaimedQuoteFee = partnerTotalTradingQuoteFee.sub(
      partnerUnclaimedQuoteFee
    );
    return {
      creator: {
        unclaimedBaseFee: creatorUnclaimedBaseFee,
        unclaimedQuoteFee: creatorUnclaimedQuoteFee,
        claimedBaseFee: creatorClaimedBaseFee,
        claimedQuoteFee: creatorClaimedQuoteFee,
        totalBaseFee: creatorTotalTradingBaseFee,
        totalQuoteFee: creatorTotalTradingQuoteFee
      },
      partner: {
        unclaimedBaseFee: partnerUnclaimedBaseFee,
        unclaimedQuoteFee: partnerUnclaimedQuoteFee,
        claimedBaseFee: partnerClaimedBaseFee,
        claimedQuoteFee: partnerClaimedQuoteFee,
        totalBaseFee: partnerTotalTradingBaseFee,
        totalQuoteFee: partnerTotalTradingQuoteFee
      }
    };
  }
  /**
   * Fetch fee metrics for every pool linked to a config.
   */
  async getPoolsFeesByConfig(configAddress) {
    const filteredPools = await this.getPoolsByConfig(configAddress);
    return filteredPools.map((pool) => ({
      poolAddress: pool.publicKey,
      partnerBaseFee: pool.account.poolState.partnerBaseFee,
      partnerQuoteFee: pool.account.poolState.partnerQuoteFee,
      creatorBaseFee: pool.account.poolState.creatorBaseFee,
      creatorQuoteFee: pool.account.poolState.creatorQuoteFee,
      totalTradingBaseFee: pool.account.poolState.metrics.totalTradingBaseFee,
      totalTradingQuoteFee: pool.account.poolState.metrics.totalTradingQuoteFee
    }));
  }
  /**
   * Fetch fee metrics for every pool linked to a creator.
   */
  async getPoolsFeesByCreator(creatorAddress) {
    const filteredPools = await this.getPoolsByCreator(creatorAddress);
    return filteredPools.map((pool) => ({
      poolAddress: pool.publicKey,
      partnerBaseFee: pool.account.poolState.partnerBaseFee,
      partnerQuoteFee: pool.account.poolState.partnerQuoteFee,
      creatorBaseFee: pool.account.poolState.creatorBaseFee,
      creatorQuoteFee: pool.account.poolState.creatorQuoteFee,
      totalTradingBaseFee: pool.account.poolState.metrics.totalTradingBaseFee,
      totalTradingQuoteFee: pool.account.poolState.metrics.totalTradingQuoteFee
    }));
  }
  /**
   * Fetch DAMM V1 migration metadata for a pool.
   */
  async getDammV1MigrationMetadata(poolAddress) {
    const migrationMetadataAddress = deriveDammV1MigrationMetadataAddress(poolAddress);
    const metadata = await this.program.account.meteoraDammMigrationMetadata.fetch(
      migrationMetadataAddress
    );
    return metadata;
  }
  /**
   * Fetch the DBC token badge for a mint, if one exists.
   */
  async getTokenBadge(tokenMint) {
    const mint = tokenMint instanceof _web3js.PublicKey ? tokenMint : new (0, _web3js.PublicKey)(tokenMint);
    const address = deriveTokenBadgeAddress(mint);
    return this.program.account.tokenBadge.fetchNullable(
      address,
      this.commitment
    );
  }
};

// src/services/program.ts
var DynamicBondingCurveProgram = class {
  constructor(connection, commitment) {
    const { program } = createDbcProgram(connection, commitment);
    this.program = program;
    this.connection = connection;
    this.poolAuthority = deriveDbcPoolAuthority();
    this.commitment = commitment;
    this.state = new StateService(connection, commitment);
  }
  async getPoolWithConfig(pool) {
    const virtualPool = await this.state.getPool(pool);
    if (!virtualPool) {
      throw new Error(`Pool not found: ${pool.toString()}`);
    }
    const poolConfigState = await this.state.getPoolConfig(
      virtualPool.poolState.config
    );
    if (!poolConfigState) {
      throw new Error(`Pool config not found for virtual pool`);
    }
    return { virtualPool, poolConfigState };
  }
  prepareSwapParams(swapBaseForQuote, virtualPoolState, poolConfigState) {
    if (swapBaseForQuote) {
      return {
        inputMint: new (0, _web3js.PublicKey)(virtualPoolState.baseMint),
        outputMint: new (0, _web3js.PublicKey)(poolConfigState.quoteMint),
        inputTokenProgram: getTokenProgram(virtualPoolState.poolType),
        outputTokenProgram: getTokenProgram(
          poolConfigState.quoteTokenFlag
        )
      };
    }
    return {
      inputMint: new (0, _web3js.PublicKey)(poolConfigState.quoteMint),
      outputMint: new (0, _web3js.PublicKey)(virtualPoolState.baseMint),
      inputTokenProgram: getTokenProgram(poolConfigState.quoteTokenFlag),
      outputTokenProgram: getTokenProgram(virtualPoolState.poolType)
    };
  }
  async buildCreateConfigTx(configParam, config, feeClaimer, leftoverReceiver, quoteMint, payer, tokenBadge) {
    validateConfigParameters({ ...configParam, leftoverReceiver });
    return this.program.methods.createConfig(configParam).accountsPartial({
      config,
      feeClaimer,
      leftoverReceiver,
      quoteMint,
      payer
    }).remainingAccounts(getTokenBadgeRemainingAccounts(tokenBadge)).transaction();
  }
  async buildCreateConfigWithTransferHookTx(configParam, config, feeClaimer, leftoverReceiver, quoteMint, transferHookProgram, payer, tokenBadge) {
    validateConfigParameters(
      { ...configParam, leftoverReceiver },
      { isTransferHook: true, transferHookProgram }
    );
    return this.program.methods.createConfigWithTransferHook(configParam).accountsPartial({
      config,
      feeClaimer,
      leftoverReceiver,
      quoteMint,
      transferHookProgram,
      payer
    }).remainingAccounts(getTokenBadgeRemainingAccounts(tokenBadge)).transaction();
  }
  async initializeSplPool(params) {
    const {
      name,
      symbol,
      uri,
      pool,
      config,
      payer,
      poolCreator,
      mintMetadata,
      baseMint,
      baseVault,
      quoteVault,
      quoteMint,
      tokenBadge,
      tokenQuoteProgram
    } = params;
    return this.program.methods.initializeVirtualPoolWithSplToken({
      name,
      symbol,
      uri
    }).accountsPartial({
      pool,
      config,
      payer,
      creator: poolCreator,
      mintMetadata,
      baseMint,
      poolAuthority: this.poolAuthority,
      baseVault,
      quoteVault,
      quoteMint,
      tokenQuoteProgram,
      metadataProgram: METAPLEX_PROGRAM_ID,
      tokenProgram: _spltoken.TOKEN_PROGRAM_ID
    }).remainingAccounts(getTokenBadgeRemainingAccounts(tokenBadge)).transaction();
  }
  async initializeToken2022Pool(params) {
    const {
      name,
      symbol,
      uri,
      pool,
      config,
      payer,
      poolCreator,
      baseMint,
      baseVault,
      quoteVault,
      quoteMint,
      tokenBadge,
      tokenQuoteProgram
    } = params;
    return this.program.methods.initializeVirtualPoolWithToken2022({
      name,
      symbol,
      uri
    }).accountsPartial({
      pool,
      config,
      payer,
      creator: poolCreator,
      baseMint,
      poolAuthority: this.poolAuthority,
      baseVault,
      quoteVault,
      quoteMint,
      tokenQuoteProgram,
      tokenProgram: _spltoken.TOKEN_2022_PROGRAM_ID
    }).remainingAccounts(getTokenBadgeRemainingAccounts(tokenBadge)).transaction();
  }
  async initializeToken2022PoolWithTransferHook(params) {
    const {
      name,
      symbol,
      uri,
      pool,
      config,
      payer,
      poolCreator,
      baseMint,
      baseVault,
      quoteVault,
      quoteMint,
      transferHookProgram,
      tokenQuoteProgram,
      tokenBadge
    } = params;
    return this.program.methods.initializeVirtualPoolWithToken2022TransferHook({
      name,
      symbol,
      uri
    }).accountsPartial({
      pool,
      config,
      payer,
      creator: poolCreator,
      baseMint,
      poolAuthority: this.poolAuthority,
      baseVault,
      quoteVault,
      quoteMint,
      transferHookProgram,
      tokenQuoteProgram,
      tokenProgram: _spltoken.TOKEN_2022_PROGRAM_ID
    }).remainingAccounts(getTokenBadgeRemainingAccounts(tokenBadge)).transaction();
  }
  async buildCreatePoolTx(createPoolParam, tokenType, quoteMint) {
    const {
      baseMint,
      name,
      symbol,
      uri,
      poolCreator,
      config,
      payer,
      tokenBadge
    } = createPoolParam;
    const pool = deriveDbcPoolAddress(quoteMint, baseMint, config);
    const baseVault = deriveDbcTokenVaultAddress(pool, baseMint);
    const quoteVault = deriveDbcTokenVaultAddress(pool, quoteMint);
    const quoteTokenType = await getTokenType(this.connection, quoteMint);
    if (quoteTokenType === null) {
      throw new Error(`Invalid quote mint: ${quoteMint.toString()}`);
    }
    const tokenQuoteProgram = getTokenProgram(quoteTokenType);
    const baseParams = {
      name,
      symbol,
      uri,
      pool,
      config,
      payer,
      poolCreator,
      baseMint,
      baseVault,
      quoteVault,
      quoteMint,
      tokenBadge
    };
    if (tokenType === 0 /* SPLToken */) {
      const mintMetadata = deriveMintMetadata(baseMint);
      return this.initializeSplPool({
        ...baseParams,
        mintMetadata,
        tokenQuoteProgram
      });
    }
    return this.initializeToken2022Pool({
      ...baseParams,
      tokenQuoteProgram
    });
  }
  async buildCreatePoolWithTransferHookTx(createPoolParam, quoteMint, tokenQuoteProgram) {
    const {
      baseMint,
      name,
      symbol,
      uri,
      poolCreator,
      config,
      payer,
      transferHookProgram,
      tokenBadge
    } = createPoolParam;
    if (!validateTransferHookProgram(transferHookProgram)) {
      throw new Error(
        "Invalid transfer hook program: cannot be the DBC program, SPL Token, SPL Token-2022, or the default pubkey"
      );
    }
    const pool = deriveDbcPoolAddress(quoteMint, baseMint, config);
    const baseVault = deriveDbcTokenVaultAddress(pool, baseMint);
    const quoteVault = deriveDbcTokenVaultAddress(pool, quoteMint);
    return this.initializeToken2022PoolWithTransferHook({
      name,
      symbol,
      uri,
      pool,
      config,
      payer,
      poolCreator,
      baseMint,
      baseVault,
      quoteVault,
      quoteMint,
      transferHookProgram,
      tokenQuoteProgram,
      tokenBadge
    });
  }
  async buildSwapBuyTx(firstBuyParam, baseMint, config, baseFee, swapBaseForQuote, activationType, tokenType, quoteMint, enableFirstSwapWithMinFee) {
    const {
      buyer,
      receiver,
      buyAmount,
      minimumAmountOut,
      referralTokenAccount
    } = firstBuyParam;
    validateSwapAmount(buyAmount);
    let rateLimiterApplied = false;
    if (baseFee.baseFeeMode === 2 /* RateLimiter */) {
      const currentPoint = await getCurrentPoint(
        this.connection,
        activationType
      );
      rateLimiterApplied = isRateLimiterApplied(
        currentPoint,
        new (0, _bnjs2.default)(0),
        swapBaseForQuote ? 0 /* BaseToQuote */ : 1 /* QuoteToBase */,
        baseFee.secondFactor,
        baseFee.thirdFactor,
        new (0, _bnjs2.default)(baseFee.firstFactor)
      );
    }
    const quoteTokenFlag = await getTokenType(this.connection, quoteMint);
    const { inputMint, outputMint, inputTokenProgram, outputTokenProgram } = this.prepareSwapParams(
      false,
      {
        baseMint,
        poolType: tokenType
      },
      {
        quoteMint,
        quoteTokenFlag
      }
    );
    const pool = deriveDbcPoolAddress(quoteMint, baseMint, config);
    const baseVault = deriveDbcTokenVaultAddress(pool, baseMint);
    const quoteVault = deriveDbcTokenVaultAddress(pool, quoteMint);
    const preInstructions = [];
    const [
      { ataPubkey: inputTokenAccount, ix: createAtaTokenAIx },
      { ataPubkey: outputTokenAccount, ix: createAtaTokenBIx }
    ] = await Promise.all([
      getOrCreateATAInstruction(
        this.connection,
        inputMint,
        buyer,
        buyer,
        true,
        inputTokenProgram,
        this.commitment
      ),
      getOrCreateATAInstruction(
        this.connection,
        outputMint,
        receiver ? receiver : buyer,
        buyer,
        true,
        outputTokenProgram,
        this.commitment
      )
    ]);
    createAtaTokenAIx && preInstructions.push(createAtaTokenAIx);
    createAtaTokenBIx && preInstructions.push(createAtaTokenBIx);
    if (inputMint.equals(_spltoken.NATIVE_MINT)) {
      preInstructions.push(
        ...wrapSOLInstruction(
          buyer,
          inputTokenAccount,
          BigInt(buyAmount.toString())
        )
      );
    }
    const postInstructions = [];
    if ([inputMint.toBase58(), outputMint.toBase58()].includes(
      _spltoken.NATIVE_MINT.toBase58()
    )) {
      const unwrapIx = unwrapSOLInstruction(buyer, buyer);
      unwrapIx && postInstructions.push(unwrapIx);
    }
    const remainingAccounts = [];
    if (rateLimiterApplied || enableFirstSwapWithMinFee) {
      remainingAccounts.push({
        isSigner: false,
        isWritable: false,
        pubkey: _web3js.SYSVAR_INSTRUCTIONS_PUBKEY
      });
    }
    return this.program.methods.swap({
      amountIn: buyAmount,
      minimumAmountOut
    }).accountsPartial({
      baseMint,
      quoteMint,
      pool,
      baseVault,
      quoteVault,
      config,
      poolAuthority: this.poolAuthority,
      referralTokenAccount,
      inputTokenAccount,
      outputTokenAccount,
      payer: buyer,
      tokenBaseProgram: outputTokenProgram,
      tokenQuoteProgram: inputTokenProgram
    }).remainingAccounts(remainingAccounts).preInstructions(preInstructions).postInstructions(postInstructions).transaction();
  }
  async buildSwap2WithTransferHookBuyTx(firstBuyParam, baseMint, config, baseFee, activationType, quoteMint, enableFirstSwapWithMinFee) {
    const {
      buyer,
      receiver,
      buyAmount,
      minimumAmountOut,
      referralTokenAccount
    } = firstBuyParam;
    validateSwapAmount(buyAmount);
    let rateLimiterApplied = false;
    if (baseFee.baseFeeMode === 2 /* RateLimiter */) {
      const currentPoint = await getCurrentPoint(
        this.connection,
        activationType
      );
      rateLimiterApplied = isRateLimiterApplied(
        currentPoint,
        new (0, _bnjs2.default)(0),
        1 /* QuoteToBase */,
        baseFee.secondFactor,
        baseFee.thirdFactor,
        new (0, _bnjs2.default)(baseFee.firstFactor)
      );
    }
    const quoteTokenFlag = await getTokenType(this.connection, quoteMint);
    const { inputMint, outputMint, inputTokenProgram, outputTokenProgram } = this.prepareSwapParams(
      false,
      {
        baseMint,
        poolType: 1 /* Token2022 */
      },
      {
        quoteMint,
        quoteTokenFlag
      }
    );
    const pool = deriveDbcPoolAddress(quoteMint, baseMint, config);
    const baseVault = deriveDbcTokenVaultAddress(pool, baseMint);
    const quoteVault = deriveDbcTokenVaultAddress(pool, quoteMint);
    const preInstructions = [];
    const [
      { ataPubkey: inputTokenAccount, ix: createAtaTokenAIx },
      { ataPubkey: outputTokenAccount, ix: createAtaTokenBIx }
    ] = await Promise.all([
      getOrCreateATAInstruction(
        this.connection,
        inputMint,
        buyer,
        buyer,
        true,
        inputTokenProgram,
        this.commitment
      ),
      getOrCreateATAInstruction(
        this.connection,
        outputMint,
        receiver ? receiver : buyer,
        buyer,
        true,
        outputTokenProgram,
        this.commitment
      )
    ]);
    createAtaTokenAIx && preInstructions.push(createAtaTokenAIx);
    createAtaTokenBIx && preInstructions.push(createAtaTokenBIx);
    if (inputMint.equals(_spltoken.NATIVE_MINT)) {
      preInstructions.push(
        ...wrapSOLInstruction(
          buyer,
          inputTokenAccount,
          BigInt(buyAmount.toString())
        )
      );
    }
    const postInstructions = [];
    if ([inputMint.toBase58(), outputMint.toBase58()].includes(
      _spltoken.NATIVE_MINT.toBase58()
    )) {
      const unwrapIx = unwrapSOLInstruction(buyer, buyer);
      unwrapIx && postInstructions.push(unwrapIx);
    }
    const remainingAccounts = [];
    if (rateLimiterApplied || enableFirstSwapWithMinFee) {
      remainingAccounts.push({
        isSigner: false,
        isWritable: false,
        pubkey: _web3js.SYSVAR_INSTRUCTIONS_PUBKEY
      });
    }
    const transferHookAccountTypes = referralTokenAccount != null ? [
      AccountsType.TransferHookBase,
      AccountsType.TransferHookBaseReferral
    ] : [AccountsType.TransferHookBase];
    let transferHookAccountsResult;
    if (firstBuyParam.transferHookAccountsInfo && firstBuyParam.transferHookAccounts) {
      transferHookAccountsResult = {
        info: firstBuyParam.transferHookAccountsInfo,
        accounts: firstBuyParam.transferHookAccounts
      };
    } else {
      try {
        transferHookAccountsResult = await this.getRemainingAccountsForTransferHook(
          baseMint,
          transferHookAccountTypes
        );
      } catch (e5) {
        throw new Error(
          `Unable to resolve transfer-hook remaining accounts for ${baseMint.toString()}. When bundling pool initialization with the first buy, pass transferHookAccountsInfo and transferHookAccounts on the first-buy params.`
        );
      }
    }
    remainingAccounts.push(...transferHookAccountsResult.accounts);
    return this.program.methods.swap2WithTransferHook(
      {
        amount0: buyAmount,
        amount1: minimumAmountOut,
        swapMode: 0 /* ExactIn */
      },
      transferHookAccountsResult.info
    ).accountsPartial({
      baseMint,
      quoteMint,
      pool,
      baseVault,
      quoteVault,
      config,
      poolAuthority: this.poolAuthority,
      referralTokenAccount,
      inputTokenAccount,
      outputTokenAccount,
      payer: buyer,
      tokenBaseProgram: outputTokenProgram,
      tokenQuoteProgram: inputTokenProgram
    }).remainingAccounts(remainingAccounts).preInstructions(preInstructions).postInstructions(postInstructions).transaction();
  }
  async buildClaimTradingFeeAccountsForSol(params) {
    const {
      payer,
      feeReceiver,
      tempWSolAcc,
      pool,
      virtualPool,
      poolConfigState,
      tokenBaseProgram,
      tokenQuoteProgram
    } = params;
    const preInstructions = [];
    const postInstructions = [];
    const tokenBaseAccount = findAssociatedTokenAddress(
      feeReceiver,
      virtualPool.poolState.baseMint,
      tokenBaseProgram
    );
    const tokenQuoteAccount = findAssociatedTokenAddress(
      tempWSolAcc,
      poolConfigState.quoteMint,
      tokenQuoteProgram
    );
    preInstructions.push(
      _spltoken.createAssociatedTokenAccountIdempotentInstruction.call(void 0, 
        payer,
        tokenBaseAccount,
        feeReceiver,
        virtualPool.poolState.baseMint,
        tokenBaseProgram
      ),
      _spltoken.createAssociatedTokenAccountIdempotentInstruction.call(void 0, 
        payer,
        tokenQuoteAccount,
        tempWSolAcc,
        poolConfigState.quoteMint,
        tokenQuoteProgram
      )
    );
    const unwrapSolIx = unwrapSOLInstruction(tempWSolAcc, feeReceiver);
    unwrapSolIx && postInstructions.push(unwrapSolIx);
    const accounts = {
      poolAuthority: this.poolAuthority,
      pool,
      tokenAAccount: tokenBaseAccount,
      tokenBAccount: tokenQuoteAccount,
      baseVault: virtualPool.poolState.baseVault,
      quoteVault: virtualPool.poolState.quoteVault,
      baseMint: virtualPool.poolState.baseMint,
      quoteMint: poolConfigState.quoteMint,
      tokenBaseProgram,
      tokenQuoteProgram
    };
    return { accounts, preInstructions, postInstructions };
  }
  async buildClaimTradingFeeAccountsForNonSol(params) {
    const {
      payer,
      feeReceiver,
      pool,
      virtualPool,
      poolConfigState,
      tokenBaseProgram,
      tokenQuoteProgram
    } = params;
    const {
      ataTokenA: tokenBaseAccount,
      ataTokenB: tokenQuoteAccount,
      instructions: preInstructions
    } = await this.prepareTokenAccounts(
      feeReceiver,
      payer,
      virtualPool.poolState.baseMint,
      poolConfigState.quoteMint,
      tokenBaseProgram,
      tokenQuoteProgram
    );
    const accounts = {
      poolAuthority: this.poolAuthority,
      pool,
      tokenAAccount: tokenBaseAccount,
      tokenBAccount: tokenQuoteAccount,
      baseVault: virtualPool.poolState.baseVault,
      quoteVault: virtualPool.poolState.quoteVault,
      baseMint: virtualPool.poolState.baseMint,
      quoteMint: poolConfigState.quoteMint,
      tokenBaseProgram,
      tokenQuoteProgram
    };
    return { accounts, preInstructions };
  }
  async getRemainingAccountsForTransferHook(mint, accountTypes = [AccountsType.TransferHookBase]) {
    const emptyAccounts = { info: { slices: [] }, accounts: [] };
    const mintInfo = await this.connection.getAccountInfo(
      mint,
      this.commitment
    );
    if (!mintInfo) {
      throw new Error(`Invalid mint: ${mint.toString()}`);
    }
    if (mintInfo.owner.equals(_spltoken.TOKEN_PROGRAM_ID)) {
      return emptyAccounts;
    }
    const mintState = _spltoken.unpackMint.call(void 0, mint, mintInfo, _spltoken.TOKEN_2022_PROGRAM_ID);
    const transferHook = _spltoken.getTransferHook.call(void 0, mintState);
    if (!transferHook || transferHook.programId.equals(_web3js.PublicKey.default)) {
      return emptyAccounts;
    }
    const transferWithHookIx = await _spltoken.createTransferCheckedWithTransferHookInstruction.call(void 0, 
      this.connection,
      _web3js.PublicKey.default,
      mint,
      _web3js.PublicKey.default,
      _web3js.PublicKey.default,
      BigInt(0),
      mintState.decimals,
      [],
      this.commitment,
      _spltoken.TOKEN_2022_PROGRAM_ID
    );
    const transferHookAccounts = transferWithHookIx.keys.slice(4);
    const slices = accountTypes.map((accountsType) => ({
      accountsType,
      length: transferHookAccounts.length
    }));
    const accounts = accountTypes.flatMap(() => transferHookAccounts);
    return { info: { slices }, accounts };
  }
  async buildWithdrawMigrationFeeTx(role, pool, sender) {
    const { virtualPool, poolConfigState } = await this.getPoolWithConfig(pool);
    const tokenQuoteProgram = getTokenProgram(
      poolConfigState.quoteTokenFlag
    );
    const preInstructions = [];
    const postInstructions = [];
    const { ataPubkey: tokenQuoteAccount, ix: createTokenQuoteAccountIx } = await getOrCreateATAInstruction(
      this.connection,
      poolConfigState.quoteMint,
      sender,
      sender,
      true,
      tokenQuoteProgram,
      this.commitment
    );
    createTokenQuoteAccountIx && preInstructions.push(createTokenQuoteAccountIx);
    if (poolConfigState.quoteMint.equals(_spltoken.NATIVE_MINT)) {
      const unwrapSolIx = unwrapSOLInstruction(sender, sender);
      unwrapSolIx && postInstructions.push(unwrapSolIx);
    }
    return this.program.methods.withdrawMigrationFee(role === "partner" ? 0 : 1).accountsPartial({
      poolAuthority: this.poolAuthority,
      config: virtualPool.poolState.config,
      virtualPool: pool,
      tokenQuoteAccount,
      quoteVault: virtualPool.poolState.quoteVault,
      quoteMint: poolConfigState.quoteMint,
      sender,
      tokenQuoteProgram
    }).preInstructions(preInstructions).postInstructions(postInstructions).transaction();
  }
  async prepareTokenAccounts(owner, payer, tokenAMint, tokenBMint, tokenAProgram, tokenBProgram) {
    const instructions = [];
    const [
      { ataPubkey: ataTokenA, ix: createAtaTokenAIx },
      { ataPubkey: ataTokenB, ix: createAtaTokenBIx }
    ] = await Promise.all([
      getOrCreateATAInstruction(
        this.connection,
        tokenAMint,
        owner,
        payer,
        true,
        tokenAProgram,
        this.commitment
      ),
      getOrCreateATAInstruction(
        this.connection,
        tokenBMint,
        owner,
        payer,
        true,
        tokenBProgram,
        this.commitment
      )
    ]);
    createAtaTokenAIx && instructions.push(createAtaTokenAIx);
    createAtaTokenBIx && instructions.push(createAtaTokenBIx);
    return { ataTokenA, ataTokenB, instructions };
  }
  /**
   * Return the underlying Anchor program client.
   */
  getProgram() {
    return this.program;
  }
};

// src/services/migration.ts







var MigrationService = class extends DynamicBondingCurveProgram {
  /**
   * Create a Dynamic Vault program client.
   */
  getDynamicVaultProgram() {
    return createDynamicVaultProgram(this.connection);
  }
  /**
   * Create a DAMM V1 program client.
   */
  getDammV1Program() {
    return createDammV1Program(this.connection);
  }
  /**
   * Build a transaction that creates the locker for locked vesting tokens.
   */
  async createLocker(params) {
    const { pool, payer } = params;
    const lockerEventAuthority = deriveLockerEventAuthority();
    const { virtualPool, poolConfigState } = await this.getPoolWithConfig(pool);
    const base = deriveBaseKeyForLocker(pool);
    const escrow = deriveEscrow(base);
    const tokenProgram = poolConfigState.tokenType === 0 ? _spltoken.TOKEN_PROGRAM_ID : _spltoken.TOKEN_2022_PROGRAM_ID;
    const escrowToken = findAssociatedTokenAddress(
      escrow,
      virtualPool.poolState.baseMint,
      tokenProgram
    );
    const preInstructions = [];
    const createOwnerEscrowVaultTokenXIx = _spltoken.createAssociatedTokenAccountIdempotentInstruction.call(void 0, 
      payer,
      escrowToken,
      escrow,
      virtualPool.poolState.baseMint,
      tokenProgram
    );
    preInstructions.push(createOwnerEscrowVaultTokenXIx);
    const accounts = {
      virtualPool: pool,
      config: virtualPool.poolState.config,
      poolAuthority: this.poolAuthority,
      baseVault: virtualPool.poolState.baseVault,
      baseMint: virtualPool.poolState.baseMint,
      base,
      creator: virtualPool.poolState.creator,
      escrow,
      escrowToken,
      payer,
      tokenProgram,
      lockerProgram: LOCKER_PROGRAM_ID,
      lockerEventAuthority,
      systemProgram: _web3js.SystemProgram.programId
    };
    return this.program.methods.createLocker().accountsPartial(accounts).preInstructions(preInstructions).transaction();
  }
  /**
   * Build a transaction that withdraws leftover base tokens after migration.
   */
  async withdrawLeftover(params) {
    const { pool, payer } = params;
    const { virtualPool, poolConfigState } = await this.getPoolWithConfig(pool);
    const tokenBaseProgram = getTokenProgram(poolConfigState.tokenType);
    const preInstructions = [];
    const { ataPubkey: tokenBaseAccount, ix: createBaseTokenAccountIx } = await getOrCreateATAInstruction(
      this.connection,
      virtualPool.poolState.baseMint,
      poolConfigState.leftoverReceiver,
      payer,
      true,
      tokenBaseProgram,
      this.commitment
    );
    createBaseTokenAccountIx && preInstructions.push(createBaseTokenAccountIx);
    return this.program.methods.withdrawLeftover().accountsPartial({
      poolAuthority: this.poolAuthority,
      config: virtualPool.poolState.config,
      virtualPool: pool,
      tokenBaseAccount,
      baseVault: virtualPool.poolState.baseVault,
      baseMint: virtualPool.poolState.baseMint,
      leftoverReceiver: poolConfigState.leftoverReceiver,
      tokenBaseProgram
    }).preInstructions(preInstructions).transaction();
  }
  ///////////////////////
  // DAMM V1 FUNCTIONS //
  ///////////////////////
  /**
   * Build a transaction that creates DAMM V1 migration metadata.
   */
  async createDammV1MigrationMetadata(params) {
    const { virtualPool, config, payer } = params;
    const migrationMetadata = deriveDammV1MigrationMetadataAddress(
      new (0, _web3js.PublicKey)(virtualPool)
    );
    const accounts = {
      virtualPool,
      config,
      migrationMetadata,
      payer,
      systemProgram: _web3js.SystemProgram.programId
    };
    return this.program.methods.migrationMeteoraDammCreateMetadata().accountsPartial(accounts).transaction();
  }
  /**
   * Build a transaction that migrates a completed virtual pool to DAMM V1.
   */
  async migrateToDammV1(params) {
    const { pool, dammConfig, payer } = params;
    const { virtualPool, poolConfigState } = await this.getPoolWithConfig(pool);
    const migrationMetadata = deriveDammV1MigrationMetadataAddress(pool);
    const dammPool = deriveDammV1PoolAddress(
      dammConfig,
      virtualPool.poolState.baseMint,
      poolConfigState.quoteMint
    );
    const lpMint = deriveDammV1LpMintAddress(dammPool);
    const mintMetadata = deriveMintMetadata(lpMint);
    const [protocolTokenAFee, protocolTokenBFee] = [
      deriveDammV1ProtocolFeeAddress(
        virtualPool.poolState.baseMint,
        dammPool
      ),
      deriveDammV1ProtocolFeeAddress(poolConfigState.quoteMint, dammPool)
    ];
    const vaultProgram = this.getDynamicVaultProgram();
    const [
      {
        vaultPda: aVault,
        tokenVaultPda: aTokenVault,
        lpMintPda: aLpMintPda
      },
      {
        vaultPda: bVault,
        tokenVaultPda: bTokenVault,
        lpMintPda: bLpMintPda
      }
    ] = [
      deriveVaultPdas(virtualPool.poolState.baseMint),
      deriveVaultPdas(poolConfigState.quoteMint)
    ];
    const [aVaultAccount, bVaultAccount] = await Promise.all([
      vaultProgram.account.vault.fetchNullable(aVault),
      vaultProgram.account.vault.fetchNullable(bVault)
    ]);
    let aVaultLpMint = aLpMintPda;
    let bVaultLpMint = bLpMintPda;
    const preInstructions = [];
    if (!aVaultAccount) {
      const createVaultAIx = await createInitializePermissionlessDynamicVaultIx(
        virtualPool.poolState.baseMint,
        payer,
        vaultProgram
      );
      if (createVaultAIx) {
        preInstructions.push(createVaultAIx.instruction);
      }
    } else {
      aVaultLpMint = aVaultAccount.lpMint;
    }
    if (!bVaultAccount) {
      const createVaultBIx = await createInitializePermissionlessDynamicVaultIx(
        poolConfigState.quoteMint,
        payer,
        vaultProgram
      );
      if (createVaultBIx) {
        preInstructions.push(createVaultBIx.instruction);
      }
    } else {
      bVaultLpMint = bVaultAccount.lpMint;
    }
    const [aVaultLp, bVaultLp] = [
      deriveDammV1VaultLPAddress(aVault, dammPool),
      deriveDammV1VaultLPAddress(bVault, dammPool)
    ];
    const virtualPoolLp = _spltoken.getAssociatedTokenAddressSync.call(void 0, 
      lpMint,
      this.poolAuthority,
      true,
      _spltoken.TOKEN_PROGRAM_ID,
      _spltoken.ASSOCIATED_TOKEN_PROGRAM_ID
    );
    const transaction = await this.program.methods.migrateMeteoraDamm().accountsPartial({
      virtualPool: pool,
      migrationMetadata,
      config: virtualPool.poolState.config,
      poolAuthority: this.poolAuthority,
      pool: dammPool,
      dammConfig,
      lpMint,
      tokenAMint: virtualPool.poolState.baseMint,
      tokenBMint: poolConfigState.quoteMint,
      aVault,
      bVault,
      aTokenVault,
      bTokenVault,
      aVaultLpMint,
      bVaultLpMint,
      aVaultLp,
      bVaultLp,
      baseVault: virtualPool.poolState.baseVault,
      quoteVault: virtualPool.poolState.quoteVault,
      virtualPoolLp,
      protocolTokenAFee,
      protocolTokenBFee,
      payer,
      rent: _web3js.SYSVAR_RENT_PUBKEY,
      mintMetadata,
      metadataProgram: METAPLEX_PROGRAM_ID,
      ammProgram: DAMM_V1_PROGRAM_ID,
      vaultProgram: VAULT_PROGRAM_ID,
      tokenProgram: _spltoken.TOKEN_PROGRAM_ID,
      associatedTokenProgram: _spltoken.ASSOCIATED_TOKEN_PROGRAM_ID
    }).preInstructions(preInstructions).transaction();
    const modifyComputeUnits = _web3js.ComputeBudgetProgram.setComputeUnitLimit({
      units: 5e5
    });
    transaction.add(modifyComputeUnits);
    return transaction;
  }
  /**
   * Build a transaction that locks DAMM V1 LP tokens for the creator or partner.
   */
  async lockDammV1LpToken(params) {
    const { pool, dammConfig, payer, isPartner } = params;
    const { virtualPool, poolConfigState } = await this.getPoolWithConfig(pool);
    const dammPool = deriveDammV1PoolAddress(
      dammConfig,
      virtualPool.poolState.baseMint,
      poolConfigState.quoteMint
    );
    const migrationMetadata = deriveDammV1MigrationMetadataAddress(pool);
    const vaultProgram = this.getDynamicVaultProgram();
    const [
      { vaultPda: aVault, lpMintPda: aLpMintPda },
      { vaultPda: bVault, lpMintPda: bLpMintPda }
    ] = [
      deriveVaultPdas(virtualPool.poolState.baseMint),
      deriveVaultPdas(poolConfigState.quoteMint)
    ];
    const [aVaultAccount, bVaultAccount] = await Promise.all([
      vaultProgram.account.vault.fetchNullable(aVault),
      vaultProgram.account.vault.fetchNullable(bVault)
    ]);
    let aVaultLpMint = aLpMintPda;
    let bVaultLpMint = bLpMintPda;
    const preInstructions = [];
    if (!aVaultAccount) {
      const createVaultAIx = await createInitializePermissionlessDynamicVaultIx(
        virtualPool.poolState.baseMint,
        payer,
        vaultProgram
      );
      if (createVaultAIx) {
        preInstructions.push(createVaultAIx.instruction);
      }
    } else {
      aVaultLpMint = aVaultAccount.lpMint;
    }
    if (!bVaultAccount) {
      const createVaultBIx = await createInitializePermissionlessDynamicVaultIx(
        poolConfigState.quoteMint,
        payer,
        vaultProgram
      );
      if (createVaultBIx) {
        preInstructions.push(createVaultBIx.instruction);
      }
    } else {
      bVaultLpMint = bVaultAccount.lpMint;
    }
    const [aVaultLp, bVaultLp] = [
      deriveDammV1VaultLPAddress(aVault, dammPool),
      deriveDammV1VaultLPAddress(bVault, dammPool)
    ];
    const lpMint = deriveDammV1LpMintAddress(dammPool);
    const dammV1Program = this.getDammV1Program();
    let lockEscrowKey;
    if (isPartner) {
      lockEscrowKey = deriveDammV1LockEscrowAddress(
        dammPool,
        poolConfigState.feeClaimer
      );
      const lockEscrowData = await this.connection.getAccountInfo(lockEscrowKey);
      if (!lockEscrowData) {
        const ix = await createLockEscrowIx(
          payer,
          dammPool,
          lpMint,
          poolConfigState.feeClaimer,
          lockEscrowKey,
          dammV1Program
        );
        preInstructions.push(ix);
      }
    } else {
      lockEscrowKey = deriveDammV1LockEscrowAddress(
        dammPool,
        virtualPool.poolState.creator
      );
      const lockEscrowData = await this.connection.getAccountInfo(lockEscrowKey);
      if (!lockEscrowData) {
        const ix = await createLockEscrowIx(
          payer,
          dammPool,
          lpMint,
          virtualPool.poolState.creator,
          lockEscrowKey,
          dammV1Program
        );
        preInstructions.push(ix);
      }
    }
    const escrowVault = _spltoken.getAssociatedTokenAddressSync.call(void 0, 
      lpMint,
      lockEscrowKey,
      true,
      _spltoken.TOKEN_PROGRAM_ID,
      _spltoken.ASSOCIATED_TOKEN_PROGRAM_ID
    );
    const createEscrowVaultIx = _spltoken.createAssociatedTokenAccountIdempotentInstruction.call(void 0, 
      payer,
      escrowVault,
      lockEscrowKey,
      lpMint,
      _spltoken.TOKEN_PROGRAM_ID,
      _spltoken.ASSOCIATED_TOKEN_PROGRAM_ID
    );
    preInstructions.push(createEscrowVaultIx);
    const sourceTokens = _spltoken.getAssociatedTokenAddressSync.call(void 0, 
      lpMint,
      this.poolAuthority,
      true
    );
    return this.program.methods.migrateMeteoraDammLockLpToken().accountsPartial({
      virtualPool: pool,
      migrationMetadata,
      poolAuthority: this.poolAuthority,
      pool: dammPool,
      lpMint,
      lockEscrow: lockEscrowKey,
      owner: isPartner ? poolConfigState.feeClaimer : virtualPool.poolState.creator,
      sourceTokens,
      escrowVault,
      aVault,
      bVault,
      aVaultLp,
      bVaultLp,
      aVaultLpMint,
      bVaultLpMint,
      ammProgram: DAMM_V1_PROGRAM_ID,
      tokenProgram: _spltoken.TOKEN_PROGRAM_ID
    }).preInstructions(preInstructions).transaction();
  }
  /**
   * Build a transaction that claims DAMM V1 LP tokens for the creator or partner.
   */
  async claimDammV1LpToken(params) {
    const { pool, dammConfig, payer, isPartner } = params;
    const { virtualPool, poolConfigState } = await this.getPoolWithConfig(pool);
    const dammPool = deriveDammV1PoolAddress(
      dammConfig,
      virtualPool.poolState.baseMint,
      poolConfigState.quoteMint
    );
    const migrationMetadata = deriveDammV1MigrationMetadataAddress(pool);
    const lpMint = deriveDammV1LpMintAddress(dammPool);
    let destinationToken;
    if (isPartner) {
      destinationToken = findAssociatedTokenAddress(
        poolConfigState.feeClaimer,
        lpMint,
        _spltoken.TOKEN_PROGRAM_ID
      );
    } else {
      destinationToken = findAssociatedTokenAddress(
        virtualPool.poolState.creator,
        lpMint,
        _spltoken.TOKEN_PROGRAM_ID
      );
    }
    const preInstructions = [];
    const createDestinationTokenIx = _spltoken.createAssociatedTokenAccountIdempotentInstruction.call(void 0, 
      payer,
      destinationToken,
      isPartner ? poolConfigState.feeClaimer : virtualPool.poolState.creator,
      lpMint,
      _spltoken.TOKEN_PROGRAM_ID
    );
    preInstructions.push(createDestinationTokenIx);
    const sourceToken = _spltoken.getAssociatedTokenAddressSync.call(void 0, 
      lpMint,
      this.poolAuthority,
      true
    );
    const accounts = {
      virtualPool: pool,
      migrationMetadata,
      poolAuthority: this.poolAuthority,
      lpMint,
      sourceToken,
      destinationToken,
      owner: isPartner ? poolConfigState.feeClaimer : virtualPool.poolState.creator,
      sender: payer,
      tokenProgram: _spltoken.TOKEN_PROGRAM_ID
    };
    return this.program.methods.migrateMeteoraDammClaimLpToken().accountsPartial(accounts).preInstructions(preInstructions).transaction();
  }
  ///////////////////////
  // DAMM V2 FUNCTIONS //
  ///////////////////////
  /**
   * Build transactions and derived addresses for migrating a completed virtual pool to DAMM V2.
   */
  async migrateToDammV2(params) {
    const { pool, dammConfig, payer } = params;
    const dammPoolAuthority = deriveDammV2PoolAuthority();
    const dammEventAuthority = deriveDammV2EventAuthority();
    const { virtualPool, poolConfigState } = await this.getPoolWithConfig(pool);
    const migrationMetadata = deriveDammV2MigrationMetadataAddress(pool);
    const dammPool = deriveDammV2PoolAddress(
      dammConfig,
      virtualPool.poolState.baseMint,
      poolConfigState.quoteMint
    );
    const firstPositionNftKP = _web3js.Keypair.generate();
    const firstPosition = derivePositionAddress(
      firstPositionNftKP.publicKey
    );
    const firstPositionNftAccount = derivePositionNftAccount(
      firstPositionNftKP.publicKey
    );
    const secondPositionNftKP = _web3js.Keypair.generate();
    const secondPosition = derivePositionAddress(
      secondPositionNftKP.publicKey
    );
    const secondPositionNftAccount = derivePositionNftAccount(
      secondPositionNftKP.publicKey
    );
    const tokenAVault = deriveDammV2TokenVaultAddress(
      dammPool,
      virtualPool.poolState.baseMint
    );
    const tokenBVault = deriveDammV2TokenVaultAddress(
      dammPool,
      poolConfigState.quoteMint
    );
    const tokenBaseProgram = poolConfigState.tokenType == 0 ? _spltoken.TOKEN_PROGRAM_ID : _spltoken.TOKEN_2022_PROGRAM_ID;
    const tokenQuoteProgram = poolConfigState.quoteTokenFlag == 0 ? _spltoken.TOKEN_PROGRAM_ID : _spltoken.TOKEN_2022_PROGRAM_ID;
    const remainingAccounts = [
      {
        isSigner: false,
        isWritable: false,
        pubkey: dammConfig
      }
    ];
    const tx = await this.program.methods.migrationDammV2().accountsStrict({
      virtualPool: pool,
      migrationMetadata,
      config: virtualPool.poolState.config,
      poolAuthority: this.poolAuthority,
      pool: dammPool,
      firstPositionNftMint: firstPositionNftKP.publicKey,
      firstPosition,
      firstPositionNftAccount,
      secondPositionNftMint: secondPositionNftKP.publicKey,
      secondPosition,
      secondPositionNftAccount,
      dammPoolAuthority,
      ammProgram: DAMM_V2_PROGRAM_ID,
      baseMint: virtualPool.poolState.baseMint,
      quoteMint: poolConfigState.quoteMint,
      tokenAVault,
      tokenBVault,
      baseVault: virtualPool.poolState.baseVault,
      quoteVault: virtualPool.poolState.quoteVault,
      payer,
      tokenBaseProgram,
      tokenQuoteProgram,
      token2022Program: _spltoken.TOKEN_2022_PROGRAM_ID,
      systemProgram: _web3js.SystemProgram.programId,
      dammEventAuthority
    }).remainingAccounts(remainingAccounts).transaction();
    const modifyComputeUnits = _web3js.ComputeBudgetProgram.setComputeUnitLimit({
      units: 6e5
    });
    tx.add(modifyComputeUnits);
    return {
      transaction: tx,
      firstPositionNftKeypair: firstPositionNftKP,
      secondPositionNftKeypair: secondPositionNftKP
    };
  }
};

// src/services/partner.ts







var PartnerService = class extends DynamicBondingCurveProgram {
  /**
   * Build a transaction that creates a partner-owned pool config.
   */
  async createConfig(params) {
    const {
      config,
      feeClaimer,
      leftoverReceiver,
      quoteMint,
      payer,
      tokenBadge,
      ...configParam
    } = params;
    return this.buildCreateConfigTx(
      configParam,
      new (0, _web3js.PublicKey)(config),
      new (0, _web3js.PublicKey)(feeClaimer),
      new (0, _web3js.PublicKey)(leftoverReceiver),
      new (0, _web3js.PublicKey)(quoteMint),
      new (0, _web3js.PublicKey)(payer),
      tokenBadge ? new (0, _web3js.PublicKey)(tokenBadge) : void 0
    );
  }
  /**
   * Build a transaction that creates a partner-owned transfer-hook pool config.
   */
  async createConfigWithTransferHook(params) {
    const {
      config,
      feeClaimer,
      leftoverReceiver,
      quoteMint,
      transferHookProgram,
      payer,
      tokenBadge,
      ...configParam
    } = params;
    return this.buildCreateConfigWithTransferHookTx(
      configParam,
      new (0, _web3js.PublicKey)(config),
      new (0, _web3js.PublicKey)(feeClaimer),
      new (0, _web3js.PublicKey)(leftoverReceiver),
      new (0, _web3js.PublicKey)(quoteMint),
      new (0, _web3js.PublicKey)(transferHookProgram),
      new (0, _web3js.PublicKey)(payer),
      tokenBadge ? new (0, _web3js.PublicKey)(tokenBadge) : void 0
    );
  }
  /**
   * Build one transaction that creates a config and initializes its pool.
   */
  async createConfigAndPool(params) {
    const {
      config,
      feeClaimer,
      leftoverReceiver,
      quoteMint,
      payer,
      preCreatePoolParam,
      tokenBadge,
      ...configParam
    } = params;
    const tx = new (0, _web3js.Transaction)();
    const configKey = new (0, _web3js.PublicKey)(config);
    const quoteMintToken = new (0, _web3js.PublicKey)(quoteMint);
    const payerAddress = new (0, _web3js.PublicKey)(payer);
    const tokenBadgeKey = tokenBadge ? new (0, _web3js.PublicKey)(tokenBadge) : void 0;
    const createConfigTx = await this.buildCreateConfigTx(
      configParam,
      configKey,
      new (0, _web3js.PublicKey)(feeClaimer),
      new (0, _web3js.PublicKey)(leftoverReceiver),
      quoteMintToken,
      payerAddress,
      tokenBadgeKey
    );
    const createPoolTx = await this.buildCreatePoolTx(
      {
        ...preCreatePoolParam,
        config: configKey,
        payer: payerAddress,
        tokenBadge: tokenBadgeKey
      },
      params.tokenType,
      quoteMintToken
    );
    tx.add(createConfigTx, createPoolTx);
    return tx;
  }
  /**
   * Build one transaction that creates a transfer-hook config and initializes its pool.
   */
  async createConfigAndPoolWithTransferHook(params) {
    const {
      config,
      feeClaimer,
      leftoverReceiver,
      quoteMint,
      transferHookProgram,
      payer,
      preCreatePoolParam,
      tokenBadge,
      ...configParam
    } = params;
    const tx = new (0, _web3js.Transaction)();
    const configKey = new (0, _web3js.PublicKey)(config);
    const quoteMintToken = new (0, _web3js.PublicKey)(quoteMint);
    const payerAddress = new (0, _web3js.PublicKey)(payer);
    const tokenBadgeKey = tokenBadge ? new (0, _web3js.PublicKey)(tokenBadge) : void 0;
    const createConfigTx = await this.buildCreateConfigWithTransferHookTx(
      configParam,
      configKey,
      new (0, _web3js.PublicKey)(feeClaimer),
      new (0, _web3js.PublicKey)(leftoverReceiver),
      quoteMintToken,
      new (0, _web3js.PublicKey)(transferHookProgram),
      payerAddress,
      tokenBadgeKey
    );
    const tokenQuoteProgram = getTokenProgram(
      await getTokenType(this.connection, quoteMintToken)
    );
    const createPoolTx = await this.buildCreatePoolWithTransferHookTx(
      {
        ...preCreatePoolParam,
        config: configKey,
        payer: payerAddress,
        transferHookProgram: new (0, _web3js.PublicKey)(transferHookProgram),
        tokenBadge: tokenBadgeKey
      },
      quoteMintToken,
      tokenQuoteProgram
    );
    tx.add(createConfigTx, createPoolTx);
    return tx;
  }
  /**
   * Build separate transactions for config creation and pool creation with an optional first buy.
   *
   * The transactions are returned separately so clients can send them independently or bundle them
   */
  async createConfigAndPoolWithFirstBuy(params) {
    const {
      config,
      feeClaimer,
      leftoverReceiver,
      quoteMint,
      payer,
      preCreatePoolParam,
      firstBuyParam,
      tokenBadge,
      ...configParam
    } = params;
    const configKey = new (0, _web3js.PublicKey)(config);
    const quoteMintToken = new (0, _web3js.PublicKey)(quoteMint);
    const payerAddress = new (0, _web3js.PublicKey)(payer);
    const tokenBadgeKey = tokenBadge ? new (0, _web3js.PublicKey)(tokenBadge) : void 0;
    const createConfigTx = await this.buildCreateConfigTx(
      configParam,
      configKey,
      new (0, _web3js.PublicKey)(feeClaimer),
      new (0, _web3js.PublicKey)(leftoverReceiver),
      quoteMintToken,
      payerAddress,
      tokenBadgeKey
    );
    const createPoolParam = {
      ...preCreatePoolParam,
      config: configKey,
      payer: payerAddress,
      tokenBadge: tokenBadgeKey
    };
    const createPoolWithFirstBuyTx = await this.buildCreatePoolTx(
      createPoolParam,
      params.tokenType,
      quoteMintToken
    );
    if (firstBuyParam && firstBuyParam.buyAmount.gt(new (0, _bnjs2.default)(0))) {
      const swapBuyTx = await this.buildSwapBuyTx(
        firstBuyParam,
        preCreatePoolParam.baseMint,
        configKey,
        configParam.poolFees.baseFee,
        false,
        configParam.activationType,
        params.tokenType,
        quoteMintToken,
        true
      );
      createPoolWithFirstBuyTx.add(swapBuyTx);
    }
    return {
      createConfigTx,
      createPoolWithFirstBuyTx
    };
  }
  /**
   * Build separate transactions for transfer-hook config creation and pool creation with an optional first buy.
   */
  async createConfigAndPoolWithFirstBuyWithTransferHook(params) {
    const {
      config,
      feeClaimer,
      leftoverReceiver,
      quoteMint,
      transferHookProgram,
      payer,
      preCreatePoolParam,
      firstBuyParam,
      tokenBadge,
      ...configParam
    } = params;
    const configKey = new (0, _web3js.PublicKey)(config);
    const quoteMintToken = new (0, _web3js.PublicKey)(quoteMint);
    const payerAddress = new (0, _web3js.PublicKey)(payer);
    const transferHookProgramKey = new (0, _web3js.PublicKey)(transferHookProgram);
    const tokenBadgeKey = tokenBadge ? new (0, _web3js.PublicKey)(tokenBadge) : void 0;
    const createConfigTx = await this.buildCreateConfigWithTransferHookTx(
      configParam,
      configKey,
      new (0, _web3js.PublicKey)(feeClaimer),
      new (0, _web3js.PublicKey)(leftoverReceiver),
      quoteMintToken,
      transferHookProgramKey,
      payerAddress,
      tokenBadgeKey
    );
    const tokenQuoteProgram = getTokenProgram(
      await getTokenType(this.connection, quoteMintToken)
    );
    const createPoolWithFirstBuyTx = await this.buildCreatePoolWithTransferHookTx(
      {
        ...preCreatePoolParam,
        config: configKey,
        payer: payerAddress,
        transferHookProgram: transferHookProgramKey,
        tokenBadge: tokenBadgeKey
      },
      quoteMintToken,
      tokenQuoteProgram
    );
    if (firstBuyParam && firstBuyParam.buyAmount.gt(new (0, _bnjs2.default)(0))) {
      const swapBuyTx = await this.buildSwap2WithTransferHookBuyTx(
        firstBuyParam,
        preCreatePoolParam.baseMint,
        configKey,
        configParam.poolFees.baseFee,
        configParam.activationType,
        quoteMintToken,
        true
      );
      createPoolWithFirstBuyTx.add(swapBuyTx);
    }
    return {
      createConfigTx,
      createPoolWithFirstBuyTx
    };
  }
  /**
   * Build a transaction that creates partner metadata for a fee claimer.
   */
  async createPartnerMetadata(params) {
    const { name, website, logo, feeClaimer, payer } = params;
    const partnerMetadata = derivePartnerMetadata(feeClaimer);
    const partnerMetadataParam = {
      padding: new Array(96).fill(0),
      name,
      website,
      logo
    };
    return this.program.methods.createPartnerMetadata(partnerMetadataParam).accountsPartial({
      partnerMetadata,
      payer,
      feeClaimer,
      systemProgram: _web3js.SystemProgram.programId
    }).transaction();
  }
  /**
   * Build a transaction that claims partner trading fees.
   *
   * When the quote mint is SOL, the transaction may create and close a temporary wrapped SOL account.
   * If `receiver` differs from `feeClaimer`, provide `tempWSolAcc`.
   */
  async claimPartnerTradingFee(params) {
    const {
      feeClaimer,
      payer,
      pool,
      maxBaseAmount,
      maxQuoteAmount,
      receiver,
      tempWSolAcc
    } = params;
    const { virtualPool, poolConfigState } = await this.getPoolWithConfig(pool);
    const tokenBaseProgram = getTokenProgram(poolConfigState.tokenType);
    const tokenQuoteProgram = getTokenProgram(
      poolConfigState.quoteTokenFlag
    );
    const isSOLQuoteMint = isNativeSol(poolConfigState.quoteMint);
    if (isSOLQuoteMint) {
      const tempWSol = receiver && !receiver.equals(feeClaimer) ? tempWSolAcc : feeClaimer;
      const feeReceiver = receiver ? receiver : feeClaimer;
      const result = await this.buildClaimTradingFeeAccountsForSol({
        payer,
        feeReceiver,
        tempWSolAcc: tempWSol,
        pool,
        virtualPool,
        poolConfigState,
        tokenBaseProgram,
        tokenQuoteProgram
      });
      return this.program.methods.claimTradingFee(maxBaseAmount, maxQuoteAmount).accountsPartial({
        ...result.accounts,
        config: virtualPool.poolState.config,
        feeClaimer
      }).preInstructions(result.preInstructions).postInstructions(result.postInstructions).transaction();
    } else {
      const feeReceiver = receiver ? receiver : feeClaimer;
      const result = await this.buildClaimTradingFeeAccountsForNonSol({
        payer,
        feeReceiver,
        pool,
        virtualPool,
        poolConfigState,
        tokenBaseProgram,
        tokenQuoteProgram
      });
      return this.program.methods.claimTradingFee(maxBaseAmount, maxQuoteAmount).accountsPartial({
        ...result.accounts,
        config: virtualPool.poolState.config,
        feeClaimer
      }).preInstructions(result.preInstructions).transaction();
    }
  }
  /**
   * Build a transaction that claims partner trading fees to an explicit receiver.
   */
  async claimPartnerTradingFeeToReceiver(params) {
    const {
      feeClaimer,
      payer,
      pool,
      maxBaseAmount,
      maxQuoteAmount,
      receiver
    } = params;
    const { virtualPool, poolConfigState } = await this.getPoolWithConfig(pool);
    const tokenBaseProgram = getTokenProgram(poolConfigState.tokenType);
    const tokenQuoteProgram = getTokenProgram(
      poolConfigState.quoteTokenFlag
    );
    const isSOLQuoteMint = isNativeSol(poolConfigState.quoteMint);
    if (isSOLQuoteMint) {
      const result = await this.buildClaimTradingFeeAccountsForSol({
        payer,
        feeReceiver: receiver,
        tempWSolAcc: feeClaimer,
        pool,
        virtualPool,
        poolConfigState,
        tokenBaseProgram,
        tokenQuoteProgram
      });
      return this.program.methods.claimTradingFee(maxBaseAmount, maxQuoteAmount).accountsPartial({
        ...result.accounts,
        config: virtualPool.poolState.config,
        feeClaimer
      }).preInstructions(result.preInstructions).postInstructions(result.postInstructions).transaction();
    } else {
      const result = await this.buildClaimTradingFeeAccountsForNonSol({
        payer,
        feeReceiver: receiver,
        pool,
        virtualPool,
        poolConfigState,
        tokenBaseProgram,
        tokenQuoteProgram
      });
      return this.program.methods.claimTradingFee(maxBaseAmount, maxQuoteAmount).accountsPartial({
        ...result.accounts,
        config: virtualPool.poolState.config,
        feeClaimer
      }).preInstructions(result.preInstructions).postInstructions([]).transaction();
    }
  }
  /**
   * Build a transaction that claims partner trading fees with transfer-hook support.
   */
  async claimPartnerTradingFee2(params) {
    const {
      feeClaimer,
      payer,
      pool,
      maxBaseAmount,
      maxQuoteAmount,
      receiver
    } = params;
    const { virtualPool, poolConfigState } = await this.getPoolWithConfig(pool);
    const tokenBaseProgram = getTokenProgram(poolConfigState.tokenType);
    const tokenQuoteProgram = getTokenProgram(
      poolConfigState.quoteTokenFlag
    );
    const isSOLQuoteMint = isNativeSol(poolConfigState.quoteMint);
    const result = isSOLQuoteMint ? await this.buildClaimTradingFeeAccountsForSol({
      payer,
      feeReceiver: receiver,
      tempWSolAcc: feeClaimer,
      pool,
      virtualPool,
      poolConfigState,
      tokenBaseProgram,
      tokenQuoteProgram
    }) : await this.buildClaimTradingFeeAccountsForNonSol({
      payer,
      feeReceiver: receiver,
      pool,
      virtualPool,
      poolConfigState,
      tokenBaseProgram,
      tokenQuoteProgram
    });
    const {
      info: transferHookAccountsInfo,
      accounts: transferHookAccounts
    } = await this.getRemainingAccountsForTransferHook(
      virtualPool.poolState.baseMint
    );
    const postInstructions = isSOLQuoteMint && "postInstructions" in result ? result.postInstructions : [];
    return this.program.methods.claimTradingFee2(
      maxBaseAmount,
      maxQuoteAmount,
      transferHookAccountsInfo
    ).accountsPartial({
      ...result.accounts,
      config: virtualPool.poolState.config,
      feeClaimer
    }).remainingAccounts(transferHookAccounts).preInstructions(result.preInstructions).postInstructions(postInstructions).transaction();
  }
  /**
   * Build a transaction that withdraws partner surplus from a pool.
   */
  async partnerWithdrawSurplus(params) {
    const { pool, feeClaimer } = params;
    const { virtualPool, poolConfigState } = await this.getPoolWithConfig(pool);
    const tokenQuoteProgram = getTokenProgram(
      poolConfigState.quoteTokenFlag
    );
    const preInstructions = [];
    const postInstructions = [];
    const { ataPubkey: tokenQuoteAccount, ix: createQuoteTokenAccountIx } = await getOrCreateATAInstruction(
      this.connection,
      poolConfigState.quoteMint,
      feeClaimer,
      feeClaimer,
      true,
      tokenQuoteProgram,
      this.commitment
    );
    createQuoteTokenAccountIx && preInstructions.push(createQuoteTokenAccountIx);
    if (poolConfigState.quoteMint.equals(_spltoken.NATIVE_MINT)) {
      const unwrapSolIx = unwrapSOLInstruction(feeClaimer, feeClaimer);
      unwrapSolIx && postInstructions.push(unwrapSolIx);
    }
    return this.program.methods.partnerWithdrawSurplus().accountsPartial({
      poolAuthority: this.poolAuthority,
      config: virtualPool.poolState.config,
      virtualPool: pool,
      tokenQuoteAccount,
      quoteVault: virtualPool.poolState.quoteVault,
      quoteMint: poolConfigState.quoteMint,
      feeClaimer,
      tokenQuoteProgram
    }).preInstructions(preInstructions).postInstructions(postInstructions).transaction();
  }
  /**
   * Build a transaction that withdraws the partner migration fee.
   */
  async partnerWithdrawMigrationFee(params) {
    const { pool, sender } = params;
    return this.buildWithdrawMigrationFeeTx("partner", pool, sender);
  }
  /**
   * Build a transaction that claims the partner pool creation fee.
   */
  async claimPartnerPoolCreationFee(params) {
    const { pool, feeReceiver } = params;
    const { virtualPool, poolConfigState } = await this.getPoolWithConfig(pool);
    const config = virtualPool.poolState.config;
    const feeClaimer = poolConfigState.feeClaimer;
    const transaction = await this.program.methods.claimPartnerPoolCreationFee().accountsPartial({
      config,
      pool,
      feeClaimer,
      feeReceiver
    }).transaction();
    return transaction;
  }
};

// src/services/pool.ts





var PoolService = class extends DynamicBondingCurveProgram {
  /**
   * Build an exact-in swap transaction for an existing pool.
   *
   * The transaction prepares token accounts, wraps SOL when SOL is the input mint,
   * and unwraps SOL after the swap when either side of the trade is SOL.
   */
  async swap(params) {
    const {
      amountIn,
      minimumAmountOut,
      swapBaseForQuote,
      owner,
      payer,
      pool,
      referralTokenAccount
    } = params;
    const { virtualPool, poolConfigState } = await this.getPoolWithConfig(pool);
    validateSwapAmount(amountIn);
    let rateLimiterApplied = false;
    if (poolConfigState.poolFees.baseFee.baseFeeMode === 2 /* RateLimiter */) {
      const currentPoint = await getCurrentPoint(
        this.connection,
        poolConfigState.activationType
      );
      rateLimiterApplied = isRateLimiterApplied(
        currentPoint,
        virtualPool.poolState.activationPoint,
        swapBaseForQuote ? 0 /* BaseToQuote */ : 1 /* QuoteToBase */,
        poolConfigState.poolFees.baseFee.secondFactor,
        poolConfigState.poolFees.baseFee.thirdFactor,
        new (0, _bnjs2.default)(poolConfigState.poolFees.baseFee.firstFactor)
      );
    }
    const { inputMint, outputMint, inputTokenProgram, outputTokenProgram } = this.prepareSwapParams(
      swapBaseForQuote,
      virtualPool.poolState,
      poolConfigState
    );
    const {
      ataTokenA: inputTokenAccount,
      ataTokenB: outputTokenAccount,
      instructions: preInstructions
    } = await this.prepareTokenAccounts(
      owner,
      payer ? payer : owner,
      inputMint,
      outputMint,
      inputTokenProgram,
      outputTokenProgram
    );
    if (inputMint.equals(_spltoken.NATIVE_MINT)) {
      preInstructions.push(
        ...wrapSOLInstruction(
          owner,
          inputTokenAccount,
          BigInt(amountIn.toString())
        )
      );
    }
    const postInstructions = [];
    if ([inputMint.toBase58(), outputMint.toBase58()].includes(
      _spltoken.NATIVE_MINT.toBase58()
    )) {
      const unwrapIx = unwrapSOLInstruction(owner, owner);
      unwrapIx && postInstructions.push(unwrapIx);
    }
    const remainingAccounts = [];
    if (rateLimiterApplied || poolConfigState.enableFirstSwapWithMinFee) {
      remainingAccounts.push({
        pubkey: _web3js.SYSVAR_INSTRUCTIONS_PUBKEY,
        isSigner: false,
        isWritable: false
      });
    }
    return this.program.methods.swap({
      amountIn,
      minimumAmountOut
    }).accountsPartial({
      baseMint: virtualPool.poolState.baseMint,
      quoteMint: poolConfigState.quoteMint,
      pool,
      baseVault: virtualPool.poolState.baseVault,
      quoteVault: virtualPool.poolState.quoteVault,
      config: virtualPool.poolState.config,
      poolAuthority: this.poolAuthority,
      referralTokenAccount,
      inputTokenAccount,
      outputTokenAccount,
      payer: owner,
      tokenBaseProgram: swapBaseForQuote ? inputTokenProgram : outputTokenProgram,
      tokenQuoteProgram: swapBaseForQuote ? outputTokenProgram : inputTokenProgram
    }).remainingAccounts(remainingAccounts).preInstructions(preInstructions).postInstructions(postInstructions).transaction();
  }
  /**
   * Build a swap transaction using `SwapMode.ExactIn`, `SwapMode.PartialFill`, or `SwapMode.ExactOut`.
   *
   * Exact-out swaps use `amountOut` and `maximumAmountIn`;
   * Exact-in and Partial-fill swaps use `amountIn` and `minimumAmountOut`.
   */
  async swap2(params) {
    const {
      pool,
      swapBaseForQuote,
      swapMode,
      owner,
      payer,
      referralTokenAccount
    } = params;
    let amount0;
    let amount1;
    if (swapMode === 2 /* ExactOut */) {
      amount0 = params.amountOut;
      amount1 = params.maximumAmountIn;
    } else {
      amount0 = params.amountIn;
      amount1 = params.minimumAmountOut;
    }
    validateSwapAmount(amount0);
    const { virtualPool, poolConfigState } = await this.getPoolWithConfig(pool);
    let rateLimiterApplied = false;
    if (poolConfigState.poolFees.baseFee.baseFeeMode === 2 /* RateLimiter */) {
      const currentPoint = await getCurrentPoint(
        this.connection,
        poolConfigState.activationType
      );
      rateLimiterApplied = isRateLimiterApplied(
        currentPoint,
        virtualPool.poolState.activationPoint,
        swapBaseForQuote ? 0 /* BaseToQuote */ : 1 /* QuoteToBase */,
        poolConfigState.poolFees.baseFee.secondFactor,
        poolConfigState.poolFees.baseFee.thirdFactor,
        new (0, _bnjs2.default)(poolConfigState.poolFees.baseFee.firstFactor)
      );
    }
    const { inputMint, outputMint, inputTokenProgram, outputTokenProgram } = this.prepareSwapParams(
      swapBaseForQuote,
      virtualPool.poolState,
      poolConfigState
    );
    const {
      ataTokenA: inputTokenAccount,
      ataTokenB: outputTokenAccount,
      instructions: preInstructions
    } = await this.prepareTokenAccounts(
      owner,
      payer ? payer : owner,
      inputMint,
      outputMint,
      inputTokenProgram,
      outputTokenProgram
    );
    if (inputMint.equals(_spltoken.NATIVE_MINT)) {
      const amount = swapMode === 0 /* ExactIn */ || swapMode === 1 /* PartialFill */ ? amount0 : amount1;
      preInstructions.push(
        ...wrapSOLInstruction(
          owner,
          inputTokenAccount,
          BigInt(amount.toString())
        )
      );
    }
    const postInstructions = [];
    if ([inputMint.toBase58(), outputMint.toBase58()].includes(
      _spltoken.NATIVE_MINT.toBase58()
    )) {
      const unwrapIx = unwrapSOLInstruction(owner, owner);
      unwrapIx && postInstructions.push(unwrapIx);
    }
    const remainingAccounts = [];
    if (rateLimiterApplied || poolConfigState.enableFirstSwapWithMinFee) {
      remainingAccounts.push({
        pubkey: _web3js.SYSVAR_INSTRUCTIONS_PUBKEY,
        isSigner: false,
        isWritable: false
      });
    }
    return this.program.methods.swap2({
      amount0,
      amount1,
      swapMode
    }).accountsPartial({
      baseMint: virtualPool.poolState.baseMint,
      quoteMint: poolConfigState.quoteMint,
      pool,
      baseVault: virtualPool.poolState.baseVault,
      quoteVault: virtualPool.poolState.quoteVault,
      config: virtualPool.poolState.config,
      poolAuthority: this.poolAuthority,
      referralTokenAccount,
      inputTokenAccount,
      outputTokenAccount,
      payer: owner,
      tokenBaseProgram: swapBaseForQuote ? inputTokenProgram : outputTokenProgram,
      tokenQuoteProgram: swapBaseForQuote ? outputTokenProgram : inputTokenProgram
    }).remainingAccounts(remainingAccounts).preInstructions(preInstructions).postInstructions(postInstructions).transaction();
  }
  /**
   * Build a swap2 transaction for transfer-hook pools.
   */
  async swap2WithTransferHook(params) {
    const {
      pool,
      swapBaseForQuote,
      swapMode,
      owner,
      payer,
      referralTokenAccount
    } = params;
    let amount0;
    let amount1;
    if (swapMode === 2 /* ExactOut */) {
      amount0 = params.amountOut;
      amount1 = params.maximumAmountIn;
    } else {
      amount0 = params.amountIn;
      amount1 = params.minimumAmountOut;
    }
    validateSwapAmount(amount0);
    const { virtualPool, poolConfigState } = await this.getPoolWithConfig(pool);
    let rateLimiterApplied = false;
    if (poolConfigState.poolFees.baseFee.baseFeeMode === 2 /* RateLimiter */) {
      const currentPoint = await getCurrentPoint(
        this.connection,
        poolConfigState.activationType
      );
      rateLimiterApplied = isRateLimiterApplied(
        currentPoint,
        virtualPool.poolState.activationPoint,
        swapBaseForQuote ? 0 /* BaseToQuote */ : 1 /* QuoteToBase */,
        poolConfigState.poolFees.baseFee.secondFactor,
        poolConfigState.poolFees.baseFee.thirdFactor,
        new (0, _bnjs2.default)(poolConfigState.poolFees.baseFee.firstFactor)
      );
    }
    const { inputMint, outputMint, inputTokenProgram, outputTokenProgram } = this.prepareSwapParams(
      swapBaseForQuote,
      virtualPool.poolState,
      poolConfigState
    );
    const {
      ataTokenA: inputTokenAccount,
      ataTokenB: outputTokenAccount,
      instructions: preInstructions
    } = await this.prepareTokenAccounts(
      owner,
      payer ? payer : owner,
      inputMint,
      outputMint,
      inputTokenProgram,
      outputTokenProgram
    );
    if (inputMint.equals(_spltoken.NATIVE_MINT)) {
      const amount = swapMode === 0 /* ExactIn */ || swapMode === 1 /* PartialFill */ ? amount0 : amount1;
      preInstructions.push(
        ...wrapSOLInstruction(
          owner,
          inputTokenAccount,
          BigInt(amount.toString())
        )
      );
    }
    const postInstructions = [];
    if ([inputMint.toBase58(), outputMint.toBase58()].includes(
      _spltoken.NATIVE_MINT.toBase58()
    )) {
      const unwrapIx = unwrapSOLInstruction(owner, owner);
      unwrapIx && postInstructions.push(unwrapIx);
    }
    const remainingAccounts = [];
    if (rateLimiterApplied || poolConfigState.enableFirstSwapWithMinFee) {
      remainingAccounts.push({
        pubkey: _web3js.SYSVAR_INSTRUCTIONS_PUBKEY,
        isSigner: false,
        isWritable: false
      });
    }
    const transferHookAccountTypes = referralTokenAccount != null ? [
      AccountsType.TransferHookBase,
      AccountsType.TransferHookBaseReferral
    ] : [AccountsType.TransferHookBase];
    const {
      info: transferHookAccountsInfo,
      accounts: transferHookAccounts
    } = await this.getRemainingAccountsForTransferHook(
      virtualPool.poolState.baseMint,
      transferHookAccountTypes
    );
    remainingAccounts.push(...transferHookAccounts);
    return this.program.methods.swap2WithTransferHook(
      {
        amount0,
        amount1,
        swapMode
      },
      transferHookAccountsInfo
    ).accountsPartial({
      baseMint: virtualPool.poolState.baseMint,
      quoteMint: poolConfigState.quoteMint,
      pool,
      baseVault: virtualPool.poolState.baseVault,
      quoteVault: virtualPool.poolState.quoteVault,
      config: virtualPool.poolState.config,
      poolAuthority: this.poolAuthority,
      referralTokenAccount,
      inputTokenAccount,
      outputTokenAccount,
      payer: owner,
      tokenBaseProgram: swapBaseForQuote ? inputTokenProgram : outputTokenProgram,
      tokenQuoteProgram: swapBaseForQuote ? outputTokenProgram : inputTokenProgram
    }).remainingAccounts(remainingAccounts).preInstructions(preInstructions).postInstructions(postInstructions).transaction();
  }
  /**
   * Quote an exact-in swap for the original swap instruction.
   */
  swapQuote(params) {
    const {
      virtualPool,
      config,
      swapBaseForQuote,
      amountIn,
      slippageBps,
      hasReferral,
      currentPoint,
      eligibleForFirstSwapWithMinFee
    } = params;
    return swapQuote(
      virtualPool,
      config,
      swapBaseForQuote,
      amountIn,
      slippageBps,
      hasReferral,
      currentPoint,
      eligibleForFirstSwapWithMinFee
    );
  }
  /**
   * Quote a swap using `SwapMode.ExactIn`, `SwapMode.PartialFill`, or `SwapMode.ExactOut`.
   */
  swapQuote2(params) {
    const {
      virtualPool,
      config,
      swapBaseForQuote,
      swapMode,
      hasReferral,
      eligibleForFirstSwapWithMinFee,
      currentPoint,
      slippageBps
    } = params;
    switch (swapMode) {
      case 0 /* ExactIn */:
        if ("amountIn" in params) {
          return swapQuoteExactIn(
            virtualPool,
            config,
            swapBaseForQuote,
            params.amountIn,
            slippageBps,
            hasReferral,
            currentPoint,
            eligibleForFirstSwapWithMinFee
          );
        }
        throw new Error("amountIn is required for ExactIn swap mode");
      case 2 /* ExactOut */:
        if ("amountOut" in params) {
          return swapQuoteExactOut(
            virtualPool,
            config,
            swapBaseForQuote,
            params.amountOut,
            slippageBps,
            hasReferral,
            currentPoint,
            eligibleForFirstSwapWithMinFee
          );
        }
        throw new Error("outAmount is required for ExactOut swap mode");
      case 1 /* PartialFill */:
        if ("amountIn" in params) {
          return swapQuotePartialFill(
            virtualPool,
            config,
            swapBaseForQuote,
            params.amountIn,
            slippageBps,
            hasReferral,
            currentPoint,
            eligibleForFirstSwapWithMinFee
          );
        }
        throw new Error(
          "amountIn is required for PartialFill swap mode"
        );
      default:
        throw new Error(`Unsupported swap mode: ${swapMode}`);
    }
  }
  /**
   * Reconcile the only two fields that differ between an on-chain `PoolConfig`
   * and a `buildCurve` output (`ConfigParameters`) so the quote math can
   * consume either directly:
   * - `migrationSqrtPrice`: used when present, otherwise derived from the
   *   curve and migration quote threshold (it is the swap stop price).
   * - `dynamicFee`: a null/undefined object becomes a disabled one, and a
   *   present object is treated as enabled unless `initialized` says otherwise.
   *
   * Everything else is already in the right shape and passed through.
   */
  normalizeQuoteConfig(config) {
    if (!config.curve || config.curve.length === 0) {
      throw new Error("config.curve is empty");
    }
    const migrationSqrtPrice = _nullishCoalesce(config.migrationSqrtPrice, () => ( getMigrationThresholdPrice(
      config.migrationQuoteThreshold,
      config.sqrtStartPrice,
      config.curve
    )));
    const dynamicFee = config.poolFees.dynamicFee;
    return {
      ...config,
      migrationSqrtPrice,
      poolFees: {
        ...config.poolFees,
        dynamicFee: dynamicFee ? {
          ...dynamicFee,
          initialized: _nullishCoalesce(dynamicFee.initialized, () => ( 1))
        } : { initialized: 0, binStep: 0, variableFeeControl: 0 }
      }
    };
  }
  /**
   * creates a virtual pool state at launch with zeroed reserves and volatility, start price set.
   */
  buildSimulatedVirtualPool(sqrtStartPrice) {
    return {
      poolState: {
        sqrtPrice: new (0, _bnjs2.default)(sqrtStartPrice),
        baseReserve: new (0, _bnjs2.default)(0),
        quoteReserve: new (0, _bnjs2.default)(0),
        activationPoint: new (0, _bnjs2.default)(0),
        volatilityTracker: {
          lastUpdateTimestamp: new (0, _bnjs2.default)(0),
          sqrtPriceReference: new (0, _bnjs2.default)(0),
          volatilityAccumulator: new (0, _bnjs2.default)(0),
          volatilityReference: new (0, _bnjs2.default)(0),
          padding: []
        }
      }
    };
  }
  /**
   * quotes a swap from an input amount before any pool exists.
   */
  getQuoteFromInputAmount(params) {
    const {
      config,
      swapBaseForQuote,
      amountIn,
      swapMode = 0 /* ExactIn */,
      slippageBps = 0,
      hasReferral = false,
      eligibleForFirstSwapWithMinFee = false,
      currentPoint = new (0, _bnjs2.default)(0)
    } = params;
    const poolConfig = this.normalizeQuoteConfig(config);
    const virtualPool = this.buildSimulatedVirtualPool(
      poolConfig.sqrtStartPrice
    );
    if (swapMode === 1 /* PartialFill */) {
      return swapQuotePartialFill(
        virtualPool,
        poolConfig,
        swapBaseForQuote,
        amountIn,
        slippageBps,
        hasReferral,
        currentPoint,
        eligibleForFirstSwapWithMinFee
      );
    }
    return swapQuoteExactIn(
      virtualPool,
      poolConfig,
      swapBaseForQuote,
      amountIn,
      slippageBps,
      hasReferral,
      currentPoint,
      eligibleForFirstSwapWithMinFee
    );
  }
  /**
   * quotes a swap from an exact output amount (`SwapMode.ExactOut`)
   */
  getQuoteFromOutputAmount(params) {
    const {
      config,
      swapBaseForQuote,
      amountOut,
      slippageBps = 0,
      hasReferral = false,
      eligibleForFirstSwapWithMinFee = false,
      currentPoint = new (0, _bnjs2.default)(0)
    } = params;
    const poolConfig = this.normalizeQuoteConfig(config);
    const virtualPool = this.buildSimulatedVirtualPool(
      poolConfig.sqrtStartPrice
    );
    return swapQuoteExactOut(
      virtualPool,
      poolConfig,
      swapBaseForQuote,
      amountOut,
      slippageBps,
      hasReferral,
      currentPoint,
      eligibleForFirstSwapWithMinFee
    );
  }
};

// src/services/creator.ts




var CreatorService = class extends DynamicBondingCurveProgram {
  async getPoolConfigForNewPool(config) {
    const poolConfigState = await this.state.getPoolConfig(config);
    if (!poolConfigState) {
      throw new Error(`Pool config not found for virtual pool`);
    }
    assertConfigAllowsNewPool({
      baseFeeMode: poolConfigState.poolFees.baseFee.baseFeeMode,
      migrationOption: poolConfigState.migrationOption
    });
    return poolConfigState;
  }
  /**
   * Build a transaction that creates metadata for a virtual pool.
   */
  async createPoolMetadata(params) {
    const { virtualPool, name, website, logo, creator, payer } = params;
    const virtualPoolMetadata = deriveDbcPoolMetadata(virtualPool);
    return this.program.methods.createVirtualPoolMetadata({
      padding: new Array(96).fill(0),
      name,
      website,
      logo
    }).accountsPartial({
      virtualPool,
      virtualPoolMetadata,
      creator,
      payer,
      systemProgram: _web3js.SystemProgram.programId
    }).transaction();
  }
  /**
   * Build a transaction that initializes a pool from an existing config.
   */
  async createPool(params) {
    const { config } = params;
    const poolConfigState = await this.getPoolConfigForNewPool(config);
    return this.buildCreatePoolTx(
      params,
      poolConfigState.tokenType,
      poolConfigState.quoteMint
    );
  }
  /**
   * Build a transaction that initializes a Token-2022 transfer-hook pool from an existing config.
   */
  async createPoolWithTransferHook(params) {
    const { config } = params;
    const poolConfigState = await this.getPoolConfigForNewPool(config);
    const tokenQuoteProgram = getTokenProgram(
      poolConfigState.quoteTokenFlag
    );
    return this.buildCreatePoolWithTransferHookTx(
      params,
      poolConfigState.quoteMint,
      tokenQuoteProgram
    );
  }
  /**
   * Build one transaction that initializes a pool and optionally appends the first buy.
   *
   * The first-buy instruction is only included when `firstBuyParam.buyAmount` is greater than 0.
   */
  async createPoolWithFirstBuy(params) {
    const { createPoolParam, firstBuyParam } = params;
    const { config } = createPoolParam;
    const poolConfigState = await this.getPoolConfigForNewPool(config);
    const createPoolWithFirstBuyTx = await this.buildCreatePoolTx(
      createPoolParam,
      poolConfigState.tokenType,
      poolConfigState.quoteMint
    );
    if (firstBuyParam && firstBuyParam.buyAmount.gt(new (0, _bnjs2.default)(0))) {
      const swapBuyTx = await this.buildSwapBuyTx(
        firstBuyParam,
        createPoolParam.baseMint,
        config,
        poolConfigState.poolFees.baseFee,
        false,
        poolConfigState.activationType,
        poolConfigState.tokenType,
        poolConfigState.quoteMint,
        true
      );
      createPoolWithFirstBuyTx.add(swapBuyTx);
    }
    return createPoolWithFirstBuyTx;
  }
  /**
   * Build one transaction that initializes a transfer-hook pool and optionally appends the first buy.
   */
  async createPoolWithFirstBuyWithTransferHook(params) {
    const { createPoolParam, firstBuyParam } = params;
    const { config } = createPoolParam;
    const poolConfigState = await this.getPoolConfigForNewPool(config);
    const createPoolWithFirstBuyTx = await this.buildCreatePoolWithTransferHookTx(
      createPoolParam,
      poolConfigState.quoteMint,
      getTokenProgram(poolConfigState.quoteTokenFlag)
    );
    if (firstBuyParam && firstBuyParam.buyAmount.gt(new (0, _bnjs2.default)(0))) {
      const swapBuyTx = await this.buildSwap2WithTransferHookBuyTx(
        firstBuyParam,
        createPoolParam.baseMint,
        config,
        poolConfigState.poolFees.baseFee,
        poolConfigState.activationType,
        poolConfigState.quoteMint,
        true
      );
      createPoolWithFirstBuyTx.add(swapBuyTx);
    }
    return createPoolWithFirstBuyTx;
  }
  /**
   * Build one transaction that initializes a pool and optionally appends partner and creator first buys.
   */
  async createPoolWithPartnerAndCreatorFirstBuy(params) {
    const { createPoolParam, partnerFirstBuyParam, creatorFirstBuyParam } = params;
    const { config } = createPoolParam;
    const poolConfigState = await this.getPoolConfigForNewPool(config);
    const createPoolWithFirstBuysTx = await this.buildCreatePoolTx(
      createPoolParam,
      poolConfigState.tokenType,
      poolConfigState.quoteMint
    );
    if (partnerFirstBuyParam && partnerFirstBuyParam.buyAmount.gt(new (0, _bnjs2.default)(0))) {
      const partnerSwapBuyTx = await this.buildSwapBuyTx(
        {
          buyer: partnerFirstBuyParam.partner,
          receiver: partnerFirstBuyParam.receiver,
          buyAmount: partnerFirstBuyParam.buyAmount,
          minimumAmountOut: partnerFirstBuyParam.minimumAmountOut,
          referralTokenAccount: partnerFirstBuyParam.referralTokenAccount
        },
        createPoolParam.baseMint,
        config,
        poolConfigState.poolFees.baseFee,
        false,
        poolConfigState.activationType,
        poolConfigState.tokenType,
        poolConfigState.quoteMint,
        true
      );
      createPoolWithFirstBuysTx.add(partnerSwapBuyTx);
    }
    if (creatorFirstBuyParam && creatorFirstBuyParam.buyAmount.gt(new (0, _bnjs2.default)(0))) {
      const creatorSwapBuyTx = await this.buildSwapBuyTx(
        {
          buyer: creatorFirstBuyParam.creator,
          receiver: creatorFirstBuyParam.receiver,
          buyAmount: creatorFirstBuyParam.buyAmount,
          minimumAmountOut: creatorFirstBuyParam.minimumAmountOut,
          referralTokenAccount: creatorFirstBuyParam.referralTokenAccount
        },
        createPoolParam.baseMint,
        config,
        poolConfigState.poolFees.baseFee,
        false,
        poolConfigState.activationType,
        poolConfigState.tokenType,
        poolConfigState.quoteMint,
        true
      );
      createPoolWithFirstBuysTx.add(creatorSwapBuyTx);
    }
    return createPoolWithFirstBuysTx;
  }
  /**
   * Build one transaction that initializes a transfer-hook pool and optionally appends partner and creator first buys.
   */
  async createPoolWithPartnerAndCreatorFirstBuyWithTransferHook(params) {
    const { createPoolParam, partnerFirstBuyParam, creatorFirstBuyParam } = params;
    const { config } = createPoolParam;
    const poolConfigState = await this.getPoolConfigForNewPool(config);
    const createPoolWithFirstBuysTx = await this.buildCreatePoolWithTransferHookTx(
      createPoolParam,
      poolConfigState.quoteMint,
      getTokenProgram(poolConfigState.quoteTokenFlag)
    );
    if (partnerFirstBuyParam && partnerFirstBuyParam.buyAmount.gt(new (0, _bnjs2.default)(0))) {
      const partnerSwapBuyTx = await this.buildSwap2WithTransferHookBuyTx(
        {
          buyer: partnerFirstBuyParam.partner,
          receiver: partnerFirstBuyParam.receiver,
          buyAmount: partnerFirstBuyParam.buyAmount,
          minimumAmountOut: partnerFirstBuyParam.minimumAmountOut,
          referralTokenAccount: partnerFirstBuyParam.referralTokenAccount,
          transferHookAccountsInfo: partnerFirstBuyParam.transferHookAccountsInfo,
          transferHookAccounts: partnerFirstBuyParam.transferHookAccounts
        },
        createPoolParam.baseMint,
        config,
        poolConfigState.poolFees.baseFee,
        poolConfigState.activationType,
        poolConfigState.quoteMint,
        true
      );
      createPoolWithFirstBuysTx.add(partnerSwapBuyTx);
    }
    if (creatorFirstBuyParam && creatorFirstBuyParam.buyAmount.gt(new (0, _bnjs2.default)(0))) {
      const creatorSwapBuyTx = await this.buildSwap2WithTransferHookBuyTx(
        {
          buyer: creatorFirstBuyParam.creator,
          receiver: creatorFirstBuyParam.receiver,
          buyAmount: creatorFirstBuyParam.buyAmount,
          minimumAmountOut: creatorFirstBuyParam.minimumAmountOut,
          referralTokenAccount: creatorFirstBuyParam.referralTokenAccount,
          transferHookAccountsInfo: creatorFirstBuyParam.transferHookAccountsInfo,
          transferHookAccounts: creatorFirstBuyParam.transferHookAccounts
        },
        createPoolParam.baseMint,
        config,
        poolConfigState.poolFees.baseFee,
        poolConfigState.activationType,
        poolConfigState.quoteMint,
        true
      );
      createPoolWithFirstBuysTx.add(creatorSwapBuyTx);
    }
    return createPoolWithFirstBuysTx;
  }
  /**
   * Build a transaction that claims creator trading fees.
   *
   * When the quote mint is SOL, the transaction may create and close a temporary wrapped SOL account.
   * If `receiver` differs from `creator`, provide `tempWSolAcc`.
   */
  async claimCreatorTradingFee(params) {
    const {
      creator,
      pool,
      maxBaseAmount,
      maxQuoteAmount,
      receiver,
      payer,
      tempWSolAcc
    } = params;
    const { virtualPool, poolConfigState } = await this.getPoolWithConfig(pool);
    const tokenBaseProgram = getTokenProgram(poolConfigState.tokenType);
    const tokenQuoteProgram = getTokenProgram(
      poolConfigState.quoteTokenFlag
    );
    const isSOLQuoteMint = isNativeSol(poolConfigState.quoteMint);
    if (isSOLQuoteMint) {
      const tempWSol = receiver && !receiver.equals(creator) ? tempWSolAcc : creator;
      const feeReceiver = receiver ? receiver : creator;
      const result = await this.buildClaimTradingFeeAccountsForSol({
        payer,
        feeReceiver,
        tempWSolAcc: tempWSol,
        pool,
        virtualPool,
        poolConfigState,
        tokenBaseProgram,
        tokenQuoteProgram
      });
      return this.program.methods.claimCreatorTradingFee(maxBaseAmount, maxQuoteAmount).accountsPartial({ ...result.accounts, creator }).preInstructions(result.preInstructions).postInstructions(result.postInstructions).transaction();
    } else {
      const feeReceiver = receiver ? receiver : creator;
      const result = await this.buildClaimTradingFeeAccountsForNonSol({
        payer,
        feeReceiver,
        pool,
        virtualPool,
        poolConfigState,
        tokenBaseProgram,
        tokenQuoteProgram
      });
      return this.program.methods.claimCreatorTradingFee(maxBaseAmount, maxQuoteAmount).accountsPartial({ ...result.accounts, creator }).preInstructions(result.preInstructions).postInstructions([]).transaction();
    }
  }
  /**
   * Build a transaction that claims creator trading fees to an explicit receiver.
   */
  async claimCreatorTradingFeeToReceiver(params) {
    const {
      creator,
      pool,
      maxBaseAmount,
      maxQuoteAmount,
      receiver,
      payer
    } = params;
    const { virtualPool, poolConfigState } = await this.getPoolWithConfig(pool);
    const tokenBaseProgram = getTokenProgram(poolConfigState.tokenType);
    const tokenQuoteProgram = getTokenProgram(
      poolConfigState.quoteTokenFlag
    );
    const isSOLQuoteMint = isNativeSol(poolConfigState.quoteMint);
    if (isSOLQuoteMint) {
      const result = await this.buildClaimTradingFeeAccountsForSol({
        payer,
        feeReceiver: receiver,
        tempWSolAcc: creator,
        pool,
        virtualPool,
        poolConfigState,
        tokenBaseProgram,
        tokenQuoteProgram
      });
      return this.program.methods.claimCreatorTradingFee(maxBaseAmount, maxQuoteAmount).accountsPartial({ ...result.accounts, creator }).preInstructions(result.preInstructions).postInstructions(result.postInstructions).transaction();
    } else {
      const result = await this.buildClaimTradingFeeAccountsForNonSol({
        payer,
        feeReceiver: receiver,
        pool,
        virtualPool,
        poolConfigState,
        tokenBaseProgram,
        tokenQuoteProgram
      });
      return this.program.methods.claimCreatorTradingFee(maxBaseAmount, maxQuoteAmount).accountsPartial({ ...result.accounts, creator }).preInstructions(result.preInstructions).postInstructions([]).transaction();
    }
  }
  /**
   * Build a transaction that claims creator trading fees with transfer-hook support.
   */
  async claimCreatorTradingFee2(params) {
    const {
      creator,
      pool,
      maxBaseAmount,
      maxQuoteAmount,
      receiver,
      payer
    } = params;
    const { virtualPool, poolConfigState } = await this.getPoolWithConfig(pool);
    const tokenBaseProgram = getTokenProgram(poolConfigState.tokenType);
    const tokenQuoteProgram = getTokenProgram(
      poolConfigState.quoteTokenFlag
    );
    const isSOLQuoteMint = isNativeSol(poolConfigState.quoteMint);
    const result = isSOLQuoteMint ? await this.buildClaimTradingFeeAccountsForSol({
      payer,
      feeReceiver: receiver,
      tempWSolAcc: creator,
      pool,
      virtualPool,
      poolConfigState,
      tokenBaseProgram,
      tokenQuoteProgram
    }) : await this.buildClaimTradingFeeAccountsForNonSol({
      payer,
      feeReceiver: receiver,
      pool,
      virtualPool,
      poolConfigState,
      tokenBaseProgram,
      tokenQuoteProgram
    });
    const {
      info: transferHookAccountsInfo,
      accounts: transferHookAccounts
    } = await this.getRemainingAccountsForTransferHook(
      virtualPool.poolState.baseMint
    );
    const postInstructions = isSOLQuoteMint && "postInstructions" in result ? result.postInstructions : [];
    return this.program.methods.claimCreatorTradingFee2(
      maxBaseAmount,
      maxQuoteAmount,
      transferHookAccountsInfo
    ).accountsPartial({ ...result.accounts, creator }).remainingAccounts(transferHookAccounts).preInstructions(result.preInstructions).postInstructions(postInstructions).transaction();
  }
  /**
   * Build a transaction that withdraws creator surplus from a pool.
   */
  async creatorWithdrawSurplus(params) {
    const { creator, pool } = params;
    const { virtualPool, poolConfigState } = await this.getPoolWithConfig(pool);
    const tokenQuoteProgram = getTokenProgram(
      poolConfigState.quoteTokenFlag
    );
    const preInstructions = [];
    const postInstructions = [];
    const { ataPubkey: tokenQuoteAccount, ix: createQuoteTokenAccountIx } = await getOrCreateATAInstruction(
      this.connection,
      poolConfigState.quoteMint,
      creator,
      creator,
      true,
      tokenQuoteProgram,
      this.commitment
    );
    if (createQuoteTokenAccountIx) {
      preInstructions.push(createQuoteTokenAccountIx);
    }
    const isSOLQuoteMint = isNativeSol(poolConfigState.quoteMint);
    if (isSOLQuoteMint) {
      const unwrapIx = unwrapSOLInstruction(creator, creator);
      if (unwrapIx) {
        postInstructions.push(unwrapIx);
      }
    }
    const accounts = {
      poolAuthority: this.poolAuthority,
      config: virtualPool.poolState.config,
      virtualPool: pool,
      tokenQuoteAccount,
      quoteVault: virtualPool.poolState.quoteVault,
      quoteMint: poolConfigState.quoteMint,
      creator,
      tokenQuoteProgram
    };
    return this.program.methods.creatorWithdrawSurplus().accountsPartial(accounts).preInstructions(preInstructions).postInstructions(postInstructions).transaction();
  }
  /**
   * Build a transaction that transfers pool creator ownership.
   */
  async transferPoolCreator(params) {
    const { pool, creator, newCreator } = params;
    const virtualPool = await this.state.getPool(pool);
    if (!virtualPool) {
      throw new Error(`Pool not found: ${pool.toString()}`);
    }
    const migrationMetadata = deriveDammV1MigrationMetadataAddress(pool);
    const transaction = await this.program.methods.transferPoolCreator().accountsPartial({
      virtualPool: pool,
      newCreator,
      config: virtualPool.poolState.config,
      creator
    }).remainingAccounts([
      {
        isSigner: false,
        isWritable: false,
        pubkey: migrationMetadata
      }
    ]).transaction();
    return transaction;
  }
  /**
   * Build a transaction that withdraws the creator migration fee.
   */
  async creatorWithdrawMigrationFee(params) {
    const { pool, sender } = params;
    return this.buildWithdrawMigrationFeeTx("creator", pool, sender);
  }
};

// src/client.ts
var DynamicBondingCurveClient = class _DynamicBondingCurveClient {
  constructor(connection, commitment) {
    this.state = new StateService(connection, commitment);
    this.pool = new PoolService(connection, commitment);
    this.partner = new PartnerService(connection, commitment);
    this.creator = new CreatorService(connection, commitment);
    this.migration = new MigrationService(connection, commitment);
    this.commitment = commitment;
    this.connection = connection;
  }
  /**
   * Create a client with all DBC services.
   */
  static create(connection, commitment = "confirmed") {
    return new _DynamicBondingCurveClient(connection, commitment);
  }
};
















































































































































































































































































exports.AccountsType = AccountsType; exports.ActivationType = ActivationType; exports.BASE_ADDRESS = BASE_ADDRESS; exports.BIN_STEP_BPS_DEFAULT = BIN_STEP_BPS_DEFAULT; exports.BIN_STEP_BPS_U128_DEFAULT = BIN_STEP_BPS_U128_DEFAULT; exports.BaseFeeMode = BaseFeeMode; exports.CollectFeeMode = CollectFeeMode; exports.CreatorService = CreatorService; exports.DAMM_V1_MIGRATION_FEE_ADDRESS = DAMM_V1_MIGRATION_FEE_ADDRESS; exports.DAMM_V1_PROGRAM_ID = DAMM_V1_PROGRAM_ID; exports.DAMM_V2_MIGRATION_FEE_ADDRESS = DAMM_V2_MIGRATION_FEE_ADDRESS; exports.DAMM_V2_PROGRAM_ID = DAMM_V2_PROGRAM_ID; exports.DEFAULT_LIQUIDITY_VESTING_INFO_PARAMS = DEFAULT_LIQUIDITY_VESTING_INFO_PARAMS; exports.DEFAULT_MIGRATED_POOL_FEE_PARAMS = DEFAULT_MIGRATED_POOL_FEE_PARAMS; exports.DEFAULT_MIGRATED_POOL_MARKET_CAP_FEE_SCHEDULER_PARAMS = DEFAULT_MIGRATED_POOL_MARKET_CAP_FEE_SCHEDULER_PARAMS; exports.DYNAMIC_BONDING_CURVE_PROGRAM_ID = DYNAMIC_BONDING_CURVE_PROGRAM_ID; exports.DYNAMIC_FEE_DECAY_PERIOD_DEFAULT = DYNAMIC_FEE_DECAY_PERIOD_DEFAULT; exports.DYNAMIC_FEE_FILTER_PERIOD_DEFAULT = DYNAMIC_FEE_FILTER_PERIOD_DEFAULT; exports.DYNAMIC_FEE_REDUCTION_FACTOR_DEFAULT = DYNAMIC_FEE_REDUCTION_FACTOR_DEFAULT; exports.DYNAMIC_FEE_ROUNDING_OFFSET = DYNAMIC_FEE_ROUNDING_OFFSET; exports.DYNAMIC_FEE_SCALING_FACTOR = DYNAMIC_FEE_SCALING_FACTOR; exports.DammV2BaseFeeMode = DammV2BaseFeeMode; exports.DammV2DynamicFeeMode = DammV2DynamicFeeMode; exports.DynamicBondingCurveClient = DynamicBondingCurveClient; exports.DynamicBondingCurveIdl = idl_default; exports.DynamicBondingCurveProgram = DynamicBondingCurveProgram; exports.FEE_DENOMINATOR = FEE_DENOMINATOR; exports.FeeRateLimiter = FeeRateLimiter; exports.FeeScheduler = FeeScheduler; exports.HOST_FEE_PERCENT = HOST_FEE_PERCENT; exports.LOCKER_PROGRAM_ID = LOCKER_PROGRAM_ID; exports.MAX_BASIS_POINT = MAX_BASIS_POINT; exports.MAX_CREATOR_MIGRATION_FEE_PERCENTAGE = MAX_CREATOR_MIGRATION_FEE_PERCENTAGE; exports.MAX_CURVE_POINT = MAX_CURVE_POINT; exports.MAX_FEE_BPS = MAX_FEE_BPS; exports.MAX_FEE_NUMERATOR = MAX_FEE_NUMERATOR; exports.MAX_LOCK_DURATION_IN_SECONDS = MAX_LOCK_DURATION_IN_SECONDS; exports.MAX_MIGRATED_POOL_FEE_BPS = MAX_MIGRATED_POOL_FEE_BPS; exports.MAX_MIGRATION_FEE_PERCENTAGE = MAX_MIGRATION_FEE_PERCENTAGE; exports.MAX_POOL_CREATION_FEE = MAX_POOL_CREATION_FEE; exports.MAX_PRICE_CHANGE_BPS_DEFAULT = MAX_PRICE_CHANGE_BPS_DEFAULT; exports.MAX_RATE_LIMITER_DURATION_IN_SECONDS = MAX_RATE_LIMITER_DURATION_IN_SECONDS; exports.MAX_RATE_LIMITER_DURATION_IN_SLOTS = MAX_RATE_LIMITER_DURATION_IN_SLOTS; exports.MAX_SQRT_PRICE = MAX_SQRT_PRICE; exports.METAPLEX_PROGRAM_ID = METAPLEX_PROGRAM_ID; exports.MIN_FEE_BPS = MIN_FEE_BPS; exports.MIN_FEE_NUMERATOR = MIN_FEE_NUMERATOR; exports.MIN_LOCKED_LIQUIDITY_BPS = MIN_LOCKED_LIQUIDITY_BPS; exports.MIN_MIGRATED_POOL_FEE_BPS = MIN_MIGRATED_POOL_FEE_BPS; exports.MIN_POOL_CREATION_FEE = MIN_POOL_CREATION_FEE; exports.MIN_SQRT_PRICE = MIN_SQRT_PRICE; exports.MigratedCollectFeeMode = MigratedCollectFeeMode; exports.MigrationFeeOption = MigrationFeeOption; exports.MigrationOption = MigrationOption; exports.MigrationService = MigrationService; exports.OFFSET = OFFSET; exports.ONE_Q64 = ONE_Q64; exports.PROTOCOL_FEE_PERCENT = PROTOCOL_FEE_PERCENT; exports.PROTOCOL_POOL_CREATION_FEE_PERCENT = PROTOCOL_POOL_CREATION_FEE_PERCENT; exports.PartnerService = PartnerService; exports.PoolService = PoolService; exports.RESOLUTION = RESOLUTION; exports.Rounding = Rounding; exports.SECONDS_PER_DAY = SECONDS_PER_DAY; exports.SWAP_BUFFER_PERCENTAGE = SWAP_BUFFER_PERCENTAGE; exports.SafeMath = SafeMath; exports.StateService = StateService; exports.SwapMode = SwapMode; exports.TokenAuthorityOption = TokenAuthorityOption; exports.TokenDecimal = TokenDecimal; exports.TokenType = TokenType; exports.TradeDirection = TradeDirection; exports.U128_MAX = U128_MAX; exports.U16_MAX = U16_MAX; exports.U24_MAX = U24_MAX; exports.U64_MAX = U64_MAX; exports.VAULT_PROGRAM_ID = VAULT_PROGRAM_ID; exports.assertConfigAllowsNewPool = assertConfigAllowsNewPool; exports.bpsToFeeNumerator = bpsToFeeNumerator; exports.buildCurve = buildCurve; exports.buildCurveWithCustomSqrtPrices = buildCurveWithCustomSqrtPrices; exports.buildCurveWithLiquidityWeights = buildCurveWithLiquidityWeights; exports.buildCurveWithMarketCap = buildCurveWithMarketCap; exports.buildCurveWithMidPrice = buildCurveWithMidPrice; exports.buildCurveWithTwoSegments = buildCurveWithTwoSegments; exports.calculateAdjustedPercentageSupplyOnMigration = calculateAdjustedPercentageSupplyOnMigration; exports.calculateBaseToQuoteFromAmountIn = calculateBaseToQuoteFromAmountIn; exports.calculateBaseToQuoteFromAmountOut = calculateBaseToQuoteFromAmountOut; exports.calculateFeeSchedulerEndingBaseFeeBps = calculateFeeSchedulerEndingBaseFeeBps; exports.calculateLockedLiquidityBpsAtTime = calculateLockedLiquidityBpsAtTime; exports.calculateQuoteToBaseFromAmountIn = calculateQuoteToBaseFromAmountIn; exports.calculateQuoteToBaseFromAmountOut = calculateQuoteToBaseFromAmountOut; exports.checkRateLimiterApplied = checkRateLimiterApplied; exports.cleanUpTokenAccountTx = cleanUpTokenAccountTx; exports.computeSqrtPriceStepBps = computeSqrtPriceStepBps; exports.convertDecimalToBN = convertDecimalToBN; exports.convertToLamports = convertToLamports; exports.createDammV1Program = createDammV1Program; exports.createDammV2Program = createDammV2Program; exports.createDbcProgram = createDbcProgram; exports.createDynamicVaultProgram = createDynamicVaultProgram; exports.createInitializePermissionlessDynamicVaultIx = createInitializePermissionlessDynamicVaultIx; exports.createLockEscrowIx = createLockEscrowIx; exports.createProgramAccountFilter = createProgramAccountFilter; exports.createSqrtPrices = createSqrtPrices; exports.deriveBaseKeyForLocker = deriveBaseKeyForLocker; exports.deriveDammV1EventAuthority = deriveDammV1EventAuthority; exports.deriveDammV1LockEscrowAddress = deriveDammV1LockEscrowAddress; exports.deriveDammV1LpMintAddress = deriveDammV1LpMintAddress; exports.deriveDammV1MigrationMetadataAddress = deriveDammV1MigrationMetadataAddress; exports.deriveDammV1PoolAddress = deriveDammV1PoolAddress; exports.deriveDammV1PoolAuthority = deriveDammV1PoolAuthority; exports.deriveDammV1ProtocolFeeAddress = deriveDammV1ProtocolFeeAddress; exports.deriveDammV1VaultLPAddress = deriveDammV1VaultLPAddress; exports.deriveDammV2EventAuthority = deriveDammV2EventAuthority; exports.deriveDammV2LockEscrowAddress = deriveDammV2LockEscrowAddress; exports.deriveDammV2MigrationMetadataAddress = deriveDammV2MigrationMetadataAddress; exports.deriveDammV2PoolAddress = deriveDammV2PoolAddress; exports.deriveDammV2PoolAuthority = deriveDammV2PoolAuthority; exports.deriveDammV2TokenVaultAddress = deriveDammV2TokenVaultAddress; exports.deriveDbcEventAuthority = deriveDbcEventAuthority; exports.deriveDbcPoolAddress = deriveDbcPoolAddress; exports.deriveDbcPoolAuthority = deriveDbcPoolAuthority; exports.deriveDbcPoolMetadata = deriveDbcPoolMetadata; exports.deriveDbcTokenVaultAddress = deriveDbcTokenVaultAddress; exports.deriveEscrow = deriveEscrow; exports.deriveLockerEventAuthority = deriveLockerEventAuthority; exports.deriveMintMetadata = deriveMintMetadata; exports.derivePartnerMetadata = derivePartnerMetadata; exports.derivePositionAddress = derivePositionAddress; exports.derivePositionNftAccount = derivePositionNftAccount; exports.deriveTokenBadgeAddress = deriveTokenBadgeAddress; exports.deriveTokenVaultKey = deriveTokenVaultKey; exports.deriveVaultAddress = deriveVaultAddress; exports.deriveVaultLpMintAddress = deriveVaultLpMintAddress; exports.deriveVaultPdas = deriveVaultPdas; exports.feeNumeratorToBps = feeNumeratorToBps; exports.findAssociatedTokenAddress = findAssociatedTokenAddress; exports.fromDecimalToBN = fromDecimalToBN; exports.getAccountCreationTimestamp = getAccountCreationTimestamp; exports.getAccountCreationTimestamps = getAccountCreationTimestamps; exports.getAccountData = getAccountData; exports.getBaseFeeHandler = getBaseFeeHandler; exports.getBaseFeeNumerator = getBaseFeeNumerator; exports.getBaseFeeNumeratorByPeriod = getBaseFeeNumeratorByPeriod; exports.getBaseFeeParams = getBaseFeeParams; exports.getBaseTokenForSwap = getBaseTokenForSwap; exports.getCheckedAmounts = getCheckedAmounts; exports.getCurrentPoint = getCurrentPoint; exports.getCurveBreakdown = getCurveBreakdown; exports.getDeltaAmountBaseUnsigned = getDeltaAmountBaseUnsigned; exports.getDeltaAmountBaseUnsigned256 = getDeltaAmountBaseUnsigned256; exports.getDeltaAmountBaseUnsignedUnchecked = getDeltaAmountBaseUnsignedUnchecked; exports.getDeltaAmountQuoteUnsigned = getDeltaAmountQuoteUnsigned; exports.getDeltaAmountQuoteUnsigned256 = getDeltaAmountQuoteUnsigned256; exports.getDeltaAmountQuoteUnsignedUnchecked = getDeltaAmountQuoteUnsignedUnchecked; exports.getDynamicFeeParams = getDynamicFeeParams; exports.getExcludedFeeAmount = getExcludedFeeAmount; exports.getFeeMode = getFeeMode; exports.getFeeNumeratorFromExcludedAmount = getFeeNumeratorFromExcludedAmount; exports.getFeeNumeratorFromIncludedAmount = getFeeNumeratorFromIncludedAmount; exports.getFeeNumeratorOnExponentialFeeScheduler = getFeeNumeratorOnExponentialFeeScheduler; exports.getFeeNumeratorOnLinearFeeScheduler = getFeeNumeratorOnLinearFeeScheduler; exports.getFeeOnAmount = getFeeOnAmount; exports.getFeeSchedulerMaxBaseFeeNumerator = getFeeSchedulerMaxBaseFeeNumerator; exports.getFeeSchedulerMinBaseFeeNumerator = getFeeSchedulerMinBaseFeeNumerator; exports.getFeeSchedulerParams = getFeeSchedulerParams; exports.getFirstCurve = getFirstCurve; exports.getFirstKey = getFirstKey; exports.getIncludedFeeAmount = getIncludedFeeAmount; exports.getInitialLiquidityFromDeltaBase = getInitialLiquidityFromDeltaBase; exports.getInitialLiquidityFromDeltaQuote = getInitialLiquidityFromDeltaQuote; exports.getLiquidity = getLiquidity; exports.getLiquidityVestingInfoParams = getLiquidityVestingInfoParams; exports.getLockedVestingParams = getLockedVestingParams; exports.getMaxIndex = getMaxIndex; exports.getMaxOutAmountWithMinBaseFee = getMaxOutAmountWithMinBaseFee; exports.getMigratedPoolFeeParams = getMigratedPoolFeeParams; exports.getMigratedPoolMarketCapFeeSchedulerParams = getMigratedPoolMarketCapFeeSchedulerParams; exports.getMigrationBaseToken = getMigrationBaseToken; exports.getMigrationQuoteAmount = getMigrationQuoteAmount; exports.getMigrationQuoteAmountFromMigrationQuoteThreshold = getMigrationQuoteAmountFromMigrationQuoteThreshold; exports.getMigrationQuoteThresholdFromMigrationQuoteAmount = getMigrationQuoteThresholdFromMigrationQuoteAmount; exports.getMigrationThresholdPrice = getMigrationThresholdPrice; exports.getNextSqrtPriceFromBaseAmountInRoundingUp = getNextSqrtPriceFromBaseAmountInRoundingUp; exports.getNextSqrtPriceFromBaseAmountOutRoundingUp = getNextSqrtPriceFromBaseAmountOutRoundingUp; exports.getNextSqrtPriceFromInput = getNextSqrtPriceFromInput; exports.getNextSqrtPriceFromOutput = getNextSqrtPriceFromOutput; exports.getNextSqrtPriceFromQuoteAmountInRoundingDown = getNextSqrtPriceFromQuoteAmountInRoundingDown; exports.getNextSqrtPriceFromQuoteAmountOutRoundingDown = getNextSqrtPriceFromQuoteAmountOutRoundingDown; exports.getOrCreateATAInstruction = getOrCreateATAInstruction; exports.getPercentageSupplyOnMigration = getPercentageSupplyOnMigration; exports.getPriceFromSqrtPrice = getPriceFromSqrtPrice; exports.getProtocolMigrationFee = getProtocolMigrationFee; exports.getQuoteReserveFromNextSqrtPrice = getQuoteReserveFromNextSqrtPrice; exports.getRateLimiterExcludedFeeAmount = getRateLimiterExcludedFeeAmount; exports.getRateLimiterMinBaseFeeNumerator = getRateLimiterMinBaseFeeNumerator; exports.getRateLimiterParams = getRateLimiterParams; exports.getSecondKey = getSecondKey; exports.getSqrtPriceFromMarketCap = getSqrtPriceFromMarketCap; exports.getSqrtPriceFromPrice = getSqrtPriceFromPrice; exports.getStartingBaseFeeBpsFromBaseFeeParams = getStartingBaseFeeBpsFromBaseFeeParams; exports.getSwapAmountWithBuffer = getSwapAmountWithBuffer; exports.getSwapResult = getSwapResult; exports.getSwapResultFromExactInput = getSwapResultFromExactInput; exports.getSwapResultFromExactOutput = getSwapResultFromExactOutput; exports.getSwapResultFromPartialInput = getSwapResultFromPartialInput; exports.getTokenBadgeRemainingAccounts = getTokenBadgeRemainingAccounts; exports.getTokenDecimals = getTokenDecimals; exports.getTokenProgram = getTokenProgram; exports.getTokenType = getTokenType; exports.getTokenomics = getTokenomics; exports.getTotalFeeNumerator = getTotalFeeNumerator; exports.getTotalFeeNumeratorFromExcludedFeeAmount = getTotalFeeNumeratorFromExcludedFeeAmount; exports.getTotalFeeNumeratorFromIncludedFeeAmount = getTotalFeeNumeratorFromIncludedFeeAmount; exports.getTotalSupplyFromCurve = getTotalSupplyFromCurve; exports.getTotalTokenSupply = getTotalTokenSupply; exports.getTotalVestingAmount = getTotalVestingAmount; exports.getTwoCurve = getTwoCurve; exports.getVariableFeeNumerator = getVariableFeeNumerator; exports.getVestingLockedLiquidityBpsAtNSeconds = getVestingLockedLiquidityBpsAtNSeconds; exports.hasMintAuthority = hasMintAuthority; exports.isDefaultLockedVesting = isDefaultLockedVesting; exports.isDynamicFeeEnabled = isDynamicFeeEnabled; exports.isNativeSol = isNativeSol; exports.isNonZeroRateLimiter = isNonZeroRateLimiter; exports.isRateLimiterApplied = isRateLimiterApplied; exports.isZeroRateLimiter = isZeroRateLimiter; exports.mulDiv = mulDiv; exports.mulShr = mulShr; exports.pow = pow; exports.prepareSwapAmountParam = prepareSwapAmountParam; exports.prepareTokenAccountTx = prepareTokenAccountTx; exports.splitFees = splitFees; exports.sqrt = sqrt; exports.swapQuote = swapQuote; exports.swapQuoteExactIn = swapQuoteExactIn; exports.swapQuoteExactOut = swapQuoteExactOut; exports.swapQuotePartialFill = swapQuotePartialFill; exports.toNumerator = toNumerator; exports.unwrapSOLInstruction = unwrapSOLInstruction; exports.validateActivationType = validateActivationType; exports.validateBalance = validateBalance; exports.validateBaseTokenType = validateBaseTokenType; exports.validateCollectFeeMode = validateCollectFeeMode; exports.validateCompoundingFeeBps = validateCompoundingFeeBps; exports.validateConfigParameters = validateConfigParameters; exports.validateCurve = validateCurve; exports.validateDynamicFee = validateDynamicFee; exports.validateFeeRateLimiter = validateFeeRateLimiter; exports.validateFeeScheduler = validateFeeScheduler; exports.validateLPPercentages = validateLPPercentages; exports.validateLiquidityVestingInfo = validateLiquidityVestingInfo; exports.validateMarketCapFeeSchedulerRequiresPoolFeeBps = validateMarketCapFeeSchedulerRequiresPoolFeeBps; exports.validateMigratedCollectFeeMode = validateMigratedCollectFeeMode; exports.validateMigratedPoolBaseFeeMode = validateMigratedPoolBaseFeeMode; exports.validateMigratedPoolFee = validateMigratedPoolFee; exports.validateMigrationAndTokenType = validateMigrationAndTokenType; exports.validateMigrationFee = validateMigrationFee; exports.validateMigrationFeeOption = validateMigrationFeeOption; exports.validateMinimumLockedLiquidity = validateMinimumLockedLiquidity; exports.validatePoolCreationFee = validatePoolCreationFee; exports.validatePoolFees = validatePoolFees; exports.validateQuoteMintBasic = validateQuoteMintBasic; exports.validateSwapAmount = validateSwapAmount; exports.validateTokenAuthorityOptions = validateTokenAuthorityOptions; exports.validateTokenDecimals = validateTokenDecimals; exports.validateTokenSupply = validateTokenSupply; exports.validateTransferHookProgram = validateTransferHookProgram; exports.validateTransferHookProgramExecutable = validateTransferHookProgramExecutable; exports.wrapSOLInstruction = wrapSOLInstruction;
//# sourceMappingURL=index.cjs.map