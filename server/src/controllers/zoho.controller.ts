import { Request, Response } from "express";
import { ZohoService } from "../services/zoho.service";

export class ZohoController {
  private zohoService: ZohoService;

  constructor() {
    this.zohoService = new ZohoService();
  }

  /**
   * Step 1: Redirect user/admin to Zoho OAuth page
   */
  authorizeZoho = async (req: Request, res: Response) => {
    try {
      const authUrl = this.zohoService.generateAuthUrl();
      res.redirect(authUrl);
    } catch (err) {
      console.error("❌ Error generating Zoho Auth URL:", err);
      res
        .status(500)
        .json({ error: "Failed to generate Zoho authorization URL" });
    }
  };

  /**
   * Step 2: Callback from Zoho with code param
   */
  zohoCallback = async (req: Request, res: Response) => {
    const code = req.query.code as string;
    if (!code) return res.status(400).send("Missing code");

    try {
      await this.zohoService.exchangeCodeForToken(code);
      res.send("✅ Zoho authorization successful! Tokens saved in DB.");
    } catch (err) {
      console.error("❌ Error exchanging code for token:", err);
      res.status(500).send("Authorization failed.");
    }
  };

  /**
   * Step 3: Fetch customers using Zoho Books API
   */
  getZohoCustomers = async (req: Request, res: Response) => {
    try {
      const customers = await this.zohoService.getCustomers();
      res.json(customers);
    } catch (err) {
      console.error("❌ Error fetching customers:", err);
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  };
}
