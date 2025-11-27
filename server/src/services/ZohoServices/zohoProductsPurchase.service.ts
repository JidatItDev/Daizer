import axios from "axios";
import { ZohoService } from "../zoho.service";
import { ZohoAccountIdsFetchingService } from "./zohoAccountIdsFetching.service";
import { ZohoWalletService } from "./zohoWallet.service";
import { ZOHO_ENV } from "../../config/Zoho";

interface ProductPurchaseParams {
  userId: string;
  userName: string;
  userEmail: string;
  zohoContactId: string;
  pricingGroupId: string;
  productId: string;
  productName: string;
  productZohoItemId: string;
  playerId: string;
  purchaseAmount: number;
  priceListName: string;
  priceBookId?: string | null;
  finalPrice: number;
  quantity: string;
}

interface ZohoPurchaseResult {
  salesOrderId: string;
  salesOrderNumber: string;
  invoiceId: string;
  invoiceNumber: string;
  priceListName: string;
  finalPrice: number;
  creditNotesApplied: Array<{
    creditNoteNumber: string;
    amountApplied: number;
  }>;
}

export class ZohoProductPurchaseService {
  private zohoService: ZohoService;
  private zohoAccountService: ZohoAccountIdsFetchingService;
  private zohoWalletService: ZohoWalletService;

  constructor() {
    this.zohoService = new ZohoService();
    this.zohoAccountService = new ZohoAccountIdsFetchingService();
    this.zohoWalletService = new ZohoWalletService();
  }

  /**
   * Complete Zoho Books workflow for product purchase
   * 1. Get customer's pricing group and fetch corresponding price
   * 2. Create sales ORDER (for reporting)
   * 3. Convert sales order to invoice
   * 4. Apply credit notes to pay invoice
   * 5. Update wallet balance custom field
   */
  async processPurchase(
    params: ProductPurchaseParams
  ): Promise<ZohoPurchaseResult> {
    const accessToken = await this.zohoService.getValidAccessToken();

    const { priceListName, priceBookId, finalPrice, zohoContactId, quantity } =
      params;

    console.log(
      `💰 Customer Pricing Group: ${priceListName} | Price: ${finalPrice}`
    );

    // Step 1: Create Sales Order (this will show in Sales Order Summary)
    const salesOrder = await this.createSalesOrder(
      accessToken,
      params,
      finalPrice,
      priceListName,
      priceBookId || "",
      quantity
    );

    console.log(`✅ Sales Order created: ${salesOrder.salesorder_number}`);

    // Step 1.5: Confirm the Sales Order (move from DRAFT to CONFIRMED status)
    await this.confirmSalesOrder(accessToken, salesOrder.salesorder_id);
    console.log(`✅ Sales Order confirmed: ${salesOrder.salesorder_number}`);

    // Step 2: Convert Sales Order to Invoice
    const invoice = await this.convertSalesOrderToInvoice(
      accessToken,
      salesOrder.salesorder_id
    );

    console.log(`✅ Sales Invoice created: ${invoice.invoice_number}`);

    // Step 3: Pay invoice with customer's credit notes
    const creditNotesApplied = await this.applyCreditNotesToInvoice(
      accessToken,
      params.zohoContactId,
      invoice.invoice_id,
      finalPrice
    );

    const zohoAccountIdsFetchingService = new ZohoAccountIdsFetchingService();
    const zohoWalletService = new ZohoWalletService();
    const walletLiabilityId =
      await zohoAccountIdsFetchingService.getWalletAccountId();
    const walletClearingId =
      await zohoAccountIdsFetchingService.getWalletClearingAccountId();
    const walletIncomeAccountID =
      await zohoAccountIdsFetchingService.getWalletIncomeAccountId();
    const incomeAccountId =
      await zohoAccountIdsFetchingService.getWalletIncomesAccountId();
    const today = new Date().toISOString().split("T")[0];

    // This journal reduces the wallet liability (customer spent their prepaid balance)
    const journalPayload = {
      journal_date: today,
      reference_number: `LIAB-ADJ-${Date.now()}`,
      notes: `Wallet liability adjustment after product purchase | Invoice: ${invoice.invoice_number} | SO: ${salesOrder.salesorder_number}`,
      line_items: [
        {
          account_id: walletLiabilityId, // Debit: Reduce liability
          debit_or_credit: "debit",
          amount: finalPrice,
          customer_id: zohoContactId,
          description: "Reduce wallet liability after purchase",
        },
        {
          account_id: walletIncomeAccountID, // Credit: Offset with clearing
          debit_or_credit: "credit",
          amount: finalPrice,
          customer_id: zohoContactId,
          description: "Clear wallet spend",
        },
      ],
    };

    await axios.post(
      `${ZOHO_ENV.BOOKS_API}/journals?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
      journalPayload,
      {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
        },
      }
    );

    // Step 4: Update customer's wallet balance custom field
    await this.zohoWalletService.updateZohoWalletBalance(
      params.zohoContactId,
      finalPrice,
      false // decrease
    );

    console.log("✅ Zoho Books purchase processing completed");

    return {
      salesOrderId: salesOrder.salesorder_id,
      salesOrderNumber: salesOrder.salesorder_number,
      invoiceId: invoice.invoice_id,
      invoiceNumber: invoice.invoice_number,
      priceListName,
      finalPrice,
      creditNotesApplied,
    };
  }

  /**
   * Create sales ORDER in Zoho Books (this appears in Sales Order Summary reports)
   */
  private async createSalesOrder(
    accessToken: string,
    params: ProductPurchaseParams,
    finalPrice: number,
    priceListName: string,
    priceBookId: string | null,
    quantity: string
  ) {
    const today = new Date().toISOString().split("T")[0];

    const salesOrderPayload: any = {
      customer_id: params.zohoContactId,
      date: today,
      reference_number: `SALE-${Date.now()}`,
      notes: `Product Purchase | Pricing Group: ${priceListName}`,
      line_items: [
        {
          item_id: params.productZohoItemId,
          rate: finalPrice,
          quantity: 1,
          description: `Player ID: ${params.playerId} | Pricing Group: ${priceListName}-qty:${quantity}`,
        },
      ],
    };

    // If customer has a price book, include it
    if (priceBookId && priceBookId.trim() !== "") {
      salesOrderPayload.pricebook_id = priceBookId;
    }

    console.log(
      "📦 Creating Sales Order with payload:",
      JSON.stringify(salesOrderPayload, null, 2)
    );

    try {
      const { data: salesOrderData } = await axios.post(
        `${ZOHO_ENV.BOOKS_API}/salesorders?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
        salesOrderPayload,
        {
          headers: {
            Authorization: `Zoho-oauthtoken ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      return salesOrderData.salesorder;
    } catch (error: any) {
      console.error("❌ Sales Order Creation Failed:");
      console.error("Status:", error.response?.status);
      console.error(
        "Error Data:",
        JSON.stringify(error.response?.data, null, 2)
      );
      console.error(
        "Payload sent:",
        JSON.stringify(salesOrderPayload, null, 2)
      );
      throw new Error(
        `Failed to create sales order: ${error.response?.data?.message || error.message}`
      );
    }
  }

  /**
   * Confirm Sales Order (change status from DRAFT to CONFIRMED)
   */
  private async confirmSalesOrder(accessToken: string, salesOrderId: string) {
    console.log(`🔄 Confirming Sales Order ${salesOrderId}...`);

    try {
      await axios.post(
        `${ZOHO_ENV.BOOKS_API}/salesorders/${salesOrderId}/status/confirmed?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
        {},
        {
          headers: {
            Authorization: `Zoho-oauthtoken ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log(`✅ Sales Order confirmed successfully`);
    } catch (error: any) {
      console.error("❌ Sales Order Confirmation Failed:");
      console.error("Status:", error.response?.status);
      console.error(
        "Error Data:",
        JSON.stringify(error.response?.data, null, 2)
      );
      throw new Error(
        `Failed to confirm sales order: ${error.response?.data?.message || error.message}`
      );
    }
  }

  /**
   * Convert Sales Order to Invoice
   */
  private async convertSalesOrderToInvoice(
    accessToken: string,
    salesOrderId: string
  ) {
    console.log(`🔄 Converting Sales Order ${salesOrderId} to Invoice...`);

    try {
      // Fetch Sales Order details
      const { data: soData } = await axios.get(
        `${ZOHO_ENV.BOOKS_API}/salesorders/${salesOrderId}?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
        {
          headers: {
            Authorization: `Zoho-oauthtoken ${accessToken}`,
          },
        }
      );

      const salesOrder = soData.salesorder;
      const today = new Date().toISOString().split("T")[0];

      // Create invoice from sales order data
      const invoicePayload: any = {
        customer_id: salesOrder.customer_id,
        date: today,
        salesorder_id: salesOrderId, // ✅ This links the invoice to the SO
        reference_number:
          salesOrder.reference_number?.replace("SALE-", "INV-") ||
          `INV-${Date.now()}`,
        notes: salesOrder.notes,
        line_items: salesOrder.line_items.map((item: any) => ({
          item_id: item.item_id,
          rate: item.rate,
          quantity: item.quantity,
          description: item.description || "",
        })),
      };

      // Include price book if exists
      if (salesOrder.pricebook_id) {
        invoicePayload.pricebook_id = salesOrder.pricebook_id;
      }

      console.log(
        "📦 Creating Invoice from SO with payload:",
        JSON.stringify(invoicePayload, null, 2)
      );

      const { data: invoiceData } = await axios.post(
        `${ZOHO_ENV.BOOKS_API}/invoices?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
        invoicePayload,
        {
          headers: {
            Authorization: `Zoho-oauthtoken ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log(
        `✅ Invoice created and linked: ${invoiceData.invoice.invoice_number}`
      );

      // Mark Sales Order as invoiced by updating its status
      await this.markSalesOrderAsInvoiced(accessToken, salesOrderId);

      return invoiceData.invoice;
    } catch (error: any) {
      console.error("❌ Invoice Creation Failed:");
      console.error("Status:", error.response?.status);
      console.error(
        "Error Data:",
        JSON.stringify(error.response?.data, null, 2)
      );

      throw new Error(
        `Failed to create invoice from sales order: ${error.response?.data?.message || error.message}`
      );
    }
  }

  /**
   * Mark Sales Order as Invoiced
   */
  private async markSalesOrderAsInvoiced(
    accessToken: string,
    salesOrderId: string
  ) {
    try {
      await axios.post(
        `${ZOHO_ENV.BOOKS_API}/salesorders/${salesOrderId}/status/invoiced?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
        {},
        {
          headers: {
            Authorization: `Zoho-oauthtoken ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      console.log(`✅ Sales Order marked as invoiced`);
    } catch (error: any) {
      // Don't throw error here - invoice is created, this is just status update
      console.warn(
        `⚠️ Could not mark SO as invoiced: ${error.response?.data?.message || error.message}`
      );
    }
  }

  /**
   * Create sales invoice in Zoho Books with pricing group price
   * (Keeping this method for backward compatibility if needed)
   */
  private async createSalesInvoice(
    accessToken: string,
    params: ProductPurchaseParams,
    finalPrice: number,
    priceListName: string,
    priceBookId: string | null,
    quantity: string
  ) {
    const today = new Date().toISOString().split("T")[0];

    const invoicePayload: any = {
      customer_id: params.zohoContactId,
      date: today,
      reference_number: `SALE-${Date.now()}`,
      notes: `Product Purchase | Pricing Group: ${priceListName}`,
      line_items: [
        {
          item_id: params.productZohoItemId,
          name: params.productName,
          rate: finalPrice,
          quantity: 1,
          description: `Player ID: ${params.playerId} | Pricing Group: ${priceListName}-qty:${quantity}`,
        },
      ],
    };

    if (priceBookId) {
      invoicePayload.pricebook_id = priceBookId;
    }

    const { data: invoiceData } = await axios.post(
      `${ZOHO_ENV.BOOKS_API}/invoices?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
      invoicePayload,
      {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    return invoiceData.invoice;
  }

  /**
   * Apply customer's credit notes to pay the invoice
   */
  private async applyCreditNotesToInvoice(
    accessToken: string,
    zohoContactId: string,
    invoiceId: string,
    invoiceAmount: number
  ): Promise<Array<{ creditNoteNumber: string; amountApplied: number }>> {
    // Get customer's available credit notes
    const { data: creditNotesData } = await axios.get(
      `${ZOHO_ENV.BOOKS_API}/creditnotes?customer_id=${zohoContactId}&status=open&organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
      {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
        },
      }
    );

    const creditNotes = creditNotesData.creditnotes || [];
    const totalAvailable = creditNotes.reduce(
      (sum: number, cn: any) => sum + (cn.balance || 0),
      0
    );

    // Verify sufficient credit balance
    if (totalAvailable < invoiceAmount) {
      throw new Error(
        `Insufficient customer credits in Zoho. Required: ${invoiceAmount}, Available: ${totalAvailable}`
      );
    }

    // Apply credit notes until invoice is fully paid
    const appliedCredits: Array<{
      creditNoteNumber: string;
      amountApplied: number;
    }> = [];
    let remainingAmount = invoiceAmount;

    for (const creditNote of creditNotes) {
      if (remainingAmount <= 0) break;
      if (creditNote.balance <= 0) continue;

      const amountToApply = Math.min(creditNote.balance, remainingAmount);

      await axios.post(
        `${ZOHO_ENV.BOOKS_API}/creditnotes/${creditNote.creditnote_id}/invoices?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
        {
          invoices: [
            {
              invoice_id: invoiceId,
              amount_applied: amountToApply,
            },
          ],
        },
        {
          headers: {
            Authorization: `Zoho-oauthtoken ${accessToken}`,
          },
        }
      );

      remainingAmount -= amountToApply;
      appliedCredits.push({
        creditNoteNumber: creditNote.creditnote_number,
        amountApplied: amountToApply,
      });

      console.log(
        `✅ Applied ${amountToApply} from credit note ${creditNote.creditnote_number}`
      );
    }

    if (remainingAmount > 0) {
      throw new Error(
        `Failed to fully pay invoice. Remaining: ${remainingAmount}`
      );
    }

    return appliedCredits;
  }

  /**
   * Get customer's assigned pricing group and fetch product price from that price list
   */
  private async getCustomerPricingGroupPrice(
    accessToken: string,
    zohoContactId: string,
    productZohoItemId: string
  ): Promise<{
    priceListName: string;
    priceBookId: string | null;
    finalPrice: number;
  }> {
    // 1️⃣ Fetch customer details to get their assigned pricing group
    console.log(`🔍 Fetching customer details: ${zohoContactId}`);

    const { data: customerData } = await axios.get(
      `${ZOHO_ENV.BOOKS_API}/contacts/${zohoContactId}?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
      {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
        },
      }
    );

    const customer = customerData.contact;
    const customerPriceBookId = customer.pricebook_id;
    const customerPricingGroupId = customer.cf_pricing_groupid;
    const customerPricingGroup = customer.cf_pricing_group;

    console.log(`👤 Customer: ${customer.contact_name}`);
    console.log(`📋 Assigned Price Book ID: ${customerPriceBookId || "None"}`);
    console.log(
      `🏷️ Pricing Group ID (Custom): ${customerPricingGroupId || "None"}`
    );
    console.log(`🏷️ Pricing Group Name: ${customerPricingGroup || "Standard"}`);

    // 2️⃣ Fetch item standard details first
    console.log(`🔍 Fetching item standard details...`);

    const { data: itemData } = await axios.get(
      `${ZOHO_ENV.BOOKS_API}/items/${productZohoItemId}?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
      {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
        },
      }
    );

    const zohoItem = itemData.item;
    let finalPrice = zohoItem.rate;
    let priceListName = "Standard Price";
    let priceBookId: string | null = null;

    console.log(`📦 Item: ${zohoItem.name} | Standard Rate: ${zohoItem.rate}`);

    // 3️⃣ Determine which price list ID to use
    const matchingPriceListId = customerPriceBookId || customerPricingGroupId;

    // 4️⃣ If customer has a price list, fetch the pricebook to get the item's rate
    if (matchingPriceListId && matchingPriceListId.trim() !== "") {
      try {
        console.log(`🔍 Fetching pricebook: ${matchingPriceListId}`);

        const { data: priceBookData } = await axios.get(
          `https://www.zohoapis.com/inventory/v1/pricebooks/${matchingPriceListId}?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
          {
            headers: {
              Authorization: `Zoho-oauthtoken ${accessToken}`,
            },
          }
        );

        const priceBook = priceBookData.pricebook;
        console.log(`📋 Pricebook fetched: ${priceBook.name}`);

        const priceBookItem = priceBook.pricebook_items?.find(
          (item: any) => item.item_id === productZohoItemId
        );

        if (priceBookItem && priceBookItem.pricebook_rate) {
          finalPrice = priceBookItem.pricebook_rate;
          priceListName = customerPricingGroup || priceBook.name;
          priceBookId = matchingPriceListId;

          console.log(
            `✅ Using Price List rate: ${finalPrice} from "${priceListName}"`
          );
        } else {
          console.warn(
            `⚠️ Item not found in pricebook. Using standard rate: ${finalPrice}`
          );
        }
      } catch (error: any) {
        console.error(
          `❌ Error fetching pricebook: ${error.response?.data?.message || error.message}`
        );
        console.log(`⚠️ Falling back to standard rate: ${finalPrice}`);
      }
    } else {
      console.log(
        `ℹ️ No price list assigned. Using standard rate: ${finalPrice}`
      );
    }

    return {
      priceListName,
      priceBookId,
      finalPrice,
    };
  }

  private async createWalletLiabilityJournal(
    accessToken: string,
    zohoContactId: string,
    amount: number,
    invoiceNumber: string
  ) {
    const today = new Date().toISOString().split("T")[0];

    const walletLiabilityId =
      await this.zohoAccountService.getWalletAccountId();
    const walletIncomeAccountId =
      await this.zohoAccountService.getWalletIncomeAccountId();

    const journalPayload = {
      journal_date: today,
      reference_number: `LIAB-ADJ-${Date.now()}`,
      notes: `Wallet liability adjustment after product purchase | Invoice: ${invoiceNumber}`,
      line_items: [
        {
          account_id: walletLiabilityId,
          debit_or_credit: "debit",
          amount: amount,
          customer_id: zohoContactId,
          description: "Reduce wallet liability after purchase",
        },
        {
          account_id: walletIncomeAccountId,
          debit_or_credit: "credit",
          amount: amount,
          customer_id: zohoContactId,
          description: "Clear wallet spend",
        },
      ],
    };

    await axios.post(
      `${ZOHO_ENV.BOOKS_API}/journals?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
      journalPayload,
      {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
        },
      }
    );

    console.log("✅ Wallet liability journal entry created");
  }
}
