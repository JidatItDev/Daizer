import bcrypt from "bcryptjs";

export const hashPassword = async (password: string): Promise<string> => {
  // Using Argon2 as primary, fallback to bcrypt
  try {
    const SALT_ROUNDS = 8;
    return bcrypt.hash(password, SALT_ROUNDS);
  } catch (error) {
    console.warn("failed to hash the password");
  }
};

export const verifyPassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  // Try argon2 first, then bcrypt
  try {
    return bcrypt.compare(password, hash);
  } catch (error) {
    return false;
  }
};
