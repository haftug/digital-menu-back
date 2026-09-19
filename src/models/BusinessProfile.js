import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database.js";

export class BusinessProfile extends Model {}

BusinessProfile.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    businessId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
    },
    description: DataTypes.TEXT,
    phone: DataTypes.STRING,
    email: DataTypes.STRING,
    address: DataTypes.STRING,
    logoUrl: DataTypes.STRING,
    coverUrl: DataTypes.STRING,
    currencyCode: { type: DataTypes.STRING, defaultValue: "ETB" },
  },
  { sequelize, modelName: "BusinessProfile", tableName: "business_profiles" },
);
