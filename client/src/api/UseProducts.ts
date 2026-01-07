import { useQuery, useMutation } from "@tanstack/react-query";
import axiosPrivate from "../AxiosInstances/PrivateAxiosInstance";
import { queryClient } from "../main";

// Types
export interface Product {
  id: string;
  name: string;
  quantity?: string;
  isActive: boolean;
  description?: string;
  pricingGroupPrices: {
    id: string;
    name: string;
    price: number;
  }[];
  subcategoryId: string;
  serviceId: string;
  apiProviderId: string;
  image?: {
    name: string;
    url: string;
    size: number;
    mimetype: string;
  };
  createdAt: string;
  updatedAt: string;
  subcategoryName: string;
  subcategory?: {
    id: string;
    name: string;
    category?: {
      id: string;
      name: string;
    };
  };
}

export interface ProductsResponse {
  success: boolean;
  products: Product[];
  pagination: {
    page: number;
    limit: number;
    totalProducts: number;
    totalPages: number;
  };
}

export interface PricingGroup {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt: string;
}

export interface PricingGroupsResponse {
  success: boolean;
  pricingGroups: PricingGroup[];
  source?: string;
}

export interface CreateProductPayload {
  name: string;
  description?: string;
  quantity?: string;
  pricingGroupPrices: Record<string, number>;
  subcategoryId: string;
  serviceId: string;
  image?: File;
  apiProviderId?: string;
  isActive: boolean;
}

export interface UpdateProductPayload {
  name?: string;
  description?: string;
  quantity?: string;
  pricingGroupPrices?: Record<string, number>;
  subcategoryId?: string;
  image?: File;
  serviceId?: string;
  isActive?: boolean;
  apiProviderId?: string;
}

export interface ExternalService {
  ServiceGroup: string;
  ServiceIcon: string;
  ServiceApiID: number;
  ServiceName: string;
  Service_AR_Name: string;
  recommended: number;
  DoTime: string;
  Price: number;
  QntAllow: boolean;
  Requires: {
    fieldname: string;
    en_name: string;
    ar_name: string;
    required: boolean;
  }[];
}

export interface ProductServicesResponse {
  success: boolean;
  count: number;
  services: ExternalService[];
}

export interface PurchaseProductPayload {
  productId: string;
  playerId: string;
}

export interface PurchaseProductResponse {
  success: boolean;
  message: string;
  product: string;
  amount: number;
  newBalance: number;
  externalResponse?: any;
}

const useInvalidateProducts = () => {
  return () =>
    queryClient.invalidateQueries({ queryKey: ["products"], exact: false });
};

export const useProducts = (
  filters: { page?: number; limit?: number } = {}
) => {
  const { page = 1, limit = 10 } = filters;

  return useQuery({
    queryKey: ["products", { page, limit }],
    queryFn: async (): Promise<ProductsResponse> => {
      const response = await axiosPrivate.get("/products/getAllProducts", {
        params: { page, limit },
      });
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Get product by ID
export const useProduct = (id: string) => {
  return useQuery({
    queryKey: ["product", id],
    queryFn: async (): Promise<{
      success: boolean;
      data: Product;
      source: string;
    }> => {
      const response = await axiosPrivate.get(`/products/getProductById/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
};

// Get pricing groups
export const usePricingGroups = () => {
  return useQuery({
    queryKey: ["pricingGroups"],
    queryFn: async (): Promise<PricingGroupsResponse> => {
      const response = await axiosPrivate.get("/products/getPricingGroups");
      return response.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Get products by category
export const useProductsByCategory = (categoryId: string) => {
  return useQuery({
    queryKey: ["products", "category", categoryId],
    queryFn: async (): Promise<{
      success: boolean;
      products: Product[];
      message: string;
    }> => {
      const response = await axiosPrivate.get(
        `/products/getProductsByCategory/${categoryId}`
      );
      return response.data;
    },
    enabled: !!categoryId,
  });
};

// Create product
export const useCreateProduct = () => {
  const invalidateProducts = useInvalidateProducts();

  return useMutation({
    mutationFn: async (payload: CreateProductPayload) => {
      const formData = new FormData();
      formData.append("name", payload.name);
      if (payload.description) {
        formData.append("description", payload.description);
      }
      // if (payload.isActive !== undefined) {
      formData.append("isActive", String(payload.isActive));
      // }

      formData.append(
        "pricingGroupPrices",
        JSON.stringify(payload.pricingGroupPrices)
      );
      formData.append("subcategoryId", payload.subcategoryId);
      if (payload.image) {
        formData.append("image", payload.image);
      }
      if (payload.quantity) {
        formData.append("quantity", payload.quantity?.toString());
      }
      formData.append("serviceId", payload.serviceId.toString());
      if (payload.apiProviderId) {
        formData.append("apiProviderId", payload.apiProviderId);
      }

      // console.log("form data", formData);
      const response = await axiosPrivate.post(
        "/products/createProduct",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return response.data;
    },
    onSuccess: () => {
      invalidateProducts();
    },
  });
};

export const useUpdateProduct = () => {
  const invalidateProducts = useInvalidateProducts();

  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: { id: string } & UpdateProductPayload) => {
      const formData = new FormData();
      if (payload.name) formData.append("name", payload.name);
      if (payload.description)
        formData.append("description", payload.description);
      if (payload.quantity) formData.append("quantity", payload.quantity);
      if (payload.pricingGroupPrices) {
        formData.append(
          "pricingGroupPrices",
          JSON.stringify(payload.pricingGroupPrices)
        );
      }
      if (payload.subcategoryId)
        formData.append("subcategoryId", payload.subcategoryId);
      if (payload.serviceId) formData.append("serviceId", payload.serviceId);
      if (payload.image) formData.append("image", payload.image);
      if (payload.isActive !== undefined) {
        formData.append("isActive", String(payload.isActive));
      }
      if (payload.apiProviderId) {
        formData.append("apiProviderId", payload.apiProviderId);
      }

      const response = await axiosPrivate.put(
        `/products/updateProduct/${id}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return response.data;
    },
    onSuccess: () => {
      invalidateProducts();
    },
  });
};

// Delete product
export const useDeleteProduct = () => {
  const invalidateProducts = useInvalidateProducts();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await axiosPrivate.delete(
        `/products/deleteProduct/${id}`
      );
      return response.data;
    },
    onSuccess: () => {
      invalidateProducts();
    },
  });
};

// export const useProductServices = () => {
//   return useQuery({
//     queryKey: ["productServices"],
//     queryFn: async (): Promise<ProductServicesResponse> => {
//       const response = await axiosPrivate.post(
//         "/products/getProductServices",
//         { request: "servicelist" }, // ✅ still send body for consistency
//         {
//           headers: {
//             "Content-Type": "application/json",
//           },
//         }
//       );
//       return response.data;
//     },
//     staleTime: 10 * 60 * 1000,
//   });
// };

export const useProductServices = (providerId?: string | null) => {
  return useQuery({
    queryKey: ["productServices", providerId],
    enabled: !!providerId,
    queryFn: async () => {
      const { data } = await axiosPrivate.post(
        "/products/getProductServices",
        {
          request: "servicelist",
          providerId,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      return data;
    },
    staleTime: 10 * 60 * 1000,
  });
};

export const usePurchaseProduct = () => {
  return useMutation({
    mutationFn: async (
      payload: PurchaseProductPayload
    ): Promise<PurchaseProductResponse> => {
      const response = await axiosPrivate.post(
        `/products/${payload.productId}/purchase`,
        { playerId: payload.playerId }
      );
      return response.data;
    },
    onSuccess: () => {
      // Invalidate relevant queries after successful purchase
      queryClient.invalidateQueries({ queryKey: ["wallet", "balance"] });
      queryClient.invalidateQueries({ queryKey: ["wallet", "transactions"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
};
