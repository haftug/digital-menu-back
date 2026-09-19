import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export class Service extends Model {}
export class ServiceRequest extends Model {}

Service.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    businessId: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    description: DataTypes.TEXT,
    priceAmount: { type: DataTypes.INTEGER, defaultValue: 0 },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
  },
  { sequelize, modelName: 'Service', tableName: 'services' }
);

ServiceRequest.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    businessId: { type: DataTypes.UUID, allowNull: false },
    branchId: { type: DataTypes.UUID, allowNull: false },
    serviceId: { type: DataTypes.UUID, allowNull: true }, // null = generic "call waiter"
    tableId: { type: DataTypes.UUID, allowNull: true },
    note: DataTypes.STRING,
    status: {
      type: DataTypes.ENUM('pending', 'accepted', 'in_progress', 'completed', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending'
    }
  },
  { sequelize, modelName: 'ServiceRequest', tableName: 'service_requests' }
);
