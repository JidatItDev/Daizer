import axios from "axios";
import { ZOHO_ENV } from "../../config/Zoho";
import { ZohoService } from "../zoho.service";
import { ZohoTokensService } from "../zohoTokens.service";

export class ZohoWalletService {
  private tokensService: ZohoTokensService;
  private zohoService: ZohoService;

  constructor() {
    this.tokensService = new ZohoTokensService();
    this.zohoService = new ZohoService();
  }
  async updateZohoWalletBalance(
    customer_id: string,
    amount: number,
    isCredit: boolean
  ) {
    const accessToken = await this.zohoService.getValidAccessToken();

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
    const accessToken = await this.zohoService.getValidAccessToken();
    const today = new Date().toISOString().split("T")[0];

    const amount =
      typeof entry.amount === "string"
        ? parseFloat(entry.amount)
        : entry.amount;
    if (!amount || amount <= 0) throw new Error("Invalid refund amount");

    const refNumber = `${entry.reference}-WALLET-REFUND`.substring(0, 50);

    // Step 1: Create Credit Note to increase unused credits
    // DO NOT specify account_id in line items
    // This way it won't affect any income account
    const creditNotePayload = {
      customer_id: entry.customer_id,
      date: today,
      reference_number: refNumber,
      notes: `${entry.reason} | Wallet Refund #${entry.refundId} | Order: ${entry.original_order_id || "N/A"}`,
      line_items: [
        {
          name: "Wallet Refund Credit",
          description: `${entry.reason} | Refund to wallet - unused credits`,
          rate: parseFloat(amount.toFixed(2)),
          quantity: 1,
          // ← NO account_id specified - won't affect income accounts
        },
      ],
    };

    const creditNoteRes = await axios.post(
      `${ZOHO_ENV.BOOKS_API}/creditnotes?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
      creditNotePayload,
      { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } }
    );

    const creditNote = creditNoteRes.data.creditnote;

    // Step 2: Journal Entry to increase Wallet Liability
    // This is where the accounting happens
    const journalPayload = {
      journal_date: today,
      reference_number: `${entry.reference}-JE`,
      notes: `Wallet refund - increase customer wallet balance | CN-${creditNote.creditnote_number} | Refund #${entry.refundId}`,
      line_items: [
        {
          account_id: entry.account_id, // Wallet Liability
          debit_or_credit: "credit", // Credit = Increase liability (we owe customer more)
          amount: parseFloat(amount.toFixed(2)),
          customer_id: entry.customer_id,
          description: "Wallet refund - customer credit increased",
        },
        {
          account_id: entry.walletClearingAccountId, // Offset account
          debit_or_credit: "debit", // Debit = Offset (could be bank if cash refund converted to wallet)
          amount: parseFloat(amount.toFixed(2)),
          customer_id: entry.customer_id,
          description: "Wallet refund - offset entry",
        },
      ],
    };

    await axios.post(
      `${ZOHO_ENV.BOOKS_API}/journals?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
      journalPayload,
      { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } }
    );

    // Step 3: Update customer's wallet balance and unused credits in database
    const updatedBalance = await this.updateZohoWalletBalance(
      entry.customer_id,
      amount,
      true // Increase
    );

    return {
      success: true,
      creditNote,
      creditNoteNumber: creditNote.creditnote_number,
      newWalletBalance: updatedBalance,
      message: "Wallet refund processed - unused credits increased",
    };
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
    expenseAccountId?: string;
    incomeAccountId?: string;
  }) {
    const accessToken = await this.zohoService.getValidAccessToken();
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
            account_id: entry.expenseAccountId, // ← This is the "cost" of giving free money (or use a separate "Promotions" expense if you want)
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
              account_id: entry.incomeAccountId, // ← THIS MUST BE HERE!
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
    const accessToken = await this.zohoService.getValidAccessToken();
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
            account_id: entry.liability_account_id, // ← Revenue!
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

    await this.updateZohoWalletBalance(entry.customer_id, amount, true);

    return { success: true, invoice, message: "Wallet topped up perfectly" };
  }
  // async topUpWalletWithRetainer(entry: {
  //   customer_id: string;
  //   amount: number | string;
  //   payment_mode: string;
  //   reference_number: string;
  //   bank_account_id: string; // Where money came from
  //   liability_account_id: string; // Customer Wallet Balance (liability)
  //   description?: string;
  // }) {
  //   const accessToken = await this.zohoService.getValidAccessToken();
  //   const amount = parseFloat(entry.amount as string);
  //   const today = new Date().toISOString().split("T")[0];

  //   // Step 1: Journal Entry for Wallet Top-up
  //   // Debit: Bank Account (money received)
  //   // Credit: Wallet Liability (we owe customer this balance)
  //   await axios.post(
  //     `${ZOHO_ENV.BOOKS_API}/journals?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
  //     {
  //       journal_date: today,
  //       reference_number: entry.reference_number,
  //       notes: entry.description || `Wallet top-up by customer`,
  //       line_items: [
  //         {
  //           account_id: entry.bank_account_id, // Bank Account
  //           debit_or_credit: "debit", // Debit (increase asset - money received)
  //           amount,
  //           customer_id: entry.customer_id,
  //           description: "Cash received for wallet top-up",
  //         },
  //         {
  //           account_id: entry.liability_account_id, // Wallet Liability Account
  //           debit_or_credit: "credit", // Credit (increase liability - we owe customer)
  //           amount,
  //           customer_id: entry.customer_id,
  //           description: "Wallet balance owed to customer",
  //         },
  //       ],
  //     },
  //     { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } }
  //   );
  //   //   // Step 2: Record payment
  //   //   await axios.post(
  //   //     `${ZOHO_ENV.BOOKS_API}/customerpayments?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
  //   //     {
  //   //       customer_id: entry.customer_id,
  //   //       payment_mode: entry.payment_mode,
  //   //       amount,
  //   //       date: today,
  //   //       reference_number: entry.reference_number,
  //   //       account_id: entry.bank_account_id,
  //   //       invoices: [{ invoice_id: invoice.invoice_id, amount_applied: amount }],
  //   //     },
  //   //     { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } }
  //   //   );
  //   // Step 2: Create Credit Note to increase unused credits
  //   const creditNoteRes = await axios.post(
  //     `${ZOHO_ENV.BOOKS_API}/creditnotes?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
  //     {
  //       customer_id: entry.customer_id,
  //       date: today,
  //       reference_number: `${entry.reference_number}-CN`,
  //       line_items: [
  //         {
  //           name: "Wallet Top-up Credit",
  //           rate: amount,
  //           quantity: 1,
  //           description:
  //             entry.description ||
  //             "Wallet balance added - unused credits increased",
  //         },
  //       ],
  //     },
  //     { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } }
  //   );

  //   const creditNote = creditNoteRes.data.creditnote;

  //   // Step 3: Update customer's wallet balance and unused credits in your database
  //   await this.updateZohoWalletBalance(entry.customer_id, amount, true);

  //   return {
  //     success: true,
  //     message: "Wallet topped up successfully",
  //     amount,
  //     credit_note_number: creditNote.creditnote_number,
  //     credit_note_id: creditNote.creditnote_id,
  //   };
  // }
}
