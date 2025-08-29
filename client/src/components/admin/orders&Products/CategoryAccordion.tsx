import React, { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Edit,
  Trash2,
  Plus,
  Check,
  X,
  Loader2,
  ChevronsRight,
  Image as ImageIcon,
} from "lucide-react";
import type { Category } from "../../../api/UseCategories";
import { Input } from "../../common/Input";
import { Button } from "../../common/Button";
import CategoryImageUpload from "./CategoryImageUploader";

interface CategoryAccordionProps {
  category: Category;
  onUpdate: (
    id: string,
    name: string,
    image?: File,
    removeImage?: boolean
  ) => Promise<void>;
  onDelete: (category: Category) => void;
  onCreateSubcategory: (
    parentId: string,
    name: string,
    image?: File
  ) => Promise<void>;
  isUpdating: boolean;
  isCreatingSubcategory: boolean;
}

const CategoryAccordion: React.FC<CategoryAccordionProps> = ({
  category,
  onUpdate,
  onDelete,
  onCreateSubcategory,
  isUpdating,
  isCreatingSubcategory,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(category.name);
  const [editImage, setEditImage] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string>("");
  const [removeImage, setRemoveImage] = useState(false);

  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [editingSubName, setEditingSubName] = useState("");
  const [editingSubImage, setEditingSubImage] = useState<File | null>(null);
  const [editingSubImagePreview, setEditingSubImagePreview] =
    useState<string>("");
  const [removeSubImage, setRemoveSubImage] = useState(false);

  const [showAddSubcategory, setShowAddSubcategory] = useState(false);
  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const [newSubcategoryImage, setNewSubcategoryImage] = useState<File | null>(
    null
  );
  const [newSubImagePreview, setNewSubImagePreview] = useState<string>("");

  const handleImageSelect = (
    file: File | null,
    type: "edit" | "sub" | "new"
  ) => {
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const preview = reader.result as string;
        switch (type) {
          case "edit":
            setEditImage(file);
            setEditImagePreview(preview);
            setRemoveImage(false);
            break;
          case "sub":
            setEditingSubImage(file);
            setEditingSubImagePreview(preview);
            setRemoveSubImage(false);
            break;
          case "new":
            setNewSubcategoryImage(file);
            setNewSubImagePreview(preview);
            break;
        }
      };
      reader.readAsDataURL(file);
    } else {
      switch (type) {
        case "edit":
          setEditImage(null);
          setEditImagePreview("");
          setRemoveImage(true);
          break;
        case "sub":
          setEditingSubImage(null);
          setEditingSubImagePreview("");
          setRemoveSubImage(true);
          break;
        case "new":
          setNewSubcategoryImage(null);
          setNewSubImagePreview("");
          break;
      }
    }
  };

  const handleUpdateCategory = async () => {
    if (
      editName.trim() &&
      (editName !== category.name || editImage || removeImage)
    ) {
      try {
        await onUpdate(
          category.id,
          editName.trim(),
          editImage || undefined,
          removeImage
        );
        setIsEditing(false);
        setEditImage(null);
        setEditImagePreview("");
        setRemoveImage(false);
      } catch (error) {
        console.error("Error updating category:", error);
      }
    } else {
      setIsEditing(false);
      setEditName(category.name);
      setEditImage(null);
      setEditImagePreview("");
      setRemoveImage(false);
    }
  };

  const handleUpdateSubcategory = async (subId: string) => {
    if (editingSubName.trim()) {
      try {
        await onUpdate(
          subId,
          editingSubName.trim(),
          editingSubImage || undefined,
          removeSubImage
        );
        setEditingSubId(null);
        setEditingSubName("");
        setEditingSubImage(null);
        setEditingSubImagePreview("");
        setRemoveSubImage(false);
      } catch (error) {
        console.error("Error updating subcategory:", error);
      }
    } else {
      setEditingSubId(null);
      setEditingSubName("");
      setEditingSubImage(null);
      setEditingSubImagePreview("");
      setRemoveSubImage(false);
    }
  };

  const handleCreateSubcategory = async () => {
    if (newSubcategoryName.trim()) {
      try {
        await onCreateSubcategory(
          category.id,
          newSubcategoryName.trim(),
          newSubcategoryImage || undefined
        );
        setNewSubcategoryName("");
        setNewSubcategoryImage(null);
        setNewSubImagePreview("");
        setShowAddSubcategory(false);
        setIsExpanded(true);
      } catch (error) {
        console.error("Error creating subcategory:", error);
      }
    }
  };

  const startEditingSubcategory = (sub: Category) => {
    setEditingSubId(sub.id);
    setEditingSubName(sub.name);
    setEditingSubImage(null);
    setEditingSubImagePreview("");
    setRemoveSubImage(false);
  };

  const cancelSubcategoryEdit = () => {
    setEditingSubId(null);
    setEditingSubName("");
    setEditingSubImage(null);
    setEditingSubImagePreview("");
    setRemoveSubImage(false);
  };

  const hasSubcategories =
    category.subcategories && category.subcategories.length > 0;

  return (
    <div className="">
      {/* Parent Category Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-300">
        <div className="flex flex-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mr-2 p-1 h-fit hover:bg-gray-200 rounded"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-gray-600" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-600" />
            )}
          </button>

          {/* Category Image */}
          {category.image && (
            <div className="mr-3">
              <img
                src={category.image.url}
                alt={category.name}
                className="w-8 h-8 object-cover rounded border border-gray-300"
              />
            </div>
          )}

          {isEditing ? (
            <div className="flex flex-col gap-3 flex-1">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full flex-1 px-2 py-1"
                    onKeyPress={(e) =>
                      e.key === "Enter" && handleUpdateCategory()
                    }
                    autoFocus
                  />
                </div>

                <button
                  onClick={handleUpdateCategory}
                  disabled={isUpdating}
                  className="p-1 text-primary-dark hover:text-primary-dark/80 disabled:opacity-50"
                >
                  {isUpdating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditName(category.name);
                    setEditImage(null);
                    setEditImagePreview("");
                    setRemoveImage(false);
                  }}
                  disabled={isUpdating}
                  className="p-1 text-red-600 hover:text-red-800 disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="">
                <CategoryImageUpload
                  onImageSelect={(file) => handleImageSelect(file, "edit")}
                  currentImage={category.image}
                  preview={editImagePreview}
                  disabled={isUpdating}
                  label="Update Image"
                />
              </div>
            </div>
          ) : (
            <span className="font-medium text-gray-900">{category.name}</span>
          )}
        </div>

        {!isEditing && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddSubcategory(true)}
              className="text-primary-dark hover:text-primary-dark/80 h-8 w-8 border border-primary-dark rounded-full flex items-center justify-center"
              title="Add Subcategory"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              onClick={() => setIsEditing(true)}
              className="text-primary-dark hover:text-primary-dark/80 h-8 w-8 border border-primary-dark rounded-full flex items-center justify-center"
              title="Edit Category"
            >
              <Edit size={16} />
            </button>
            <button
              onClick={() => onDelete(category)}
              className="text-red-600 hover:text-red-800 h-8 w-8 border border-red-600 rounded-full flex items-center justify-center"
              title="Delete Category"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Add Subcategory Form */}
      {showAddSubcategory && (
        <div className="px-4 pb-4 border-t w-full bg-gray-50">
          <div className="space-y-4 mt-4">
            <Input
              type="text"
              value={newSubcategoryName}
              onChange={(e) => setNewSubcategoryName(e.target.value)}
              placeholder="Enter subcategory name"
              onKeyPress={(e) => e.key === "Enter" && handleCreateSubcategory()}
              autoFocus
            />

            <div className="max-w-xs">
              <CategoryImageUpload
                onImageSelect={(file) => handleImageSelect(file, "new")}
                preview={newSubImagePreview}
                disabled={isCreatingSubcategory}
                label="Subcategory Image (Optional)"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleCreateSubcategory}
                disabled={!newSubcategoryName.trim() || isCreatingSubcategory}
                className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
              >
                {isCreatingSubcategory ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Add
              </Button>
              <Button
                onClick={() => {
                  setShowAddSubcategory(false);
                  setNewSubcategoryName("");
                  setNewSubcategoryImage(null);
                  setNewSubImagePreview("");
                }}
                disabled={isCreatingSubcategory}
                className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Subcategories */}
      {isExpanded && hasSubcategories && (
        <div className="border-b border-gray-300">
          {category.subcategories!.map((subcategory) => (
            <div
              key={subcategory.id}
              className="flex items-center justify-between px-8 py-3 border-b border-gray-100 last:border-b-0"
            >
              {editingSubId === subcategory.id ? (
                <div className="flex flex-col gap-3 flex-1">
                  <div className="flex items-center gap-2">
                    <ChevronsRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <div className="flex-1">
                      <Input
                        type="text"
                        value={editingSubName}
                        onChange={(e) => setEditingSubName(e.target.value)}
                        className="flex-1 px-2 py-1"
                        onKeyPress={(e) =>
                          e.key === "Enter" &&
                          handleUpdateSubcategory(subcategory.id)
                        }
                        autoFocus
                      />{" "}
                    </div>
                    <button
                      onClick={() => handleUpdateSubcategory(subcategory.id)}
                      disabled={isUpdating}
                      className="p-1 text-primary-dark hover:text-primary-dark/80 disabled:opacity-50"
                    >
                      {isUpdating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={cancelSubcategoryEdit}
                      disabled={isUpdating}
                      className="p-1 text-red-600 hover:text-red-800 disabled:opacity-50"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="ml-6">
                    <CategoryImageUpload
                      onImageSelect={(file) => handleImageSelect(file, "sub")}
                      currentImage={subcategory.image}
                      preview={editingSubImagePreview}
                      disabled={isUpdating}
                      label="Update Subcategory Image"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 flex-1">
                    <ChevronsRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    {subcategory.image && (
                      <img
                        src={subcategory.image.url}
                        alt={subcategory.name}
                        className="w-6 h-6 object-cover rounded border border-gray-300"
                      />
                    )}
                    <span className="text-gray-700">{subcategory.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEditingSubcategory(subcategory)}
                      className="text-primary-dark hover:text-primary-dark/80 h-8 w-8 border border-primary-dark rounded-full flex items-center justify-center"
                      title="Edit Subcategory"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => onDelete(subcategory)}
                      className="text-red-600 hover:text-red-800 h-8 w-8 border border-red-600 rounded-full flex items-center justify-center"
                      title="Delete Subcategory"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CategoryAccordion;
