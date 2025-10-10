import { useQuery, useMutation } from "@tanstack/react-query";
import axiosPrivate from "../AxiosInstances/PrivateAxiosInstance";
import { queryClient } from "../main";

const useInvalidateConfig = () => {
  return () =>
    queryClient.invalidateQueries({ queryKey: ["config"], exact: false });
};

export const useConfig = () => {
  return useQuery({
    queryKey: ["config"],
    queryFn: async () => {
      const res = await axiosPrivate.get("/config");
      return res.data;
    },
  });
};

export const useEmailTemplate = () => {
  return useQuery({
    queryKey: ["config", "emailTemplate"],
    queryFn: async () => {
      const res = await axiosPrivate.get("/config/emailTemplate");
      return res.data;
    },
  });
};

export const useUpdateOrCreateConfig = () => {
  const invalidateConfig = useInvalidateConfig();

  return useMutation({
    mutationFn: async (payload: FormData) => {
      // payload should be FormData if uploading logo
      const res = await axiosPrivate.post("/config", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    },
    onSuccess: () => {
      invalidateConfig();
    },
  });
};
