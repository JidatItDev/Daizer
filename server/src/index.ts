import express from "express";
import helmet from "helmet";
import cors from "cors";
import dotenv from "dotenv";
import compression from "compression";
import authRouter from "./routes/auth.routes";
import { setupSwagger } from "./config/Swagger";
import pricingGroupRouter from "./routes/pricingGroup.routes";

dotenv.config();

const app = express();

const PORT = process.env.PORT;
const allowedOrigin = process.env.FRONTEND_URL;

if (!allowedOrigin) {
  throw new Error("FRONTEND_URL environment variable is not defined");
}

app.use(helmet());
app.use(
  cors({
    origin: [allowedOrigin],
    credentials: true,
  })
);

app.use(compression({ threshold: 0, level: 6 }));

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));
setupSwagger(app);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/pricing-groups", pricingGroupRouter);

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

app.listen(PORT, () => {
  console.log(`Server running on port: ${PORT}`);
});
