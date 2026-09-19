import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export class CatalogItem extends Model {}

CatalogItem.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    businessId: { type: DataTypes.UUID, allowNull: false },
    categoryId: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    description: DataTypes.TEXT,
    imageUrl: DataTypes.STRING,
    // stored in minor currency units (e.g. cents / santim) to avoid float rounding
    priceAmount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    itemType: {
      type: DataTypes.ENUM('food', 'drink', 'product', 'service'),
      defaultValue: 'food'
    },
    // availability engine (simplified 4-state model instead of full rule/override tables)
    availabilityStatus: {
      type: DataTypes.ENUM('available', 'sold_out', 'hidden'),
      allowNull: false,
      defaultValue: 'available'
    },
    isFeatured: { type: DataTypes.BOOLEAN, defaultValue: false },
    sortOrder: { type: DataTypes.INTEGER, defaultValue: 0 }
  },
  { sequelize, modelName: 'CatalogItem', tableName: 'catalog_items' }
);
