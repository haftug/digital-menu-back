import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database.js";

export class CatalogItemImage extends Model {}

CatalogItemImage.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    catalogItemId: { type: DataTypes.UUID, allowNull: false },
    url: { type: DataTypes.STRING, allowNull: false },
    sortOrder: { type: DataTypes.INTEGER, defaultValue: 0 },
  },
  {
    sequelize,
    modelName: "CatalogItemImage",
    tableName: "catalog_item_images",
  },
);
