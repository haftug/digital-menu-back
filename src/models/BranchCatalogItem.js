import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/database.js";

// Presence of a row = this catalog item is DISABLED (not offered) at this branch.
// Absence = enabled by default, so newly created items automatically show at every
// branch until an admin explicitly unticks them for a specific branch.
export class BranchCatalogItem extends Model {}

BranchCatalogItem.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    branchId: { type: DataTypes.UUID, allowNull: false },
    catalogItemId: { type: DataTypes.UUID, allowNull: false },
  },
  {
    sequelize,
    modelName: "BranchCatalogItem",
    tableName: "branch_catalog_items",
    // Hard delete (not soft) — this is a pure toggle table, and a soft-deleted row
    // would still trip the unique index below when the item is re-disabled later.
    paranoid: false,
    indexes: [{ unique: true, fields: ["branch_id", "catalog_item_id"] }],
  },
);
