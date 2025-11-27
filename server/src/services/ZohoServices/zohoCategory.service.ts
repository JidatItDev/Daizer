import axios from "axios";
import { ZohoService } from "../zoho.service";
import { ZOHO_ENV } from "../../config/Zoho";

export class ZohoCategoryService {
  private zohoService: ZohoService;

  constructor() {
    this.zohoService = new ZohoService();
  }

  /**
   * Update category name in all items that have this category
   */
  async updateCategoryInZohoItems(
    oldCategoryName: string,
    newCategoryName: string
  ) {
    const accessToken = await this.zohoService.getValidAccessToken();

    try {
      console.log(
        `🔄 Updating category from "${oldCategoryName}" to "${newCategoryName}" in Zoho items...`
      );

      // Step 1: Get all items (with pagination support)
      let allItems: any[] = [];
      let page = 1;
      let hasMorePages = true;

      while (hasMorePages) {
        const { data: itemsData } = await axios.get(
          `${ZOHO_ENV.BOOKS_API}/items?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}&page=${page}&per_page=200`,
          {
            headers: {
              Authorization: `Zoho-oauthtoken ${accessToken}`,
            },
          }
        );

        const items = itemsData.items || [];
        allItems = [...allItems, ...items];

        hasMorePages = itemsData.page_context?.has_more_page || false;
        page++;
      }

      console.log(`   📊 Found ${allItems.length} total items in Zoho`);

      let updatedCount = 0;

      // Step 2: Find and update items with matching category
      for (const item of allItems) {
        // ✅ Check the cf_category field (not custom_fields array)
        const categoryValue = item.cf_category || item.cf_category_unformatted;
        console.log("categoryValue:", categoryValue);
        console.log("oldCategoryName:", oldCategoryName);
        if (categoryValue === oldCategoryName) {
          console.log(`→ Updating item: ${item.name} (${item.item_id})`);

          try {
            // ✅ Update using custom_fields array format (required for PUT request)
            const updatePayload = {
              custom_fields: [
                {
                  label: "Category",
                  value: newCategoryName,
                },
              ],
            };

            await axios.put(
              `${ZOHO_ENV.BOOKS_API}/items/${item.item_id}?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
              updatePayload,
              {
                headers: {
                  Authorization: `Zoho-oauthtoken ${accessToken}`,
                  "Content-Type": "application/json",
                },
              }
            );

            console.log(`      ✅ Updated: ${item.name}`);
            updatedCount++;
          } catch (updateError: any) {
            console.error(
              `      ❌ Failed to update item ${item.item_id}:`,
              updateError.response?.data?.message || updateError.message
            );
            // Continue with other items
          }
        }
      }

      console.log(
        `✅ Updated ${updatedCount} items with new category name: "${newCategoryName}"`
      );
      return updatedCount;
    } catch (error: any) {
      console.error(
        "❌ Failed to update category in Zoho items:",
        error.response?.data || error.message
      );
      throw new Error("Failed to update category in Zoho Books");
    }
  }
  async updateCategoryInZohoItemsDetailed(
    oldCategoryName: string,
    newCategoryName: string
  ) {
    const accessToken = await this.zohoService.getValidAccessToken();

    try {
      console.log(
        `🔄 Updating category from "${oldCategoryName}" to "${newCategoryName}" (detailed method)...`
      );

      // Step 1: Get all items
      let allItems: any[] = [];
      let page = 1;
      let hasMorePages = true;

      while (hasMorePages) {
        const { data: itemsData } = await axios.get(
          `${ZOHO_ENV.BOOKS_API}/items?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}&page=${page}&per_page=200`,
          {
            headers: {
              Authorization: `Zoho-oauthtoken ${accessToken}`,
            },
          }
        );

        const items = itemsData.items || [];
        allItems = [...allItems, ...items];

        hasMorePages = itemsData.page_context?.has_more_page || false;
        page++;
      }

      console.log(`   📊 Found ${allItems.length} total items in Zoho`);

      let updatedCount = 0;

      // Step 2: Find items with matching category
      const itemsToUpdate = allItems.filter((item) => {
        const categoryValue = item.cf_category || item.cf_category_unformatted;
        return categoryValue === oldCategoryName;
      });

      console.log(
        `   📦 Found ${itemsToUpdate.length} items with category "${oldCategoryName}"`
      );

      // Step 3: Get full details and update each item
      for (const item of itemsToUpdate) {
        try {
          console.log(
            `   → Fetching details for: ${item.name} (${item.item_id})`
          );

          // Get full item details (includes custom_fields in proper format)
          const { data: itemDetailsData } = await axios.get(
            `${ZOHO_ENV.BOOKS_API}/items/${item.item_id}?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
            {
              headers: {
                Authorization: `Zoho-oauthtoken ${accessToken}`,
              },
            }
          );

          const fullItem = itemDetailsData.item;
          const customFields = fullItem.custom_fields || [];

          // Update the category field
          const updatedCustomFields = customFields.map((field: any) => {
            if (field.label === "Category") {
              return { ...field, value: newCategoryName };
            }
            return field;
          });

          // If category field doesn't exist, add it
          if (!customFields.some((f: any) => f.label === "Category")) {
            updatedCustomFields.push({
              label: "Category",
              value: newCategoryName,
            });
          }

          // Update the item
          await axios.put(
            `${ZOHO_ENV.BOOKS_API}/items/${item.item_id}?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
            {
              custom_fields: updatedCustomFields,
            },
            {
              headers: {
                Authorization: `Zoho-oauthtoken ${accessToken}`,
                "Content-Type": "application/json",
              },
            }
          );

          console.log(`      ✅ Updated: ${item.name}`);
          updatedCount++;
        } catch (updateError: any) {
          console.error(
            `      ❌ Failed to update item ${item.item_id}:`,
            updateError.response?.data?.message || updateError.message
          );
          // Continue with other items
        }
      }

      console.log(
        `✅ Updated ${updatedCount} items with new category name: "${newCategoryName}"`
      );
      return updatedCount;
    } catch (error: any) {
      console.error(
        "❌ Failed to update category in Zoho items:",
        error.response?.data || error.message
      );
      throw new Error("Failed to update category in Zoho Books");
    }
  }
  async findItemsByCategory(categoryName: string): Promise<any[]> {
    const accessToken = await this.zohoService.getValidAccessToken();

    try {
      let allItems: any[] = [];
      let page = 1;
      let hasMorePages = true;

      while (hasMorePages) {
        const { data: itemsData } = await axios.get(
          `${ZOHO_ENV.BOOKS_API}/items?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}&page=${page}&per_page=200`,
          {
            headers: {
              Authorization: `Zoho-oauthtoken ${accessToken}`,
            },
          }
        );

        const items = itemsData.items || [];
        allItems = [...allItems, ...items];

        hasMorePages = itemsData.page_context?.has_more_page || false;
        page++;
      }

      // Find items matching the category
      const matchingItems = allItems.filter((item) => {
        const categoryValue = item.cf_category || item.cf_category_unformatted;
        return categoryValue === categoryName;
      });

      return matchingItems;
    } catch (error: any) {
      console.error("Failed to find items by category:", error.message);
      throw error;
    }
  }

  /**
   * Remove category from all items that have this category
   */
  async removeCategoryFromZohoItems(categoryName: string) {
    const accessToken = await this.zohoService.getValidAccessToken();

    try {
      console.log(
        `🔄 Removing category "${categoryName}" from all Zoho items...`
      );

      // Step 1: Get all items (with pagination support)
      let allItems: any[] = [];
      let page = 1;
      let hasMorePages = true;

      while (hasMorePages) {
        const { data: itemsData } = await axios.get(
          `${ZOHO_ENV.BOOKS_API}/items?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}&page=${page}&per_page=200`,
          {
            headers: {
              Authorization: `Zoho-oauthtoken ${accessToken}`,
            },
          }
        );

        const items = itemsData.items || [];
        allItems = [...allItems, ...items];

        hasMorePages = itemsData.page_context?.has_more_page || false;
        page++;
      }

      console.log(`   📊 Found ${allItems.length} total items in Zoho`);

      // ✅ Log all unique categories for debugging
      const uniqueCategories = new Set(
        allItems
          .map((item) => item.cf_category || item.cf_category_unformatted)
          .filter(Boolean)
      );
      console.log(
        `   📋 Unique categories in Zoho:`,
        Array.from(uniqueCategories)
      );
      console.log(`   🔍 Looking for items with category: "${categoryName}"`);

      let updatedCount = 0;

      // Step 2: Find and update items with matching category
      for (const item of allItems) {
        // ✅ Check the cf_category field (not custom_fields array)
        const categoryValue = item.cf_category || item.cf_category_unformatted;

        // ✅ Debug log
        if (categoryValue) {
          console.log(
            `   📦 Item: "${item.name}" has category: "${categoryValue}"`
          );
        }

        if (categoryValue === categoryName) {
          console.log(
            `   → ✅ MATCH! Removing category from: ${item.name} (${item.item_id})`
          );

          try {
            // ✅ Remove/clear the category custom field
            const updatePayload = {
              custom_fields: [
                {
                  label: "Category",
                  value: "", // ✅ Set to empty string to clear
                },
              ],
            };

            await axios.put(
              `${ZOHO_ENV.BOOKS_API}/items/${item.item_id}?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
              updatePayload,
              {
                headers: {
                  Authorization: `Zoho-oauthtoken ${accessToken}`,
                  "Content-Type": "application/json",
                },
              }
            );

            console.log(`      ✅ Cleared category for: ${item.name}`);
            updatedCount++;
          } catch (updateError: any) {
            console.error(
              `      ❌ Failed to update item ${item.item_id}:`,
              updateError.response?.data?.message || updateError.message
            );
            // Continue with other items
          }
        }
      }

      // ✅ Warning if no items were updated
      if (updatedCount === 0) {
        console.warn(
          `⚠️ WARNING: No items found with category "${categoryName}"`
        );
        console.warn(
          `   Available categories in Zoho:`,
          Array.from(uniqueCategories)
        );
      }

      console.log(`✅ Removed category from ${updatedCount} items in Zoho`);
      return updatedCount;
    } catch (error: any) {
      console.error(
        "❌ Failed to remove category from Zoho items:",
        error.response?.data || error.message
      );
      throw new Error("Failed to remove category from Zoho Books");
    }
  }
}
