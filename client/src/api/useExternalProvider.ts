// import { useQuery, useMutation } from "@tanstack/react-query";
// import axiosPrivate from "../AxiosInstances/PrivateAxiosInstance";
// import { queryClient } from "../main";

// export const useExternalProvider = () => {
//   return useQuery({
//     queryKey: ["externalProvider"],
//     queryFn: async () => {
//       const res = await axiosPrivate.get("/external-provider");
//       return res.data;
//     },
//   });
// };

// export const useUpsertExternalProvider = () => {
//   return useMutation({
//     mutationFn: async (payload: any) => {
//       const res = await axiosPrivate.post("/external-provider", payload);
//       return res.data;
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ["externalProvider"] });
//     },
//   });
// };

import { useQuery, useMutation } from "@tanstack/react-query";
import axiosPrivate from "../AxiosInstances/PrivateAxiosInstance";
import { queryClient } from "../main";

/* ================================
   GET ALL PROVIDERS
================================ */
export const useApiProviders = () => {
  return useQuery({
    queryKey: ["apiProviders"],
    queryFn: async () => {
      const res = await axiosPrivate.get("/external-providers");
      return res.data.providers;
    },
  });
};

/* ================================
   CREATE PROVIDER
================================ */
export const useCreateApiProvider = () => {
  return useMutation({
    mutationFn: async (payload: any) => {
      const res = await axiosPrivate.post("/external-providers", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apiProviders"] });
    },
  });
};

/* ================================
   UPDATE PROVIDER
================================ */
export const useUpdateApiProvider = () => {
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await axiosPrivate.put(`/external-providers/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apiProviders"] });
    },
  });
};

/* ================================
   DELETE PROVIDER
================================ */
export const useDeleteApiProvider = () => {
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await axiosPrivate.delete(`/external-providers/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apiProviders"] });
    },
  });
};

/* ================================
   TEST PROVIDER
================================ */
export const useTestApiProvider = () => {
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await axiosPrivate.post(`/external-providers/${id}/test`);
      return res.data;
    },
  });
};
