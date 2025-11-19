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
  async getValidAccessToken(): Promise<string> {
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

  async getWalletAccountId(): Promise<string> {
    const accessToken = await this.getValidAccessToken();
    const url = `${ZOHO_ENV.BOOKS_API}/chartofaccounts?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`;
    const { data } = await axios.get(url, {
      headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
    });

    const account = data.chartofaccounts.find(
      (acc: any) => acc.account_name.toLowerCase() === "wallet retainer"
    );

    if (!account) throw new Error("Parent Wallet account not found");
    return account.account_id;
  }

  async getBankAccountId(): Promise<string> {
    const accessToken = await this.getValidAccessToken();
    const url = `${ZOHO_ENV.BOOKS_API}/chartofaccounts?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`;
    const { data } = await axios.get(url, {
      headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
    });

    let account = data.chartofaccounts.find(
      (acc: any) => acc.account_name === "Employee Reimbursements"
    );

    if (!account) {
      const parentId = await this.getWalletAccountId();
      account = await this.createSubAccount(
        parentId,
        "Employee Reimbursements"
      );
    }

    return account.account_id;
  }

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
  // async topUpWallet(entry: {
  //   customer_id: string;
  //   sub_account_id: string; // <-- user sub-account
  //   parent_account_id: string; // <-- parent wallet account
  //   bank_account_id: string; // <-- PayPal / Bank account in Zoho
  //   amount: number | string;
  //   payment_mode: string;
  //   reference_number?: string;
  //   description?: string;
  // }) {
  //   const accessToken = await this.getValidAccessToken();
  //   const today = new Date().toISOString().split("T")[0];
  //   const amount =
  //     typeof entry.amount === "string"
  //       ? parseFloat(entry.amount)
  //       : entry.amount;

  //   // 1️⃣ Create Retainer Invoice
  //   const retainerInvoiceRes = await axios.post(
  //     `${ZOHO_ENV.BOOKS_API}/retainerinvoices?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
  //     {
  //       customer_id: entry.customer_id,
  //       date: today,
  //       reference_number: entry.reference_number,
  //       line_items: [
  //         {
  //           description: entry.description || "Wallet Top-up",
  //           rate: amount,
  //           quantity: 1,
  //         },
  //       ],
  //     },
  //     {
  //       headers: {
  //         Authorization: `Zoho-oauthtoken ${accessToken}`,
  //       },
  //     }
  //   );

  //   const invoice = retainerInvoiceRes.data.retainerinvoice;

  //   // 2️⃣ Record Payment
  //   const paymentRes = await axios.post(
  //     `${ZOHO_ENV.BOOKS_API}/customerpayments?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
  //     {
  //       customer_id: entry.customer_id,
  //       amount,
  //       date: today,
  //       payment_mode: entry.payment_mode,
  //       reference_number: entry.reference_number,
  //       retainer_invoice_id: invoice.retainerinvoice_id,
  //     },
  //     {
  //       headers: {
  //         Authorization: `Zoho-oauthtoken ${accessToken}`,
  //       },
  //     }
  //   );

  //   // 3️⃣ Journal Entry — Bank → Sub Wallet
  //   const je1 = await this.createJournalEntry({
  //     debit_account_id: entry.bank_account_id,
  //     credit_account_id: entry.sub_account_id,
  //     amount,
  //     notes: `Wallet Top-up (User Wallet) Ref: ${entry.reference_number}`,
  //   });

  //   // 4️⃣ Journal Entry — Sub Wallet → Parent Wallet
  //   // const je2 = await this.createJournalEntry({
  //   //   debit_account_id: entry.sub_account_id,
  //   //   credit_account_id: entry.parent_account_id,
  //   //   amount,
  //   //   notes: `Wallet Top-up Aggregation (Parent Wallet) Ref: ${entry.reference_number}`,
  //   // });

  //   return {
  //     invoice,
  //     payment: paymentRes.data,
  //     je1,
  //   };
  // }
  // async recordWalletTopup(
  //   userZohoSubAccountId: string,
  //   userZohoContactId: string,
  //   amount: number | string,
  //   reference: string,
  //   description = "Wallet Top-up"
  // ) {
  //   const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  //   const bankAccountId = await this.getBankAccountId();

  //   // ✅ Only 1 Journal Entry: Bank -> User Sub-account
  //   const subAccountJournal = await this.createJournalEntry({
  //     debit_account_id: bankAccountId,
  //     credit_account_id: userZohoSubAccountId,
  //     amount: numAmount,
  //     notes: `${description} (Ref: ${reference})`,
  //   });

  //   // ❌ REMOVE THE SECOND JOURNAL ENTRY – not needed
  //   // Zoho will automatically aggregate sub-accounts under the parent

  //   // 2️⃣ Retainer Payment for customer reporting
  //   const retainer = await this.createRetainerPayment({
  //     customer_id: userZohoContactId,
  //     amount: numAmount,
  //     payment_mode: "paypal",
  //     reference_number: reference,
  //     description,
  //   });

  //   return {
  //     subAccountJournal,
  //     retainer,
  //   };
  // }

  // async createJournalEntry(entry: {
  //   debit_account_id: string;
  //   credit_account_id: string;
  //   amount: number | string;
  //   notes: string;
  // }) {
  //   const accessToken = await this.getValidAccessToken();

  //   const numAmount =
  //     typeof entry.amount === "string"
  //       ? parseFloat(entry.amount)
  //       : entry.amount;

  //   const payload = {
  //     journal_date: new Date().toISOString().split("T")[0],
  //     notes: entry.notes,
  //     line_items: [
  //       {
  //         account_id: entry.debit_account_id,
  //         debit_or_credit: "debit",
  //         amount: numAmount.toFixed(2),
  //       },
  //       {
  //         account_id: entry.credit_account_id,
  //         debit_or_credit: "credit",
  //         amount: numAmount.toFixed(2),
  //       },
  //     ],
  //   };
  //   // ✅ Correct URL
  //   const url = `${ZOHO_ENV.BOOKS_API}/journals?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`;

  //   try {
  //     const { data } = await axios.post(url, payload, {
  //       headers: {
  //         Authorization: `Zoho-oauthtoken ${accessToken}`,
  //         "Content-Type": "application/json",
  //       },
  //     });

  //     console.log("✅ Journal Entry Created:", data);
  //     return data.journal;
  //   } catch (err: any) {
  //     console.error("❌ Journal Entry Error:");
  //     console.error("Response:", JSON.stringify(err.response?.data, null, 2));
  //     console.error("Payload:", JSON.stringify(payload, null, 2));
  //     throw new Error(
  //       `Failed to create journal entry: ${err.response?.data?.message || err.message}`
  //     );
  //   }
  // }
  // async createRetainerPayment(entry: {
  //   customer_id: string;
  //   amount: number | string;
  //   payment_mode: string;
  //   reference_number?: string;
  //   description?: string;
  // }) {
  //   const accessToken = await this.getValidAccessToken();
  //   const numAmount =
  //     typeof entry.amount === "string"
  //       ? parseFloat(entry.amount)
  //       : entry.amount;

  //   // 1️⃣ Create Retainer Invoice
  //   const invoiceRes = await axios.post(
  //     `${ZOHO_ENV.BOOKS_API}/retainerinvoices?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
  //     {
  //       customer_id: entry.customer_id,
  //       date: new Date().toISOString().split("T")[0],
  //       line_items: [
  //         {
  //           description: entry.description || "Wallet Top-up",
  //           rate: numAmount,
  //           quantity: 1,
  //         },
  //       ],
  //       reference_number: entry.reference_number,
  //     },
  //     {
  //       headers: {
  //         Authorization: `Zoho-oauthtoken ${accessToken}`,
  //         "Content-Type": "application/json",
  //       },
  //     }
  //   );

  //   const retainerInvoice = invoiceRes.data.retainerinvoice;
  //   if (!retainerInvoice?.retainerinvoice_id)
  //     throw new Error("Failed to create retainer invoice");

  //   // ✅ 2️⃣ Record Payment
  //   const paymentRes = await axios.post(
  //     `${ZOHO_ENV.BOOKS_API}/customerpayments?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
  //     {
  //       customer_id: entry.customer_id,
  //       amount: numAmount,
  //       date: new Date().toISOString().split("T")[0],
  //       payment_mode: entry.payment_mode,
  //       reference_number: entry.reference_number,
  //     },
  //     {
  //       headers: {
  //         Authorization: `Zoho-oauthtoken ${accessToken}`,
  //         "Content-Type": "application/json",
  //       },
  //     }
  //   );

  //   console.log("✅ Retainer Payment Recorded:", paymentRes.data);
  //   return paymentRes.data;
  // }
  // async createRefundToWallet(entry: {
  //   customer_id: string;
  //   amount: number | string;
  //   reason: string;
  //   reference: string;
  //   original_order_id?: string;
  // }) {
  //   const accessToken = await this.getValidAccessToken();
  //   const today = new Date().toISOString().split("T")[0];
  //   const amount =
  //     typeof entry.amount === "string"
  //       ? parseFloat(entry.amount)
  //       : entry.amount;

  //   const payload = {
  //     customer_id: entry.customer_id,
  //     date: today,
  //     reference_number: entry.reference,
  //     notes: `${entry.reason} | Daizer Refund ID: ${entry.reference}`,
  //     line_items: [
  //       {
  //         name: "Refund to Wallet",
  //         description: `${entry.reason} | Order: ${entry.original_order_id || "N/A"}`,
  //         rate: parseFloat(amount.toFixed(2)),
  //         quantity: 1,
  //       },
  //     ],
  //     // DO NOT add any payment or refund – leave as "Open"
  //   };

  //   const response = await axios.post(
  //     `${ZOHO_ENV.BOOKS_API}/creditnotes?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
  //     payload,
  //     { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } }
  //   );

  //   const creditNote = response.data.creditnote;
  //   console.log(
  //     "Refund to Wallet → Open Credit Note Created:",
  //     creditNote.creditnote_number
  //   );

  //   return creditNote;
  // }
  async createRefundToWallet(entry: {
    refundId: string;
    customer_id: string;
    amount: number | string;
    reason: string;
    reference: string;
    original_order_id?: string;
    account_id: string;
  }) {
    const zohoAccessToken = await this.getValidAccessToken();
    const today = new Date().toISOString().split("T")[0];
    const amount =
      typeof entry.amount === "string"
        ? parseFloat(entry.amount)
        : entry.amount;

    const payload = {
      customer_id: entry.customer_id,
      date: today,
      reference_number: entry.reference,
      notes: `${entry.reason} | Daizer Refund #${entry.refundId}`,
      line_items: [
        {
          name: "Refund to Wallet",
          description: `${entry.reason} | Order: ${entry.original_order_id || "N/A"}`,
          rate: parseFloat(amount.toFixed(2)),
          quantity: 1,
          // FORCE IT TO YOUR CUSTOM LIABILITY ACCOUNT
          account_id: entry.account_id,
        },
      ],
    };

    const response = await axios.post(
      `${ZOHO_ENV.BOOKS_API}/creditnotes?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
      payload,
      { headers: { Authorization: `Zoho-oauthtoken ${zohoAccessToken}` } }
    );

    const creditNote = response.data.creditnote;

    return creditNote;
  }
  // async recordPaymentAdjustmentInZoho(entry: {
  //   refundId: string;
  //   customer_id: string;
  //   amount: number | string;
  //   reference: string;
  //   creditNoteId: string;
  // }) {
  //   const zohoAccessToken = await this.getValidAccessToken();
  //   const today = new Date().toISOString().split("T")[0];
  //   const amount =
  //     typeof entry.amount === "string"
  //       ? parseFloat(entry.amount)
  //       : entry.amount;

  //   // Step 2: Record Payment Adjustment (Refund Payment) in Zoho Books
  //   const paymentRes = await axios.post(
  //     `${ZOHO_ENV.BOOKS_API}/customerpayments?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
  //     {
  //       customer_id: entry.customer_id,
  //       payment_mode: "Wallet Refund", // You can set this to 'PayPal' or 'Bank Transfer' depending on your refund method
  //       amount: amount.toString(),
  //       date: today,
  //       reference_number: `REFUND-${entry.refundId}`,
  //       description: `Refund for Wallet Top-up #${entry.refundId}`,
  //       creditnotes: [
  //         {
  //           creditnote_id: entry.creditNoteId,
  //           amount_applied: parseFloat(amount.toString()),
  //         },
  //       ],
  //     },
  //     { headers: { Authorization: `Zoho-oauthtoken ${zohoAccessToken}` } }
  //   );

  //   console.log(
  //     "Payment Adjustment Recorded:",
  //     paymentRes.data.payment.payment_id
  //   );
  //   return paymentRes.data.payment;
  // }
  async topUpWalletWithRetainer(entry: {
    customer_id: string;
    amount: number | string;
    payment_mode: string;
    reference_number: string;
    account_id: string; // Add account_id here
    description?: string;
  }) {
    const accessToken = await this.getValidAccessToken();
    const today = new Date().toISOString().split("T")[0];

    // Ensure amount is a number
    const amount =
      typeof entry.amount === "string"
        ? parseFloat(entry.amount)
        : entry.amount;

    if (isNaN(amount) || amount <= 0) throw new Error("Invalid top-up amount");

    // Step 1: Create Retainer Invoice (with line_items – mandatory)
    const retainerRes = await axios.post(
      `${ZOHO_ENV.BOOKS_API}/retainerinvoices?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
      {
        customer_id: entry.customer_id,
        date: today,
        reference_number: entry.reference_number,
        notes: entry.description || "Wallet Top-up via PayPal",
        line_items: [
          {
            name: "Wallet Top-up",
            description: `PayPal Capture ID: ${entry.reference_number}`,
            rate: parseFloat(amount.toFixed(2)),
            quantity: 1,
          },
        ],
      },
      { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } }
    );

    const retainerInvoice = retainerRes.data.retainerinvoice;
    if (!retainerInvoice?.retainerinvoice_id) {
      throw new Error("Failed to create retainer invoice");
    }

    // Step 2: Record Payment via Customer Payments (links to retainerinvoice)
    const paymentRes = await axios.post(
      `${ZOHO_ENV.BOOKS_API}/customerpayments?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
      {
        customer_id: entry.customer_id,
        payment_mode: entry.payment_mode, // "PayPal", "Bank Transfer", etc.
        amount: parseFloat(amount.toFixed(2)),
        date: today,
        reference_number: entry.reference_number,
        description: entry.description || "Wallet top-up via PayPal",

        // Link payment to the retainer invoice
        retainerinvoices: [
          {
            retainerinvoice_id: retainerInvoice.retainerinvoice_id,
            amount_applied: parseFloat(amount.toFixed(2)),
          },
        ],

        // Deposit to the correct bank/PayPal account
        account_id: entry.account_id,
      },
      { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } }
    );

    console.log("Wallet Top-up 100% Synced!", {
      retainer_invoice_id: retainerInvoice.retainerinvoice_id,
      payment_id: paymentRes.data.payment?.payment_id,
      unused_retainers: amount.toFixed(2),
    });

    return {
      retainerInvoice,
      payment: paymentRes.data.payment,
    };
  }

  /** High-level helper for wallet top-up with journal entry */
}
