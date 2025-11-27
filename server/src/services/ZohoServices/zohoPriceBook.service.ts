import axios from "axios";
import { ZOHO_ENV } from "../../config/Zoho";
import { ZohoService } from "../zoho.service";
import { ZohoTokensService } from "../zohoTokens.service";
import { ZohoItemService } from "./zohoItems.service";

export class ZohoPriceBookService {
  private tokensService: ZohoTokensService;
  private zohoService: ZohoService;
  private ZohoItemService: ZohoItemService;
  constructor() {
    this.tokensService = new ZohoTokensService();
    this.zohoService = new ZohoService();
    this.ZohoItemService = new ZohoItemService();
  }
  async createPriceBookInZoho(name: string) {
    const accessToken = await this.zohoService.getValidAccessToken();

    function sanitizePriceBookName(name: string) {
      return name
        .replace(/[^a-zA-Z0-9 _-]/g, "")
        .substring(0, 100)
        .trim();
    }
    const items = await this.ZohoItemService.getZohoItems(accessToken);

    // Suppose you already know the name of the item
    const myItem = items.find((item: any) => item.name === "Placeholder Item");
    const sanitizedName = sanitizePriceBookName(name);
    // currency_id: '7462675000000000097',
    // currency_code: 'USD',
    // NOTE: currency_id is required by Zoho Inventory API
    const payload = {
      name: sanitizedName,
      description: `This is ${sanitizedName} Pricing Group`,
      currency_id: "7462675000000000097",
      pricebook_type: "per_item",
      is_increase: true,
      rounding_type: "no_rounding",
      sales_or_purchase_type: "sales",
      pricebook_items: [
        {
          item_id: myItem.item_id,
          pricebook_rate: 100, // Correct field
        },
      ],
    };

    // Use the Inventory API base URL directly
    const inventoryBaseUrl = ZOHO_ENV.BOOKS_API; // e.g. "https://www.zohoapis.com/inventory/v1"
    const url = `${inventoryBaseUrl}/pricebooks?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`;

    try {
      const { data } = await axios.post(url, payload, {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      console.log("✅ Zoho price book created:", data.pricebook?.pricebook_id);
      return data.pricebook;
    } catch (error: any) {
      console.error(
        "❌ Failed to create Zoho price book:",
        error.response?.data || error.message
      );
      if (error.response?.data) {
        console.error(
          "Full error response:",
          JSON.stringify(error.response.data, null, 2)
        );
      }

      // Provide more context in error
      throw new Error(
        `Failed to create price book in Zoho: ` +
          `${error.response?.data?.message || error.message}. ` +
          `Ensure: (1) OAuth token has ZohoInventory.settings.CREATE scope, ` +
          `(2) payload includes required currency_id, and (3) your organization has pricing lists enabled.`
      );
    }
  }

  async updatePriceBookInZoho(
    priceBookId: string,
    updates: {
      name?: string;
      description?: string;
    }
  ) {
    const accessToken = await this.zohoService.getValidAccessToken();

    try {
      console.log(`🔄 Starting price book update: ${priceBookId}`);

      // ✅ STEP 1: Get current price book details
      console.log("   → Step 1: Fetching current price book details...");
      const { data: priceBookData } = await axios.get(
        `${ZOHO_ENV.BOOKS_API}/pricebooks/${priceBookId}?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
        {
          headers: {
            Authorization: `Zoho-oauthtoken ${accessToken}`,
          },
        }
      );

      const priceBook = priceBookData.pricebook;
      const oldPriceBookName = priceBook.name;
      const newPriceBookName = updates.name || oldPriceBookName;
      const priceBookItems = priceBook.pricebook_items || [];

      console.log(
        `   ✅ Found price book: "${oldPriceBookName}" with ${priceBookItems.length} items`
      );

      // ✅ STEP 2: Update the price book itself
      console.log("   → Step 2: Updating price book details...");
      const payload = {
        name: newPriceBookName,
        description: updates.description ?? priceBook.description,
        currency_id: priceBook.currency_id,
        pricebook_type: priceBook.pricebook_type,
        is_increase: priceBook.is_increase,
        rounding_type: priceBook.rounding_type || "no_rounding",
        sales_or_purchase_type: priceBook.sales_or_purchase_type || "sales",
        pricebook_items: priceBookItems.map((item: any) => ({
          item_id: item.item_id,
          pricebook_rate: item.pricebook_rate,
        })),
      };

      const { data: updatedData } = await axios.put(
        `${ZOHO_ENV.BOOKS_API}/pricebooks/${priceBookId}?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
        payload,
        {
          headers: {
            Authorization: `Zoho-oauthtoken ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("   ✅ Step 2 complete: Price book updated");

      // ✅ STEP 3: Update custom fields for all items if name changed
      if (
        updates.name &&
        updates.name !== oldPriceBookName &&
        priceBookItems.length > 0
      ) {
        console.log(
          `   → Step 3: Updating custom fields for ${priceBookItems.length} items (name changed)...`
        );

        for (const priceBookItem of priceBookItems) {
          const itemId = priceBookItem.item_id;
          const itemPrice = priceBookItem.pricebook_rate;

          try {
            // Get current item details
            const { data: itemData } = await axios.get(
              `${ZOHO_ENV.BOOKS_API}/items/${itemId}?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
              {
                headers: {
                  Authorization: `Zoho-oauthtoken ${accessToken}`,
                },
              }
            );

            const item = itemData.item;
            const customFields = item.custom_fields || [];

            // ✅ Update "Pricing Groups" field - replace old name with new name
            const pricingGroupsField = customFields.find(
              (cf: any) => cf.label === "Pricing Groups"
            );

            if (pricingGroupsField && pricingGroupsField.value) {
              // Parse current pricing groups: "Retail: 100 | Wholesale: 80 | VIP: 75"
              const pricingParts = pricingGroupsField.value.split(" | ");

              // Replace the old price book name with the new one
              const updatedPricingParts = pricingParts.map((part: string) => {
                const [groupName, price] = part.split(":").map((s) => s.trim());
                if (groupName === oldPriceBookName) {
                  return `${newPriceBookName}: ${price}`;
                }
                return part;
              });

              pricingGroupsField.value = updatedPricingParts.join(" | ");
            }

            // ✅ Min/Max prices stay the same since only the name changed
            // (The prices themselves haven't changed)

            // ✅ Update the item with updated custom fields
            const updatePayload = {
              custom_fields: customFields,
            };

            await axios.put(
              `${ZOHO_ENV.BOOKS_API}/items/${itemId}?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
              updatePayload,
              {
                headers: {
                  Authorization: `Zoho-oauthtoken ${accessToken}`,
                  "Content-Type": "application/json",
                },
              }
            );

            console.log(
              `      ✅ Updated custom fields for item ${itemId} ("${oldPriceBookName}" → "${newPriceBookName}")`
            );
          } catch (itemError: any) {
            console.warn(
              `      ⚠️ Could not update item ${itemId}:`,
              itemError.response?.data?.message || itemError.message
            );
            // Continue with other items
          }
        }

        console.log("   ✅ Step 3 complete: All custom fields updated");
      } else if (!updates.name || updates.name === oldPriceBookName) {
        console.log(
          "   ⏭️  Step 3 skipped: Name unchanged, no custom field updates needed"
        );
      }

      console.log(`✅ Price book updated successfully!`);
      console.log(`   Summary:`);
      console.log(`   - Old name: "${oldPriceBookName}"`);
      console.log(`   - New name: "${newPriceBookName}"`);
      if (updates.name && updates.name !== oldPriceBookName) {
        console.log(
          `   - Updated ${priceBookItems.length} items' custom fields`
        );
      }

      return updatedData.pricebook;
    } catch (error: any) {
      console.error(
        "❌ Failed to update Zoho price book:",
        error.response?.data || error.message
      );

      if (error.response?.data) {
        console.error(
          "Full error:",
          JSON.stringify(error.response.data, null, 2)
        );
      }

      throw new Error(
        `Failed to update price book in Zoho Books: ${error.response?.data?.message || error.message}`
      );
    }
  }

  async deletePriceBookInZoho(priceBookId: string) {
    const accessToken = await this.zohoService.getValidAccessToken();

    try {
      console.log(`🔄 Starting price book deletion: ${priceBookId}`);

      // ✅ STEP 1: Get price book details
      console.log("   → Step 1: Fetching price book details...");
      const { data: priceBookData } = await axios.get(
        `${ZOHO_ENV.BOOKS_API}/pricebooks/${priceBookId}?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
        {
          headers: {
            Authorization: `Zoho-oauthtoken ${accessToken}`,
          },
        }
      );

      const priceBook = priceBookData.pricebook;
      const priceBookName = priceBook.name;
      const priceBookItems = priceBook.pricebook_items || [];

      console.log(
        `   ✅ Found price book: "${priceBookName}" with ${priceBookItems.length} items`
      );

      // ✅ STEP 2: Update custom fields for all items in this price book
      if (priceBookItems.length > 0) {
        console.log(
          `   → Step 2: Updating custom fields for ${priceBookItems.length} items...`
        );

        for (const priceBookItem of priceBookItems) {
          const itemId = priceBookItem.item_id;

          try {
            // Get current item details
            const { data: itemData } = await axios.get(
              `${ZOHO_ENV.BOOKS_API}/items/${itemId}?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
              {
                headers: {
                  Authorization: `Zoho-oauthtoken ${accessToken}`,
                },
              }
            );

            const item = itemData.item;
            const customFields = item.custom_fields || [];

            // ✅ Update "Pricing Groups" field - remove this price book
            const pricingGroupsField = customFields.find(
              (cf: any) => cf.label === "Pricing Groups"
            );

            if (pricingGroupsField) {
              // Parse current pricing groups: "Retail: 100 | Wholesale: 80 | VIP: 75"
              const pricingParts = pricingGroupsField.value.split(" | ");

              // Filter out the price book being deleted
              const updatedPricingParts = pricingParts.filter(
                (part: string) => {
                  const groupName = part.split(":")[0].trim();
                  return groupName !== priceBookName;
                }
              );

              // Update the field
              pricingGroupsField.value = updatedPricingParts.join(" | ");

              // If no pricing groups left, set to empty
              if (updatedPricingParts.length === 0) {
                pricingGroupsField.value = "";
              }
            }

            // ✅ Update Min/Max prices if other pricing groups exist
            const updatedCustomFields = [...customFields];

            if (pricingGroupsField && pricingGroupsField.value) {
              // Recalculate min/max from remaining pricing groups
              const remainingPriceParts = pricingGroupsField.value.split(" | ");
              const remainingPrices = remainingPriceParts
                .map((part: string) => {
                  const price = part.split(":")[1]?.trim();
                  return price ? parseFloat(price) : null;
                })
                .filter((p: number | null) => p !== null) as number[];

              if (remainingPrices.length > 0) {
                const minPrice = Math.min(...remainingPrices);
                const maxPrice = Math.max(...remainingPrices);

                // Update Min Price field
                const minPriceField = updatedCustomFields.find(
                  (cf: any) => cf.label === "Min Price"
                );
                if (minPriceField) {
                  minPriceField.value = minPrice.toString();
                }

                // Update Max Price field
                const maxPriceField = updatedCustomFields.find(
                  (cf: any) => cf.label === "Max Price"
                );
                if (maxPriceField) {
                  maxPriceField.value = maxPrice.toString();
                }
              } else {
                // No pricing groups left, clear min/max
                updatedCustomFields.forEach((cf: any) => {
                  if (cf.label === "Min Price" || cf.label === "Max Price") {
                    cf.value = "";
                  }
                });
              }
            } else {
              // No pricing groups left, clear all pricing fields
              updatedCustomFields.forEach((cf: any) => {
                if (
                  cf.label === "Pricing Groups" ||
                  cf.label === "Min Price" ||
                  cf.label === "Max Price"
                ) {
                  cf.value = "";
                }
              });
            }

            // ✅ Update the item with cleaned custom fields
            const updatePayload = {
              custom_fields: updatedCustomFields,
            };

            await axios.put(
              `${ZOHO_ENV.BOOKS_API}/items/${itemId}?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
              updatePayload,
              {
                headers: {
                  Authorization: `Zoho-oauthtoken ${accessToken}`,
                  "Content-Type": "application/json",
                },
              }
            );

            console.log(
              `      ✅ Updated custom fields for item ${itemId} (removed "${priceBookName}")`
            );
          } catch (itemError: any) {
            console.warn(
              `      ⚠️ Could not update item ${itemId}:`,
              itemError.response?.data?.message || itemError.message
            );
            // Continue with other items
          }
        }

        console.log("   ✅ Step 2 complete: Custom fields updated");
      }

      // ✅ STEP 3: Clear all items from the price book
      if (priceBookItems.length > 0) {
        console.log(
          `   → Step 3: Clearing ${priceBookItems.length} items from price book...`
        );

        const payload = {
          name: priceBook.name,
          description: priceBook.description || "",
          currency_id: priceBook.currency_id,
          pricebook_type: priceBook.pricebook_type,
          is_increase: priceBook.is_increase,
          rounding_type: priceBook.rounding_type || "no_rounding",
          sales_or_purchase_type: priceBook.sales_or_purchase_type || "sales",
          pricebook_items: [], // ✅ Empty array to remove all items
        };

        await axios.put(
          `${ZOHO_ENV.BOOKS_API}/pricebooks/${priceBookId}?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
          payload,
          {
            headers: {
              Authorization: `Zoho-oauthtoken ${accessToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        console.log("   ✅ Step 3 complete: All items removed from price book");
      }

      // ✅ STEP 4: Delete the price book
      console.log("   → Step 4: Deleting price book...");
      const url = `${ZOHO_ENV.BOOKS_API}/pricebooks/${priceBookId}?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`;

      await axios.delete(url, {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
        },
      });

      console.log(`✅ Price book "${priceBookName}" deleted successfully!`);
      console.log(`   Summary:`);
      console.log(`   - Updated ${priceBookItems.length} items' custom fields`);
      console.log(
        `   - Removed ${priceBookItems.length} items from price book`
      );
      console.log(`   - Deleted price book "${priceBookName}"`);

      return {
        success: true,
        priceBookName,
        itemsUpdated: priceBookItems.length,
      };
    } catch (error: any) {
      console.error(
        "❌ Failed to delete Zoho price book:",
        error.response?.data || error.message
      );

      if (error.response?.data) {
        console.error(
          "Full error:",
          JSON.stringify(error.response.data, null, 2)
        );
      }

      throw new Error(
        `Failed to delete price book in Zoho Books: ${error.response?.data?.message || error.message}`
      );
    }
  }
}
