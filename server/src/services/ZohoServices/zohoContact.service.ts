import axios from "axios";
import { ZOHO_ENV } from "../../config/Zoho";
import { ZohoService } from "../zoho.service";
import { ZohoTokensService } from "../zohoTokens.service";
import { ZohoItemService } from "./zohoItems.service";

export class ZohoContactService {
  private tokensService: ZohoTokensService;
  private zohoService: ZohoService;
  private ZohoItemService: ZohoItemService;
  constructor() {
    this.tokensService = new ZohoTokensService();
    this.zohoService = new ZohoService();
    this.ZohoItemService = new ZohoItemService();
  }
  async createContactInZohoBooks(user: {
    name: string;
    email: string;
    pricingGroupName?: string;
  }) {
    const accessToken = await this.zohoService.getValidAccessToken();

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
      custom_fields: [
        {
          label: "Wallet Balance",
          value: 0,
        },
        ...(user.pricingGroupName
          ? [
              {
                label: "Pricing Group",
                value: user.pricingGroupName,
              },
            ]
          : []),
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

  async updateContactInZohoBooks(
    contactId: string,
    updates: {
      name?: string;
      email?: string;
      pricingGroupName?: string;
      pricingGroupId?: string;
    }
  ) {
    const accessToken = await this.zohoService.getValidAccessToken();

    const customFields = [];
    if (updates.pricingGroupName !== undefined) {
      customFields.push({
        label: "Pricing Group",
        value: updates.pricingGroupName,
      });
    }
    if (updates.pricingGroupId !== undefined) {
      customFields.push({
        label: "Pricing GroupId",
        value: updates.pricingGroupId,
      });
    }
    // if (updates.walletBalance !== undefined) {
    //   customFields.push({
    //     label: "Wallet Balance",
    //     value: updates.walletBalance,
    //   });
    // }

    const payload = {
      ...(updates.name && { contact_name: updates.name }),
      ...(updates.name && { company_name: updates.name }),
      ...(updates.email && {
        contact_persons: [
          {
            first_name: updates.name,
            email: updates.email,
          },
        ],
      }),
      ...(customFields.length > 0 && { custom_fields: customFields }),
    };

    const url = `${ZOHO_ENV.BOOKS_API}/contacts/${contactId}?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`;

    try {
      const { data } = await axios.put(url, payload, {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      console.log("✅ Zoho contact updated:", contactId);
      return data.contact;
    } catch (error: any) {
      console.error(
        "❌ Failed to update Zoho contact:",
        error.response?.data || error.message
      );
      throw new Error("Failed to update contact in Zoho Books");
    }
  }
  async getCustomerPriceList(customerId: string) {
    const accessToken = await this.zohoService.getValidAccessToken();

    try {
      const { data } = await axios.get(
        `${ZOHO_ENV.BOOKS_API}/contacts/${customerId}?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
        {
          headers: {
            Authorization: `Zoho-oauthtoken ${accessToken}`,
          },
        }
      );

      const customer = data.contact;
      const priceListId = customer.pricebook_id;

      console.log(
        `Customer ${customerId} assigned to price list: ${priceListId}`
      );
      return priceListId;
    } catch (error: any) {
      console.error(
        "❌ Failed to fetch customer:",
        error.response?.data || error.message
      );
      throw new Error("Failed to fetch customer details");
    }
  }

  // ==========================================
  // 6. ASSIGN PRICE LIST TO CUSTOMER
  // ==========================================
  async assignPriceListToCustomer(customerId: string, priceListId: string) {
    const accessToken = await this.zohoService.getValidAccessToken();

    try {
      const payload = {
        pricebook_id: priceListId,
      };

      await axios.put(
        `${ZOHO_ENV.BOOKS_API}/contacts/${customerId}?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
        payload,
        {
          headers: {
            Authorization: `Zoho-oauthtoken ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log(
        `✅ Price list ${priceListId} assigned to customer ${customerId}`
      );
    } catch (error: any) {
      console.error(
        "❌ Failed to assign price list:",
        error.response?.data || error.message
      );
      throw new Error("Failed to assign price list to customer");
    }
  }

  // ==========================================
  // 7. CALCULATE PRICE FOR CUSTOMER (KEY FUNCTION)
  // ==========================================
  async calculatePriceForCustomer(customerId: string, itemId: string) {
    const accessToken = await this.zohoService.getValidAccessToken();

    // Get customer's assigned price list
    const priceListId = await this.getCustomerPriceList(customerId);

    if (!priceListId) {
      // No price list assigned, use default item rate
      const item = await this.ZohoItemService.getItemWithPriceLists(itemId);
      return {
        itemId: item.item_id,
        itemName: item.name,
        defaultRate: item.rate,
        priceListRate: null,
        finalPrice: item.rate,
        priceListApplied: false,
      };
    }

    // Get item details
    const item = await this.ZohoItemService.getItemWithPriceLists(itemId);

    // Find the rate for this customer's price list
    const priceBookItem = item.pricebook_items?.find(
      (pb: any) => pb.pricebook_id === priceListId
    );

    if (priceBookItem) {
      return {
        itemId: item.item_id,
        itemName: item.name,
        defaultRate: item.rate,
        priceListRate: priceBookItem.pricebook_rate,
        finalPrice: priceBookItem.pricebook_rate,
        priceListApplied: true,
        priceListId: priceListId,
      };
    } else {
      // Item not in customer's price list, use default rate
      return {
        itemId: item.item_id,
        itemName: item.name,
        defaultRate: item.rate,
        priceListRate: null,
        finalPrice: item.rate,
        priceListApplied: false,
      };
    }
  }
  async deleteCustomerInZoho(customerId: string): Promise<{
    success: boolean;
    action: "deleted" | "deactivated";
    message: string;
  }> {
    const accessToken = await this.zohoService.getValidAccessToken();

    try {
      console.log(
        `🔄 Attempting to delete customer ${customerId} from Zoho...`
      );

      // Try to delete the customer
      const url = `${ZOHO_ENV.BOOKS_API}/contacts/${customerId}?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`;

      await axios.delete(url, {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
        },
      });

      console.log(`✅ Customer ${customerId} deleted successfully`);
      return {
        success: true,
        action: "deleted",
        message: "Customer deleted successfully from Zoho Books",
      };
    } catch (error: any) {
      // Check if error is due to existing transactions
      if (
        error.response?.data?.code === 1009 || // Customer has transactions
        error.response?.data?.message?.includes("transactions") ||
        error.response?.data?.message?.includes("invoices") ||
        error.response?.data?.message?.includes("credit notes")
      ) {
        console.warn(
          `⚠️ Customer ${customerId} has transactions, marking as inactive instead...`
        );

        // Mark as inactive instead
        return await this.markCustomerAsInactive(customerId);
      }

      // Log the full error for debugging
      console.error(
        "❌ Failed to delete customer:",
        error.response?.data || error.message
      );

      if (error.response?.data) {
        console.error(
          "Full error:",
          JSON.stringify(error.response.data, null, 2)
        );
      }

      throw new Error(
        `Failed to delete customer: ${error.response?.data?.message || error.message}`
      );
    }
  }

  /**
   * Mark customer as inactive in Zoho Books
   */
  async markCustomerAsInactive(customerId: string): Promise<{
    success: boolean;
    action: "deactivated";
    message: string;
  }> {
    const accessToken = await this.zohoService.getValidAccessToken();

    try {
      console.log(`🔄 Marking customer ${customerId} as inactive in Zoho...`);

      const url = `${ZOHO_ENV.BOOKS_API}/contacts/${customerId}/inactive?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`;

      await axios.post(
        url,
        {},
        {
          headers: {
            Authorization: `Zoho-oauthtoken ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log(`✅ Customer ${customerId} marked as inactive`);
      return {
        success: true,
        action: "deactivated",
        message:
          "Customer has existing transactions and has been marked as inactive in Zoho Books",
      };
    } catch (error: any) {
      console.error(
        "❌ Failed to mark customer as inactive:",
        error.response?.data || error.message
      );

      if (error.response?.data) {
        console.error(
          "Full error:",
          JSON.stringify(error.response.data, null, 2)
        );
      }

      throw new Error(
        `Failed to mark customer as inactive: ${error.response?.data?.message || error.message}`
      );
    }
  }

  /**
   * Check if customer has any transactions
   */
  async checkCustomerTransactions(customerId: string): Promise<{
    hasTransactions: boolean;
    transactions: {
      invoices: number;
      creditNotes: number;
      salesOrders: number;
      estimates: number;
    };
  }> {
    const accessToken = await this.zohoService.getValidAccessToken();

    try {
      console.log(`🔍 Checking transactions for customer ${customerId}...`);

      // Get customer details which includes transaction info
      const url = `${ZOHO_ENV.BOOKS_API}/contacts/${customerId}?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`;

      const { data } = await axios.get(url, {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
        },
      });

      const contact = data.contact;

      const transactions = {
        invoices: contact.invoices_count || 0,
        creditNotes: contact.creditnotes_count || 0,
        salesOrders: contact.salesorders_count || 0,
        estimates: contact.estimates_count || 0,
      };

      const hasTransactions =
        transactions.invoices > 0 ||
        transactions.creditNotes > 0 ||
        transactions.salesOrders > 0 ||
        transactions.estimates > 0;

      console.log(
        `📊 Customer transactions:`,
        JSON.stringify(transactions, null, 2)
      );

      return { hasTransactions, transactions };
    } catch (error: any) {
      console.error(
        "❌ Failed to check customer transactions:",
        error.response?.data || error.message
      );
      throw new Error("Failed to check customer transactions");
    }
  }

  /**
   * Smart delete: Check first, then delete or deactivate
   */
  async smartDeleteCustomer(customerId: string): Promise<{
    success: boolean;
    action: "deleted" | "deactivated";
    message: string;
    transactions?: {
      invoices: number;
      creditNotes: number;
      salesOrders: number;
      estimates: number;
    };
  }> {
    try {
      // First, check if customer has transactions
      const { hasTransactions, transactions } =
        await this.checkCustomerTransactions(customerId);

      if (hasTransactions) {
        console.log(
          `⚠️ Customer has ${transactions.invoices} invoices, ${transactions.creditNotes} credit notes, ${transactions.salesOrders} sales orders, ${transactions.estimates} estimates`
        );
        console.log("→ Marking as inactive instead of deleting");

        const result = await this.markCustomerAsInactive(customerId);
        return {
          ...result,
          transactions,
        };
      }

      // No transactions, safe to delete
      console.log("✅ Customer has no transactions, safe to delete");
      return await this.deleteCustomerInZoho(customerId);
    } catch (error: any) {
      throw error;
    }
  }
}
