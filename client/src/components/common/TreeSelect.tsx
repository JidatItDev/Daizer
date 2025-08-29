import React, { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

interface TreeNode {
  id: string;
  name: string;
  parentCategoryId: string | null;
  subcategories?: TreeNode[];
}

interface TreeSelectProps {
  data: TreeNode[];
  value: string;
  onChange: (value: string, node: TreeNode) => void;
  placeholder?: string;
  error?: string;
}

export const TreeSelect: React.FC<TreeSelectProps> = ({
  data,
  value,
  onChange,
  placeholder = "Select category",
  error,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Filter to only show categories that have subcategories
  const categoriesWithSubcategories = data.filter(
    (category) => category.subcategories && category.subcategories.length > 0
  );

  const selectedNode = findNodeById(data, value);

  function findNodeById(nodes: TreeNode[], id: string): TreeNode | null {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.subcategories) {
        const found = findNodeById(node.subcategories, id);
        if (found) return found;
      }
    }
    return null;
  }

  const toggleExpanded = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const handleSelect = (node: TreeNode) => {
    // Only allow selection of subcategories (leaf nodes)
    if (!node.subcategories || node.subcategories.length === 0) {
      onChange(node.id, node);
      setIsOpen(false);
    }
  };

  const renderNode = (node: TreeNode, level: number = 0) => {
    const hasChildren = node.subcategories && node.subcategories.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    const isSelectable = !hasChildren; // Only subcategories are selectable
    const isSelected = value === node.id;

    return (
      <div key={node.id}>
        <div
          className={`flex items-center px-3 py-2 cursor-pointer hover:bg-gray-50 
            ${isSelected ? "bg-blue-50 text-blue-600" : ""}
            ${!isSelectable ? "text-gray-500" : "text-gray-900"}
          `}
          style={{ paddingLeft: `${12 + level * 20}px` }}
          onClick={() => handleSelect(node)}
        >
          {hasChildren && (
            <button
              onClick={(e) => toggleExpanded(node.id, e)}
              className="mr-2 p-0.5 hover:bg-gray-200 rounded"
            >
              {isExpanded ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
            </button>
          )}

          <span className={`flex-1 ${!isSelectable ? "font-medium" : ""}`}>
            {node.name}
            {!isSelectable && <span className="text-xs ml-2">(Category)</span>}
          </span>
        </div>

        {hasChildren && isExpanded && (
          <div>
            {node.subcategories!.map((child) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="relative">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full py-3 px-0 border-b-[2px] cursor-pointer flex items-center justify-between
          ${error ? "border-red-300" : "border-gray-300 focus-within:border-black"}
        `}
      >
        <span
          className={`lg:text-lg md:text-base text-sm ${selectedNode ? "text-black" : "text-gray-500"}`}
        >
          {selectedNode ? `${selectedNode.name}` : placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`transform transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </div>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
            {categoriesWithSubcategories.length > 0 ? (
              categoriesWithSubcategories.map((node) => renderNode(node))
            ) : (
              <div className="px-3 py-2 text-gray-500 text-sm">
                No categories with subcategories found
              </div>
            )}
          </div>
        </>
      )}

      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
    </div>
  );
};
