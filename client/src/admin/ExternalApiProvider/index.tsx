import { useEffect, useMemo, useState } from "react";
import Heading from "../../components/common/Heading";
import { Button } from "../../components/common/Button";
import { Table, type TableColumn } from "../../components/common/Table";
import Modal from "../../components/common/Modal";
import { Input } from "../../components/common/Input";
import ConfirmationModal from "../../components/common/ConfirmationModal";
import toast from "react-hot-toast";
import { Edit, Trash2 } from "lucide-react";
import {
  useApiProviders,
  useCreateApiProvider,
  useDeleteApiProvider,
  useTestApiProvider,
  useUpdateApiProvider,
} from "../../api/useExternalProvider";

interface ApiProvider {
  id: string;
  providerName: string;
  hostUrl: string;
  username: string;
  password: string;
  token?: string;
  active: boolean;
  createdAt: string;
}

const ExternalProviderSettings = () => {
  const { data, isLoading, refetch } = useApiProviders();
  const createMutation = useCreateApiProvider();
  const updateMutation = useUpdateApiProvider();
  const deleteMutation = useDeleteApiProvider();
  const testMutation = useTestApiProvider();

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 5,
    total: 0,
  });

  const providers: ApiProvider[] = data ?? [];

  useEffect(() => {
    if (pagination.total !== providers.length) {
      setPagination((prev) => ({
        ...prev,
        total: providers.length,
      }));
    }
  }, [providers]);

  const paginatedProviders = useMemo(() => {
    const start = (pagination.current - 1) * pagination.pageSize;
    const end = start + pagination.pageSize;
    return providers.slice(start, end);
  }, [providers, pagination.current, pagination.pageSize]);

  const handlePageChange = (page: number, pageSize: number) => {
    setPagination((prev) => ({
      ...prev,
      current: page,
      pageSize,
    }));
  };

  // const [showSecret, setShowSecret] = useState(false);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const [selectedProvider, setSelectedProvider] = useState<ApiProvider | null>(
    null
  );
  const [testingId, setTestingId] = useState<string | null>(null);

  const buildGeneratedUrl = (provider: ApiProvider) => {
    const base = provider.hostUrl.replace(/\/$/, "");

    return provider.username && provider.token
      ? `${base}/${provider.username}/${provider.token}`
      : base;
  };

  const [formData, setFormData] = useState({
    providerName: "",
    hostUrl: "https://megatec-center.com/api/rest",
    username: "",
    password: "",
    token: "",
    active: true,
  });

  const resetForm = () => {
    setFormData({
      providerName: "",
      hostUrl: "https://megatec-center.com/api/rest",
      username: "",
      password: "",
      token: "",
      active: true,
    });
  };

  // -------------------------
  // CREATE
  // -------------------------
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMutation.mutateAsync(formData);
      toast.success("API Provider created");
      setIsCreateOpen(false);
      resetForm();
      refetch();
    } catch {
      toast.error("Failed to create provider");
    }
  };
  const generatedUrl = useMemo(() => {
    if (!formData.hostUrl) return "";

    const base = formData.hostUrl.replace(/\/$/, "");

    // if (formData.username) params.append("username", formData.username);
    // if (formData.token) params.append("token", formData.token);

    return formData.username && formData.token
      ? `${base}/${formData.username}/${formData.token}`
      : base;
  }, [formData.hostUrl, formData.username, formData.token]);

  // -------------------------
  // EDIT
  // -------------------------
  const handleEditOpen = (provider: ApiProvider) => {
    setSelectedProvider(provider);
    setFormData({
      providerName: provider.providerName,
      hostUrl: provider.hostUrl,
      username: provider.username,
      password: "",
      token: provider.token || "",
      active: provider.active,
    });
    setIsEditOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProvider) return;

    try {
      await updateMutation.mutateAsync({
        id: selectedProvider.id,
        payload: formData,
      });
      toast.success("API Provider updated");
      setIsEditOpen(false);
      setSelectedProvider(null);
      resetForm();
      refetch();
    } catch {
      toast.error("Failed to update provider");
    }
  };

  // -------------------------
  // DELETE
  // -------------------------
  const handleDelete = async () => {
    if (!selectedProvider) return;

    try {
      await deleteMutation.mutateAsync(selectedProvider.id);
      toast.success("API Provider deleted");
      setIsDeleteOpen(false);
      setSelectedProvider(null);
      refetch();
    } catch {
      toast.error("Failed to delete provider");
    }
  };

  // const handleTestApi = async (provider: ApiProvider) => {
  //   const url = buildGeneratedUrl(provider);

  //   const formData = new FormData();
  //   formData.append("request", "balance");

  //   try {
  //     setTestingId(provider.id);

  //     const response = await fetch(url, {
  //       method: "POST",
  //       body: formData,
  //     });

  //     const data = await response.json();

  //     if (data?.status === true) {
  //       console.log("API provider is working");
  //       toast.success(`${provider.providerName} is working`);
  //     } else {
  //       console.error("API provider failed", data);
  //       toast.error(`${provider.providerName} failed`);
  //     }
  //   } catch (error) {
  //     console.error("API test error", error);
  //     toast.error("API request failed");
  //   } finally {
  //     setTestingId(null);
  //   }
  // };

  // -------------------------
  // TABLE COLUMNS
  // -------------------------

  const handleTestApi = async (provider: ApiProvider) => {
    try {
      console.log("Testing provider", provider);
      setTestingId(provider.id);

      const result = await testMutation.mutateAsync(provider.id);

      if (result?.working) {
        toast.success(`${provider.providerName} is working`);
      } else {
        toast.error(`${provider.providerName} failed`);
      }
    } catch (error) {
      console.error("API test error", error);
      toast.error("API test failed");
    } finally {
      setTestingId(null);
    }
  };

  const columns: TableColumn<ApiProvider>[] = [
    { key: "providerName", title: "Provider Name" },
    { key: "hostUrl", title: "Base URL" },
    { key: "username", title: "Username" },
    {
      key: "status",
      title: "Status",
      render: (_, record) => (
        <span
          className={` rounded-full text-sm ${
            record?.active ? "text-success" : "text-error"
          }`}
        >
          {record?.active ? "Active" : "Disabled"}
        </span>
      ),
    },
    {
      key: "actions",
      title: "Actions",
      align: "center",
      render: (_, record) => (
        <div className="flex gap-2 justify-center">
          <Button
            variant="outline"
            size="sm"
            disabled={testingId === record.id}
            className="px-3 py-1 text-primary-dark border-primary-dark hover:bg-gray-50 min-w-[140px] "
            onClick={() => handleTestApi(record)}
          >
            {testingId === record.id ? "Testing..." : "Test API"}
          </Button>
          <button
            onClick={() => handleEditOpen(record)}
            className="h-8 w-8 border rounded-full flex items-center justify-center"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => {
              setSelectedProvider(record);
              setIsDeleteOpen(true);
            }}
            className="h-8 w-8 border rounded-full flex items-center justify-center"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="bg-white">
      <div className="flex justify-between items-center mb-6">
        <Heading>API Providers</Heading>
        <Button onClick={() => setIsCreateOpen(true)}>Add API Provider</Button>
      </div>

      {/* <Table columns={columns} data={providers} loading={isLoading} />
       */}
      <Table
        columns={columns}
        data={paginatedProviders}
        loading={isLoading}
        pagination={{
          ...pagination,
          onChange: handlePageChange,
        }}
      />

      {/* CREATE MODAL */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          resetForm();
        }}
        heading="Create API Provider"
      >
        <form onSubmit={handleCreate} className="space-y-6 mt-6">
          <Input
            placeholder="Base URL"
            value={formData.hostUrl}
            onChange={(e) =>
              setFormData({ ...formData, hostUrl: e.target.value })
            }
            disabled
            required
          />
          <Input
            placeholder="Provider Name"
            value={formData.providerName}
            onChange={(e) =>
              setFormData({ ...formData, providerName: e.target.value })
            }
            required
          />

          <Input
            placeholder="Username"
            value={formData.username}
            onChange={(e) =>
              setFormData({ ...formData, username: e.target.value })
            }
            required
          />

          {/* <div className="relative">
            <Input
              type={showSecret ? "text" : "password"}
              placeholder="Password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              required
            />
            <button
              type="button"
              className="absolute right-2 top-3"
              onClick={() => setShowSecret(!showSecret)}
            >
              {showSecret ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div> */}

          <Input
            placeholder="API Key / Token (optional)"
            value={formData.token}
            onChange={(e) =>
              setFormData({ ...formData, token: e.target.value })
            }
          />
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.active}
              onChange={(e) =>
                setFormData({ ...formData, active: e.target.checked })
              }
            />
            <span className="text-sm">Set as Active</span>
          </label>
          {generatedUrl && (
            <div className="bg-gray-50 border rounded p-3 text-sm">
              <div className="text-xs text-gray-500 mb-1">
                New Generated URL (preview)
              </div>
              <code className="break-all">{generatedUrl}</code>
            </div>
          )}

          <Button
            type="submit"
            loading={createMutation.isPending}
            className="w-full"
          >
            Create Provider
          </Button>
        </form>
      </Modal>

      {/* EDIT MODAL */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => {
          resetForm();
          setIsEditOpen(false);
        }}
        heading="Edit API Provider"
      >
        <form onSubmit={handleUpdate} className="space-y-6 mt-6">
          <Input
            placeholder="Base URL"
            value={formData.hostUrl}
            onChange={(e) =>
              setFormData({ ...formData, hostUrl: e.target.value })
            }
            disabled
            required
          />
          <Input
            placeholder="Provider Name"
            value={formData.providerName}
            onChange={(e) =>
              setFormData({ ...formData, providerName: e.target.value })
            }
            required
          />

          <Input
            placeholder="Username"
            value={formData.username}
            onChange={(e) =>
              setFormData({ ...formData, username: e.target.value })
            }
            required
          />
          {/* <Input
            placeholder="New Password (leave empty to keep old password)"
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
          /> */}
          <Input
            placeholder="API Key"
            value={formData.token}
            onChange={(e) =>
              setFormData({ ...formData, token: e.target.value })
            }
          />
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.active}
              onChange={(e) =>
                setFormData({ ...formData, active: e.target.checked })
              }
            />
            <span className="text-sm">Set as Active</span>
          </label>

          {generatedUrl && (
            <div className="bg-gray-50 border rounded p-3 text-sm">
              <div className="text-xs text-gray-500 mb-1">
                Generated URL (preview)
              </div>
              <code className="break-all">{generatedUrl}</code>
            </div>
          )}

          <Button
            type="submit"
            loading={updateMutation.isPending}
            className="w-full"
          >
            Update Provider
          </Button>
        </form>
      </Modal>

      {/* DELETE MODAL */}
      <ConfirmationModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete API Provider"
        message={`Are you sure you want to delete "${selectedProvider?.providerName}"?`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
};

export default ExternalProviderSettings;
