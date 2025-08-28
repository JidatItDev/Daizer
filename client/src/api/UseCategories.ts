import { useQuery, useMutation } from "@tanstack/react-query";
import axiosPrivate from "../AxiosInstances/PrivateAxiosInstance";
import { queryClient } from "../main";

// Types
export interface Category {
  id: string;
  name: string;
  parentCategoryId: string | null;
  image?: { name: string; url: string };
  createdAt: string;
  updatedAt: string;
  subcategories?: Category[];
}

export interface CategoriesResponse {
  success: boolean;
  categories: Category[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface TreeResponse {
  success: boolean;
  categories: Category[];
}

const useInvalidateAll = () => {
  return () => queryClient.invalidateQueries({ queryKey: [], exact: false });
};

// Get categories tree (main hook for the modal)
export const useCategoriesTree = () => {
  return useQuery({
    queryKey: ["categoriesTree"],
    queryFn: async (): Promise<TreeResponse> => {
      const response = await axiosPrivate.get("/categories/ListAllCategories");
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Get all categories with search
export const useAllCategories = (
  filters: { page?: number; limit?: number } = {}
) => {
  const { page = 1, limit = 100 } = filters;

  const params = {
    ...(page && { page }),
    ...(limit && { limit }),
  };

  return useQuery({
    queryKey: ["allCategories", params],
    queryFn: async (): Promise<CategoriesResponse> => {
      const response = await axiosPrivate.get("/categories/getAllCategories", {
        params,
      });
      return response.data;
    },
  });
};

// Get parent categories
export const useParentCategories = (
  filters: { page?: number; limit?: number } = {}
) => {
  const { page = 1, limit = 50 } = filters;

  const params = {
    ...(page && { page }),
    ...(limit && { limit }),
  };

  return useQuery({
    queryKey: ["parentCategories", params],
    queryFn: async (): Promise<CategoriesResponse> => {
      const response = await axiosPrivate.get(
        "/categories/getAllParentCategories",
        {
          params,
        }
      );
      return response.data;
    },
  });
};

// Get subcategories of a specific category
export const useSubcategoriesOfCategory = (categoryId: string) => {
  return useQuery({
    queryKey: ["subcategoriesOf", categoryId],
    queryFn: async (): Promise<{
      success: boolean;
      subcategories: Category[];
    }> => {
      const response = await axiosPrivate.get(
        `/categories/getSpecific_Subcategories_Of_Category/${categoryId}`
      );
      return response.data;
    },
    enabled: !!categoryId,
  });
};

// Create parent category
export const useCreateParentCategory = () => {
  const invalidateAll = useInvalidateAll();
  return useMutation({
    mutationFn: async (payload: { name: string }) => {
      const response = await axiosPrivate.post(
        "/categories/createParentCategory",
        payload
      );
      return response.data;
    },
    onSuccess: () => {
      invalidateAll();
    },
  });
};

// Create subcategory
export const useCreateSubcategory = () => {
  const invalidateAll = useInvalidateAll();
  return useMutation({
    mutationFn: async (payload: { name: string; parentCategoryId: string }) => {
      const response = await axiosPrivate.post(
        "/categories/createSubCategory",
        payload
      );
      return response.data;
    },
    onSuccess: () => {
      invalidateAll();
    },
  });
};

// Update category
export const useUpdateCategory = () => {
  const invalidateAll = useInvalidateAll();
  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: {
      id: string;
      name?: string;
      parentCategoryId?: string | null;
    }) => {
      const response = await axiosPrivate.put(
        `/categories/updateCategory/${id}`,
        payload
      );
      return response.data;
    },
    onSuccess: () => {
      invalidateAll();
    },
  });
};

// Delete category
export const useDeleteCategory = () => {
  const invalidateAll = useInvalidateAll();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await axiosPrivate.delete(
        `/categories/deleteCategory/${id}`
      );
      return response.data;
    },
    onSuccess: () => {
      invalidateAll();
    },
  });
};
