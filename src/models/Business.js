import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database.js";

export class Business extends Model {}

Business.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: { type: DataTypes.STRING, allowNull: false },
    slug: { type: DataTypes.STRING, allowNull: false, unique: true },
    ownerUserId: { type: DataTypes.UUID, allowNull: true },
    businessType: {
      type: DataTypes.ENUM(
        "restaurant",
        "cafe",
        "burger_shop",
        "hotel",
        "other",
      ),
      allowNull: false,
      defaultValue: "restaurant",
    },
    status: {
      type: DataTypes.ENUM("pending", "active", "inactive", "suspended"),
      allowNull: false,
      defaultValue: "pending",
    },
  },
  { sequelize, modelName: "Business", tableName: "businesses" },
);
