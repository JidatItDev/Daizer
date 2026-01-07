import { Request, Response } from "express";
import { db } from "../db/dbConnection";
import { wallets, transactions, refundRequests, users } from "../db/schema";
import { and, asc, desc, eq, inArray, ne, SQL, sql } from "drizzle-orm";
import { checkoutNodeJssdk, paypalClient } from "../config/paypal";
import redisClient from "../config/redis";
import { EmailService } from "../services/email.service";
import { email } from "zod";
import { ZohoService } from "../services/zoho.service";
import { ZOHO_ENV } from "../config/Zoho";
import axios from "axios";
import { ZohoAccountIdsFetchingService } from "../services/ZohoServices/zohoAccountIdsFetching.service";
import { ZohoWalletService } from "../services/ZohoServices/zohoWallet.service";
import { getActiveChartOfAccounts } from "../utils/getChartOfAccounts";
import { validateAmount } from "../utils/amountValidator";

async function invalidateUserTransactionsCache(userId: string) {
  const pattern = `transactions:${userId}:*`;
  const keys = await redisClient.keys(pattern);

  if (keys.length > 0) {
    await redisClient.del(keys);
    // console.log(`Invalidated ${keys.length} cache entries for user ${userId}`);
  }
}

const invalidateTransactionCaches = async () => {
  try {
    // Get all keys that match the transaction cache pattern
    const keys = await redisClient.keys("all-transactions:*");

    // Delete all matching keys
    if (keys.length > 0) {
      await redisClient.del(keys);
    }

    // console.log(`Invalidated ${keys.length} transaction cache entries`);
  } catch (error) {
    console.error("Error invalidating transaction caches:", error);
  }
};
async function invalidateRefundRequestCaches() {
  const keys = await redisClient.keys("refund-requests:*");

  if (keys.length > 0) {
    await redisClient.del(keys);
  }
}

class WalletController {
  // User APIs
  static async getBalance(req: Request, res: Response) {
    const userId = req.user!.id; // from auth middleware
    const [wallet] = await db
      .select()
      .from(wallets)
      .where(eq(wallets.userId, userId));
    return res.json({
      balance: wallet?.balance || 0,
      currency: wallet?.currency || "USD",
    });
  }

  static async getTransactions(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const {
        page = "1",
        limit = "20",
        type: filterType,
        sortField = "createdAt",
        sortOrder = "desc",
      } = req.query;

      const pageNum = Math.max(1, Number(page));
      const perPage = Math.max(1, Math.min(100, Number(limit)));
      const offset = (pageNum - 1) * perPage;

      const cacheKey = `transactions:${userId}:page:${pageNum}:limit:${perPage}:type:${
        filterType ?? "all"
      }:sort:${String(sortField)}:${String(sortOrder)}`;

      const cached = await redisClient.get(cacheKey);
      if (cached) {
        const payload = JSON.parse(cached);
        return res.json(payload);
      }

      // console.log("called transactions of user", userId);

      // let whereCondition = eq(transactions.userId, userId);

      // if (filterType && filterType !== "all") {
      //   whereCondition = and(
      //     whereCondition,
      //     eq(transactions.type, filterType as string)
      //   );
      // }
      let whereCondition: SQL = eq(transactions.userId, userId);

      if (filterType && filterType !== "all") {
        const newCondition = and(
          whereCondition,
          eq(transactions.type, filterType as string)
        );
        if (newCondition) {
          whereCondition = newCondition;
        }
      }

      // Allowed sort field mapping
      const allowedSortFields: Record<string, any> = {
        createdAt: transactions.createdAt,
        amount: transactions.amount,
        type: transactions.type,
        status: transactions.status,
      };
      const orderByField =
        allowedSortFields[String(sortField)] || transactions.createdAt;
      const orderDirection =
        String(sortOrder).toLowerCase() === "asc" ? "asc" : "desc";

      // Run queries: paginated rows and total count
      const [rows, countResult] = await Promise.all([
        db
          .select()
          .from(transactions)
          .where(whereCondition)
          .orderBy(
            orderDirection === "asc" ? asc(orderByField) : desc(orderByField)
          )
          .limit(perPage)
          .offset(offset),

        db
          .select({ count: sql<number>`count(*)` })
          .from(transactions)
          .where(whereCondition),
      ]);

      const [{ count }] = countResult as { count: number }[];

      const responsePayload = {
        success: true,
        transactions: rows,
        pagination: {
          page: pageNum,
          limit: perPage,
          total: Number(count),
          totalPages: Math.ceil(Number(count) / perPage),
        },
      };

      await redisClient.setEx(cacheKey, 60, JSON.stringify(responsePayload));

      return res.json(responsePayload);
    } catch (err) {
      console.error("getTransactions error:", err);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  static async getUserRefundRequests(req: Request, res: Response) {
    const userId = req.user!.id;
    const list = await db
      .select()
      .from(refundRequests)
      .where(eq(refundRequests.userId, userId));
    return res.json({ refundRequests: list });
  }

  // static async requestRefund(req: Request, res: Response) {
  //   const userId = req.user!.id;
  //   const { amount } = req.body;

  //   const [user] = await db
  //     .select({
  //       id: users.id,
  //       name: users.name,
  //       email: users.email,
  //     })
  //     .from(users)
  //     .where(eq(users.id, userId))
  //     .limit(1);

  //   if (!user) {
  //     return res.status(404).json({ message: "User not found" });
  //   }

  //   const [rr] = await db
  //     .insert(refundRequests)
  //     .values({ userId, amount })
  //     .returning();

  //   console.log("request refund called!!", rr);
  //   await EmailService.sendTemplateEmail("userPartialRequest", user.email, {
  //     requestedBy: user.name,
  //     name: user.name,
  //     email: user.email,
  //     status: rr.status || "pending",
  //     amount,
  //     refundAmount: amount,
  //   });

  //   return res.status(201).json({ success: true, refundRequest: rr });
  // }

  // Admin APIs

  static async requestRefund(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      let { amount } = req.body;
      amount = validateAmount(req.body.amount);

      // fetch requesting user
      const [user] = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const [rr] = await db
        .insert(refundRequests)
        .values({ userId, amount })
        .returning();

      // console.log("request refund called!!", rr);

      const admins = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
        })
        .from(users)
        .where(eq(users.role, "admin"));

      for (const admin of admins) {
        await EmailService.sendTemplateEmail(
          "refundRequestAdminNotification",
          admin.email,
          {
            adminName: admin.name,
            admin: admin.name,
            requestedBy: user.name,
            name: user.name,
            requesterEmail: user.email,
            email: user.email,
            amount,
            refundAmount: amount,
            refundId: rr.id,
            id: rr.id,
            status: rr.status || "pending",
          }
        );
      }

      return res.status(201).json({ success: true, refundRequest: rr });
    } catch (err: any) {
      if (err.name === "AmountValidationError") {
        return res.status(err.statusCode).json({ message: err.message });
      }
      console.error("requestRefund error:", err);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  static async getAllWallets(req: Request, res: Response) {
    const result = await db.query.wallets.findMany({
      with: { user: true },
    });
    return res.json(result);
  }

  static async getAllTransactions(req: Request, res: Response) {
    try {
      const {
        page = "1",
        limit = "20",
        type: filterType,
        sortField = "createdAt",
        sortOrder = "desc",
        userId, // Optional filter by specific user
      } = req.query;

      const pageNum = Math.max(1, Number(page));
      const perPage = Math.max(1, Math.min(100, Number(limit)));
      const offset = (pageNum - 1) * perPage;

      const cacheKey = `all-transactions:page:${pageNum}:limit:${perPage}:type:${
        filterType ?? "all"
      }:user:${userId ?? "all"}:sort:${String(sortField)}:${String(sortOrder)}`;

      const cached = await redisClient.get(cacheKey);
      if (cached) {
        const payload = JSON.parse(cached);
        return res.json(payload);
      }

      let whereCondition: SQL | undefined;
      if (filterType && filterType !== "all") {
        whereCondition = eq(transactions.type, filterType as string);
      }

      // Add user filter if provided
      if (userId && userId !== "all") {
        const userCondition = eq(transactions.userId, userId as string);
        whereCondition = whereCondition
          ? and(whereCondition, userCondition)
          : userCondition;
      }

      // Allowed sort field mapping
      const allowedSortFields: Record<string, any> = {
        createdAt: transactions.createdAt,
        amount: transactions.amount,
        type: transactions.type,
        status: transactions.status,
        userId: transactions.userId,
      };
      const orderByField =
        allowedSortFields[String(sortField)] || transactions.createdAt;
      const orderDirection =
        String(sortOrder).toLowerCase() === "asc" ? "asc" : "desc";

      // Get transactions with pagination
      const transactionRows = await db
        .select()
        .from(transactions)
        .where(whereCondition)
        .orderBy(
          orderDirection === "asc" ? asc(orderByField) : desc(orderByField)
        )
        .limit(perPage)
        .offset(offset);

      // Get total count for pagination
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(transactions)
        .where(whereCondition);

      const [{ count }] = countResult as { count: number }[];

      // Get unique user IDs from transactions
      const userIds = [...new Set(transactionRows.map((t) => t.userId))];

      // Fetch users with pricing group information
      const userRows = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          pricingGroupId: users.pricingGroupId,
        })
        .from(users)
        .where(inArray(users.id, userIds));

      // Fetch wallet balances for users
      const walletRows = await db
        .select({
          id: wallets.id,
          userId: wallets.userId,
          balance: wallets.balance,
          currency: wallets.currency,
        })
        .from(wallets)
        .where(inArray(wallets.userId, userIds));

      // Create maps for easy lookup
      const userMap = new Map(userRows.map((user) => [user.id, user]));
      const walletMap = new Map(
        walletRows.map((wallet) => [wallet.userId, wallet])
      );

      // Combine transactions with user and wallet data
      const transactionsWithUsers = transactionRows.map((transaction) => {
        const user = userMap.get(transaction.userId) || null;
        const wallet = walletMap.get(transaction.userId);

        return {
          ...transaction,
          user: user
            ? {
                id: user.id,
                name: user.name,
                email: user.email,
                pricingGroupId: user.pricingGroupId,
                wallet: wallet
                  ? {
                      balance: wallet.balance,
                      currency: wallet.currency,
                    }
                  : null,
              }
            : null,
        };
      });

      const responsePayload = {
        success: true,
        transactions: transactionsWithUsers,
        pagination: {
          page: pageNum,
          limit: perPage,
          total: Number(count),
          totalPages: Math.ceil(Number(count) / perPage),
        },
      };

      await redisClient.setEx(cacheKey, 60, JSON.stringify(responsePayload));

      return res.json(responsePayload);
    } catch (err) {
      console.error("getAllTransactions error:", err);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
  static async getWalletAccountId(): Promise<string> {
    const zohoService = new ZohoService();
    const accessToken = await zohoService.getValidAccessToken();

    const url = `${ZOHO_ENV.BOOKS_API}/chartofaccounts?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`;

    const { data } = await axios.get(url, {
      headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
    });

    const account = data.chartofaccounts.find(
      (acc: any) =>
        acc.account_name.toLowerCase().includes("wallet") &&
        acc.account_type === "other_current_assets"
    );

    if (!account) throw new Error("Wallet account not found in Zoho Books");

    return account.account_id;
  }

  static async getRefundRequests(req: Request, res: Response) {
    try {
      const {
        page = "1",
        limit = "20",
        status: filterStatus,
        sortField = "createdAt",
        sortOrder = "desc",
        userId, // Optional filter by specific user
      } = req.query;

      const pageNum = Math.max(1, Number(page));
      const perPage = Math.max(1, Math.min(100, Number(limit)));
      const offset = (pageNum - 1) * perPage;

      const cacheKey = `refund-requests:page:${pageNum}:limit:${perPage}:status:${
        filterStatus ?? "all"
      }:user:${userId ?? "all"}:sort:${String(sortField)}:${String(sortOrder)}`;

      const cached = await redisClient.get(cacheKey);
      if (cached) {
        const payload = JSON.parse(cached);
        return res.json(payload);
      }

      let whereCondition: SQL | undefined;
      if (filterStatus && filterStatus !== "all") {
        whereCondition = eq(refundRequests.status, filterStatus as string);
      }

      // Add user filter if provided
      if (userId && userId !== "all") {
        const userCondition = eq(refundRequests.userId, userId as string);
        whereCondition = whereCondition
          ? and(whereCondition, userCondition)
          : userCondition;
      }

      // Allowed sort field mapping
      const allowedSortFields: Record<string, any> = {
        createdAt: refundRequests.createdAt,
        amount: refundRequests.amount,
        status: refundRequests.status,
        userId: refundRequests.userId,
      };
      const orderByField =
        allowedSortFields[String(sortField)] || refundRequests.createdAt;
      const orderDirection =
        String(sortOrder).toLowerCase() === "asc" ? "asc" : "desc";

      // Get refund requests with pagination
      const refundRows = await db
        .select()
        .from(refundRequests)
        .where(whereCondition)
        .orderBy(
          orderDirection === "asc" ? asc(orderByField) : desc(orderByField)
        )
        .limit(perPage)
        .offset(offset);

      // Get total count for pagination
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(refundRequests)
        .where(whereCondition);

      const [{ count }] = countResult as { count: number }[];

      // Get unique user IDs from refund requests
      const userIds = [...new Set(refundRows.map((r) => r.userId))];

      // Fetch users with pricing group information
      const userRows = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          pricingGroupId: users.pricingGroupId,
        })
        .from(users)
        .where(inArray(users.id, userIds));

      // Fetch wallet balances for users
      const walletRows = await db
        .select({
          id: wallets.id,
          userId: wallets.userId,
          balance: wallets.balance,
          currency: wallets.currency,
        })
        .from(wallets)
        .where(inArray(wallets.userId, userIds));

      // Create maps for easy lookup
      const userMap = new Map(userRows.map((user) => [user.id, user]));
      const walletMap = new Map(
        walletRows.map((wallet) => [wallet.userId, wallet])
      );

      // Combine refund requests with user and wallet data
      const refundsWithUsers = refundRows.map((refund) => {
        const user = userMap.get(refund.userId);
        const wallet = walletMap.get(refund.userId);

        return {
          ...refund,
          user: user
            ? {
                id: user.id,
                name: user.name,
                email: user.email,
                pricingGroupId: user.pricingGroupId,
                wallet: wallet
                  ? {
                      balance: wallet.balance,
                      currency: wallet.currency,
                    }
                  : null,
              }
            : null,
        };
      });

      const responsePayload = {
        success: true,
        refundRequests: refundsWithUsers,
        pagination: {
          page: pageNum,
          limit: perPage,
          total: Number(count),
          totalPages: Math.ceil(Number(count) / perPage),
        },
      };

      await redisClient.setEx(cacheKey, 60, JSON.stringify(responsePayload));

      return res.json(responsePayload);
    } catch (err) {
      console.error("getRefundRequests error:", err);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  static async approveRefund(req: Request, res: Response) {
    const result = await db.transaction(async (tx) => {
      try {
        const { refundId } = req.params;
        const { destination, sentBy } = req.body;
        const adminId = req.user!.id;

        // 1. Get refund request
        const [refund] = await tx
          .select()
          .from(refundRequests)
          .where(eq(refundRequests.id, refundId));

        if (!refund) throw new Error("Refund request not found");

        // 2. Get user + Zoho contact
        const [user] = await tx
          .select({
            zohoContactId: users.zohoContactId,
            name: users.name,
            email: users.email,
          })
          .from(users)
          .where(eq(users.id, refund.userId));

        if (!user?.zohoContactId)
          throw new Error("User missing Zoho Contact ID");

        // 3. Get wallet
        const [wallet] = await tx
          .select()
          .from(wallets)
          .where(eq(wallets.userId, refund.userId));

        if (!wallet) throw new Error("Wallet not found");

        // 4. Calculate & update wallet balance
        const newBalance = Number(wallet.balance) + Number(refund.amount);

        const [updatedWallet] = await tx
          .update(wallets)
          .set({
            balance: newBalance.toString(),
            updatedAt: new Date(),
          })
          .where(eq(wallets.userId, refund.userId))
          .returning();

        // 5. Mark refund as approved
        const [approvedRefund] = await tx
          .update(refundRequests)
          .set({
            status: "approved",
            adminId,
            updatedAt: new Date(),
          })
          .where(eq(refundRequests.id, refundId))
          .returning();
        const referenceId = `REFUND-${refund.id}-${Date.now()}`;
        // // 6. Insert transaction log
        await tx.insert(transactions).values({
          walletId: wallet.id,
          userId: refund.userId,
          type: "refund",
          amount: refund.amount.toString(),
          currency: wallet.currency,
          status: "pending", // 👈 important
          referenceId,
          metadata: JSON.stringify({
            destination,
            sentBy,
            refundId: refund.id,
            adminId,
            originalBalance: wallet.balance,
            newBalance: newBalance.toString(),
            refundReason: refund.reason || "No reason provided",
          }),
        });

        // 7. SYNC WITH ZOHO — THIS CAN FAIL!
        const zohoAccountIdsFetchingService =
          new ZohoAccountIdsFetchingService();
        const zohoWalletService = new ZohoWalletService();
        const account_id =
          await zohoAccountIdsFetchingService.getWalletAccountId();
        const walletIncomeAccountID =
          await zohoAccountIdsFetchingService.getWalletIncomeAccountId();
        const walletClearingAccountId =
          await zohoAccountIdsFetchingService.getWalletClearingAccountId();

        const refundData = await zohoWalletService.refundWalletWithCreditNote({
          refundId: refund.id,
          customer_id: user.zohoContactId,
          amount: refund.amount,
          reason: refund.reason || "Refund approved by admin",
          reference: referenceId,
          original_order_id: refund.transactionId || "N/A",
          account_id,
          walletIncomeAccountID,
          walletClearingAccountId,
        });
        console.log("refundData", refundData);
        if (refundData?.creditNote?.creditnote_id) {
          await tx
            .update(transactions)
            .set({
              status: "completed",
              creditNoteId: refundData.creditNote.creditnote_id,
              creditNoteNumber: refundData.creditNote.creditnote_number,
              updatedAt: new Date(),
            })
            .where(eq(transactions.referenceId, referenceId));
        }

        // Invalidate all relevant caches
        await Promise.all([
          invalidateTransactionCaches(),
          invalidateUserTransactionsCache(refund.userId),
          invalidateRefundRequestCaches(),
          // invalidateWalletCaches(refund.userId),
        ]);

        if (user) {
          await EmailService.sendTemplateEmail(
            "refundApprovedNotification",
            user.email,
            {
              name: user.name,
              refundId: refund.id,
              amount: refund.amount.toString(),
              newBalance: newBalance.toString(),
              destination,
              sentBy,
              status: approvedRefund.status || "accepted",
            }
          );
        }

        return res.json({
          success: true,
          refund: approvedRefund,
          newBalance: newBalance.toString(),
          zohoRefund: refundData,
          message: "Refund approved and wallet updated successfully",
        });
      } catch (err: any) {
        console.error("approveRefund failed → rolling back:", err);
        throw err; // This triggers rollback
      }
    });
    return result;
  }

  static async rejectRefund(req: Request, res: Response) {
    try {
      const { refundId } = req.params;
      const adminId = req.user!.id;

      // Get the refund request first to get user ID for cache invalidation
      const [refund] = await db
        .select()
        .from(refundRequests)
        .where(eq(refundRequests.id, refundId));

      if (!refund) {
        return res.status(404).json({ message: "Refund request not found" });
      }

      // Mark refund as rejected (only update status and admin, no wallet changes)
      const [rejectedRefund] = await db
        .update(refundRequests)
        .set({
          status: "rejected",
          adminId,
          updatedAt: new Date(),
        })
        .where(eq(refundRequests.id, refundId))
        .returning();

      // Invalidate refund request cache only (no transaction created, no wallet change)
      // await invalidateRefundRequestCaches();
      const [user] = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
        })
        .from(users)
        .where(eq(users.id, refund.userId));

      if (user) {
        await EmailService.sendTemplateEmail(
          "refundRejectedNotification",
          user.email,
          {
            name: user.name,
            refundId: refund.id,
            amount: refund.amount.toString(),
            status: rejectedRefund.status || "rejected",
          }
        );
      }
      await Promise.all([
        invalidateRefundRequestCaches(),
        // invalidateWalletCaches(refund.userId),
      ]);
      return res.json({
        success: true,
        refund: rejectedRefund,
      });
    } catch (err) {
      console.error("rejectRefund error:", err);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  static async adjustWallet(req: Request, res: Response) {
    const { userId, type, destination, sentReceived } = req.body;
    const adminId = req.user!.id;
    let amount = validateAmount(req.body.amount);
    if (type !== "credit" && type !== "debit") {
      return res
        .status(400)
        .json({ message: "Type must be 'credit' or 'debit'" });
    }
    return await db.transaction(async (tx) => {
      try {
        const [user] = await tx
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            zohoContactId: users.zohoContactId,
          })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);

        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        const [wallet] = await tx
          .select()
          .from(wallets)
          .where(eq(wallets.userId, userId));

        if (!wallet) {
          return res.status(404).json({ message: "Wallet not found" });
        }

        let newBalance: number;
        if (type === "credit") {
          newBalance = Number(wallet.balance) + Number(amount);
        } else {
          // debit
          if (Number(wallet.balance) < Number(amount)) {
            return res.status(400).json({ message: "Insufficient balance" });
          }
          newBalance = Number(wallet.balance) - Number(amount);
        }

        const [updatedWallet] = await tx
          .update(wallets)
          .set({ balance: newBalance.toString() })
          .where(eq(wallets.userId, userId))
          .returning();
        const referenceId = `ADJ-${type.toUpperCase()}-${Date.now()}`;

        await tx.insert(transactions).values({
          walletId: wallet.id,
          userId,
          type: "adjustment",
          amount: type === "credit" ? amount.toString() : `-${amount}`,
          currency: wallet.currency,
          status: "completed",
          referenceId: referenceId,
          metadata: JSON.stringify({
            destination,
            [type === "credit" ? "receivedInto" : "sentBy"]: sentReceived,
            adminId,
            type,
            originalBalance: wallet.balance,
            newBalance: newBalance.toString(),
          }),
        });

        const zohoAccountIdsFetchingService =
          new ZohoAccountIdsFetchingService();
        const zohoWalletService = new ZohoWalletService();
        const account_id =
          await zohoAccountIdsFetchingService.getWalletAccountId();
        const walletIncomeAccountID =
          await zohoAccountIdsFetchingService.getWalletIncomeAccountId();
        const incomeAccountId =
          await zohoAccountIdsFetchingService.getWalletIncomesAccountId();
        const walletClearingAccountId =
          await zohoAccountIdsFetchingService.getWalletClearingAccountId(); // ← Good variable name
        const expenseAccountId =
          await zohoAccountIdsFetchingService.getWalletExpenseAccountId();
        const zohoResult = await zohoWalletService.adjustWalletAndSyncZoho({
          customer_id: user.zohoContactId,
          amount: amount,
          type: type,
          reason: req.body.reason || "Admin adjustment",
          reference: `ADJ-${type.toUpperCase()}-${Date.now()}`,
          liability_account_id: account_id,
          walletIncomeAccountID: walletIncomeAccountID,
          walletClearingAccountId: walletClearingAccountId, // ← Now it's passed correctly!
          expenseAccountId: expenseAccountId,
          incomeAccountId: incomeAccountId,
        });
        console.log("zohoResult", zohoResult);
        const zohoTxn = zohoResult.zohoTransaction;

        if (type === "credit" && zohoTxn?.creditnote_id) {
          await tx
            .update(transactions)
            .set({
              creditNoteId: zohoTxn.creditnote_id,
              creditNoteNumber: zohoTxn.creditnote_number,
              updatedAt: new Date(),
            })
            .where(eq(transactions.referenceId, referenceId));
        }

        if (type === "debit" && zohoTxn?.invoice_id) {
          await tx
            .update(transactions)
            .set({
              invoiceId: zohoTxn.invoice_id,
              invoiceNumber: zohoTxn.invoice_number,
              updatedAt: new Date(),
            })
            .where(eq(transactions.referenceId, referenceId));
        }

        await invalidateTransactionCaches();

        return res.json({
          success: true,
          wallet: updatedWallet,
          newBalance,
          message: `Wallet ${
            type === "credit" ? "credited" : "debited"
          } successfully`,
        });
      } catch (err: any) {
        // Everything rolls back automatically thanks to `tx.rollback()` on error
        console.error("adjustWallet failed, rolling back:", err);
        tx.rollback?.(); // Explicit rollback (optional in Drizzle, but safe)

        return res.status(500).json({
          message: err.message || "Failed to adjust wallet",
          error: process.env.NODE_ENV === "development" ? err : undefined,
        });
      }
    });
  }

  static async createPayPalOrder(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { currency = "USD" } = req.body;
      let amount = validateAmount(req.body.amount);
      // Ensure wallet exists
      let [wallet] = await db
        .select()
        .from(wallets)
        .where(eq(wallets.userId, userId));
      if (!wallet) {
        [wallet] = await db
          .insert(wallets)
          .values({ userId, balance: "0", currency })
          .returning();
      }

      const request = new checkoutNodeJssdk.orders.OrdersCreateRequest();
      request.prefer("return=representation");
      request.requestBody({
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: { currency_code: currency, value: amount.toString() },
            custom_id: userId,
          },
        ],
        application_context: {
          return_url: `${process.env.FRONTEND_URL}/topup`,
          cancel_url: `${process.env.FRONTEND_URL}/topup`,
        },
      });

      // const order = await paypalClient().execute(request);
      const client = await paypalClient();
      const order = await client.execute(request);
      // Save pending transaction (store in dollars, not cents)
      await db.insert(transactions).values({
        walletId: wallet.id,
        userId,
        type: "topup",
        amount: amount.toString(),
        currency,
        status: "pending",
        referenceId: order.result.id,
      });

      const approvalUrl = order.result.links.find(
        (l: any) => l.rel === "approve"
      )?.href;
      await invalidateUserTransactionsCache(userId);

      return res.json({ orderId: order.result.id, approvalUrl });
    } catch (err: any) {
      console.error("PayPal createOrder error:", err);
      return res.status(500).json({ message: "Failed to create PayPal order" });
    }
  }

  // ========================
  // 2) Capture PayPal Order
  // ========================
  static async capturePayPalOrder(req: Request, res: Response) {
    const result = await db.transaction(async (tx) => {
      try {
        const { orderId } = req.body;

        // 1. Capture PayPal order
        const request = new checkoutNodeJssdk.orders.OrdersCaptureRequest(
          orderId
        );
        request.requestBody({});
        // const capture = await paypalClient().execute(request);
        const client = await paypalClient();
        const capture = await client.execute(request);

        const status = capture.result.status;
        const captureId =
          capture.result.purchase_units[0].payments.captures[0].id;
        let amount = parseFloat(
          capture.result.purchase_units[0].payments.captures[0].amount.value
        );

        const currency =
          capture.result.purchase_units[0].payments.captures[0].amount
            .currency_code;

        if (status !== "COMPLETED") {
          throw new Error("PayPal payment not completed");
        }

        // 2. Find transaction by PayPal order ID
        const [transaction] = await tx
          .select()
          .from(transactions)
          .where(eq(transactions.referenceId, orderId));

        if (!transaction) throw new Error("Transaction not found");

        const userId = transaction.userId;

        // 3. Update transaction status
        // await tx
        //   .update(transactions)
        //   .set({ status: "completed", updatedAt: new Date() })
        //   .where(eq(transactions.id, transaction.id));

        // 4. Update wallet balance (atomic!)
        const [updatedWallet] = await tx
          .update(wallets)
          .set({
            balance: sql`${wallets.balance} + ${amount}`,
            updatedAt: new Date(),
          })
          .where(eq(wallets.userId, userId))
          .returning();

        // 5. Get user with Zoho IDs
        const [user] = await tx
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            zohoContactId: users.zohoContactId,
          })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);

        if (!user?.zohoContactId)
          throw new Error("User missing Zoho Contact ID");

        // 6. SYNC WITH ZOHO — This is the risky part!
        const zohoAccountIdsFetchingService =
          new ZohoAccountIdsFetchingService();
        const zohoWalletService = new ZohoWalletService();
        const account_id =
          await zohoAccountIdsFetchingService.getWalletAccountId();
        const bankAccountId =
          await zohoAccountIdsFetchingService.getBankAccountId();
        const walletIncomeAccountID =
          await zohoAccountIdsFetchingService.getWalletIncomeAccountId();
        const walletClearingAccountId =
          await zohoAccountIdsFetchingService.getWalletClearingAccountId();

        const zohoResult = await zohoWalletService.topUpWalletWithRetainer({
          customer_id: user.zohoContactId,
          amount: amount.toString(),
          payment_mode: "PayPal",
          reference_number: captureId,
          walletIncomeAccountId: walletIncomeAccountID,
          bank_account_id: bankAccountId,
          liability_account_id: account_id,
          walletClearingAccountId: walletClearingAccountId,
          description: `Wallet Top-up via PayPal - Ref: ${captureId}`,
        });
        console.log("zohoResult", zohoResult);
        // 3. Update transaction status + save Zoho invoice info
        await tx
          .update(transactions)
          .set({
            status: "completed",
            invoiceId: zohoResult.invoice.invoice_id, // <- Save Zoho invoice ID
            invoiceNumber: zohoResult.invoice.invoice_number, // <- Save Zoho invoice number
            updatedAt: new Date(),
          })
          .where(eq(transactions.id, transaction.id));

        // 7. Invalidate cache (non-critical)
        await invalidateUserTransactionsCache(userId);
        if (user) {
          await EmailService.sendTemplateEmail("topup", user.email, {
            name: user.name,
            amount: amount.toString(),
            currency,
            newBalance: updatedWallet.balance.toString(),
            referenceId: captureId,
            date: new Date().toLocaleString(),
          });
        }

        return res.json({
          success: true,
          message: "PayPal top-up captured and wallet updated",
          amount,
          currency,
          captureId,
          newBalance: updatedWallet.balance,
          zoho: zohoResult,
        });
      } catch (err: any) {
        console.error("capturePayPalOrder failed → rolling back:", err);
        throw err; // Triggers rollback
      }
    });

    return result;
  }

  // Express/NestJS route handler
  static async getActiveAccountsHandler(req: Request, res: Response) {
    try {
      const result = await getActiveChartOfAccounts();
      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
  static async handlePayPalWebhook(req: Request, res: Response) {
    try {
      const event = req.body;
      // console.log("hook called");
      // TODO: verify webhook signature using PayPal headers (important for security)
      if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
        const capture = event.resource;
        const orderId = capture.supplementary_data?.related_ids?.order_id;
        const userId = capture.custom_id;
        const amount = capture.amount.value;
        const currency = capture.amount.currency_code;

        // Update DB if not already processed
        await db
          .update(transactions)
          .set({ status: "completed", updatedAt: new Date() })
          .where(eq(transactions.referenceId, orderId));

        await db
          .update(wallets)
          .set({ balance: sql`${wallets.balance} + ${parseFloat(amount)}` })
          .where(eq(wallets.userId, userId));
      }

      res.sendStatus(200);
    } catch (err: any) {
      console.error("PayPal webhook error:", err);
      res.sendStatus(500);
    }
  }
}

export default WalletController;
