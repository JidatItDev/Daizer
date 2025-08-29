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
} from "lucide-react";
import type { Category } from "../../../api/UseCategories";

interface CategoryAccordionProps {
  category: Category;
  onUpdate: (id: string, name: string) => Promise<void>;
  onDelete: (category: Category) => void;
  onCreateSubcategory: (parentId: string, name: string) => Promise<void>;
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
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [editingSubName, setEditingSubName] = useState("");
  const [showAddSubcategory, setShowAddSubcategory] = useState(false);
  const [newSubcategoryName, setNewSubcategoryName] = useState("");

  const handleUpdateCategory = async () => {
    if (editName.trim() && editName !== category.name) {
      try {
        await onUpdate(category.id, editName.trim());
        setIsEditing(false);
      } catch (error) {
        console.error("Error updating category:", error);
      }
    } else {
      setIsEditing(false);
      setEditName(category.name);
    }
  };

  const handleUpdateSubcategory = async (subId: string) => {
    if (editingSubName.trim()) {
      try {
        await onUpdate(subId, editingSubName.trim());
        setEditingSubId(null);
        setEditingSubName("");
      } catch (error) {
        console.error("Error updating subcategory:", error);
      }
    } else {
      setEditingSubId(null);
      setEditingSubName("");
    }
  };

  const handleCreateSubcategory = async () => {
    if (newSubcategoryName.trim()) {
      try {
        await onCreateSubcategory(category.id, newSubcategoryName.trim());
        setNewSubcategoryName("");
        setShowAddSubcategory(false);
        setIsExpanded(true); // Expand to show the new subcategory
      } catch (error) {
        console.error("Error creating subcategory:", error);
      }
    }
  };

  const startEditingSubcategory = (sub: Category) => {
    setEditingSubId(sub.id);
    setEditingSubName(sub.name);
  };

  const cancelSubcategoryEdit = () => {
    setEditingSubId(null);
    setEditingSubName("");
  };

  const hasSubcategories =
    category.subcategories && category.subcategories.length > 0;

  return (
    <div className="border border-gray-400 rounded-md ">
      {/* Parent Category Header */}
      <div className="flex items-center justify-between p-4  ">
        <div className="flex items-center flex-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mr-2 p-1 hover:bg-gray-200 rounded"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-gray-600" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-600" />
            )}
          </button>

          {isEditing ? (
            <div className="flex items-center gap-2 flex-1">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="flex-1 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary-dark focus:border-transparent"
                onKeyPress={(e) => e.key === "Enter" && handleUpdateCategory()}
                autoFocus
              />
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
                }}
                disabled={isUpdating}
                className="p-1 text-red-600 hover:text-red-800 disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <span className="font-medium text-gray-900">{category.name}</span>
          )}
        </div>

        {!isEditing && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddSubcategory(true)}
              className="text-primary-dark hover:text-primary-dark/80 h-8 w-8 border border-primary-dark rounded-full flex items-center justify-center py-2 md:py-3"
              title="Add Subcategory"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              onClick={() => setIsEditing(true)}
              className="text-primary-dark hover:text-primary-dark/80 h-8 w-8 border border-primary-dark rounded-full flex items-center justify-center py-2 md:py-3"
            >
              <Edit size={16} />
            </button>
            <button
              onClick={() => onDelete(category)}
              className="text-red-600 hover:text-red-800 h-8 w-8 border border-red-600 rounded-full flex items-center justify-center py-2 md:py-3"
              title="Delete Category"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Add Subcategory Form */}
      {showAddSubcategory && (
        <div className="px-4 pb-4 border-t">
          <div className="flex items-center gap-2 mt-3">
            <input
              type="text"
              value={newSubcategoryName}
              onChange={(e) => setNewSubcategoryName(e.target.value)}
              placeholder="Enter subcategory name"
              className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary-dark focus:border-transparent"
              onKeyPress={(e) => e.key === "Enter" && handleCreateSubcategory()}
              autoFocus
            />
            <button
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
            </button>
            <button
              onClick={() => {
                setShowAddSubcategory(false);
                setNewSubcategoryName("");
              }}
              disabled={isCreatingSubcategory}
              className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Subcategories */}
      {isExpanded && hasSubcategories && (
        <div className="border-t border-gray-200 ">
          {category.subcategories!.map((subcategory) => (
            <div
              key={subcategory.id}
              className="flex items-center justify-between px-8 py-3 border-b border-gray-100 last:border-b-0"
            >
              {editingSubId === subcategory.id ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="text"
                    value={editingSubName}
                    onChange={(e) => setEditingSubName(e.target.value)}
                    className="flex-1 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary-dark focus:border-transparent"
                    onKeyPress={(e) =>
                      e.key === "Enter" &&
                      handleUpdateSubcategory(subcategory.id)
                    }
                    autoFocus
                  />
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
              ) : (
                <>
                  <span className="text-gray-700">{subcategory.name}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEditingSubcategory(subcategory)}
                      className="text-primary-dark hover:text-primary-dark/80 h-8 w-8 border border-primary-dark rounded-full flex items-center justify-center py-2 md:py-3"
                    >
                      <Edit size={16} />{" "}
                    </button>

                    <button
                      onClick={() => onDelete(subcategory)}
                      className="text-red-600 hover:text-red-800 h-8 w-8 border border-red-600 rounded-full flex items-center justify-center py-2 md:py-3"
                      title="Delete Category"
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
