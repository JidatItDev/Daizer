import bcrypt from "bcryptjs";

export const hashPassword = async (password: string): Promise<string> => {
  const SALT_ROUNDS = 8;
  return bcrypt.hash(password, SALT_ROUNDS);
};

export const verifyPassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};
