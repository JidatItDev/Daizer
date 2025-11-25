import axios from "axios";
import { ZOHO_ENV } from "../config/Zoho";
import { ZohoTokensService } from "./zohoTokens.service";

export class ZohoService {
  private tokensService: ZohoTokensService;

  constructor() {
    this.tokensService = new ZohoTokensService();
  }

  /**
   * Generate Zoho OAuth authorization URL
   */
  generateAuthUrl(): string {
    // ✅ Add both Zoho Books AND Zoho Inventory scopes
    const scope = "ZohoBooks.fullaccess.all,ZohoInventory.fullaccess.all";

    // ✅ Build the full authorization URL
    return `${ZOHO_ENV.ZOHO_BASE_URL}/auth?scope=${scope}&client_id=${ZOHO_ENV.ZOHO_CLIENT_ID}&response_type=code&access_type=offline&prompt=consent&redirect_uri=${ZOHO_ENV.ZOHO_REDIRECT_URI}`;
  }

  /**
   * Exchange authorization code for access/refresh tokens and save to DB
   */
  async exchangeCodeForToken(code: string) {
    const url = `${ZOHO_ENV.ZOHO_BASE_URL}/token`;

    const params = new URLSearchParams({
      code,
      client_id: ZOHO_ENV.ZOHO_CLIENT_ID,
      client_secret: ZOHO_ENV.ZOHO_CLIENT_SECRET,
      redirect_uri: ZOHO_ENV.ZOHO_REDIRECT_URI,
      grant_type: "authorization_code",
    });

    const { data } = await axios.post(url, params);
    console.log("Zoho token response:", data); // 👈 Add this
    const expiresAt = new Date(Date.now() + data.expires_in * 1000);

    await this.tokensService.saveTokens({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt, // ✅ Use correct key and Date object
    });

    console.log("✅ Tokens exchanged and stored in DB");
    return data;
  }

  /**
   * Refresh access token if expired
   */
  async getValidAccessToken(): Promise<string> {
    const tokens = await this.tokensService.getTokens();
    const now = Date.now();

    // Convert expiresAt to a number (timestamp in ms)
    const expiresAtTime =
      tokens.expiresAt instanceof Date
        ? tokens.expiresAt.getTime()
        : tokens.expiresAt;
    console.log(
      "Token expires at:",
      new Date(expiresAtTime),
      "Current time:",
      new Date(now)
    );
    // Return existing token if valid for at least 2 minutes
    if (expiresAtTime - now > 2 * 60 * 1000) {
      console.log("✅ Access token is still valid");
      return tokens.accessToken!;
    }

    // Refresh token
    const res = await axios.post(`${ZOHO_ENV.ZOHO_BASE_URL}/token`, null, {
      params: {
        refresh_token: tokens.refreshToken!,
        client_id: ZOHO_ENV.ZOHO_CLIENT_ID,
        client_secret: ZOHO_ENV.ZOHO_CLIENT_SECRET,
        grant_type: "refresh_token",
      },
    });

    const newAccessToken = res.data.access_token;
    const newExpiresAt = Date.now() + res.data.expires_in * 1000;

    await this.tokensService.saveTokens({
      ...tokens,
      accessToken: newAccessToken,
      expiresAt: new Date(newExpiresAt), // store as Date for timestamp column
    });

    console.log("✅ Access token refreshed successfully!");
    return newAccessToken;
  }

  /**
   * Fetch all customers from Zoho Books
   */
  async getCustomers() {
    const accessToken = await this.getValidAccessToken();

    const { data } = await axios.get(
      `${ZOHO_ENV.BOOKS_API}/contacts?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
      {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
        },
      }
    );

    return data;
  }
  // async createContactInZohoBooks(user: { name: string; email: string }) {
  //   const accessToken = await this.getValidAccessToken();

  //   const payload = {
  //     contact_name: user.name,
  //     contact_type: "customer",
  //     customer_sub_type: "business",
  //     company_name: user.name,
  //     contact_persons: [
  //       {
  //         first_name: user.name,
  //         email: user.email,
  //       },
  //     ],
  //     custom_fields: [
  //       {
  //         label: "Wallet Balance", // Must match the custom field created in Zoho
  //         value: 0, // Initial wallet balance is 0
  //       },
  //     ],
  //   };

  //   const url = `${ZOHO_ENV.BOOKS_API}/contacts?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`;

  //   try {
  //     const { data } = await axios.post(url, payload, {
  //       headers: {
  //         Authorization: `Zoho-oauthtoken ${accessToken}`,
  //         "Content-Type": "application/json",
  //       },
  //     });

  //     console.log("✅ Zoho contact created:", data.contact.contact_id);
  //     return data.contact;
  //   } catch (error: any) {
  //     console.error(
  //       "❌ Failed to create Zoho contact:",
  //       error.response?.data || error.message
  //     );
  //     throw new Error("Failed to create contact in Zoho Books");
  //   }
  // }
  // Utility: update wallet balance custom field in Zoho Books

  // async getWalletIncomeAccountId(): Promise<string> {
  //   const accessToken = await this.getValidAccessToken();
  //   const url = `${ZOHO_ENV.BOOKS_API}/chartofaccounts?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`;
  //   const { data } = await axios.get(url, {
  //     headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
  //   });

  //   const account = data.chartofaccounts.find(
  //     (acc: any) =>
  //       acc.account_name.toLowerCase() === "wallet adjustment income"
  //   );

  //   if (!account) throw new Error("Parent Wallet account not found");
  //   return account.account_id;
  // }

  // ✅ Fixed: Sub-account inherits parent's account_type
  async createSubAccount(
    parentAccountId: string,
    accountName: string
  ): Promise<any> {
    const accessToken = await this.getValidAccessToken();
    const url = `${ZOHO_ENV.BOOKS_API}/chartofaccounts?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`;

    // Get parent account details
    const { data: parentData } = await axios.get(url, {
      headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
    });

    const parentAccount = parentData.chartofaccounts.find(
      (acc: any) => acc.account_id === parentAccountId
    );

    if (!parentAccount) throw new Error("Parent account not found");

    const subAccountType = parentAccount.account_type;

    const payload = {
      account_name: accountName,
      account_type: subAccountType,
      parent_account_id: parentAccountId,
      description: `Wallet sub-account for ${accountName}`,
    };

    try {
      const { data } = await axios.post(url, payload, {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      // ✅ Response structure: data.chart_of_account (with underscore!)
      if (!data.chart_of_account || !data.chart_of_account.account_id) {
        throw new Error("Invalid response structure from Zoho");
      }

      return data.chart_of_account;
    } catch (err: any) {
      throw new Error(
        `Failed to create Zoho sub-account: ${
          err.response?.data?.message || err.message
        }`
      );
    }
  }

  async getCurrencies() {
    const accessToken = await this.getValidAccessToken();

    const resp = await axios.get(
      `${ZOHO_ENV.BOOKS_API}/settings/currencies?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
      {
        headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
      }
    );

    return resp.data.currencies;
  }
}
