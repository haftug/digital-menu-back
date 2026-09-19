import { sequelize } from "../config/database.js";
import { User } from "./User.js";
import { Business } from "./Business.js";
import { BusinessProfile } from "./BusinessProfile.js";
import { BusinessSocial } from "./BusinessSocial.js";
import { Branch } from "./Branch.js";
import { Category } from "./Category.js";
import { CatalogItem } from "./CatalogItem.js";
import { CatalogItemImage } from "./CatalogItemImage.js";
import { TableModel } from "./Table.js";
import { QRCode } from "./QRCode.js";
import { Order, OrderItem } from "./Order.js";
import { Service, ServiceRequest } from "./Service.js";
import { BranchCatalogItem } from "./BranchCatalogItem.js";

// --- Associations ---

/* Business ↔ BusinessProfile (1:1) */
Business.hasOne(BusinessProfile, {
  foreignKey: "businessId",
  as: "profile",
  onDelete: "CASCADE",
});
BusinessProfile.belongsTo(Business, {
  foreignKey: "businessId",
  as: "business",
});

/* Business ↔ BusinessSocial (1:1) */
Business.hasOne(BusinessSocial, {
  foreignKey: "businessId",
  as: "social",
  onDelete: "CASCADE",
});
BusinessSocial.belongsTo(Business, {
  foreignKey: "businessId",
  as: "business",
});

/* Business ↔ Branch (1:N) */
Business.hasMany(Branch, { foreignKey: "businessId", as: "branches" });
Branch.belongsTo(Business, { foreignKey: "businessId" });

/* Business ↔ Category (1:N) */
Business.hasMany(Category, { foreignKey: "businessId", as: "categories" });
Category.belongsTo(Business, { foreignKey: "businessId" });

/* Category ↔ CatalogItem (1:N) */
Category.hasMany(CatalogItem, { foreignKey: "categoryId", as: "items" });
CatalogItem.belongsTo(Category, { foreignKey: "categoryId", as: "category" });

/* Business ↔ CatalogItem (1:N) */
Business.hasMany(CatalogItem, { foreignKey: "businessId" });
CatalogItem.belongsTo(Business, { foreignKey: "businessId" });

/* CatalogItem ↔ CatalogItemImage (1:N) */
CatalogItem.hasMany(CatalogItemImage, {
  foreignKey: "catalogItemId",
  as: "images",
  onDelete: "CASCADE",
});
CatalogItemImage.belongsTo(CatalogItem, {
  foreignKey: "catalogItemId",
  as: "item",
});

/* Branch ↔ TableModel (1:N) */
Branch.hasMany(TableModel, { foreignKey: "branchId", as: "tables" });
TableModel.belongsTo(Branch, { foreignKey: "branchId" });

/* Business ↔ QRCode (1:N) */
Business.hasMany(QRCode, { foreignKey: "businessId", as: "qrCodes" });
QRCode.belongsTo(Business, { foreignKey: "businessId" });

/* TableModel ↔ QRCode (1:1) */
TableModel.hasOne(QRCode, { foreignKey: "tableId", as: "qrCode" });
QRCode.belongsTo(TableModel, { foreignKey: "tableId", as: "table" });

/* Branch ↔ Order (1:N) */
Branch.hasMany(Order, { foreignKey: "branchId", as: "orders" });
Order.belongsTo(Branch, { foreignKey: "branchId" });

/* Order ↔ TableModel (N:1) */
Order.belongsTo(TableModel, { foreignKey: "tableId", as: "table" });

/* Business ↔ Order (1:N) */
Business.hasMany(Order, { foreignKey: "businessId" });
Order.belongsTo(Business, { foreignKey: "businessId" });

/* CatalogItem ↔ OrderItem (1:N) */
CatalogItem.hasMany(OrderItem, { foreignKey: "catalogItemId" });
OrderItem.belongsTo(CatalogItem, { foreignKey: "catalogItemId" });

/* Business ↔ Service (1:N) */
Business.hasMany(Service, { foreignKey: "businessId", as: "services" });
Service.belongsTo(Business, { foreignKey: "businessId" });

/* Business ↔ ServiceRequest (1:N) */
Business.hasMany(ServiceRequest, { foreignKey: "businessId" });
Branch.hasMany(ServiceRequest, {
  foreignKey: "branchId",
  as: "serviceRequests",
});
ServiceRequest.belongsTo(Branch, { foreignKey: "branchId" });
ServiceRequest.belongsTo(Service, { foreignKey: "serviceId", as: "service" });
ServiceRequest.belongsTo(TableModel, { foreignKey: "tableId", as: "table" });

/* Business ↔ User (owner) */
Business.belongsTo(User, { foreignKey: "ownerUserId", as: "owner" });
Branch.hasMany(BranchCatalogItem, {
  foreignKey: "branchId",
  as: "catalogOverrides",
});
BranchCatalogItem.belongsTo(Branch, { foreignKey: "branchId" });
CatalogItem.hasMany(BranchCatalogItem, { foreignKey: "catalogItemId" });
BranchCatalogItem.belongsTo(CatalogItem, { foreignKey: "catalogItemId" });

export {
  sequelize,
  User,
  Business,
  BusinessProfile,
  BusinessSocial,
  Branch,
  Category,
  CatalogItem,
  CatalogItemImage,
  TableModel,
  QRCode,
  Order,
  OrderItem,
  Service,
  ServiceRequest,
  BranchCatalogItem,
};
