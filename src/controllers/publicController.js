import { z } from "zod";
import { Op } from "sequelize";
import {
  Business,
  BusinessProfile,
  BusinessSocial,
  Branch,
  Category,
  CatalogItem,
  CatalogItemImage,
  BranchCatalogItem,
  QRCode,
  TableModel,
  Order,
  OrderItem,
  Service,
  ServiceRequest,
} from "../models/index.js";
import { isValidQrTokenShape } from "../utils/qrToken.js";
import { asyncHandler, ApiError } from "../middlewares/errorHandler.js";

// Resolves a QR token to its business/branch/table context, scoped to the slug in the
// URL so a token can never be replayed against a different business's routes.
//
// Fallback: business-wide QRs (no branchId) resolve to the business's first active
// branch, so owners who print a general QR can still accept orders.
async function resolveQrContext(slug, token) {
  if (!token) return { branch: null, table: null, qr: null };
  if (!isValidQrTokenShape(token))
    throw new ApiError(400, "INVALID_QR", "Invalid QR code");

  const business = await Business.findOne({ where: { slug } });
  if (!business) throw new ApiError(404, "NOT_FOUND", "Business not found");

  const qr = await QRCode.findOne({
    where: { token, businessId: business.id, isActive: true },
  });
  if (!qr)
    throw new ApiError(400, "INVALID_QR", "QR code is invalid or inactive");

  let branch = null;
  let table = null;
  if (qr.branchId) branch = await Branch.findByPk(qr.branchId);
  if (qr.tableId) table = await TableModel.findByPk(qr.tableId);

  // Fallback: business-wide QRs have no branchId — route to the first active branch
  if (!branch) {
    branch = await Branch.findOne({
      where: { businessId: business.id, isActive: true },
      order: [["createdAt", "ASC"]],
    });
  }

  return { qr, branch, table };
}

/* ─────────────────────────────────────────────
   Flatten Business + Profile + Social into one object.
   The frontend expects one flat object with socials + contact
   at the top level.
   ───────────────────────────────────────────── */
function flattenBusiness(business, branches) {
  const json = business.toJSON();
  const { profile, social, ...core } = json;
  const out = {
    ...core,
    ...(profile ? omitMeta(profile) : {}),
    ...(social ? omitMeta(social) : {}),
    branches: (branches || []).map((b) => ({
      id: b.id,
      name: b.name,
      openTime: b.openTime,
      closeTime: b.closeTime,
    })),
  };
  if (out.currencyCode == null) out.currencyCode = "ETB";
  return out;
}

function omitMeta(row) {
  const { id, businessId, createdAt, updatedAt, deletedAt, ...rest } = row;
  return rest;
}

export const getBusinessBySlug = asyncHandler(async (req, res) => {
  const business = await Business.findOne({
    where: { slug: req.params.slug, status: "active" },
    include: [
      { model: BusinessProfile, as: "profile" },
      { model: BusinessSocial, as: "social" },
    ],
  });
  if (!business)
    throw new ApiError(404, "NOT_FOUND", "Business not found or not active");

  const branches = await Branch.findAll({
    where: { businessId: business.id, isActive: true },
  });

  res.json({ success: true, data: flattenBusiness(business, branches) });
});

export const getPublicMenu = asyncHandler(async (req, res) => {
  const business = await Business.findOne({
    where: { slug: req.params.slug, status: "active" },
  });
  if (!business)
    throw new ApiError(404, "NOT_FOUND", "Business not found or not active");

  // Resolve QR FIRST so we can filter items by branch below.
  const context = await resolveQrContext(req.params.slug, req.query.qr);

  const categories = await Category.findAll({
    where: { businessId: business.id, isVisible: true },
    order: [["sortOrder", "ASC"]],
    include: [
      {
        model: CatalogItem,
        as: "items",
        // hidden items are never sent to the customer; sold_out items are sent but flagged
        where: { availabilityStatus: { [Op.ne]: "hidden" } },
        required: false,
        order: [["sortOrder", "ASC"]],
        include: [
          // Load the image rows for each item.
          {
            model: CatalogItemImage,
            as: "images",
            separate: true, // avoids row multiplication
            order: [["sortOrder", "ASC"]], // ordered, first = cover
          },
        ],
      },
    ],
  });

  // Items disabled at the resolved branch — a row in BranchCatalogItem means
  // "disabled at this branch." Absence = enabled.
  let disabledItemIds = new Set();
  if (context.branch) {
    const overrides = await BranchCatalogItem.findAll({
      where: { branchId: context.branch.id },
      attributes: ["catalogItemId"],
    });
    disabledItemIds = new Set(overrides.map((o) => o.catalogItemId));
  }

  const data = categories
    .map((cat) => {
      const json = cat.toJSON();
      const items = (json.items || []).filter(
        (item) => !disabledItemIds.has(item.id),
      );
      return { ...json, items };
    })
    // Hide empty categories only when we're branch-scoped. When no QR is
    // supplied (browse-only mode) keep the original behavior.
    .filter((cat) => (context.branch ? cat.items.length > 0 : true));

  res.json({
    success: true,
    data: {
      categories: data,
      context: {
        branchId: context.branch?.id || null,
        branchName: context.branch?.name || null,
        tableId: context.table?.id || null,
        tableNumber: context.table?.tableNumber || null,
      },
    },
  });
});

export const getPublicServices = asyncHandler(async (req, res) => {
  const business = await Business.findOne({
    where: { slug: req.params.slug, status: "active" },
  });
  if (!business)
    throw new ApiError(404, "NOT_FOUND", "Business not found or not active");
  const services = await Service.findAll({
    where: { businessId: business.id, isActive: true },
  });
  res.json({ success: true, data: services });
});

export const recordScan = asyncHandler(async (req, res) => {
  const token = req.body.qr;
  if (!token || !isValidQrTokenShape(token))
    return res.json({ success: true, data: null });
  const business = await Business.findOne({ where: { slug: req.params.slug } });
  if (!business) return res.json({ success: true, data: null });
  const qr = await QRCode.findOne({
    where: { token, businessId: business.id },
  });
  if (qr) {
    await qr.update({ scanCount: qr.scanCount + 1, lastScannedAt: new Date() });
  }
  res.json({ success: true, data: null });
});

const orderSchema = z.object({
  qr: z.string(),
  items: z
    .array(
      z.object({
        catalogItemId: z.string().uuid(),
        quantity: z.number().int().positive(),
        note: z.string().optional(),
      }),
    )
    .min(1),
  note: z.string().optional(),
});

// Order creation: prices and availability are ALWAYS re-validated server-side from the
// database. The client never gets to supply a price or a total.
export const createOrder = asyncHandler(async (req, res) => {
  const data = orderSchema.parse(req.body);
  const business = await Business.findOne({
    where: { slug: req.params.slug, status: "active" },
  });
  if (!business)
    throw new ApiError(404, "NOT_FOUND", "Business not found or not active");

  const { branch, table } = await resolveQrContext(req.params.slug, data.qr);
  if (!branch) {
    throw new ApiError(
      400,
      "NO_BRANCH",
      "This business has no active branch yet, so orders cannot be accepted.",
    );
  }

  const itemIds = data.items.map((i) => i.catalogItemId);
  const catalogItems = await CatalogItem.findAll({
    where: { id: itemIds, businessId: business.id },
  });
  const itemMap = new Map(catalogItems.map((i) => [i.id, i]));

  // Items disabled at this branch — enforced server-side so a hand-crafted
  // POST can't order something the branch doesn't offer.
  const branchOverrides = await BranchCatalogItem.findAll({
    where: { branchId: branch.id, catalogItemId: itemIds },
    attributes: ["catalogItemId"],
  });
  const disabledAtBranch = new Set(branchOverrides.map((o) => o.catalogItemId));

  let total = 0;
  const orderItemsData = [];
  for (const line of data.items) {
    const item = itemMap.get(line.catalogItemId);
    if (!item)
      throw new ApiError(400, "INVALID_ITEM", "One or more items are invalid");
    if (item.availabilityStatus !== "available") {
      throw new ApiError(
        400,
        "ITEM_UNAVAILABLE",
        `"${item.name}" is not currently available`,
      );
    }
    if (disabledAtBranch.has(item.id)) {
      throw new ApiError(
        400,
        "ITEM_UNAVAILABLE",
        `"${item.name}" is not offered at this branch`,
      );
    }
    const lineTotal = item.priceAmount * line.quantity;
    total += lineTotal;
    orderItemsData.push({
      catalogItemId: item.id,
      nameSnapshot: item.name,
      unitPriceSnapshot: item.priceAmount,
      quantity: line.quantity,
      note: line.note || null,
    });
  }

  const order = await Order.create({
    businessId: business.id,
    branchId: branch.id,
    tableId: table ? table.id : null,
    totalAmount: total,
    currencyCode: business.currencyCode,
    note: data.note || null,
    status: "pending",
  });

  await OrderItem.bulkCreate(
    orderItemsData.map((i) => ({ ...i, orderId: order.id })),
  );

  const fullOrder = await Order.findByPk(order.id, {
    include: [{ model: OrderItem, as: "items" }],
  });
  res.status(201).json({ success: true, data: fullOrder });
});

// Customer polls this to see their order status (no login — order id acts as the capability).
export const getOrderStatus = asyncHandler(async (req, res) => {
  const business = await Business.findOne({
    where: { slug: req.params.slug, status: "active" },
  });
  if (!business)
    throw new ApiError(404, "NOT_FOUND", "Business not found or not active");

  const order = await Order.findOne({
    where: { id: req.params.orderId, businessId: business.id },
    include: [{ model: OrderItem, as: "items" }],
  });
  if (!order) throw new ApiError(404, "NOT_FOUND", "Order not found");

  res.json({ success: true, data: order });
});

const serviceRequestSchema = z.object({
  qr: z.string(),
  serviceId: z.string().uuid().optional(),
  note: z.string().optional(),
});

export const createServiceRequest = asyncHandler(async (req, res) => {
  const data = serviceRequestSchema.parse(req.body);
  const business = await Business.findOne({
    where: { slug: req.params.slug, status: "active" },
  });
  if (!business)
    throw new ApiError(404, "NOT_FOUND", "Business not found or not active");

  const { branch, table } = await resolveQrContext(req.params.slug, data.qr);
  if (!branch) {
    throw new ApiError(
      400,
      "NO_BRANCH",
      "This business has no active branch yet, so service requests cannot be accepted.",
    );
  }

  if (data.serviceId) {
    const service = await Service.findOne({
      where: { id: data.serviceId, businessId: business.id },
    });
    if (!service) throw new ApiError(400, "INVALID_SERVICE", "Invalid service");
  }

  const request = await ServiceRequest.create({
    businessId: business.id,
    branchId: branch.id,
    serviceId: data.serviceId || null,
    tableId: table ? table.id : null,
    note: data.note || null,
    status: "pending",
  });

  res.status(201).json({ success: true, data: request });
});
