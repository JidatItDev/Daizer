import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

export const multiPartValidateSchema = (schema: ZodSchema<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log("Original req.body:", req.body);
      console.log("Content-Type:", req.headers["content-type"]);
      console.log(
        "File uploaded:",
        req.file ? req.file.originalname : "No file"
      );

      // Handle different content types
      let dataToValidate = req.body || {};

      // For multipart/form-data, multer populates req.body but values might be strings
      if (req.headers["content-type"]?.includes("multipart/form-data")) {
        console.log("Processing multipart data...");

        // Parse JSON strings from multipart data
        Object.keys(dataToValidate).forEach((key) => {
          const value = dataToValidate[key];

          if (typeof value === "string") {
            // Try to parse JSON strings (like pricingGroupPrices)
            if (value.startsWith("{") || value.startsWith("[")) {
              try {
                dataToValidate[key] = JSON.parse(value);
                console.log(`Parsed ${key}:`, dataToValidate[key]);
              } catch (parseError) {
                console.log(
                  `Failed to parse ${key} as JSON, keeping as string`
                );
                // Keep as string if parsing fails
              }
            }
            // Convert string numbers to actual numbers if needed
            else if (!isNaN(Number(value)) && value !== "") {
              dataToValidate[key] = Number(value);
            }
          }
        });
      }

      console.log("Data to validate:", dataToValidate);

      // Validate with Zod schema
      const validatedData = schema.parse(dataToValidate);
      req.body = validatedData;

      console.log("Validation successful:", validatedData);
      next();
    } catch (err: any) {
      console.error("Validation error:", err);
      return res.status(400).json({
        message: "Validation error",
        errors: err.errors || err.message,
      });
    }
  };
};
