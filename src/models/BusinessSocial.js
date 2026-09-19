import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database.js";

export class BusinessSocial extends Model {}

BusinessSocial.init(
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
    instagramUrl: DataTypes.STRING,
    facebookUrl: DataTypes.STRING,
    twitterUrl: DataTypes.STRING,
    youtubeUrl: DataTypes.STRING,
    tiktokUrl: DataTypes.STRING,
    whatsappUrl: DataTypes.STRING,
    websiteUrl: DataTypes.STRING,
  },
  { sequelize, modelName: "BusinessSocial", tableName: "business_socials" },
);
