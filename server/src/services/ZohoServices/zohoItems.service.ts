import axios from "axios";
import { ZOHO_ENV } from "../../config/Zoho";
import { ZohoService } from "../zoho.service";
import { ZohoTokensService } from "../zohoTokens.service";
function generateSafeFilename(originalUrl: string, itemId?: string): string {
  const urlParts = originalUrl.split("/");
  const originalFilename = urlParts[urlParts.length - 1] || "image.jpg";

  // Extract extension
  let extension = ".jpg";
  const extMatch = originalFilename.match(/\.(jpg|jpeg|png|gif|webp)$/i);
  if (extMatch) {
    extension = extMatch[0].toLowerCase();
  }

  // ✅ Create short filename: item-{id}-{timestamp}.ext (always < 50 chars)
  const timestamp = Date.now();
  const shortId = itemId ? itemId.substring(0, 8) : "new";
  const filename = `item-${shortId}-${timestamp}${extension}`;

  console.log(
    `📝 Generated safe filename: ${filename} (${filename.length} chars)`
  );
  return filename;
}
export class ZohoItemService {
  private tokensService: ZohoTokensService;
  private zohoService: ZohoService;

  constructor() {
    this.tokensService = new ZohoTokensService();
    this.zohoService = new ZohoService();
  }

  // ✅ SOLUTION 1: Upload image directly when creating the item (RECOMMENDED)
  async createItemInZoho(product: {
    name: string;
    description?: string;
    rate: string;
    categoryName?: string;
    sku?: string;
    unit?: string;
    pricingGroupPrices?: {
      id: string;
      name: string;
      price: string;
      rate: number;
      zohoPriceBookId?: string;
    }[];
    isActive?: string;
    imageUrl?: string;
  }) {
    const accessToken = await this.zohoService.getValidAccessToken();

    // ✅ Build custom fields INCLUDING pricing group info
    const customFields: any[] = [];

    if (product.categoryName) {
      customFields.push({ label: "Category", value: product.categoryName });
    }

    if (product.isActive !== undefined) {
      customFields.push({
        label: "Product Status",
        value: product.isActive,
      });
    }

    // ✅ ADD PRICING GROUPS AS CUSTOM FIELDS
    // ✅ ADD PRICING GROUPS AS CUSTOM FIELDS
    if (product.pricingGroupPrices && product.pricingGroupPrices.length > 0) {
      // Store as a formatted string
      const pricingInfo = product.pricingGroupPrices
        .map((pg) => `${pg.name}: ${Number(pg.rate).toFixed(2)}`)
        .join(" | ");

      customFields.push({
        label: "Pricing Groups",
        value: pricingInfo,
      });

      // Store min and max prices with exactly 2 decimal places
      // Store min and max prices as NUMBERS (not strings)
      const rates = product.pricingGroupPrices.map((pg) => Number(pg.rate));
      const minRate = Math.min(...rates);
      const maxRate = Math.max(...rates);

      customFields.push({
        label: "Min Price",
        value: Number(minRate.toFixed(2)), // ✅ Convert back to number: 23.44
      });

      customFields.push({
        label: "Max Price",
        value: Number(maxRate.toFixed(2)), // ✅ Convert back to number: 34.43
      });
    }

    // If image exists, create item with image using multipart/form-data
    if (product.imageUrl) {
      try {
        console.log(`📸 Downloading image from S3: ${product.imageUrl}`);

        const imageResponse = await axios.get(product.imageUrl, {
          responseType: "arraybuffer",
        });

        const imageBuffer = Buffer.from(imageResponse.data, "binary");
        const contentType =
          imageResponse.headers["content-type"] || "image/jpeg";

        // ✅ Generate short, safe filename (< 100 chars, Zoho limit)
        const filename = generateSafeFilename(product.imageUrl);

        const FormData = require("form-data");
        const formData = new FormData();

        // ✅ Create the item data as JSON with custom fields
        const itemData = {
          name: product.name,
          rate: Number(product.rate).toFixed(2),
          description: product.description || "",
          item_type: "sales",
          ...(product.sku && { sku: product.sku }),
          ...(product.unit && { unit: "pcs" }),
          ...(customFields.length > 0 && { custom_fields: customFields }),
        };

        formData.append("JSONString", JSON.stringify(itemData));
        formData.append("image", imageBuffer, {
          filename: filename,
          contentType: contentType,
        });

        console.log(`📤 Creating item with image in Zoho: ${filename}`);

        const { data } = await axios.post(
          `${ZOHO_ENV.BOOKS_API}/items?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
          formData,
          {
            headers: {
              Authorization: `Zoho-oauthtoken ${accessToken}`,
              ...formData.getHeaders(),
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
          }
        );

        const item = data.item;
        console.log(`✅ Item created with image: ${item.item_id}`);

        // Associate with price books if provided
        if (product.pricingGroupPrices?.length) {
          await this.associateItemWithPriceBooks(
            item.item_id,
            product.pricingGroupPrices
          );
        }

        return item;
      } catch (error: any) {
        console.error(
          "❌ Failed to create item with image:",
          error.response?.data || error.message
        );
        console.log("⚠️ Falling back to create item without image...");
      }
    }

    // Create item without image (fallback or no image provided)
    const payload: any = {
      name: product.name,
      rate: Number(product.rate),
      description: product.description || "",
      item_type: "sales",
      ...(product.sku && { sku: product.sku }),
      ...(product.unit && { unit: "pcs" }),
      ...(customFields.length > 0 && { custom_fields: customFields }),
    };

    const { data } = await axios.post(
      `${ZOHO_ENV.BOOKS_API}/items?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
      payload,
      {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const item = data.item;
    console.log(`✅ Item created without image: ${item.item_id}`);

    // Associate with price books if provided
    if (product.pricingGroupPrices?.length) {
      await this.associateItemWithPriceBooks(
        item.item_id,
        product.pricingGroupPrices
      );
    }

    return item;
  }

  // ==========================================
  // UPDATE ITEM IN ZOHO (MATCHING CREATE LOGIC)
  // ==========================================
  async updateItemInZoho(
    itemId: string,
    updates: {
      name?: string;
      description?: string;
      rate?: string;
      groupId?: string;
      unit?: string;
      pricingGroupPrices?: {
        id: string;
        name: string;
        price: number;
        zohoPriceBookId?: string;
      }[];
      isActive?: boolean;
      imageUrl?: string;
    }
  ) {
    const accessToken = await this.zohoService.getValidAccessToken();

    // ✅ Build custom fields for update (SAME AS CREATE)
    const customFields: any[] = [];

    if (updates.isActive !== undefined) {
      customFields.push({
        label: "Product Status",
        value: updates.isActive,
      });
    }

    // ✅ ADD PRICING GROUPS TO CUSTOM FIELDS (NO DYNAMIC FIELDS)
    if (updates.pricingGroupPrices && updates.pricingGroupPrices.length > 0) {
      const pricingInfo = updates.pricingGroupPrices
        .map((pg) => `${pg.name}: ${Number(pg.price).toFixed(2)}`)
        .join(" | ");

      customFields.push({
        label: "Pricing Groups",
        value: pricingInfo,
      });

      const rates = updates.pricingGroupPrices.map((pg) => Number(pg.price));
      const minRate = Math.min(...rates);
      const maxRate = Math.max(...rates);

      customFields.push({
        label: "Min Price",
        value: Number(minRate.toFixed(2)), // ✅ Convert back to number: 23.44
      });

      customFields.push({
        label: "Max Price",
        value: Number(maxRate.toFixed(2)), // ✅ Convert back to number: 34.43
      });

      // ❌ REMOVED: Dynamic pricing group fields
      // updates.pricingGroupPrices.forEach((pg) => {
      //   customFields.push({
      //     label: `${pg.name} Price`,
      //     value: pg.price.toString(),
      //   });
      // });
    }

    // If image is provided, use multipart/form-data
    if (updates.imageUrl) {
      try {
        console.log(`📸 Downloading image from S3: ${updates.imageUrl}`);

        const imageResponse = await axios.get(updates.imageUrl, {
          responseType: "arraybuffer",
        });

        const imageBuffer = Buffer.from(imageResponse.data, "binary");
        const contentType =
          imageResponse.headers["content-type"] || "image/jpeg";

        // ✅ Generate short, safe filename (< 100 chars)
        const filename = generateSafeFilename(updates.imageUrl, itemId);

        const FormData = require("form-data");
        const formData = new FormData();

        const itemData: any = {};

        if (updates.name) itemData.name = updates.name;
        if (updates.description !== undefined)
          itemData.description = updates.description;
        if (updates.rate !== undefined) itemData.rate = updates.rate;
        if (updates.unit) itemData.unit = "pcs";
        if (updates.groupId) itemData.group_id = updates.groupId;
        if (updates.isActive !== undefined) {
          itemData.status = updates.isActive ? "active" : "inactive";
        }
        if (customFields.length > 0) {
          itemData.custom_fields = customFields;
        }

        formData.append("JSONString", JSON.stringify(itemData));
        formData.append("image", imageBuffer, {
          filename: filename,
          contentType: contentType,
        });

        console.log(`📤 Updating item ${itemId} with image: ${filename}`);

        const url = `${ZOHO_ENV.BOOKS_API}/items/${itemId}?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`;

        const { data } = await axios.put(url, formData, {
          headers: {
            Authorization: `Zoho-oauthtoken ${accessToken}`,
            ...formData.getHeaders(),
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        });

        console.log(`✅ Item ${itemId} updated with image`);

        if (updates.pricingGroupPrices?.length) {
          await this.associateItemWithPriceBooks(
            itemId,
            updates.pricingGroupPrices.map((pg) => ({
              id: pg.id,
              rate: pg.price,
              zohoPriceBookId: pg.zohoPriceBookId,
            }))
          );
        }

        return data.item;
      } catch (error: any) {
        console.error(
          "❌ Failed to update item with image:",
          error.response?.data || error.message
        );
        console.log("⚠️ Falling back to update without image...");
      }
    }

    // Update without image
    const payload: any = {
      ...(updates.name && { name: updates.name }),
      ...(updates.description !== undefined && {
        description: updates.description,
      }),
      ...(updates.rate !== undefined && { rate: updates.rate }),
      ...(updates.unit && { unit: "pcs" }),
      ...(updates.groupId && { group_id: updates.groupId }),
      ...(updates.isActive !== undefined && {
        status: updates.isActive ? "active" : "inactive",
      }),
      ...(customFields.length > 0 && { custom_fields: customFields }),
    };

    const url = `${ZOHO_ENV.BOOKS_API}/items/${itemId}?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`;

    try {
      const { data } = await axios.put(url, payload, {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      console.log(`✅ Item ${itemId} updated without image`);

      if (updates.pricingGroupPrices?.length) {
        await this.associateItemWithPriceBooks(
          itemId,
          updates.pricingGroupPrices.map((pg) => ({
            id: pg.id,
            rate: pg.price,
            zohoPriceBookId: pg.zohoPriceBookId,
          }))
        );
      }

      return data.item;
    } catch (error: any) {
      console.error(
        "❌ Failed to update Zoho item:",
        error.response?.data || error.message
      );
      throw new Error("Failed to update item in Zoho Books");
    }
  }
  // ✅ SOLUTION 2: Update existing item with image
  async updateItemWithImage(itemId: string, imageUrl: string) {
    const accessToken = await this.zohoService.getValidAccessToken();

    try {
      console.log(`📸 Downloading image from S3: ${imageUrl}`);

      const imageResponse = await axios.get(imageUrl, {
        responseType: "arraybuffer",
      });

      const imageBuffer = Buffer.from(imageResponse.data, "binary");
      const contentType = imageResponse.headers["content-type"] || "image/jpeg";

      const urlParts = imageUrl.split("/");
      let filename = urlParts[urlParts.length - 1] || "product-image.jpg";

      if (!filename.match(/\.(jpg|jpeg|png|gif)$/i)) {
        const extension = contentType.includes("png") ? ".png" : ".jpg";
        filename += extension;
      }

      const FormData = require("form-data");
      const formData = new FormData();

      // ✅ For UPDATE, only send the image
      formData.append("image", imageBuffer, {
        filename: filename,
        contentType: contentType,
      });

      console.log(`📤 Updating item ${itemId} with image`);

      const { data } = await axios.put(
        `${ZOHO_ENV.BOOKS_API}/items/${itemId}?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
        formData,
        {
          headers: {
            Authorization: `Zoho-oauthtoken ${accessToken}`,
            ...formData.getHeaders(),
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        }
      );

      console.log(`✅ Item ${itemId} updated with image`);
      return data.item;
    } catch (error: any) {
      console.error(
        "❌ Failed to update item with image:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  // ✅ SOLUTION 3: If you must use document upload approach
  async uploadImageToZohoAndAttachToItem(itemId: string, imageUrl: string) {
    const accessToken = await this.zohoService.getValidAccessToken();

    try {
      console.log(`📸 Downloading image from S3: ${imageUrl}`);

      // Step 1: Download the image from S3
      const imageResponse = await axios.get(imageUrl, {
        responseType: "arraybuffer",
      });

      const imageBuffer = Buffer.from(imageResponse.data, "binary");
      const contentType = imageResponse.headers["content-type"] || "image/jpeg";

      const urlParts = imageUrl.split("/");
      let filename = urlParts[urlParts.length - 1] || "product-image.jpg";

      if (!filename.match(/\.(jpg|jpeg|png|gif)$/i)) {
        filename += ".jpg";
      }

      console.log(`📤 Uploading image to Zoho: ${filename}`);

      // Step 2: Upload to Zoho Books documents
      const FormData = require("form-data");
      const formData = new FormData();

      // Try 'attachment' field name
      formData.append("attachment", imageBuffer, {
        filename: filename,
        contentType: contentType,
      });

      const { data: docData } = await axios.post(
        `${ZOHO_ENV.BOOKS_API}/documents?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
        formData,
        {
          headers: {
            Authorization: `Zoho-oauthtoken ${accessToken}`,
            ...formData.getHeaders(),
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        }
      );

      const imageDocumentId = docData.document?.document_id;
      console.log(`✅ Image uploaded. Document ID: ${imageDocumentId}`);

      if (!imageDocumentId) {
        throw new Error("No document ID returned");
      }

      // Step 3: Update the item with the image document ID
      const updatePayload = {
        image_document_id: imageDocumentId,
      };

      const { data: itemData } = await axios.put(
        `${ZOHO_ENV.BOOKS_API}/items/${itemId}?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
        updatePayload,
        {
          headers: {
            Authorization: `Zoho-oauthtoken ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log(`✅ Item ${itemId} linked with image document`);
      return itemData.item;
    } catch (error: any) {
      console.error(
        "❌ Failed to attach image to item:",
        error.response?.data || error.message
      );
      throw error;
    }
  }

  /**
   * Update item in Zoho Books with image support
   */
  // async updateItemInZoho(
  //   itemId: string,
  //   updates: {
  //     name?: string;
  //     description?: string;
  //     rate?: number;
  //     groupId?: string;
  //     unit?: string;
  //     pricingGroupPrices?: {
  //       id: string;
  //       name: string;
  //       price: number;
  //       zohoPriceBookId?: string;
  //     }[];
  //     isActive?: boolean;
  //     imageUrl?: string; // ✅ S3 image URL
  //   }
  // ) {
  //   const accessToken = await this.zohoService.getValidAccessToken();

  //   // ✅ If image is provided, use multipart/form-data
  //   if (updates.imageUrl) {
  //     try {
  //       console.log(`📸 Downloading image from S3: ${updates.imageUrl}`);

  //       const imageResponse = await axios.get(updates.imageUrl, {
  //         responseType: "arraybuffer",
  //       });

  //       const imageBuffer = Buffer.from(imageResponse.data, "binary");
  //       const contentType =
  //         imageResponse.headers["content-type"] || "image/jpeg";

  //       // ✅ Generate a clean, short filename
  //       const urlParts = updates.imageUrl.split("/");
  //       const originalFilename =
  //         urlParts[urlParts.length - 1] || "product-image.jpg";

  //       // Extract extension from original filename or content type
  //       let extension = ".jpg";
  //       const extMatch = originalFilename.match(/\.(jpg|jpeg|png|gif)$/i);
  //       if (extMatch) {
  //         extension = extMatch[0].toLowerCase();
  //       } else if (contentType.includes("png")) {
  //         extension = ".png";
  //       } else if (contentType.includes("gif")) {
  //         extension = ".gif";
  //       }

  //       // ✅ Create a short filename (under 100 chars): item-{itemId}-{timestamp}.ext
  //       const timestamp = Date.now();
  //       const filename = `item-${itemId}-${timestamp}${extension}`;

  //       console.log(`📝 Generated short filename: ${filename}`);

  //       const FormData = require("form-data");
  //       const formData = new FormData();

  //       // ✅ Build update payload (WITHOUT pricebook_rates)
  //       const itemData: any = {};

  //       if (updates.name) itemData.name = updates.name;
  //       if (updates.description !== undefined)
  //         itemData.description = updates.description;
  //       if (updates.rate !== undefined) itemData.rate = updates.rate;
  //       if (updates.unit) itemData.unit = "pcs";
  //       if (updates.groupId) itemData.group_id = updates.groupId;

  //       if (updates.isActive !== undefined) {
  //         itemData.status = updates.isActive ? "active" : "inactive";
  //       }

  //       // ❌ REMOVE pricebook_rates from here - it causes the error

  //       // ✅ Add JSONString and image to form data
  //       formData.append("JSONString", JSON.stringify(itemData));
  //       formData.append("image", imageBuffer, {
  //         filename: filename,
  //         contentType: contentType,
  //       });

  //       console.log(`📤 Updating item ${itemId} with image: ${filename}`);

  //       const url = `${ZOHO_ENV.BOOKS_API}/items/${itemId}?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`;

  //       const { data } = await axios.put(url, formData, {
  //         headers: {
  //           Authorization: `Zoho-oauthtoken ${accessToken}`,
  //           ...formData.getHeaders(),
  //         },
  //         maxContentLength: Infinity,
  //         maxBodyLength: Infinity,
  //       });

  //       console.log(`✅ Item ${itemId} updated with image`);

  //       // ✅ Associate with price books AFTER item update
  //       if (updates.pricingGroupPrices?.length) {
  //         await this.associateItemWithPriceBooks(
  //           itemId,
  //           updates.pricingGroupPrices.map((pg) => ({
  //             id: pg.id,
  //             rate: pg.price,
  //             zohoPriceBookId: pg.zohoPriceBookId,
  //           }))
  //         );
  //       }

  //       return data.item;
  //     } catch (error: any) {
  //       console.error(
  //         "❌ Failed to update item with image:",
  //         error.response?.data || error.message
  //       );
  //       console.log("⚠️ Falling back to update without image...");
  //       // Continue to update without image
  //     }
  //   }

  //   // ✅ Update without image (fallback or no image provided)
  //   const payload: any = {
  //     ...(updates.name && { name: updates.name }),
  //     ...(updates.description !== undefined && {
  //       description: updates.description,
  //     }),
  //     ...(updates.rate !== undefined && { rate: updates.rate }),
  //     ...(updates.unit && { unit: "pcs" }),
  //     ...(updates.groupId && { group_id: updates.groupId }),
  //     ...(updates.isActive !== undefined && {
  //       status: updates.isActive ? "active" : "inactive",
  //     }),
  //     // ❌ REMOVED: pricebook_rates - this causes the error
  //   };

  //   const url = `${ZOHO_ENV.BOOKS_API}/items/${itemId}?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`;

  //   try {
  //     const { data } = await axios.put(url, payload, {
  //       headers: {
  //         Authorization: `Zoho-oauthtoken ${accessToken}`,
  //         "Content-Type": "application/json",
  //       },
  //     });

  //     console.log(`✅ Item ${itemId} updated without image`);

  //     // ✅ Associate with price books AFTER item update
  //     if (updates.pricingGroupPrices?.length) {
  //       await this.associateItemWithPriceBooks(
  //         itemId,
  //         updates.pricingGroupPrices.map((pg) => ({
  //           id: pg.id,
  //           rate: pg.price,
  //           zohoPriceBookId: pg.zohoPriceBookId,
  //         }))
  //       );
  //     }

  //     return data.item;
  //   } catch (error: any) {
  //     console.error(
  //       "❌ Failed to update Zoho item:",
  //       error.response?.data || error.message
  //     );
  //     throw new Error("Failed to update item in Zoho Books");
  //   }
  // }

  // ✅ Helper: Update only the image (without other fields)
  async updateItemImageOnly(itemId: string, imageUrl: string) {
    const accessToken = await this.zohoService.getValidAccessToken();

    try {
      console.log(`📸 Downloading image from S3: ${imageUrl}`);

      const imageResponse = await axios.get(imageUrl, {
        responseType: "arraybuffer",
      });

      const imageBuffer = Buffer.from(imageResponse.data, "binary");
      const contentType = imageResponse.headers["content-type"] || "image/jpeg";

      // ✅ Generate a clean, short filename
      const urlParts = imageUrl.split("/");
      const originalFilename =
        urlParts[urlParts.length - 1] || "product-image.jpg";

      // Extract extension
      let extension = ".jpg";
      const extMatch = originalFilename.match(/\.(jpg|jpeg|png|gif)$/i);
      if (extMatch) {
        extension = extMatch[0].toLowerCase();
      } else if (contentType.includes("png")) {
        extension = ".png";
      } else if (contentType.includes("gif")) {
        extension = ".gif";
      }

      // ✅ Create a short filename: item-{itemId}-{timestamp}.ext
      const timestamp = Date.now();
      const filename = `item-${itemId}-${timestamp}${extension}`;

      console.log(`📝 Generated short filename: ${filename}`);

      const FormData = require("form-data");
      const formData = new FormData();

      // ✅ For image-only update, just send the image (no JSONString needed)
      formData.append("image", imageBuffer, {
        filename: filename,
        contentType: contentType,
      });

      console.log(`📤 Updating item ${itemId} image only: ${filename}`);

      const url = `${ZOHO_ENV.BOOKS_API}/items/${itemId}?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`;

      const { data } = await axios.put(url, formData, {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
          ...formData.getHeaders(),
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      console.log(`✅ Item ${itemId} image updated successfully`);
      return data.item;
    } catch (error: any) {
      console.error(
        "❌ Failed to update item image:",
        error.response?.data || error.message
      );
      throw error;
    }
  }
  // ✅ BONUS: Separate method to update only the image (optional)

  // ==========================================
  // 3. ASSOCIATE ITEM WITH PRICE BOOKS (FIXED)
  // ==========================================
  async associateItemWithPriceBooks(
    itemId: string,
    pricingGroupPrices: { id: string; rate: number; zohoPriceBookId?: string }[]
  ) {
    const accessToken = await this.zohoService.getValidAccessToken();

    console.log(
      `🔄 Associating item ${itemId} with ${pricingGroupPrices.length} pricebooks`
    );

    for (const pg of pricingGroupPrices) {
      try {
        console.log(
          `   → Adding to pricebook ${pg.zohoPriceBookId} at rate ${pg.rate}`
        );

        // Step 1: Get current pricebook to fetch existing items
        const { data: priceBookData } = await axios.get(
          `${ZOHO_ENV.BOOKS_API}/pricebooks/${pg.zohoPriceBookId}?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
          {
            headers: {
              Authorization: `Zoho-oauthtoken ${accessToken}`,
            },
          }
        );
        console.log("priceGroup", pg);
        console.log("priceBookData", priceBookData);
        const currentPriceBook = priceBookData.pricebook;
        const existingItems = currentPriceBook.pricebook_items || [];

        // Check if item already exists
        const existingItemIndex = existingItems.findIndex(
          (item: any) => item.item_id === itemId
        );

        let updatedItems;
        if (existingItemIndex >= 0) {
          // Update existing item rate
          updatedItems = [...existingItems];
          updatedItems[existingItemIndex].pricebook_rate = pg.rate;
          console.log(`   📝 Updating existing item rate to ${pg.rate}`);
        } else {
          // Add new item
          updatedItems = [
            ...existingItems,
            {
              item_id: itemId,
              pricebook_rate: pg.rate,
            },
          ];
          console.log(`   ➕ Adding new item at rate ${pg.rate}`);
        }

        // Step 2: Update pricebook with all items (existing + new)
        // ⚠️ IMPORTANT: Must include pricebook_type and other required fields
        const payload = {
          name: currentPriceBook.name,
          description: currentPriceBook.description || "",
          currency_id: currentPriceBook.currency_id,
          pricebook_type: currentPriceBook.pricebook_type, // ✅ This was missing!
          is_increase: currentPriceBook.is_increase,
          rounding_type: currentPriceBook.rounding_type || "no_rounding",
          sales_or_purchase_type:
            currentPriceBook.sales_or_purchase_type || "sales",
          pricebook_items: updatedItems,
        };

        await axios.put(
          `${ZOHO_ENV.BOOKS_API}/pricebooks/${pg.zohoPriceBookId}?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
          payload,
          {
            headers: {
              Authorization: `Zoho-oauthtoken ${accessToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        console.log(
          `✅ Item ${itemId} associated with pricebook ${pg.zohoPriceBookId} at rate ${pg.rate}`
        );
      } catch (err: any) {
        console.error(
          `❌ Failed to associate item with pricebook ${pg.zohoPriceBookId}:`,
          err.response?.data || err.message
        );

        // Log full error for debugging
        if (err.response?.data) {
          console.error(
            "Full error:",
            JSON.stringify(err.response.data, null, 2)
          );
        }
      }
    }
  }
  // async updateItemInZoho(
  //   itemId: string,
  //   updates: {
  //     name?: string;
  //     description?: string;
  //     rate?: number;
  //     groupId?: string;
  //     unit?: string;
  //     pricingGroupPrices?: {
  //       id: string;
  //       name: string;
  //       price: number;
  //       zohoPriceBookId?: string;
  //     }[];
  //     isActive?: boolean;
  //   }
  // ) {
  //   const accessToken = await this.zohoService.getValidAccessToken();

  //   const pricebookRates = updates.pricingGroupPrices?.map((pg) => ({
  //     pricebook_name: pg.name,
  //     rate: pg.price,
  //   }));

  //   const payload = {
  //     ...(updates.name && { name: updates.name }),
  //     ...(updates.description !== undefined && {
  //       description: updates.description,
  //     }),
  //     ...(updates.rate !== undefined && { rate: updates.rate }),
  //     ...(updates.unit && { unit: "pcs" }),
  //     ...(updates.groupId && { group_id: updates.groupId }),
  //     ...(updates.isActive !== undefined && {
  //       status: updates.isActive ? "active" : "inactive",
  //     }),
  //     ...(pricebookRates && { pricebook_rates: pricebookRates }),
  //   };

  //   const url = `${ZOHO_ENV.BOOKS_API}/items/${itemId}?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`;

  //   try {
  //     const { data } = await axios.put(url, payload, {
  //       headers: {
  //         Authorization: `Zoho-oauthtoken ${accessToken}`,
  //         "Content-Type": "application/json",
  //       },
  //     });

  //     console.log("✅ Zoho item updated:", itemId);

  //     // ✅ NEW: Associate with price books if provided (same as createItemInZoho)
  //     if (updates.pricingGroupPrices?.length) {
  //       await this.associateItemWithPriceBooks(
  //         itemId,
  //         updates.pricingGroupPrices.map((pg) => ({
  //           id: pg.id,
  //           rate: pg.price,
  //           zohoPriceBookId: pg.zohoPriceBookId,
  //         }))
  //       );
  //     }

  //     return data.item;
  //   } catch (error: any) {
  //     console.error(
  //       "❌ Failed to update Zoho item:",
  //       error.response?.data || error.message
  //     );
  //     throw new Error("Failed to update item in Zoho Books");
  //   }
  // }
  // ==========================================
  // 5B. REMOVE ITEM FROM PRICEBOOK
  // ==========================================
  async removeItemFromPricebook(itemId: string, zohoPriceBookId: string) {
    const accessToken = await this.zohoService.getValidAccessToken();

    try {
      // Get current pricebook
      const { data: priceBookData } = await axios.get(
        `${ZOHO_ENV.BOOKS_API}/pricebooks/${zohoPriceBookId}?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
        {
          headers: {
            Authorization: `Zoho-oauthtoken ${accessToken}`,
          },
        }
      );

      const currentPriceBook = priceBookData.pricebook;
      const existingItems = currentPriceBook.pricebook_items || [];

      // Filter out the item to remove
      const updatedItems = existingItems.filter(
        (item: any) => item.item_id !== itemId
      );

      // Update pricebook
      const payload = {
        pricebook_items: updatedItems,
      };

      await axios.put(
        `${ZOHO_ENV.BOOKS_API}/pricebooks/${zohoPriceBookId}?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
        payload,
        {
          headers: {
            Authorization: `Zoho-oauthtoken ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log(
        `✅ Removed item ${itemId} from pricebook ${zohoPriceBookId}`
      );
    } catch (err: any) {
      console.error(
        `❌ Failed to remove item from pricebook:`,
        err.response?.data || err.message
      );
      throw err;
    }
  }
  // ==========================================
  // 4. GET ITEM DETAILS WITH ASSOCIATED PRICE LISTS
  // ==========================================
  async getItemWithPriceLists(itemId: string) {
    const accessToken = await this.zohoService.getValidAccessToken();

    try {
      const { data } = await axios.get(
        `${ZOHO_ENV.BOOKS_API}/items/${itemId}?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
        {
          headers: {
            Authorization: `Zoho-oauthtoken ${accessToken}`,
          },
        }
      );

      const item = data.item;

      // Zoho returns pricebook_items array with associated price books
      console.log("Item with price lists:", {
        item_id: item.item_id,
        name: item.name,
        rate: item.rate,
        pricebook_items: item.pricebook_items || [],
      });

      return item;
    } catch (error: any) {
      console.error(
        "❌ Failed to fetch item:",
        error.response?.data || error.message
      );
      throw new Error("Failed to fetch item details");
    }
  }
  async getProductsForPriceList(priceListId: string) {
    const accessToken = await this.zohoService.getValidAccessToken();

    try {
      // Get price list details
      const { data } = await axios.get(
        `${ZOHO_ENV.BOOKS_API}/pricebooks/${priceListId}?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`,
        {
          headers: {
            Authorization: `Zoho-oauthtoken ${accessToken}`,
          },
        }
      );

      const priceList = data.pricebook;

      // Only items in pricebook_items are associated
      const associatedProducts = priceList.pricebook_items || [];

      console.log(
        `Price list ${priceListId} has ${associatedProducts.length} associated products`
      );

      return associatedProducts.map((item: any) => ({
        itemId: item.item_id,
        itemName: item.item_name,
        rate: item.pricebook_rate,
      }));
    } catch (error: any) {
      console.error(
        "❌ Failed to fetch price list:",
        error.response?.data || error.message
      );
      throw new Error("Failed to fetch price list details");
    }
  }

  // ==========================================
  // CONTROLLER: Delete Product (Soft Delete)
  // ==========================================

  // ==========================================
  // SERVICE: Mark Item as Inactive (Recommended)
  // ==========================================
  async deleteOrInactivateItem(itemId: string) {
    const accessToken = await this.zohoService.getValidAccessToken();

    try {
      console.log(
        `🔍 Checking if item ${itemId} is associated with transactions...`
      );

      // Check if item is used in any invoices or credit notes
      const isUsed = await this.isItemUsedInTransactions(itemId, accessToken);

      if (isUsed) {
        // Item is associated with invoices/credit notes - mark as inactive
        console.log(
          `⚠️ Item ${itemId} is used in transactions. Marking as inactive...`
        );
        await this.markItemAsInactive(itemId, accessToken);
        return { action: "inactivated", itemId };
      } else {
        // Item is not used - safe to delete
        console.log(`🗑️ Item ${itemId} is not used. Deleting...`);
        await this.deleteItem(itemId, accessToken);
        return { action: "deleted", itemId };
      }
    } catch (error: any) {
      console.error(
        "❌ Failed to delete/inactivate item:",
        error.response?.data || error.message
      );
      throw new Error("Failed to process item deletion/inactivation");
    }
  }

  private async isItemUsedInTransactions(
    itemId: string,
    accessToken: string
  ): Promise<boolean> {
    try {
      // Check invoices
      const invoiceUrl = `${ZOHO_ENV.BOOKS_API}/invoices?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}&item_id=${itemId}&per_page=1`;
      const invoiceResponse = await axios.get(invoiceUrl, {
        headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
      });

      if (invoiceResponse.data?.invoices?.length > 0) {
        console.log(`📄 Item ${itemId} found in invoices`);
        return true;
      }

      // Check credit notes
      const creditNoteUrl = `${ZOHO_ENV.BOOKS_API}/creditnotes?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}&item_id=${itemId}&per_page=1`;
      const creditNoteResponse = await axios.get(creditNoteUrl, {
        headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
      });

      if (creditNoteResponse.data?.creditnotes?.length > 0) {
        console.log(`💳 Item ${itemId} found in credit notes`);
        return true;
      }

      // Optional: Check bills/purchase orders if needed
      // const billUrl = `${ZOHO_ENV.BOOKS_API}/bills?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}&item_id=${itemId}&per_page=1`;
      // ...

      console.log(`✅ Item ${itemId} is not used in any transactions`);
      return false;
    } catch (error: any) {
      console.error(
        "❌ Error checking item usage:",
        error.response?.data || error.message
      );
      // If we can't verify, safer to mark as inactive rather than delete
      return true;
    }
  }

  private async markItemAsInactive(itemId: string, accessToken: string) {
    const url = `${ZOHO_ENV.BOOKS_API}/items/${itemId}?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`;

    const payload = {
      status: "inactive",
    };

    await axios.put(url, payload, {
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    console.log(`✅ Item ${itemId} marked as inactive in Zoho`);
  }

  private async deleteItem(itemId: string, accessToken: string) {
    const url = `${ZOHO_ENV.BOOKS_API}/items/${itemId}?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`;

    await axios.delete(url, {
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
      },
    });

    console.log(`✅ Item ${itemId} deleted from Zoho`);
  }
  // ==========================================
  // SERVICE: Force Delete (Use with Caution)
  // ==========================================

  // ============================================
  // PRICING GROUP SERVICES (PRICE BOOKS)
  // ============================================
  async getZohoItems(accessToken: string) {
    const url = `${ZOHO_ENV.BOOKS_API}/items?organization_id=${ZOHO_ENV.ZOHO_ORG_ID}`;

    try {
      const { data } = await axios.get(url, {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
        },
      });

      // data.items is an array of all items
      return data.items;
    } catch (error: any) {
      console.error(
        "Failed to fetch items:",
        error.response?.data || error.message
      );
      return [];
    }
  }
}
