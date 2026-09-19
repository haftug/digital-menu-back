import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export class QRCode extends Model {}

QRCode.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    businessId: { type: DataTypes.UUID, allowNull: false },
    branchId: { type: DataTypes.UUID, allowNull: true },
    tableId: { type: DataTypes.UUID, allowNull: true },
    targetType: {
      type: DataTypes.ENUM('business', 'branch', 'table'),
      allowNull: false,
      defaultValue: 'table'
    },
    // signed token embedded in the QR URL; verified server-side on every write
    token: { type: DataTypes.STRING, allowNull: false, unique: true },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
    scanCount: { type: DataTypes.INTEGER, defaultValue: 0 },
    lastScannedAt: DataTypes.DATE
  },
  { sequelize, modelName: 'QRCode', tableName: 'qr_codes' }
);
