import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import path from "path";

import routes from "./routes/index.js";
import { notFound, errorHandler } from "./middlewares/errorHandler.js";

dotenv.config();

const app = express();

// Allow cross-origin embedding of uploaded images.
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
  }),
);

const allowedOrigins = [
  "http://localhost:5173",
  "http://172.25.112.1:5173",
  "http://192.168.137.1:5173",
  "https://digital-menu-all.netlify.app",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      console.log("Blocked CORS origin:", origin);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);

app.use(express.json());
app.use(morgan("dev"));

// Serve uploaded files statically — must come BEFORE /api routes.
app.use("/uploads", express.static(path.resolve("public/uploads")));

app.use("/api", routes);

app.use(notFound);
app.use(errorHandler);

export default app;
