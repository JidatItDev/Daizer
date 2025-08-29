import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET as string;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in environment variables");
}

export const createAccessToken = (id: string, role: string): string => {
  return jwt.sign({ id, role }, JWT_SECRET, {
    expiresIn: "7d",
  });
};
export function createResetToken(email: string): string {
  return jwt.sign({ email }, JWT_SECRET, { expiresIn: "1h" });
}
export const createRefreshToken = (id: string): string => {
  return jwt.sign({ id }, JWT_SECRET, {
    expiresIn: "7d",
  });
};
export function verifyResetToken(token: string): { email: string } {
  const payload = jwt.verify(token, JWT_SECRET);
  if (
    typeof payload === "object" &&
    payload !== null &&
    "email" in payload &&
    typeof (payload as any).email === "string"
  ) {
    return { email: (payload as any).email };
  }
  throw new Error("Invalid token payload: email not found");
}
