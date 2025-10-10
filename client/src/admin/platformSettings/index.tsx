import { useEffect, useState, type ChangeEvent } from "react";
import { Button } from "../../components/common/Button";
import Heading from "../../components/common/Heading";
import { Input } from "../../components/common/Input";
import { useConfig, useUpdateOrCreateConfig } from "../../api/useConfig";
import { useConfigContext } from "../../context/ConfigContext";

const Settings = () => {
  const { data: config } = useConfig();
  const updateConfig = useUpdateOrCreateConfig();
  // const { logoUrl } = useConfigContext();
  const configobj = useConfigContext();
  const logoUrl = configobj?.logoUrl || "";

  const [editMode, setEditMode] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [minBalance, setMinBalance] = useState("0");

  useEffect(() => {
    if (config?.config) {
      console.log("object", config?.config);
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
    // const mainBalanceRequirement = minBalance.toString();
    const mainBalanceRequirement = String(minBalance);
    formData.append("minimumBalanceRequirement", mainBalanceRequirement);

    if (logoFile) {
      formData.append("logo", logoFile); // backend should accept "logo"
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
          <div className="mb-12">
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
          </div>
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
      </div>
    </div>
  );
};

export default Settings;
