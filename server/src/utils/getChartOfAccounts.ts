import axios from "axios";
import { ZOHO_ENV } from "../config/Zoho";
import { ZohoService } from "../services/zoho.service";

export const getActiveChartOfAccounts = async () => {
  try {
    const zohoService = new ZohoService();
    const accessToken = await zohoService.getValidAccessToken();

    const response = await axios.get(
      `${ZOHO_ENV.BOOKS_API}/chartofaccounts?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}&filter_by=AccountType.Active`,
      {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
        },
      }
    );

    // Filter only active accounts and format for frontend
    const accounts = response.data.chartofaccounts
      .filter((account: any) => account.account_type && account.is_active)
      .map((account: any) => ({
        id: account.account_id,
        name: account.account_name,
        type: account.account_type,
        accountCode: account.account_code || "",
        balance: account.balance || 0,
      }));

    return {
      success: true,
      accounts,
    };
  } catch (error) {
    console.error("Error fetching chart of accounts:", error);
    throw new Error("Failed to fetch accounts");
  }
};
