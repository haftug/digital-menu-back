import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export class User extends Model {}

User.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { isEmail: true } },
    passwordHash: { type: DataTypes.STRING, allowNull: false },
    // super_admin: platform-wide. business_owner / staff: scoped to businessId (and optional branchId).
    role: {
      type: DataTypes.ENUM('super_admin', 'business_owner', 'staff'),
      allowNull: false,
      defaultValue: 'staff'
    },
    businessId: { type: DataTypes.UUID, allowNull: true },
    branchId: { type: DataTypes.UUID, allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
  },
  { sequelize, modelName: 'User', tableName: 'users' }
);
