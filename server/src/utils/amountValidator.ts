export class AmountValidationError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "AmountValidationError";
    this.statusCode = statusCode;
  }
}

/**
 * Validates and normalizes monetary amounts
 *
 * @param amount - string | number from request body
 * @returns number - safe numeric amount (2 decimals max)
 * @throws AmountValidationError
 */
export function validateAmount(amount: unknown): number {
  if (amount === undefined || amount === null) {
    throw new AmountValidationError("Amount is required");
  }

  const amountStr = String(amount).trim();

  // Only digits + optional decimal (max 2 places)
  const amountRegex = /^\d+(\.\d{1,2})?$/;

  if (!amountRegex.test(amountStr)) {
    throw new AmountValidationError(
      "Invalid amount format. Use numbers only with up to 2 decimal places."
    );
  }

  const numericAmount = Number(amountStr);

  if (Number.isNaN(numericAmount)) {
    throw new AmountValidationError("Amount must be a valid number");
  }

  if (numericAmount <= 0) {
    throw new AmountValidationError("Amount must be greater than zero");
  }

  // Normalize to 2 decimals (safe for DB)
  return Number(numericAmount.toFixed(2));
}
