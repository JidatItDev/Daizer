import { useQuery, useMutation } from "@tanstack/react-query";
import axiosPrivate from "../AxiosInstances/PrivateAxiosInstance";
import { queryClient } from "../main";

const useInvalidateAll = () => {
  return () => queryClient.invalidateQueries({ queryKey: [], exact: false });
};

export const useEmailTemplates = (
  filters: {
    page?: number;
    limit?: number;
    sortField?: string;
    sortOrder?: string;
  } = {}
) => {
  const { page = 1, limit = 10, sortField, sortOrder } = filters;

  return useQuery({
    queryKey: ["emailTemplates", filters],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (page) params.append("page", page.toString());
      if (limit) params.append("limit", limit.toString());
      if (sortField) params.append("sortField", sortField);
      if (sortOrder) params.append("sortOrder", sortOrder);

      const res = await axiosPrivate.get(`/emailTemplate?${params.toString()}`);
      return res.data;
    },
  });
};

export const useEmailTemplateById = (id: string, options = {}) => {
  return useQuery({
    queryKey: ["emailTemplateById", id],
    queryFn: async () => {
      const res = await axiosPrivate.get(`/emailTemplate/id/${id}`);
      return res.data;
    },
    enabled: !!id,
    ...options,
  });
};

export const useEmailTemplateByType = (type: string, options = {}) => {
  return useQuery({
    queryKey: ["emailTemplateByType", type],
    queryFn: async () => {
      const res = await axiosPrivate.get(`/emailTemplate/type/${type}`);
      return res.data;
    },
    enabled: !!type,
    ...options,
  });
};

export const useCreateEmailTemplate = () => {
  const invalidateAll = useInvalidateAll();

  return useMutation({
    mutationFn: async (payload: {
      name: string;
      type: string;
      subject: string;
      body: string;
    }) => {
      const response = await axiosPrivate.post(`/emailTemplate`, payload);
      return response.data;
    },
    onSuccess: () => invalidateAll(),
  });
};

export const useUpdateEmailTemplate = () => {
  const invalidateAll = useInvalidateAll();

  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<{
        name: string;
        type: string;
        subject: string;
        body: string;
      }>;
    }) => {
      const response = await axiosPrivate.put(`/emailTemplate/${id}`, payload);
      return response.data;
    },
    onSuccess: () => invalidateAll(),
  });
};

export const useDeleteEmailTemplate = () => {
  const invalidateAll = useInvalidateAll();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await axiosPrivate.delete(`/emailTemplate/${id}`);
      return response.data;
    },
    onSuccess: () => invalidateAll(),
  });
};
