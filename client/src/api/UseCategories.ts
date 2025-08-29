import { useQuery, useMutation } from "@tanstack/react-query";
import axiosPrivate from "../AxiosInstances/PrivateAxiosInstance";
import { queryClient } from "../main";

// Types
export interface Category {
  id: string;
  name: string;
  parentCategoryId: string | null;
  image?: { name: string; url: string } | null;
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

export interface CreateParentCategoryPayload {
  name: string;
  image?: File;
}

export interface CreateSubcategoryPayload {
  name: string;
  parentCategoryId: string;
  image?: File;
}

export interface UpdateCategoryPayload {
  id: string;
  name?: string;
  parentCategoryId?: string | null;
  image?: File;
  removeImage?: boolean;
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
    mutationFn: async (payload: CreateParentCategoryPayload) => {
      const formData = new FormData();
      formData.append("name", payload.name);

      if (payload.image) {
        formData.append("image", payload.image);
      }

      const response = await axiosPrivate.post(
        "/categories/createParentCategory",
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
      invalidateAll();
    },
  });
};

// Create subcategory
export const useCreateSubcategory = () => {
  const invalidateAll = useInvalidateAll();
  return useMutation({
    mutationFn: async (payload: CreateSubcategoryPayload) => {
      const formData = new FormData();
      formData.append("name", payload.name);
      formData.append("parentCategoryId", payload.parentCategoryId);

      if (payload.image) {
        formData.append("image", payload.image);
      }

      const response = await axiosPrivate.post(
        "/categories/createSubCategory",
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
      invalidateAll();
    },
  });
};

// Update category
export const useUpdateCategory = () => {
  const invalidateAll = useInvalidateAll();
  return useMutation({
    mutationFn: async (payload: UpdateCategoryPayload) => {
      const { id, ...updateData } = payload;
      const formData = new FormData();

      if (updateData.name !== undefined) {
        formData.append("name", updateData.name);
      }

      if (updateData.parentCategoryId !== undefined) {
        formData.append("parentCategoryId", updateData.parentCategoryId || "");
      }

      if (updateData.image) {
        formData.append("image", updateData.image);
      }

      if (updateData.removeImage) {
        formData.append("removeImage", "true");
      }

      const response = await axiosPrivate.put(
        `/categories/updateCategory/${id}`,
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
