import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export class Branch extends Model {}

Branch.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    businessId: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    address: DataTypes.STRING,
    openTime: { type: DataTypes.STRING, defaultValue: '08:00' },
    closeTime: { type: DataTypes.STRING, defaultValue: '22:00' },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
  },
  { sequelize, modelName: 'Branch', tableName: 'branches' }
);
