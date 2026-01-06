import https from "https";

export const zohoHttpsAgent = new https.Agent({
  keepAlive: true,
  timeout: 120000, // ⏱ socket timeout (2 minutes)
  keepAliveMsecs: 30000, // keep connection alive
  maxSockets: 10,
});
