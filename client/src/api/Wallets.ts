import { useQuery, useMutation } from "@tanstack/react-query";
import axiosPrivate from "../AxiosInstances/PrivateAxiosInstance";
import { queryClient } from "../main";

const useInvalidateAll = () => {
  return () => queryClient.invalidateQueries({ queryKey: [], exact: false });
};

// =======================
// User Wallet Hooks
// =======================

export const useWalletBalance = () => {
  return useQuery({
    queryKey: ["wallet", "balance"],
    queryFn: async () => {
      const res = await axiosPrivate.get("/wallet/balance");
      return res.data;
    },
  });
};

/**
 * User Transactions with filters + pagination
 */
export const useWalletTransactions = (
  filters: {
    page?: number;
    limit?: number;
    type?: "topup" | "purchase" | "adjustment" | "all";
    sortField?: string;
    sortOrder?: "asc" | "desc";
  } = {}
) => {
  const { page = 1, limit = 10, type = "all", sortField, sortOrder } = filters;

  return useQuery({
    queryKey: ["wallet", "transactions", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());
      if (type !== "all") params.append("type", type);
      if (sortField) params.append("sortField", sortField);
      if (sortOrder) params.append("sortOrder", sortOrder);

      const res = await axiosPrivate.get(
        `/wallet/transactions?${params.toString()}`
      );
      return res.data;
    },
    // keepPreviousData: true,
  });
};

/**
 * User Refund Requests
 */
export const useUserRefundRequests = (
  filters: {
    page?: number;
    limit?: number;
    status?: "pending" | "approved" | "rejected" | "all";
    sortField?: string;
    sortOrder?: "asc" | "desc";
  } = {}
) => {
  const {
    page = 1,
    limit = 10,
    status = "all",
    sortField,
    sortOrder,
  } = filters;

  return useQuery({
    queryKey: ["wallet", "refundRequests", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());
      if (status !== "all") params.append("status", status);
      if (sortField) params.append("sortField", sortField);
      if (sortOrder) params.append("sortOrder", sortOrder);

      const res = await axiosPrivate.get(
        `/wallet/refunds?${params.toString()}`
      );
      return res.data;
    },
    // keepPreviousData: true,
  });
};
export interface ChartOfAccount {
  id: string;
  name: string;
  type: string;
  accountCode: string;
  balance: number;
}

export const useGetActiveAccounts = () => {
  return useQuery<{ success: boolean; accounts: ChartOfAccount[] }>({
    queryKey: ["active-accounts"],
    queryFn: async () => {
      const { data } = await axiosPrivate.get("/wallet/active"); // Adjust endpoint
      return data;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
};

export const useRequestRefund = () => {
  const invalidateAll = useInvalidateAll();
  return useMutation({
    mutationFn: async (payload: { amount: number }) => {
      const res = await axiosPrivate.post("/wallet/refund-request", payload);
      return res.data;
    },
    onSuccess: () => invalidateAll(),
  });
};

// =======================
// PayPal Top-up Hooks
// =======================

export const useCreatePayPalOrder = () => {
  return useMutation({
    mutationFn: async (payload: { amount: number; currency?: string }) => {
      const res = await axiosPrivate.post(
        "/wallet/paypal/create-order",
        payload
      );
      return res.data;
    },
  });
};

export const useCapturePayPalOrder = () => {
  const invalidateAll = useInvalidateAll();
  return useMutation({
    mutationFn: async (payload: { orderId: string }) => {
      const res = await axiosPrivate.post(
        "/wallet/paypal/capture-order",
        payload
      );
      return res.data;
    },
    onSuccess: () => invalidateAll(),
  });
};

// =======================
// Admin Wallet Hooks
// =======================

export const useAllWallets = (
  filters: {
    page?: number;
    limit?: number;
    search?: string;
    sortField?: string;
    sortOrder?: "asc" | "desc";
  } = {}
) => {
  const { page = 1, limit = 20, search, sortField, sortOrder } = filters;

  return useQuery({
    queryKey: ["admin", "wallets", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());
      if (search) params.append("search", search);
      if (sortField) params.append("sortField", sortField);
      if (sortOrder) params.append("sortOrder", sortOrder);

      const res = await axiosPrivate.get(
        `/wallet/admin/wallets?${params.toString()}`
      );
      return res.data;
    },
    // keepPreviousData: true,
  });
};

export const useAllTransactions = (
  filters: {
    page?: number;
    limit?: number;
    type?: "topup" | "purchase" | "refund" | "adjustment" | "all";
    sortField?: string;
    sortOrder?: "desc";
  } = {}
) => {
  const { page = 1, limit = 50, type = "all", sortField, sortOrder } = filters;

  return useQuery({
    queryKey: ["admin", "transactions", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());
      if (type !== "all") params.append("type", type);
      if (sortField) params.append("sortField", sortField);
      if (sortOrder) params.append("sortOrder", sortOrder);

      const res = await axiosPrivate.get(
        `/wallet/admin/transactions?${params.toString()}`
      );
      return res.data;
    },
    // keepPreviousData: true,
  });
};

export const useRefundRequests = (
  filters: {
    page?: number;
    limit?: number;
    status?: "pending" | "approved" | "rejected" | "all";
    sortField?: string;
    sortOrder?: "asc" | "desc";
  } = {}
) => {
  const {
    page = 1,
    limit = 20,
    status = "all",
    sortField,
    sortOrder,
  } = filters;

  return useQuery({
    queryKey: ["admin", "refundRequests", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());
      if (status !== "all") params.append("status", status);
      if (sortField) params.append("sortField", sortField);
      if (sortOrder) params.append("sortOrder", sortOrder);

      const res = await axiosPrivate.get(
        `/wallet/admin/refunds?${params.toString()}`
      );
      return res.data;
    },
    // keepPreviousData: true,
  });
};

export const useApproveRefund = () => {
  const invalidateAll = useInvalidateAll();
  return useMutation({
    mutationFn: async (payload: {
      refundId: string;
      destination: string;
      sentBy: string;
    }) => {
      const res = await axiosPrivate.post(
        `/wallet/admin/refunds/${payload.refundId}/approve`,
        {
          destination: payload.destination,
          sentBy: payload.sentBy,
        }
      );
      return res.data;
    },
    onSuccess: () => invalidateAll(),
  });
};

export const useRejectRefund = () => {
  const invalidateAll = useInvalidateAll();
  return useMutation({
    mutationFn: async (refundId: string) => {
      const res = await axiosPrivate.post(
        `/wallet/admin/refunds/${refundId}/reject`
      );
      return res.data;
    },
    onSuccess: () => invalidateAll(),
  });
};

export const useAdjustWallet = () => {
  const invalidateAll = useInvalidateAll();
  return useMutation({
    mutationFn: async (payload: {
      userId: string;
      amount: number;
      type: "credit" | "debit";
      destination: string;
      sentReceived: string;
    }) => {
      const res = await axiosPrivate.post("/wallet/admin/adjust", payload);
      return res.data;
    },
    onSuccess: () => invalidateAll(),
  });
};
