import { useEffect, useState, type ChangeEvent } from "react";
import { Button } from "../../components/common/Button";
import Heading from "../../components/common/Heading";
import { Input } from "../../components/common/Input";
import { Table, type TableColumn } from "../../components/common/Table";
import Modal from "../../components/common/Modal";
import { useConfig, useUpdateOrCreateConfig } from "../../api/useConfig";
import { useConfigContext } from "../../context/ConfigContext";

import { Edit } from "lucide-react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import {
  useEmailTemplates,
  useUpdateEmailTemplate,
} from "../../api/useEmailTemplates";
import toast from "react-hot-toast";

export interface EmailTemplate {
  id: string;
  name: string;
  type: string;
  subject: string;
  body: string;
}

const Settings = () => {
  const { data: config } = useConfig();
  const updateConfig = useUpdateOrCreateConfig();
  const configobj = useConfigContext();
  const logoUrl = configobj?.logoUrl || "";
  const [paginationState, setPaginationState] = useState({
    page: 1,
    limit: 10,
  });

  const { data, isLoading } = useEmailTemplates(paginationState);
  const { mutateAsync: updateTemplate } = useUpdateEmailTemplate();
  const templates = data?.templates || [];
  const pagination = data?.pagination;

  const [editMode, setEditMode] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [minBalance, setMinBalance] = useState("0");

  // Email templates modal state
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<EmailTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({
    subject: "",
    body: "",
  });
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  const handlePaginationChange = (page: number, pageSize: number) => {
    setPaginationState({
      page,
      limit: pageSize,
    });
  };

  useEffect(() => {
    if (config?.config) {
      setMinBalance(config?.config?.minimumBalanceRequirement || "0");
    }
  }, [config?.config]);

  const handleLogoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
    }
  };

  const handleSave = () => {
    const formData = new FormData();
    const mainBalanceRequirement = String(minBalance);
    formData.append("minimumBalanceRequirement", mainBalanceRequirement);

    if (logoFile) {
      formData.append("logo", logoFile);
    }

    updateConfig.mutate(formData, {
      onSuccess: () => {
        setEditMode(false);
      },
    });
  };

  const handleCancel = () => {
    setEditMode(false);
    if (config) {
      setMinBalance(config.minBalance || "1000");
    }
    setLogoFile(null);
  };

  // Email templates handlers
  const handleEditTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setTemplateForm({
      subject: template.subject,
      body: template.body,
    });
    setIsTemplateModalOpen(true);
  };

  const handleSaveTemplate = async () => {
    if (!selectedTemplate) return;

    setIsSavingTemplate(true);
    try {
      await updateTemplate({
        id: selectedTemplate.id,
        payload: {
          subject: templateForm.subject,
          body: templateForm.body,
        },
      });
      setIsTemplateModalOpen(false);
      setSelectedTemplate(null);
      toast.success("Template updated successfully");
    } catch (error) {
      console.error("Failed to update template:", error);
      toast.error("Failed to update template");
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleCloseTemplateModal = () => {
    setIsTemplateModalOpen(false);
    setSelectedTemplate(null);
    setTemplateForm({ subject: "", body: "" });
  };

  // Table columns for email templates
  const templateColumns: TableColumn<EmailTemplate>[] = [
    {
      key: "name",
      title: "Template Name",
    },
    {
      key: "type",
      title: "Type",
    },
    {
      key: "subject",
      title: "Subject",
      render: (_, record) => (
        <div className="max-w-xs truncate" title={record.subject}>
          {record.subject}
        </div>
      ),
    },
    {
      key: "action",
      title: "Action",
      align: "center",
      render: (_, record) => (
        <button
          onClick={() => handleEditTemplate(record)}
          className="text-primary-dark hover:text-black h-8 w-8 border border-primary-dark rounded-full flex items-center justify-center py-2 md:py-3"
        >
          <Edit size={16} />
        </button>
      ),
    },
  ];
  const modules = {
    toolbar: [
      [{ header: [1, 2, 3, 4, 5, 6, false] }],
      ["bold", "italic", "underline", "strike"],
      [{ list: "ordered" }, { list: "bullet" }],
      [{ color: [] }],
      ["link"],
      ["clean"],
    ],
  };
  const handleQuillChange = (content: string) => {
    setTemplateForm((prev) => ({ ...prev, body: content }));
  };

  return (
    <div className="bg-white">
      <div className="flex justify-between items-center mb-6">
        <Heading>Platform Settings</Heading>
        <Button
          variant="primary"
          size="md"
          disabled={editMode}
          onClick={() => setEditMode(true)}
        >
          Edit
        </Button>
      </div>

      <div className="bg-white border-t-2 border-black/50 pt-12">
        <div className="flex items-center gap-24">
          {/* Logo Section */}
          <div className="mb-12">
            <div className="relative inline-block">
              <div className="w-48 h-48 rounded-full overflow-hidden shadow-lg flex items-center justify-center">
                {logoFile ? (
                  <img
                    src={URL.createObjectURL(logoFile)}
                    alt="Preview Logo"
                    className="w-full h-full object-cover"
                  />
                ) : logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Current Logo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>No Logo</span>
                )}
              </div>

              {editMode && (
                <label className="absolute bottom-2 right-2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center cursor-pointer hover:bg-gray-50 border-2 border-gray-300">
                  <svg
                    className="w-5 h-5 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                    />
                  </svg>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Minimum Balance Section */}
          {/* <div className="mb-12">
            {editMode ? (
              <Input
                label="Minimum Balance Limit:"
                type="number"
                value={minBalance}
                onChange={(e) => setMinBalance(e.target.value)}
                placeholder="Write Amount"
                className="w-[500px]"
              />
            ) : (
              <div className="bg-gray-50 rounded-lg p-6 w-[500px] border border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-normal text-gray-800">
                    Minimum Balance Limit:
                  </span>
                  <span className="text-lg font-semibold text-gray-900">
                    {minBalance}
                  </span>
                </div>
              </div>
            )}
          </div> */}
        </div>
        {editMode && (
          <div className="flex justify-end gap-4 mt-8">
            <Button variant="secondary" size="md" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleSave}
              disabled={updateConfig.isPending}
            >
              {updateConfig.isPending ? "Saving..." : "Save "}
            </Button>
          </div>
        )}

        {/* Email Templates Section */}
        <div className="mt-12">
          <div className="flex justify-between items-center mb-6">
            <Heading>Email Templates</Heading>
          </div>

          <div className="bg-white border-t-2 border-black/50">
            <Table
              columns={templateColumns}
              data={templates}
              loading={isLoading}
              pagination={{
                current: paginationState.page,
                pageSize: paginationState.limit,
                total: pagination?.totalTemplates,
                onChange: handlePaginationChange,
              }}
            />
          </div>
        </div>
      </div>

      {/* Edit Template Modal */}
      <Modal
        isOpen={isTemplateModalOpen}
        onClose={handleCloseTemplateModal}
        heading="Edit Email Template"
        subheading={`Modify the ${selectedTemplate?.name} template`}
        widthClass="max-w-[920px] max-h-[90vh] overflow-y-auto"
      >
        <div className="space-y-6 mt-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Template Name
            </label>
            <Input
              type="text"
              value={selectedTemplate?.name || ""}
              disabled
              className="bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Template Type
            </label>
            <Input
              type="text"
              value={selectedTemplate?.type || ""}
              disabled
              className="bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject
            </label>
            <Input
              type="text"
              value={templateForm.subject}
              onChange={(e) =>
                setTemplateForm((prev) => ({
                  ...prev,
                  subject: e.target.value,
                }))
              }
              placeholder="Enter email subject"
            />
          </div>

          <div className="mb-4 h-full">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Body
            </label>

            <ReactQuill
              theme="snow"
              value={templateForm.body}
              onChange={handleQuillChange}
              modules={modules}
              style={{ height: 250 }}
            />
          </div>

          <div className="flex justify-end gap-4 pt-[40px]">
            <Button
              variant="secondary"
              size="md"
              onClick={handleCloseTemplateModal}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleSaveTemplate}
              disabled={isSavingTemplate}
            >
              {isSavingTemplate ? "Saving..." : "Save Template"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Settings;
