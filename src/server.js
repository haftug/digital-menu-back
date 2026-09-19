import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import { sequelize } from "./models/index.js";
import "./models/index.js"; // ensure associations are registered

const PORT = process.env.PORT || 4000;

async function start() {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected");

    // Creates the new tables (business_profiles, business_socials)
    // if they don't exist yet. Safe to run on every boot.
    await sequelize.sync();
    console.log("✅ Models synced");

    app.listen(PORT, () => {
      console.log(`🚀 API listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
}

start();
