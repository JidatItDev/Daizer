// import checkoutNodeJssdk from "@paypal/checkout-server-sdk";

// function environment() {
//   const clientId = process.env.PAYPAL_CLIENT_ID!;
//   const clientSecret = process.env.PAYPAL_CLIENT_SECRET!;
//   if (process.env.NODE_ENV === "production") {
//     return new checkoutNodeJssdk.core.LiveEnvironment(clientId, clientSecret);
//   } else {
//     return new checkoutNodeJssdk.core.SandboxEnvironment(
//       clientId,
//       clientSecret
//     );
//   }
// }

// export function paypalClient() {
//   return new checkoutNodeJssdk.core.PayPalHttpClient(environment());
// }

// export { checkoutNodeJssdk };
import checkoutNodeJssdk from "@paypal/checkout-server-sdk";
import redisClient from "../config/redis";
import { db } from "../db/dbConnection";
import { config } from "../db/schema/config.schema";

const CONFIG_CACHE_KEY = "config:system";

async function getPaypalConfig() {
  const cached = await redisClient.get(CONFIG_CACHE_KEY);
  if (cached) {
    console.log("Using cached config");
    console.log(JSON.parse(cached)?.config);
    return JSON.parse(cached)?.config;
  }

  const [systemConfig] = await db.select().from(config).limit(1);
  return systemConfig;
}

export async function paypalClient() {
  const systemConfig = await getPaypalConfig();

  const clientId =
    systemConfig?.paypalClientId || process.env.PAYPAL_CLIENT_ID!;
  const clientSecret =
    systemConfig?.paypalClientSecret || process.env.PAYPAL_CLIENT_SECRET!;

  const mode = systemConfig?.paypalMode || "sandbox";
  console.log("clientId", clientId);
  console.log("clientSecret", clientSecret);
  console.log("mode", mode);

  const env =
    mode === "live"
      ? new checkoutNodeJssdk.core.LiveEnvironment(clientId, clientSecret)
      : new checkoutNodeJssdk.core.SandboxEnvironment(clientId, clientSecret);

  return new checkoutNodeJssdk.core.PayPalHttpClient(env);
}

export { checkoutNodeJssdk };
