import axios from "axios";
import { ZOHO_ENV } from "../../config/Zoho";
import { ZohoService } from "../zoho.service";
import { ZohoTokensService } from "../zohoTokens.service";
import { ZohoItemService } from "./zohoItems.service";
import zohoHttpClient from "../../utils/zohoHttpClient";

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

    const myItem = items.find((item: any) => item.name === "Placeholder Item");
    const sanitizedName = sanitizePriceBookName(name);

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
          pricebook_rate: 100,
        },
      ],
    };

    const inventoryBaseUrl = ZOHO_ENV.BOOKS_API;
    const url = `${inventoryBaseUrl}/pricebooks?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`;

    try {
      const { data } = await zohoHttpClient.post(url, payload, {
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

      throw new Error(
        `Failed to create price book in Zoho: ` +
          `${error.response?.data?.message || error.message}. ` +
          `Ensure: (1) OAuth token has ZohoInventory.settings.CREATE scope, ` +
          `(2) payload includes required currency_id, and (3) your organization has pricing lists enabled.`
      );
    }
  }

  /**
   * Helper: Get all customers that have a specific pricing group
   */
  private async getCustomersWithPricingGroup(
    accessToken: string,
    priceBookName: string
  ): Promise<any[]> {
    try {
      console.log(
        `   → Fetching customers with pricing group "${priceBookName}"...`
      );

      const url = `${ZOHO_ENV.BOOKS_API}/contacts?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`;
      const { data } = await zohoHttpClient.get(url, {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
        },
      });

      const customers = data.contacts || [];

      // Filter customers that have this pricing group in their custom field
      const matchingCustomers = customers.filter((customer: any) => {
        const customFields = customer.custom_fields || [];
        const pricingGroupField = customFields.find(
          (cf: any) => cf.label === "Pricing Group"
        );
        return pricingGroupField?.value === priceBookName;
      });

      console.log(
        `   ✅ Found ${matchingCustomers.length} customers with pricing group "${priceBookName}"`
      );
      return matchingCustomers;
    } catch (error: any) {
      console.error(
        "❌ Failed to fetch customers:",
        error.response?.data || error.message
      );
      return [];
    }
  }

  /**
   * Helper: Update customer's pricing group custom field
   */
  private async updateCustomerPricingGroup(
    accessToken: string,
    customerId: string,
    newPricingGroup: string | null
  ): Promise<void> {
    try {
      // Get current customer details
      const { data: customerData } = await zohoHttpClient.get(
        `${ZOHO_ENV.BOOKS_API}/contacts/${customerId}?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
        {
          headers: {
            Authorization: `Zoho-oauthtoken ${accessToken}`,
          },
        }
      );

      const customer = customerData.contact;
      const customFields = customer.custom_fields || [];

      // Find and update the Pricing Group field
      const pricingGroupField = customFields.find(
        (cf: any) => cf.label === "Pricing Group"
      );

      if (pricingGroupField) {
        pricingGroupField.value = newPricingGroup || "";
      }

      // Update customer
      const payload = {
        custom_fields: customFields,
      };

      await zohoHttpClient.put(
        `${ZOHO_ENV.BOOKS_API}/contacts/${customerId}?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
        payload,
        {
          headers: {
            Authorization: `Zoho-oauthtoken ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log(
        `      ✅ Updated customer ${customerId} pricing group to: "${
          newPricingGroup || "(empty)"
        }"`
      );
    } catch (error: any) {
      console.warn(
        `      ⚠️ Could not update customer ${customerId}:`,
        error.response?.data?.message || error.message
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
      const { data: priceBookData } = await zohoHttpClient.get(
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

      const { data: updatedData } = await zohoHttpClient.put(
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

          try {
            const { data: itemData } = await zohoHttpClient.get(
              `${ZOHO_ENV.BOOKS_API}/items/${itemId}?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
              {
                headers: {
                  Authorization: `Zoho-oauthtoken ${accessToken}`,
                },
              }
            );

            const item = itemData.item;
            const customFields = item.custom_fields || [];

            const pricingGroupsField = customFields.find(
              (cf: any) => cf.label === "Pricing Groups"
            );

            if (pricingGroupsField && pricingGroupsField.value) {
              const pricingParts = pricingGroupsField.value.split(" | ");

              const updatedPricingParts = pricingParts.map((part: string) => {
                const [groupName, price] = part.split(":").map((s) => s.trim());
                if (groupName === oldPriceBookName) {
                  return `${newPriceBookName}: ${price}`;
                }
                return part;
              });

              pricingGroupsField.value = updatedPricingParts.join(" | ");
            }

            const updatePayload = {
              custom_fields: customFields,
            };

            await zohoHttpClient.put(
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
          }
        }

        console.log("   ✅ Step 3 complete: All items' custom fields updated");
      } else {
        console.log(
          "   ⏭️  Step 3 skipped: Name unchanged, no item custom field updates needed"
        );
      }

      // ✅ STEP 4: Update customers' pricing group custom field if name changed
      if (updates.name && updates.name !== oldPriceBookName) {
        console.log("   → Step 4: Updating customers' pricing group field...");

        const customers = await this.getCustomersWithPricingGroup(
          accessToken,
          oldPriceBookName
        );

        if (customers.length > 0) {
          for (const customer of customers) {
            await this.updateCustomerPricingGroup(
              accessToken,
              customer.contact_id,
              newPriceBookName
            );
          }
          console.log(
            `   ✅ Step 4 complete: Updated ${customers.length} customers' pricing group field`
          );
        } else {
          console.log(
            "   ⏭️  Step 4: No customers found with this pricing group"
          );
        }
      } else {
        console.log(
          "   ⏭️  Step 4 skipped: Name unchanged, no customer updates needed"
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
        `Failed to update price book in Zoho Books: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  }

  async deletePriceBookInZoho(priceBookId: string) {
    const accessToken = await this.zohoService.getValidAccessToken();

    try {
      console.log(`🔄 Starting price book deletion: ${priceBookId}`);

      // ✅ STEP 1: Get price book details
      console.log("   → Step 1: Fetching price book details...");
      const { data: priceBookData } = await zohoHttpClient.get(
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
            const { data: itemData } = await zohoHttpClient.get(
              `${ZOHO_ENV.BOOKS_API}/items/${itemId}?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
              {
                headers: {
                  Authorization: `Zoho-oauthtoken ${accessToken}`,
                },
              }
            );

            const item = itemData.item;
            const customFields = item.custom_fields || [];

            const pricingGroupsField = customFields.find(
              (cf: any) => cf.label === "Pricing Groups"
            );

            if (pricingGroupsField) {
              const pricingParts = pricingGroupsField.value.split(" | ");

              const updatedPricingParts = pricingParts.filter(
                (part: string) => {
                  const groupName = part.split(":")[0].trim();
                  return groupName !== priceBookName;
                }
              );

              pricingGroupsField.value = updatedPricingParts.join(" | ");

              if (updatedPricingParts.length === 0) {
                pricingGroupsField.value = "";
              }
            }

            const updatedCustomFields = [...customFields];

            if (pricingGroupsField && pricingGroupsField.value) {
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

                const minPriceField = updatedCustomFields.find(
                  (cf: any) => cf.label === "Min Price"
                );
                if (minPriceField) {
                  minPriceField.value = minPrice.toString();
                }

                const maxPriceField = updatedCustomFields.find(
                  (cf: any) => cf.label === "Max Price"
                );
                if (maxPriceField) {
                  maxPriceField.value = maxPrice.toString();
                }
              } else {
                updatedCustomFields.forEach((cf: any) => {
                  if (cf.label === "Min Price" || cf.label === "Max Price") {
                    cf.value = "";
                  }
                });
              }
            } else {
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

            const updatePayload = {
              custom_fields: updatedCustomFields,
            };

            await zohoHttpClient.put(
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
              `✅ Updated custom fields for item ${itemId} (removed "${priceBookName}")`
            );
          } catch (itemError: any) {
            console.warn(
              `      ⚠️ Could not update item ${itemId}:`,
              itemError.response?.data?.message || itemError.message
            );
          }
        }

        console.log("✅ Step 2 complete: Items' custom fields updated");
      }

      // ✅ STEP 3: Remove pricing group from all customers
      console.log("→ Step 3: Removing pricing group from customers...");

      const customers = await this.getCustomersWithPricingGroup(
        accessToken,
        priceBookName
      );

      if (customers.length > 0) {
        for (const customer of customers) {
          await this.updateCustomerPricingGroup(
            accessToken,
            customer.contact_id,
            null // Set to empty/null
          );
        }
        console.log(
          `   ✅ Step 3 complete: Removed pricing group from ${customers.length} customers`
        );
      } else {
        console.log(
          "   ⏭️  Step 3: No customers found with this pricing group"
        );
      }

      // ✅ STEP 4: Clear all items from the price book
      if (priceBookItems.length > 0) {
        console.log(
          `   → Step 4: Clearing ${priceBookItems.length} items from price book...`
        );

        const payload = {
          name: priceBook.name,
          description: priceBook.description || "",
          currency_id: priceBook.currency_id,
          pricebook_type: priceBook.pricebook_type,
          is_increase: priceBook.is_increase,
          rounding_type: priceBook.rounding_type || "no_rounding",
          sales_or_purchase_type: priceBook.sales_or_purchase_type || "sales",
          pricebook_items: [],
        };

        await zohoHttpClient.put(
          `${ZOHO_ENV.BOOKS_API}/pricebooks/${priceBookId}?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
          payload,
          {
            headers: {
              Authorization: `Zoho-oauthtoken ${accessToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        console.log("   ✅ Step 4 complete: All items removed from price book");
      }

      // ✅ STEP 5: Delete the price book
      console.log("   → Step 5: Deleting price book...");
      const url = `${ZOHO_ENV.BOOKS_API}/pricebooks/${priceBookId}?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`;

      await zohoHttpClient.delete(url, {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
        },
      });

      console.log(`✅ Price book "${priceBookName}" deleted successfully!`);
      console.log(`   Summary:`);
      console.log(`   - Updated ${priceBookItems.length} items' custom fields`);
      console.log(
        `   - Removed pricing group from ${customers.length} customers`
      );
      console.log(
        `   - Removed ${priceBookItems.length} items from price book`
      );
      console.log(`   - Deleted price book "${priceBookName}"`);

      return {
        success: true,
        priceBookName,
        itemsUpdated: priceBookItems.length,
        customersUpdated: customers.length,
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
        `Failed to delete price book in Zoho Books: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  }
}
