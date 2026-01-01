import React, { useState, useMemo } from "react";
import { Search, Plus, Loader2 } from "lucide-react";
import { Button } from "../../common/Button";
import Modal from "../../common/Modal";
import CategoryAccordion from "./CategoryAccordion";

import {
  useCategoriesTree,
  useCreateParentCategory,
  useCreateSubcategory,
  useDeleteCategory,
  useUpdateCategory,
  type Category,
  type CreateParentCategoryPayload,
  type CreateSubcategoryPayload,
  type UpdateCategoryPayload,
} from "../../../api/UseCategories";
import ConfirmationModalNew from "../../common/NewConfirmationModal";
import { Input } from "../../common/Input";

import CategoryImageUpload from "./CategoryImageUploader";

interface CategoryManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CategoryManagementModal: React.FC<CategoryManagementModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryImage, setNewCategoryImage] = useState<File | null>(null);
  const [newImagePreview, setNewImagePreview] = useState<string>("");
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    category: Category | null;
  }>({ isOpen: false, category: null });

  // API hooks
  const { data: treeData, isLoading, error, refetch } = useCategoriesTree();
  const createParentMutation = useCreateParentCategory();
  const createSubMutation = useCreateSubcategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();

  // Filter categories based on search term
  const filteredCategories = useMemo(() => {
    if (!treeData?.categories || !searchTerm) {
      return treeData?.categories || [];
    }

    const filterCategory = (category: Category): Category | null => {
      const matchesSearch = category.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const filteredSubcategories = category.subcategories
        ?.map(filterCategory)
        .filter(Boolean) as Category[];

      if (matchesSearch || filteredSubcategories.length > 0) {
        return {
          ...category,
          subcategories: filteredSubcategories,
        };
      }

      return null;
    };

    return treeData.categories
      .map(filterCategory)
      .filter(Boolean) as Category[];
  }, [treeData?.categories, searchTerm]);

  const handleImageSelect = (file: File | null) => {
    if (file) {
      setNewCategoryImage(file);
      const reader = new FileReader();
      reader.onload = () => {
        setNewImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setNewCategoryImage(null);
      setNewImagePreview("");
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;

    try {
      if (selectedParentId) {
        (await createSubMutation.mutateAsync({
          name: newCategoryName.trim(),
          parentCategoryId: selectedParentId,
          image: newCategoryImage || undefined,
        })) as CreateSubcategoryPayload;
      } else {
        (await createParentMutation.mutateAsync({
          name: newCategoryName.trim(),
          image: newCategoryImage || undefined,
        })) as CreateParentCategoryPayload;
      }

      setNewCategoryName("");
      setNewCategoryImage(null);
      setNewImagePreview("");
      setSelectedParentId(null);
      setShowCreateForm(false);
    } catch (error) {
      console.error("Error creating category:", error);
    }
  };

  const handleUpdateCategory = async (
    id: string,
    name: string,
    image?: File,
    removeImage?: boolean
  ) => {
    try {
      (await updateMutation.mutateAsync({
        id,
        name,
        image,
        removeImage,
      })) as UpdateCategoryPayload;
    } catch (error) {
      console.error("Error updating category:", error);
    }
  };

  const handleCreateSubcategory = async (
    parentId: string,
    name: string,
    image?: File
  ) => {
    try {
      (await createSubMutation.mutateAsync({
        name,
        parentCategoryId: parentId,
        image,
      })) as CreateSubcategoryPayload;
    } catch (error) {
      console.error("Error creating subcategory:", error);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteConfirmation.category) return;

    try {
      await deleteMutation.mutateAsync(deleteConfirmation.category.id);
      setDeleteConfirmation({ isOpen: false, category: null });
    } catch (error) {
      console.error("Error deleting category:", error);
    }
  };

  const handleCancelCreate = () => {
    setShowCreateForm(false);
    setNewCategoryName("");
    setNewCategoryImage(null);
    setNewImagePreview("");
    setSelectedParentId(null);
  };

  const isCreating =
    createParentMutation.isPending || createSubMutation.isPending;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        heading="Manage Categories"
        subheading="Create, edit, and organize your product categories"
        widthClass="max-w-[700px] max-h-[90vh] overflow-y-auto"
      >
        <div className="space-y-6">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search categories and subcategories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-dark focus:border-transparent"
            />
          </div>

          {/* Create Category Button */}
          <div className="flex justify-end">
            <Button
              onClick={() => setShowCreateForm(true)}
              disabled={showCreateForm || isCreating}
              className="bg-primary-dark hover:bg-primary-dark/80 text-white px-4 py-2 rounded-full flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Category
            </Button>
          </div>

          {/* Create Category Form */}
          {showCreateForm && (
            <div className="bg-gray-50 p-6 rounded-lg border">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category Name
                  </label>
                  <Input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Enter category name"
                    className="w-full px-3 py-2"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Parent Category (Optional)
                  </label>
                  <select
                    value={selectedParentId || ""}
                    onChange={(e) =>
                      setSelectedParentId(e.target.value || null)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-dark focus:border-transparent"
                  >
                    <option value="">None (Create as parent category)</option>
                    {treeData?.categories?.map((category: Category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="max-w-md">
                  <CategoryImageUpload
                    onImageSelect={handleImageSelect}
                    preview={newImagePreview}
                    disabled={isCreating}
                    label="Category Image (Optional)"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={handleCreateCategory}
                    disabled={!newCategoryName.trim() || isCreating}
                    className="bg-primary-dark hover:bg-primary-dark/80 text-white px-6 py-2 rounded-full flex items-center gap-2"
                  >
                    {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isCreating ? "Creating..." : "Create"}
                  </Button>
                  <Button
                    onClick={handleCancelCreate}
                    disabled={isCreating}
                    variant="outline"
                    className="rounded-full flex items-center gap-2"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Categories List */}
          <div className="space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary-dark" />
                <span className="ml-2 text-gray-600">
                  Loading categories...
                </span>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-red-600 mb-4">Failed to load categories</p>
                <Button onClick={() => refetch()} variant="outline">
                  Retry
                </Button>
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchTerm
                  ? "No categories found matching your search"
                  : "No categories available"}
              </div>
            ) : (
              filteredCategories.map((category: Category) => (
                <CategoryAccordion
                  key={category.id}
                  category={category}
                  onUpdate={handleUpdateCategory}
                  onDelete={(cat) =>
                    setDeleteConfirmation({ isOpen: true, category: cat })
                  }
                  onCreateSubcategory={handleCreateSubcategory}
                  isUpdating={updateMutation.isPending}
                  isCreatingSubcategory={createSubMutation.isPending}
                />
              ))
            )}
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModalNew
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation({ isOpen: false, category: null })}
        onConfirm={handleDeleteCategory}
        title="Delete Category"
        message={`Are you sure you want to delete "${
          deleteConfirmation.category?.name
        }"? ${
          deleteConfirmation.category?.subcategories?.length
            ? "This will also delete all subcategories."
            : ""
        }`}
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={deleteMutation.isPending}
        variant="danger"
      />
    </>
  );
};

export default CategoryManagementModal;
