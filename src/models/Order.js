import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export class Order extends Model {}
export class OrderItem extends Model {}

Order.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    businessId: { type: DataTypes.UUID, allowNull: false },
    branchId: { type: DataTypes.UUID, allowNull: false },
    tableId: { type: DataTypes.UUID, allowNull: true },
    status: {
      type: DataTypes.ENUM(
        'pending',
        'accepted',
        'rejected',
        'preparing',
        'ready',
        'served',
        'completed',
        'cancelled'
      ),
      allowNull: false,
      defaultValue: 'pending'
    },
    // authoritative total, always computed server-side from item price snapshots — never trust client totals
    totalAmount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    currencyCode: { type: DataTypes.STRING, defaultValue: 'ETB' },
    note: DataTypes.TEXT
  },
  { sequelize, modelName: 'Order', tableName: 'orders' }
);

OrderItem.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    orderId: { type: DataTypes.UUID, allowNull: false },
    catalogItemId: { type: DataTypes.UUID, allowNull: false },
    nameSnapshot: { type: DataTypes.STRING, allowNull: false },
    unitPriceSnapshot: { type: DataTypes.INTEGER, allowNull: false },
    quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    note: DataTypes.STRING
  },
  { sequelize, modelName: 'OrderItem', tableName: 'order_items' }
);

Order.hasMany(OrderItem, { foreignKey: 'orderId', as: 'items' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId' });
