import express from "express";
import helmet from "helmet";
import cors from "cors";
import dotenv from "dotenv";
import compression from "compression";
import authRouter from "./routes/auth.routes";
import { setupSwagger } from "./config/Swagger";
import pricingGroupRouter from "./routes/pricingGroup.routes";
import CategoryRoutes from "./routes/category.routes";
import productRouter from "./routes/product.routes";
import walletRouter from "./routes/wallet.routes";
import configRouter from "./routes/config.routes";
import emailTemplateRouter from "./routes/emailTemplate.routes";
import zohoRoutes from "./routes/zoho.routes";
import axios from "axios";
import externalProviderRouter from "./routes/externalProvider.routes";

dotenv.config();

const app = express();

const PORT = process.env.PORT;
// const allowedOrigin = process.env.FRONTEND_URL;

// if (!allowedOrigin) {
//   throw new Error("FRONTEND_URL environment variable is not defined");
// }

// app.use(helmet());
// app.use(
//   cors({
//     origin: [allowedOrigin],
//     credentials: true,
//   }),
// );
const allowedOrigins = process.env.FRONTEND_URL?.split(",").map((o) =>
  o.trim(),
);

if (!allowedOrigins || allowedOrigins.length === 0) {
  throw new Error("FRONTEND_URL environment variable is not defined");
}

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);

app.use(compression({ threshold: 0, level: 6 }));

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));
setupSwagger(app);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/products", productRouter);
app.use("/api/v1/categories", CategoryRoutes);
app.use("/api/v1/pricing-groups", pricingGroupRouter);
app.use("/api/v1/wallet", walletRouter);
app.use("/api/v1/config", configRouter);
app.use("/api/v1/emailTemplate", emailTemplateRouter);
app.use("/api/v1/external-providers", externalProviderRouter);

app.use("/api/v1/zoho", zohoRoutes);
// async function verifyZohoBooksConnection(accessToken: string) {
//   try {
//     const response = await axios.get(
//       "https://www.zohoapis.com/books/v3/organizations",
//       {
//         headers: {
//           Authorization: `Zoho-oauthtoken ${accessToken}`,
//         },
//       }
//     );

//     console.log("✅ Zoho Books Connected:", response.data.organizations);
//   } catch (error: any) {
//     console.error(
//       "❌ Zoho Books Connection Failed:",
//       error.response?.data || error.message
//     );
//   }
// }
// verifyZohoBooksConnection(
//   "1000.eb43d49531de245fe08300fdc7af7c50.af4114d1f385aae0a344ed041c282da8"
// );
app.get("/", (_, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Welcome to Daizer</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          background: #f3f4f6;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          height: 100vh;
          margin: 0;
          text-align: center;
        }
        h1 {
          color: #2C2E5F;
        }
        p {
          color: #374151;
        }
        a.button {
          display: inline-block;
          margin-top: 20px;
          padding: 12px 24px;
          background: #2C2E5F;

          color: white;
          text-decoration: none;
          border-radius: 8px;
          font-weight: bold;
          box-shadow: 0 2px 6px rgba(0,0,0,0.1);
          transition: background 0.3s;
        }
        a.button:hover {
          background: #4338ca;
        }
      </style>
    </head>
    <body>
      <h1>Welcome to Daizer API Server </h1>
      <p>This server powers the Daizer platform. Use the documentation below to explore available APIs.</p>
      <a class="button" href="/api-docs" target="_blank">View Swagger Docs</a>
    </body>
    </html>
  `);
});

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [System]
 *     description: Check if the server is up and running
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: OK
 */
app.get("/health", (_, res) => res.sendStatus(200).send("ok"));

app.use((req, res) => {
  res.status(404).json({ message: "Not found" });
});

// Global error handler for multer and other errors
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    // Handle Multer errors specifically
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        success: false,
        message: "File too large. Please select an image smaller than 10MB.",
      });
    }

    if (err.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        success: false,
        message: "Too many files selected. Please select only one image.",
      });
    }

    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        success: false,
        message: "Unexpected file field. Please select a valid image file.",
      });
    }

    if (err.code === "LIMIT_PART_COUNT") {
      return res.status(400).json({
        success: false,
        message: "Form contains too many parts.",
      });
    }

    if (err.code === "LIMIT_FIELD_KEY") {
      return res.status(400).json({
        success: false,
        message: "Field name too long.",
      });
    }

    if (err.code === "LIMIT_FIELD_VALUE") {
      return res.status(400).json({
        success: false,
        message: "Field value too long.",
      });
    }

    if (err.code === "LIMIT_FIELD_COUNT") {
      return res.status(400).json({
        success: false,
        message: "Too many fields in form.",
      });
    }

    // Handle file filter errors
    if (err.message?.includes("Only image files are allowed")) {
      return res.status(400).json({
        success: false,
        message: "Invalid file format. Please select a valid image file.",
      });
    }

    // Default error handler
    console.error("Unhandled error:", err);
    res.status(err.status || 500).json({
      success: false,
      message: err.message || "Internal server error",
    });
  },
);

app.listen(PORT, () => {
  console.log(`Server running on port: ${PORT}`);
});
