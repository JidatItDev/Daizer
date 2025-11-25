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

      // Step 1: Get all items
      const { data: itemsData } = await axios.get(
        `${ZOHO_ENV.BOOKS_API}/items?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
        {
          headers: {
            Authorization: `Zoho-oauthtoken ${accessToken}`,
          },
        }
      );

      const allItems = itemsData.items || [];
      let updatedCount = 0;

      // Step 2: Find and update items with matching category
      for (const item of allItems) {
        // Check if item has custom fields with the old category name
        const customFields = item.custom_fields || [];
        const categoryField = customFields.find(
          (field: any) =>
            field.label === "Category" && field.value === oldCategoryName
        );

        if (categoryField) {
          console.log(`   → Updating item: ${item.name} (${item.item_id})`);

          // Update the custom field with new category name
          const updatedCustomFields = customFields.map((field: any) =>
            field.label === "Category"
              ? { ...field, value: newCategoryName }
              : field
          );

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

          updatedCount++;
        }
      }

      console.log(
        `✅ Updated ${updatedCount} items with new category name: ${newCategoryName}`
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

  /**
   * Remove category from all items that have this category
   */
  async removeCategoryFromZohoItems(categoryName: string) {
    const accessToken = await this.zohoService.getValidAccessToken();

    try {
      console.log(
        `🔄 Removing category "${categoryName}" from all Zoho items...`
      );

      // Step 1: Get all items
      const { data: itemsData } = await axios.get(
        `${ZOHO_ENV.BOOKS_API}/items?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
        {
          headers: {
            Authorization: `Zoho-oauthtoken ${accessToken}`,
          },
        }
      );

      const allItems = itemsData.items || [];
      let updatedCount = 0;

      // Step 2: Find and update items with matching category
      for (const item of allItems) {
        const customFields = item.custom_fields || [];
        const hasCategoryField = customFields.some(
          (field: any) =>
            field.label === "Category" && field.value === categoryName
        );

        if (hasCategoryField) {
          console.log(
            `   → Removing category from: ${item.name} (${item.item_id})`
          );

          // Remove the category custom field or set it to empty
          const updatedCustomFields = customFields.map((field: any) =>
            field.label === "Category" ? { ...field, value: "" } : field
          );

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

          updatedCount++;
        }
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
