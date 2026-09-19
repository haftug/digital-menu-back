import { z } from "zod";
import {
  Category,
  CatalogItem,
  CatalogItemImage,
  Branch,
  BranchCatalogItem,
} from "../models/index.js";
import { asyncHandler, ApiError } from "../middlewares/errorHandler.js";
import { sequelize } from "../config/database.js";

/* ═══════════════════════════════════════════
   Categories — name only
   ═══════════════════════════════════════════ */

const categorySchema = z.object({
  name: z.string().min(1).max(120),
  sortOrder: z.number().int().optional(),
  isVisible: z.boolean().optional(),
});

export const listCategories = asyncHandler(async (req, res) => {
  const categories = await Category.findAll({
    where: { businessId: req.auth.businessId },
    order: [["sortOrder", "ASC"]],
    include: [
      {
        model: CatalogItem,
        as: "items",
        include: [
          {
            model: CatalogItemImage,
            as: "images",
            separate: true,
            order: [["sortOrder", "ASC"]],
          },
        ],
      },
    ],
  });
  res.json({ success: true, data: categories });
});

export const createCategory = asyncHandler(async (req, res) => {
  const data = categorySchema.parse(req.body);
  const category = await Category.create({
    ...data,
    businessId: req.auth.businessId,
  });
  res.status(201).json({ success: true, data: category });
});

export const updateCategory = asyncHandler(async (req, res) => {
  const data = categorySchema.partial().parse(req.body);

  const category = await Category.findOne({
    where: { id: req.params.id, businessId: req.auth.businessId },
  });
  if (!category) throw new ApiError(404, "NOT_FOUND", "Category not found");

  const keys = Object.keys(data);
  if (keys.length > 0) {
    await Category.update(data, {
      where: { id: category.id },
      fields: keys,
    });
  }

  const fresh = await Category.findByPk(category.id);
  res.json({ success: true, data: fresh });
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findOne({
    where: { id: req.params.id, businessId: req.auth.businessId },
  });
  if (!category) throw new ApiError(404, "NOT_FOUND", "Category not found");
  await category.destroy();
  res.json({ success: true, data: { id: req.params.id } });
});

/* ═══════════════════════════════════════════
   Catalog items — multi-image
   ═══════════════════════════════════════════ */

const itemSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().min(1).max(160),
  description: z.string().max(2000).optional().nullable(),
  images: z.array(z.string().url()).optional(), // multi-image
  imageUrl: z.string().url().optional().nullable(), // legacy: synced to images[0]
  priceAmount: z.number().int().nonnegative(),
  itemType: z.enum(["food", "drink", "product", "service"]).optional(),
  isFeatured: z.boolean().optional(),
  availabilityStatus: z.enum(["available", "sold_out", "hidden"]).optional(),
  sortOrder: z.number().int().optional(),
});

export const listItems = asyncHandler(async (req, res) => {
  const where = { businessId: req.auth.businessId };
  if (req.query.categoryId) where.categoryId = req.query.categoryId;

  const items = await CatalogItem.findAll({
    where,
    order: [["sortOrder", "ASC"]],
    include: [
      {
        model: CatalogItemImage,
        as: "images",
        separate: true,
        order: [["sortOrder", "ASC"]],
      },
    ],
  });
  res.json({ success: true, data: items });
});

export const createItem = asyncHandler(async (req, res) => {
  const data = itemSchema.parse(req.body);
  const { images, ...itemFields } = data;

  const category = await Category.findOne({
    where: { id: data.categoryId, businessId: req.auth.businessId },
  });
  if (!category)
    throw new ApiError(
      400,
      "INVALID_CATEGORY",
      "Category does not belong to your business",
    );

  const created = await sequelize.transaction(async (t) => {
    const item = await CatalogItem.create(
      {
        ...itemFields,
        // Keep the legacy column in sync with the first image.
        imageUrl: images?.[0] || itemFields.imageUrl || null,
        businessId: req.auth.businessId,
      },
      { transaction: t },
    );

    if (images && images.length > 0) {
      await CatalogItemImage.bulkCreate(
        images.map((url, i) => ({
          catalogItemId: item.id,
          url,
          sortOrder: i,
        })),
        { transaction: t },
      );
    }

    return CatalogItem.findByPk(item.id, {
      include: [{ model: CatalogItemImage, as: "images" }],
      transaction: t,
    });
  });

  res.status(201).json({ success: true, data: created });
});

export const updateItem = asyncHandler(async (req, res) => {
  const data = itemSchema.partial().parse(req.body);
  const { images, ...itemFields } = data;

  const item = await CatalogItem.findOne({
    where: { id: req.params.id, businessId: req.auth.businessId },
  });
  if (!item) throw new ApiError(404, "NOT_FOUND", "Item not found");

  if (itemFields.categoryId) {
    const category = await Category.findOne({
      where: {
        id: itemFields.categoryId,
        businessId: req.auth.businessId,
      },
    });
    if (!category)
      throw new ApiError(
        400,
        "INVALID_CATEGORY",
        "Category does not belong to your business",
      );
  }

  const updated = await sequelize.transaction(async (t) => {
    // Sync legacy column with the first image when images are supplied.
    if (images !== undefined) {
      itemFields.imageUrl = images[0] || null;
    }

    const keys = Object.keys(itemFields);
    if (keys.length > 0) {
      await CatalogItem.update(itemFields, {
        where: { id: item.id },
        fields: keys,
        transaction: t,
      });
    }

    if (images !== undefined) {
      const existing = await CatalogItemImage.findAll({
        where: { catalogItemId: item.id },
        transaction: t,
      });
      const existingByUrl = new Map(existing.map((r) => [r.url, r]));

      const wantedUrls = new Set(images);
      const toDelete = existing.filter((r) => !wantedUrls.has(r.url));
      const toInsert = images
        .map((url, i) => ({ url, sortOrder: i }))
        .filter((row) => !existingByUrl.has(row.url));

      if (toDelete.length > 0) {
        await CatalogItemImage.destroy({
          where: { id: toDelete.map((r) => r.id) },
          transaction: t,
        });
      }

      if (toInsert.length > 0) {
        await CatalogItemImage.bulkCreate(
          toInsert.map((row) => ({ ...row, catalogItemId: item.id })),
          { transaction: t },
        );
      }

      // Re-index surviving rows to match the new array order.
      for (let i = 0; i < images.length; i++) {
        const row = existingByUrl.get(images[i]);
        if (row && row.sortOrder !== i) {
          await CatalogItemImage.update(
            { sortOrder: i },
            {
              where: { id: row.id },
              fields: ["sortOrder"],
              transaction: t,
            },
          );
        }
      }
    }

    return CatalogItem.findByPk(item.id, {
      include: [{ model: CatalogItemImage, as: "images" }],
      transaction: t,
    });
  });

  res.json({ success: true, data: updated });
});

const availabilitySchema = z.object({
  availabilityStatus: z.enum(["available", "sold_out", "hidden"]),
});

export const setItemAvailability = asyncHandler(async (req, res) => {
  const { availabilityStatus } = availabilitySchema.parse(req.body);
  const item = await CatalogItem.findOne({
    where: { id: req.params.id, businessId: req.auth.businessId },
  });
  if (!item) throw new ApiError(404, "NOT_FOUND", "Item not found");
  await item.update({ availabilityStatus });
  res.json({ success: true, data: item });
});

export const deleteItem = asyncHandler(async (req, res) => {
  const item = await CatalogItem.findOne({
    where: { id: req.params.id, businessId: req.auth.businessId },
  });
  if (!item) throw new ApiError(404, "NOT_FOUND", "Item not found");
  await item.destroy();
  res.json({ success: true, data: { id: req.params.id } });
});
export const getBranchCatalogConfig = asyncHandler(async (req, res) => {
  const branch = await Branch.findOne({
    where: { id: req.params.branchId, businessId: req.auth.businessId },
  });
  if (!branch) throw new ApiError(404, "NOT_FOUND", "Branch not found");

  const [categories, overrides] = await Promise.all([
    Category.findAll({
      where: { businessId: req.auth.businessId },
      order: [["sortOrder", "ASC"]],
      include: [{ model: CatalogItem, as: "items" }],
    }),
    BranchCatalogItem.findAll({
      where: { branchId: branch.id },
      attributes: ["catalogItemId"],
    }),
  ]);

  const disabledIds = new Set(overrides.map((o) => o.catalogItemId));

  const data = categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    items: (cat.items || [])
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((item) => ({
        id: item.id,
        name: item.name,
        priceAmount: item.priceAmount,
        availabilityStatus: item.availabilityStatus,
        enabledAtBranch: !disabledIds.has(item.id),
      })),
  }));

  res.json({ success: true, data });
});

const branchCatalogSchema = z.object({
  enabledItemIds: z.array(z.string().uuid()),
});

export const setBranchCatalogConfig = asyncHandler(async (req, res) => {
  const { enabledItemIds } = branchCatalogSchema.parse(req.body);
  const branch = await Branch.findOne({
    where: { id: req.params.branchId, businessId: req.auth.businessId },
  });
  if (!branch) throw new ApiError(404, "NOT_FOUND", "Branch not found");

  const allItems = await CatalogItem.findAll({
    where: { businessId: req.auth.businessId },
    attributes: ["id"],
  });
  const allIds = allItems.map((i) => i.id);
  const enabledSet = new Set(
    enabledItemIds.filter((id) => allIds.includes(id)),
  );
  const disabledIds = allIds.filter((id) => !enabledSet.has(id));

  await BranchCatalogItem.destroy({ where: { branchId: branch.id } });
  if (disabledIds.length > 0) {
    await BranchCatalogItem.bulkCreate(
      disabledIds.map((catalogItemId) => ({
        branchId: branch.id,
        catalogItemId,
      })),
    );
  }

  res.json({
    success: true,
    data: { branchId: branch.id, disabledItemIds: disabledIds },
  });
});
