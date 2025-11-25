import axios from "axios";
import { ZOHO_ENV } from "../../config/Zoho";
import { ZohoService } from "../zoho.service";
import { ZohoTokensService } from "../zohoTokens.service";

export class ZohoAccountIdsFetchingService {
  private tokensService: ZohoTokensService;
  private zohoService: ZohoService;

  constructor() {
    this.tokensService = new ZohoTokensService();
    this.zohoService = new ZohoService();
  }
  async getWalletAccountId(): Promise<string> {
    const accessToken = await this.zohoService.getValidAccessToken();
    const url = `${ZOHO_ENV.BOOKS_API}/chartofaccounts?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`;
    const { data } = await axios.get(url, {
      headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
    });

    const account = data.chartofaccounts.find(
      (acc: any) => acc.account_name.toLowerCase() === "customer wallet balance"
    );

    if (!account) throw new Error("Parent Wallet account not found");
    return account.account_id;
  }
  async getWalletClearingAccountId(): Promise<string> {
    const accessToken = await this.zohoService.getValidAccessToken();
    const { data } = await axios.get(
      `${ZOHO_ENV.BOOKS_API}/chartofaccounts?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
      { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } }
    );

    const account = data.chartofaccounts.find(
      (acc: any) =>
        acc.account_name.trim().toLowerCase() === "wallet clearing" ||
        acc.account_code === "Clearing18030"
    );

    if (!account) {
      console.error(
        "Available accounts:",
        data.chartofaccounts.map((a: any) => ({
          name: a.account_name,
          code: a.account_code,
          id: a.account_id,
        }))
      );
      throw new Error(
        "Wallet Clearing account not found! Check name or code 'Clearing18030'"
      );
    }

    console.log(
      "Wallet Clearing Account Found:",
      account.account_name,
      account.account_id
    );
    return account.account_id;
  }
  // In your ZohoService or config
  async getWalletIncomeAccountId(): Promise<string> {
    const accessToken = await this.zohoService.getValidAccessToken();
    const { data } = await axios.get(
      `${ZOHO_ENV.BOOKS_API}/chartofaccounts?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
      { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } }
    );

    const account = data.chartofaccounts.find(
      (acc: any) =>
        acc.account_name.toLowerCase().includes("wallet income") ||
        acc.account_name === "Wallet Income"
    );

    if (!account) throw new Error("Wallet Income account not found!");
    return account.account_id;
  }
  // Return the ID of the account
  async getBankAccountId(): Promise<string> {
    const accessToken = await this.zohoService.getValidAccessToken();
    const url = `${ZOHO_ENV.BOOKS_API}/chartofaccounts?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`;
    const { data } = await axios.get(url, {
      headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
    });

    const account = data.chartofaccounts.find(
      (acc: any) => acc.account_name.toLowerCase() === "test bank"
    );

    if (!account) throw new Error("Parent Wallet account not found");
    return account.account_id;
  }
  async getWalletExpenseAccountId(): Promise<string> {
    const accessToken = await this.zohoService.getValidAccessToken();

    const { data } = await axios.get(
      `${ZOHO_ENV.BOOKS_API}/chartofaccounts?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
      {
        headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
      }
    );

    if (!data?.chartofaccounts?.length) {
      throw new Error("No chart of accounts returned from Zoho Books");
    }

    // Search by exact name (case-insensitive + trim)
    let account = data.chartofaccounts.find(
      (acc: any) =>
        acc.account_name.trim().toLowerCase() === "wallet adjustment expenses"
    );

    // Fallback: partial match (in case of typos or future changes)
    if (!account) {
      account = data.chartofaccounts.find((acc: any) =>
        acc.account_name.toLowerCase().includes("wallet adjustment")
      );
    }

    // Final fallback: by account code (most reliable if you keep code consistent)
    if (!account) {
      account = data.chartofaccounts.find(
        (acc: any) => acc.account_code === "expense10@"
      );
    }

    if (!account) {
      console.error(
        "Available accounts:",
        data.chartofaccounts.map((a: any) => ({
          name: a.account_name,
          code: a.account_code,
          id: a.account_id,
        }))
      );
      throw new Error(
        "Wallet Adjustment Expenses account not found! " +
          "Please check the account name/code: 'Wallet Adjustment Expenses' or 'expense10@'"
      );
    }

    console.log("Found Wallet Expense Account:", {
      name: account.account_name,
      code: account.account_code,
      id: account.account_id,
    });

    return account.account_id;
  }
  async getWalletIncomesAccountId(): Promise<string> {
    const accessToken = await this.zohoService.getValidAccessToken();

    const { data } = await axios.get(
      `${ZOHO_ENV.BOOKS_API}/chartofaccounts?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
      {
        headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
      }
    );

    if (!data?.chartofaccounts?.length) {
      throw new Error("No chart of accounts returned from Zoho Books");
    }

    // Search by exact name (case-insensitive + trim)
    let account = data.chartofaccounts.find(
      (acc: any) =>
        acc.account_name.trim().toLowerCase() === "wallet adjustment incomes"
    );

    if (!account) {
      console.error(
        "Available accounts:",
        data.chartofaccounts.map((a: any) => ({
          name: a.account_name,
          code: a.account_code,
          id: a.account_id,
        }))
      );
      throw new Error(
        "Wallet Adjustment Expenses account not found! " +
          "Please check the account name/code: 'Wallet Adjustment Expenses' or 'expense10@'"
      );
    }

    console.log("Found Wallet Expense Account:", {
      name: account.account_name,
      code: account.account_code,
      id: account.account_id,
    });

    return account.account_id;
  }
}
