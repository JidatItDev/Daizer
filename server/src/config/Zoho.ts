import dotenv from "dotenv";
dotenv.config();

export const ZOHO_ENV = {
  ZOHO_CLIENT_ID: process.env.ZOHO_CLIENT_ID!,
  ZOHO_CLIENT_SECRET: process.env.ZOHO_CLIENT_SECRET!,
  ZOHO_REDIRECT_URI: process.env.ZOHO_REDIRECT_URI!,
  ZOHO_ORG_ID: process.env.ZOHO_ORG_ID!,
  PORT: process.env.PORT || 5000,
  BOOKS_API: process.env.BOOKS_API!,
  ZOHO_BASE_URL: process.env.ZOHO_BASE_URL!,
};
