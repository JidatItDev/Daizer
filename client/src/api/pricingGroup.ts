import { useQuery, useMutation } from "@tanstack/react-query";
import axiosPrivate from "../AxiosInstances/PrivateAxiosInstance";
import { queryClient } from "../main";

const useInvalidateAll = () => {
  return () => queryClient.invalidateQueries({ queryKey: [], exact: false });
};

export const usePricingGroups = (
  filters: { page?: number; limit?: number } = {}
) => {
  const { page = 1, limit = 10 } = filters;

  const params = {
    ...(page && { page }),
    ...(limit && { limit }),
  };

  const { data, refetch, ...rest } = useQuery({
    queryKey: ["pricingGroups", params],
    queryFn: async () => {
      const response = await axiosPrivate.get("/pricing-groups", { params });
      return response.data;
    },
  });

  return { data, refetch, ...rest };
};

export const usePricingGroupById = (id: string) => {
  return useQuery({
    queryKey: ["pricingGroup", id],
    queryFn: async () => {
      const response = await axiosPrivate.get(`/pricing-groups/${id}`);
      return response.data;
    },
    enabled: !!id, // only run when id exists
  });
};

export const useCreatePricingGroup = () => {
  const invalidateAll = useInvalidateAll();
  return useMutation({
    mutationFn: async (payload: { name: string; isDefault: boolean }) => {
      const response = await axiosPrivate.post("/pricing-groups", payload);
      return response.data;
    },
    onSuccess: () => invalidateAll(),
  });
};

export const useUpdatePricingGroup = () => {
  const invalidateAll = useInvalidateAll();
  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: {
      id: string;
      [key: string]: any;
    }) => {
      const response = await axiosPrivate.put(`/pricing-groups/${id}`, payload);
      return response.data;
    },
    onSuccess: () => invalidateAll(),
  });
};

export const useDeletePricingGroup = () => {
  const invalidateAll = useInvalidateAll();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await axiosPrivate.delete(`/pricing-groups/${id}`);
      return response.data;
    },
    onSuccess: () => invalidateAll(),
  });
};
