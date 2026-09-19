import { z } from "zod";
import QRCodeLib from "qrcode";
import { QRCode, TableModel, Branch, Business } from "../models/index.js";
import { generateQrToken } from "../utils/qrToken.js";
import { asyncHandler, ApiError } from "../middlewares/errorHandler.js";

const createSchema = z.object({
  targetType: z.enum(["business", "branch", "table"]),
  branchId: z.string().uuid().optional(),
  tableId: z.string().uuid().optional(),
});

function buildTargetUrl({ slug, token }) {
  const base = "https://digital-menu-all.netlify.app";
  return `${base}/b/${slug}?qr=${token}`;
}

export const listQrCodes = asyncHandler(async (req, res) => {
  const codes = await QRCode.findAll({
    where: { businessId: req.auth.businessId },
    include: [{ model: TableModel, as: "table" }],
    order: [["createdAt", "DESC"]],
  });
  const business = await Business.findByPk(req.auth.businessId);
  const data = codes.map((c) => ({
    ...c.toJSON(),
    targetUrl: buildTargetUrl({ slug: business.slug, token: c.token }),
  }));
  res.json({ success: true, data });
});

export const createQrCode = asyncHandler(async (req, res) => {
  const data = createSchema.parse(req.body);

  if (data.targetType === "branch" || data.targetType === "table") {
    const branch = await Branch.findOne({
      where: { id: data.branchId, businessId: req.auth.businessId },
    });
    if (!branch)
      throw new ApiError(
        400,
        "INVALID_BRANCH",
        "Branch does not belong to your business",
      );
  }
  if (data.targetType === "table") {
    const table = await TableModel.findOne({
      where: { id: data.tableId, businessId: req.auth.businessId },
    });
    if (!table)
      throw new ApiError(
        400,
        "INVALID_TABLE",
        "Table does not belong to your business",
      );
  }

  const token = generateQrToken();
  const qr = await QRCode.create({
    businessId: req.auth.businessId,
    branchId: data.branchId || null,
    tableId: data.tableId || null,
    targetType: data.targetType,
    token,
  });

  const business = await Business.findByPk(req.auth.businessId);
  const targetUrl = buildTargetUrl({ slug: business.slug, token });
  const pngDataUrl = await QRCodeLib.toDataURL(targetUrl, {
    width: 512,
    margin: 1,
  });

  res
    .status(201)
    .json({ success: true, data: { ...qr.toJSON(), targetUrl, pngDataUrl } });
});

export const getQrCodeImage = asyncHandler(async (req, res) => {
  const qr = await QRCode.findOne({
    where: { id: req.params.id, businessId: req.auth.businessId },
  });
  if (!qr) throw new ApiError(404, "NOT_FOUND", "QR code not found");
  const business = await Business.findByPk(req.auth.businessId);
  const targetUrl = buildTargetUrl({ slug: business.slug, token: qr.token });
  const pngDataUrl = await QRCodeLib.toDataURL(targetUrl, {
    width: 512,
    margin: 1,
  });
  res.json({ success: true, data: { targetUrl, pngDataUrl } });
});

export const toggleQrCode = asyncHandler(async (req, res) => {
  const qr = await QRCode.findOne({
    where: { id: req.params.id, businessId: req.auth.businessId },
  });
  if (!qr) throw new ApiError(404, "NOT_FOUND", "QR code not found");
  await qr.update({ isActive: !qr.isActive });
  res.json({ success: true, data: qr });
});

export const deleteQrCode = asyncHandler(async (req, res) => {
  const qr = await QRCode.findOne({
    where: { id: req.params.id, businessId: req.auth.businessId },
  });
  if (!qr) throw new ApiError(404, "NOT_FOUND", "QR code not found");
  await qr.destroy();
  res.json({ success: true, data: { id: req.params.id } });
});
