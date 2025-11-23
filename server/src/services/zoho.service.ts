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
      custom_fields: [
        {
          label: "Wallet Balance", // Must match the custom field created in Zoho
          value: 0, // Initial wallet balance is 0
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
  // Utility: update wallet balance custom field in Zoho Books
  async updateZohoWalletBalance(
    customer_id: string,
    amount: number,
    isCredit: boolean
  ) {
    const accessToken = await this.getValidAccessToken();

    // 1️⃣ Get current wallet balance from Zoho
    const contactRes = await axios.get(
      `${ZOHO_ENV.BOOKS_API}/contacts/${customer_id}?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
      { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } }
    );

    const contact = contactRes.data.contact;
    let currentBalance = 0;

    if (contact.custom_fields) {
      const walletField = contact.custom_fields.find(
        (f: any) => f.label === "Wallet Balance"
      );
      if (walletField) currentBalance = parseFloat(walletField.value || 0);
    }

    // 2️⃣ Update balance
    const newBalance = isCredit
      ? currentBalance + amount
      : currentBalance - amount;

    // 3️⃣ Update Zoho contact
    await axios.put(
      `${ZOHO_ENV.BOOKS_API}/contacts/${customer_id}?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
      {
        custom_fields: [
          { label: "Wallet Balance", value: parseFloat(newBalance.toFixed(2)) },
        ],
      },
      { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } }
    );

    return newBalance;
  }

  async getWalletAccountId(): Promise<string> {
    const accessToken = await this.getValidAccessToken();
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
    const accessToken = await this.getValidAccessToken();
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
    const accessToken = await this.getValidAccessToken();
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
    const accessToken = await this.getValidAccessToken();
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
    const accessToken = await this.getValidAccessToken();
    const url = `${ZOHO_ENV.BOOKS_API}/chartofaccounts?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`;
    const { data } = await axios.get(url, {
      headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
    });

    const account = data.chartofaccounts.find(
      (acc: any) =>
        acc.account_name.toLowerCase() === "wallet adjustment expenses"
    );

    if (!account) throw new Error("Parent Wallet account not found");
    return account.account_id;
  }
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

  async refundWalletWithCreditNote(entry: {
    refundId: string;
    customer_id: string;
    amount: number | string;
    reason: string;
    reference: string;
    original_order_id?: string;
    account_id: string; // ← Wallet Liability (Current Liability)
    walletIncomeAccountID: string; // ← CHANGE THIS: now it's Income, not Expense!
    walletClearingAccountId: string;
  }) {
    const accessToken = await this.getValidAccessToken();
    const today = new Date().toISOString().split("T")[0];

    const amount =
      typeof entry.amount === "string"
        ? parseFloat(entry.amount)
        : entry.amount;
    if (!amount || amount <= 0) throw new Error("Invalid refund amount");

    const refNumber = `${entry.reference}-WALLET`.substring(0, 50);

    const creditNotePayload = {
      customer_id: entry.customer_id,
      date: today,
      reference_number: refNumber,
      notes: `${entry.reason} | Wallet Refund #${entry.refundId} | Order: ${entry.original_order_id || "N/A"}`,
      line_items: [
        {
          name: "Wallet Refund",
          description: `${entry.reason} | Original Order: ${entry.original_order_id || "N/A"}`,
          rate: parseFloat(amount.toFixed(2)),
          quantity: 1,
          account_id: entry.walletIncomeAccountID, // ← NOW USING INCOME ACCOUNT → Revenue reversal
        },
      ],
    };

    const creditNoteRes = await axios.post(
      `${ZOHO_ENV.BOOKS_API}/creditnotes?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
      creditNotePayload,
      { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } }
    );

    const creditNote = creditNoteRes.data.creditnote;

    // Your journal to move liability
    const journalPayload = {
      journal_date: today,
      reference_number: entry.reference,
      notes: `Wallet refund liability adjustment | CN-${creditNote.creditnote_number}`,
      line_items: [
        {
          account_id: entry.account_id, // Wallet Liability
          debit_or_credit: "credit",
          amount: parseFloat(amount.toFixed(2)),
          customer_id: entry.customer_id,
          description: "Wallet refund - increase liability",
        },
        {
          account_id: entry.walletClearingAccountId,
          debit_or_credit: "debit",
          amount: parseFloat(amount.toFixed(2)),
          customer_id: entry.customer_id,
          description: "Wallet refund - offset",
        },
      ],
    };

    await axios.post(
      `${ZOHO_ENV.BOOKS_API}/journals?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
      journalPayload,
      { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } }
    );
    const updatedBalance = await this.updateZohoWalletBalance(
      entry.customer_id,
      amount,
      true
    );
    return { success: true, creditNote };
  }

  // ZohoService.ts
  async adjustWalletAndSyncZoho(entry: {
    customer_id: string;
    amount: number | string;
    type: "credit" | "debit";
    reason: string;
    reference: string;
    liability_account_id: string;
    walletIncomeAccountID: string; // ← NEW: Use same Income account everywhere
    walletClearingAccountId: string;
  }) {
    const accessToken = await this.getValidAccessToken();
    const amount = parseFloat(entry.amount as string);
    if (isNaN(amount) || amount <= 0) throw new Error("Invalid amount");
    const today = new Date().toISOString().split("T")[0];

    let zohoTransaction = null;

    // =================================================================
    // CASE 1: ADMIN CREDIT (free money to customer)
    // =================================================================
    if (entry.type === "credit") {
      // Journal: Increase liability
      const journalPayload = {
        journal_date: today,
        reference_number: entry.reference,
        notes: `Admin Wallet Credit - ${entry.reason}`,
        line_items: [
          {
            account_id: entry.liability_account_id,
            debit_or_credit: "credit",
            amount,
            customer_id: entry.customer_id,
            description: `Admin wallet credit - ${entry.reason}`,
          },
          {
            account_id: entry.walletIncomeAccountID, // ← This is the "cost" of giving free money (or use a separate "Promotions" expense if you want)
            debit_or_credit: "debit",
            amount,
            description: "Admin wallet credit offset",
          },
        ],
      };

      await axios.post(
        `${ZOHO_ENV.BOOKS_API}/journals?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
        journalPayload,
        { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } }
      );

      // Credit Note: Increase unused credits — NO account_id!
      const creditNotePayload = {
        customer_id: entry.customer_id,
        date: today,
        reference_number: entry.reference,
        notes: `Admin Wallet Credit - ${entry.reason}`,
        line_items: [
          {
            name: "Admin Wallet Credit",
            rate: amount,
            quantity: 1,
            description: entry.reason,
            // ← NO account_id → Zoho treats as pure customer credit → perfect!
          },
        ],
      };

      const creditNoteRes = await axios.post(
        `${ZOHO_ENV.BOOKS_API}/creditnotes?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
        creditNotePayload,
        { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } }
      );

      zohoTransaction = creditNoteRes.data.creditnote;
      await this.updateZohoWalletBalance(entry.customer_id, amount, true);
    }

    // =================================================================
    // CASE 2: ADMIN DEBIT (deduct from wallet)
    // =================================================================
    if (entry.type === "debit") {
      // Step 1: Get customer's credit notes to verify balance
      const creditNotesRes = await axios.get(
        `${ZOHO_ENV.BOOKS_API}/creditnotes?customer_id=${entry.customer_id}&status=open&organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
        { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } }
      );

      const creditNotes = creditNotesRes.data.creditnotes || [];
      const totalAvailable = creditNotes.reduce(
        (sum: number, cn: any) => sum + (cn.balance || 0),
        0
      );

      if (totalAvailable < amount) {
        throw new Error(
          `Insufficient customer credits. Required: ${amount}, Available: ${totalAvailable}`
        );
      }

      // Step 2: Create the invoice — ADD account_id for revenue!
      const invRes = await axios.post(
        `${ZOHO_ENV.BOOKS_API}/invoices?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
        {
          customer_id: entry.customer_id,
          date: today,
          reference_number: entry.reference,
          line_items: [
            {
              name: "Admin Wallet Debit",
              rate: amount,
              quantity: 1,
              description: entry.reason,
              account_id: entry.walletIncomeAccountID, // ← THIS IS THE ONLY CHANGE: Recognize revenue!
            },
          ],
        },
        { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } }
      );

      const invoice = invRes.data.invoice;

      // Step 3: Apply credit notes to pay the invoice — THIS IS PERFECT!
      let remainingAmount = amount;
      for (const creditNote of creditNotes) {
        if (remainingAmount <= 0) break;
        if (creditNote.balance <= 0) continue;

        const amountToApply = Math.min(creditNote.balance, remainingAmount);

        await axios.post(
          `${ZOHO_ENV.BOOKS_API}/creditnotes/${creditNote.creditnote_id}/invoices?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
          {
            invoices: [
              {
                invoice_id: invoice.invoice_id,
                amount_applied: amountToApply,
              },
            ],
          },
          { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } }
        );

        remainingAmount -= amountToApply;
      }
      console.log(
        "DEBUG - Wallet Clearing Account ID:",
        entry.walletClearingAccountId
      );
      if (!entry.walletClearingAccountId) {
        throw new Error("walletClearingAccountId is missing or undefined!");
      }

      // THEN create the journal — with explicit account_id
      await axios.post(
        `${ZOHO_ENV.BOOKS_API}/journals?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
        {
          journal_date: today,
          reference_number: `${entry.reference}-LIAB-ADJ`,
          notes: `Decrease wallet liability after admin debit | INV-${invoice.invoice_number}`,
          line_items: [
            {
              account_id: entry.liability_account_id,
              debit_or_credit: "debit",
              amount,
              customer_id: entry.customer_id,
              description: "Admin wallet debit - reduce liability",
            },
            {
              account_id: entry.walletClearingAccountId, // ← THIS MUST BE HERE!
              debit_or_credit: "credit",
              amount,
              customer_id: entry.customer_id,
              description: "Offset via Wallet Clearing",
            },
          ],
        },
        { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } }
      );
      zohoTransaction = invoice;
      await this.updateZohoWalletBalance(entry.customer_id, amount, false);
    }

    return {
      journal: null, // Invoice + credit note application handles the accounting
      zohoTransaction,
    };
  }
  async topUpWalletWithRetainer(entry: {
    customer_id: string;
    amount: number | string;
    payment_mode: string;
    reference_number: string;
    walletIncomeAccountId: string; // Income account
    bank_account_id: string; // Where money came from
    liability_account_id: string;
    walletClearingAccountId: string;
    description?: string;
  }) {
    const accessToken = await this.getValidAccessToken();
    const amount = parseFloat(entry.amount as string);
    const today = new Date().toISOString().split("T")[0];

    // Step 1: Invoice → recognize revenue
    const invoiceRes = await axios.post(
      `${ZOHO_ENV.BOOKS_API}/invoices?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
      {
        customer_id: entry.customer_id,
        date: today,
        reference_number: entry.reference_number,
        status: "sent",
        line_items: [
          {
            name: "Wallet Top-up",
            rate: amount,
            quantity: 1,
            account_id: entry.walletIncomeAccountId, // ← Revenue!
            description: entry.description || "Wallet top-up",
          },
        ],
      },
      { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } }
    );

    const invoice = invoiceRes.data.invoice;

    // Step 2: Record payment
    await axios.post(
      `${ZOHO_ENV.BOOKS_API}/customerpayments?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
      {
        customer_id: entry.customer_id,
        payment_mode: entry.payment_mode,
        amount,
        date: today,
        reference_number: entry.reference_number,
        account_id: entry.bank_account_id,
        invoices: [{ invoice_id: invoice.invoice_id, amount_applied: amount }],
      },
      { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } }
    );

    // Step 3: Credit Note → THIS automatically increases Wallet Liability!
    const creditNoteRes = await axios.post(
      `${ZOHO_ENV.BOOKS_API}/creditnotes?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
      {
        customer_id: entry.customer_id,
        date: today,
        reference_number: `${entry.reference_number}-WALLET`,
        line_items: [
          {
            name: "Wallet Balance Credit",
            rate: amount,
            quantity: 1,
            description: "Added to customer wallet balance",
            // ← NO account_id = Zoho automatically debits Wallet Liability
          },
        ],
      },
      { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } }
    );
    const creditNote = creditNoteRes.data.creditnote;
    await axios.post(
      `${ZOHO_ENV.BOOKS_API}/journals?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
      {
        journal_date: today,
        reference_number: `${entry.reference_number}-LIAB-ADJ`,
        notes: `Move wallet top-up liability to Customer Wallet Balance | CN-${creditNote.creditnote_number}`,
        line_items: [
          {
            account_id: entry.walletClearingAccountId, // ← Debit the offset/clearing (or A/R)
            debit_or_credit: "debit", // ← Debit offset (increases asset or clears A/R)
            amount,
            customer_id: entry.customer_id,
            description: "Offset A/R from credit note",
          },
          {
            account_id: entry.liability_account_id, // Your "Customer Wallet Balance"
            debit_or_credit: "credit", // ← FIXED: CREDIT increases liability (positive balance)
            amount,
            customer_id: entry.customer_id,
            description: "Increase customer wallet liability from top-up",
          },
          // Always balance: Total Debits = Total Credits
        ],
      },
      { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } }
    );
    await this.updateZohoWalletBalance(entry.customer_id, amount, true);

    return { success: true, invoice, message: "Wallet topped up perfectly" };
  }
  /*******  841efb00-cb8e-46ec-865f-26b7d69b4471  *******/
  /** High-level helper for wallet top-up with journal entry */
}
