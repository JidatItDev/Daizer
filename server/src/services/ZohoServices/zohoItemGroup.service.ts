import axios from "axios";
import { ZOHO_ENV } from "../../config/Zoho";
import { ZohoService } from "../zoho.service";
import { ZohoTokensService } from "../zohoTokens.service";

export class ZohoItemGroupService {
  private tokensService: ZohoTokensService;
  private zohoService: ZohoService;

  constructor() {
    this.tokensService = new ZohoTokensService();
    this.zohoService = new ZohoService();
  }
  async createItemGroupInZoho(category: {
    name: string;
    isParent: boolean;
    parentGroupId?: string;
  }) {
    const accessToken = await this.zohoService.getValidAccessToken();
    const INVENTORY_API = "https://www.zohoapis.com/inventory/v1";
    // Get active items
    const itemsUrl = `${INVENTORY_API}/items?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}&filter_by=Status.Active`;

    const { data: itemsData } = await axios.get(itemsUrl, {
      headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
    });

    const activeItems =
      itemsData.items?.filter((i: any) => i.status === "active") || [];

    if (activeItems.length === 0) {
      throw new Error("No active items found");
    }

    // Build item group payload for Inventory API
    const payload = {
      group_name: category.name,
      unit: "qty",
      description: `Category: ${category.name}`,
      items: activeItems.slice(0, 2).map((item: any) => ({
        name: `${category.name}-${item.name}`,
        rate: item.rate || 0,
        purchase_rate: item.purchase_rate || item.rate || 0,
        reorder_level: 5,
        initial_stock: 0,
        initial_stock_rate: 0,
        sku: `${category.name}-${item.sku || "SKU"}`,
      })),
    };

    const url = `${INVENTORY_API}/itemgroups?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`;

    try {
      const { data } = await axios.post(url, payload, {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
          "Content-Type": "application/json",
        },
      });
      // for (const group of pricingGroups) {
      //   await axios.put(
      //     `https://www.zohoapis.com/books/v3/pricelists/${group.pricelistId}?organization_id=${ORG_ID}`,
      //     {
      //       items: [
      //         {
      //           item_id: zohoItemId,
      //           rate: group.price, // group price for this item
      //         },
      //       ],
      //     },
      //     { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } }
      //   );
      // }
      console.log("✅ Item group created in Zoho Inventory:", data.group_id);
      return data;
    } catch (error: any) {
      console.error("Payload sent:", JSON.stringify(payload, null, 2));
      console.error("Error:", error.response?.data);
      throw new Error(
        `Failed: ${error.response?.data?.message || error.message}`
      );
    }
  }
  async updateItemGroupInZoho(groupId: string, name: string) {
    const accessToken = await this.zohoService.getValidAccessToken();

    const payload = {
      group_name: name,
    };

    const url = `${ZOHO_ENV.BOOKS_API}/itemgroups/${groupId}?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`;

    try {
      const { data } = await axios.put(url, payload, {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      console.log("✅ Zoho item group updated:", groupId);
      return data.item_group;
    } catch (error: any) {
      console.error(
        "❌ Failed to update Zoho item group:",
        error.response?.data || error.message
      );
      throw new Error("Failed to update item group in Zoho Books");
    }
  }

  async deleteItemGroupInZoho(groupId: string) {
    const accessToken = await this.zohoService.getValidAccessToken();

    const url = `${ZOHO_ENV.BOOKS_API}/itemgroups/${groupId}?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`;

    try {
      await axios.delete(url, {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
        },
      });

      console.log("✅ Zoho item group deleted:", groupId);
      return true;
    } catch (error: any) {
      console.error(
        "❌ Failed to delete Zoho item group:",
        error.response?.data || error.message
      );
      throw new Error("Failed to delete item group in Zoho Books");
    }
  }
}
