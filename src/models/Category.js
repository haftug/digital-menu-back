import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export class Category extends Model {}

Category.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    businessId: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    imageUrl: DataTypes.STRING,
    sortOrder: { type: DataTypes.INTEGER, defaultValue: 0 },
    isVisible: { type: DataTypes.BOOLEAN, defaultValue: true }
  },
  { sequelize, modelName: 'Category', tableName: 'categories' }
);
