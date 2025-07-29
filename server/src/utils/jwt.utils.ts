import jwt from "jsonwebtoken";

export const createAccessToken = (id: string, role: string) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_ACCESS_EXPIRATION_MINUTES,
  });

export const createRefreshToken = (id: string) =>
  jwt.sign({ id }, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_REFRESH_EXPIRATION_DAYS,
  });
