import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in environment variables");
}

export const createAccessToken = (id: string, role: string): string => {
  return jwt.sign({ id, role }, JWT_SECRET, {
    expiresIn: "15m",
  });
};

export const createRefreshToken = (id: string): string => {
  return jwt.sign({ id }, JWT_SECRET, {
    expiresIn: "7d",
  });
};
