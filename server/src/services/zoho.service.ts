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
    // ✅ Use full access scope for Zoho Books
    const scope = "ZohoBooks.fullaccess.all";

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
  private async getValidAccessToken(): Promise<string> {
    const tokens = await this.tokensService.getTokens();
    const now = Date.now();

    // ✅ If token still valid, return it
    if (tokens.expiresAt && tokens.expiresAt > new Date()) {
      return tokens.accessToken!;
    }

    // 🔄 Otherwise, refresh token
    const res = await axios.post(`${ZOHO_ENV.ZOHO_BASE_URL}/token`, null, {
      params: {
        refresh_token: tokens.refreshToken!,
        client_id: ZOHO_ENV.ZOHO_CLIENT_ID,
        client_secret: ZOHO_ENV.ZOHO_CLIENT_SECRET,
        grant_type: "refresh_token",
      },
    });

    const newAccessToken = res.data.access_token;
    const newExpiresIn = now + res.data.expires_in * 1000;

    await this.tokensService.saveTokens({
      ...tokens,
      accessToken: newAccessToken,
      expiresIn: newExpiresIn,
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
  async createContactInZohoBooks(user: { name: string; email: string }) {
    const accessToken = await this.getValidAccessToken();

    const payload = {
      contact_name: user.name,
      contact_type: "customer",
      customer_sub_type: "business",
      company_name: user.name,
      contact_persons: [
        {
          first_name: user.name,
          email: user.email,
        },
      ],
    };

    const url = `${ZOHO_ENV.BOOKS_API}/contacts?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`;

    try {
      const { data } = await axios.post(url, payload, {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      console.log("✅ Zoho contact created:", data.contact.contact_id);
      return data.contact;
    } catch (error: any) {
      console.error(
        "❌ Failed to create Zoho contact:",
        error.response?.data || error.message
      );
      throw new Error("Failed to create contact in Zoho Books");
    }
  }
}
