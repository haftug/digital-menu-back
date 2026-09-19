import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export class TableModel extends Model {}

TableModel.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    businessId: { type: DataTypes.UUID, allowNull: false },
    branchId: { type: DataTypes.UUID, allowNull: false },
    tableNumber: { type: DataTypes.STRING, allowNull: false },
    capacity: { type: DataTypes.INTEGER, defaultValue: 2 },
    status: {
      type: DataTypes.ENUM('available', 'occupied', 'reserved', 'inactive'),
      defaultValue: 'available'
    }
  },
  { sequelize, modelName: 'TableModel', tableName: 'tables' }
);
