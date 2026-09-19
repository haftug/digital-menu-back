import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

export const sequelize = new Sequelize(
  process.env.DB_NAME || "qrmenu",
  process.env.DB_USER || "postgres",
  process.env.DB_PASSWORD || "DB@2018",
  {
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 5432,
    dialect: "postgres",
    logging: false, // set to console.log to debug SQL
    define: {
      underscored: true,
      paranoid: true, // soft deletes (deleted_at) on all models
    },
  },
);

export default sequelize;
