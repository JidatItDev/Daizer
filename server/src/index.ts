import express from "express";
import helmet from "helmet";
import cors from "cors";
import dotenv from "dotenv";
import compression from "compression";
import authRouter from "./routes/auth.routes";
import { setupSwagger } from "./config/Swagger";

dotenv.config();

const app = express();

const PORT = 3000;

app.use(helmet());
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);

app.use(compression({ threshold: 0, level: 6 }));

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));
setupSwagger(app);
app.use("/api/v1/auth", authRouter);

app.get("/health", (_, res) => res.sendStatus(200));

app.use((req, res) => {
  res.status(404).json({ message: "Not found" });
});

app.listen(PORT, () => {
  console.log(`Server running on port: ${PORT}`);
});
