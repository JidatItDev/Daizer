// // src/api/auth.js
// import { useQuery, useMutation } from "@tanstack/react-query";
// import axiosPrivate from "../AxiosInstances/PrivateAxiosInstance";
// import { queryClient } from "../main";

// const useInvalidateAll = () => {
//   //   const queryClient = useQueryClient();
//   return () => queryClient.invalidateQueries({ queryKey: [], exact: false });
// };

// // export const useUsers = (filters = {}) => {
// //   const {
// //     page = 1,
// //     limit = 10,
// //     status,
// //     pricingGroupIds,
// //     sortField,
// //     sortOrder,
// //   } = filters;

// //   const params = {
// //     ...(page && { page }),
// //     ...(limit && { limit }),
// //     ...(status !== undefined && { status }), // boolean
// //     ...(pricingGroupIds?.length > 0 && { pricingGroupIds }),
// //     ...(sortField && { sortField }),
// //     ...(sortOrder && { sortOrder }),
// //   };

// //   return useQuery({
// //     queryKey: ["users", params],
// //     queryFn: async () => {
// //       const res = await axiosPrivate.get("/auth/users", { params });
// //       return res.data;
// //     },
// //   });
// // };

// export const useUsers = (filters = {}) => {
//   const {
//     page = 1,
//     limit = 10,
//     status,
//     pricingGroupIds,
//     sortField,
//     sortOrder,
//   } = filters;

//   return useQuery({
//     queryKey: ["users", filters],
//     queryFn: async () => {
//       // Create URLSearchParams to properly handle arrays
//       const params = new URLSearchParams();

//       if (page) params.append("page", page.toString());
//       if (limit) params.append("limit", limit.toString());
//       if (status !== undefined) params.append("status", status.toString());
//       if (sortField) params.append("sortField", sortField);
//       if (sortOrder) params.append("sortOrder", sortOrder);

//       // Handle array parameters correctly
//       if (pricingGroupIds?.length > 0) {
//         pricingGroupIds.forEach((id) => {
//           params.append("pricingGroupIds[]", id);
//         });
//       }

//       const res = await axiosPrivate.get(`/auth/users?${params.toString()}`);
//       return res.data;
//     },
//   });
// };

// export const useCreateUser = () => {
//   const invalidateAll = useInvalidateAll();
//   return useMutation({
//     mutationFn: async (payload) => {
//       const response = await axiosPrivate.post("/auth/create-user", payload);
//       return response.data;
//     },
//     onSuccess: () => invalidateAll(),
//   });
// };

// src/api/auth.ts
import { useQuery, useMutation } from "@tanstack/react-query";
import axiosPrivate from "../AxiosInstances/PrivateAxiosInstance";
import { queryClient } from "../main";

const useInvalidateAll = () => {
  return () => queryClient.invalidateQueries({ queryKey: [], exact: false });
};

export const useUsers = (
  filters: {
    page?: number;
    limit?: number;
    status?: boolean;
    pricingGroupIds?: string[];
    sortField?: string;
    sortOrder?: string;
  } = {}
) => {
  const {
    page = 1,
    limit = 10,
    status,
    pricingGroupIds,
    sortField,
    sortOrder,
  } = filters;

  return useQuery({
    queryKey: ["users", filters],
    queryFn: async () => {
      // Create URLSearchParams to properly handle arrays
      const params = new URLSearchParams();

      if (page) params.append("page", page.toString());
      if (limit) params.append("limit", limit.toString());
      if (status !== undefined) params.append("status", status.toString());
      if (sortField) params.append("sortField", sortField);
      if (sortOrder) params.append("sortOrder", sortOrder);

      // Handle array parameters correctly
      if (pricingGroupIds && pricingGroupIds?.length > 0) {
        pricingGroupIds?.forEach((id: string) => {
          params.append("pricingGroupIds[]", id);
        });
      }

      const res = await axiosPrivate.get(`/auth/users?${params.toString()}`);
      return res.data;
    },
  });
};

export const useCreateUser = () => {
  const invalidateAll = useInvalidateAll();
  return useMutation({
    mutationFn: async (payload: any) => {
      const response = await axiosPrivate.post("/auth/create-user", payload);
      return response.data;
    },
    onSuccess: () => invalidateAll(),
  });
};
