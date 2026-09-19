import { z } from 'zod';
import { TableModel, Branch } from '../models/index.js';
import { asyncHandler, ApiError } from '../middlewares/errorHandler.js';

const tableSchema = z.object({
  branchId: z.string().uuid(),
  tableNumber: z.string().min(1),
  capacity: z.number().int().positive().optional()
});

export const listTables = asyncHandler(async (req, res) => {
  const where = { businessId: req.auth.businessId };
  if (req.query.branchId) where.branchId = req.query.branchId;
  const tables = await TableModel.findAll({ where, order: [['tableNumber', 'ASC']] });
  res.json({ success: true, data: tables });
});

export const createTable = asyncHandler(async (req, res) => {
  const data = tableSchema.parse(req.body);
  const branch = await Branch.findOne({ where: { id: data.branchId, businessId: req.auth.businessId } });
  if (!branch) throw new ApiError(400, 'INVALID_BRANCH', 'Branch does not belong to your business');
  const table = await TableModel.create({ ...data, businessId: req.auth.businessId });
  res.status(201).json({ success: true, data: table });
});

export const updateTable = asyncHandler(async (req, res) => {
  const data = tableSchema.partial().parse(req.body);
  const table = await TableModel.findOne({ where: { id: req.params.id, businessId: req.auth.businessId } });
  if (!table) throw new ApiError(404, 'NOT_FOUND', 'Table not found');
  await table.update(data);
  res.json({ success: true, data: table });
});

export const deleteTable = asyncHandler(async (req, res) => {
  const table = await TableModel.findOne({ where: { id: req.params.id, businessId: req.auth.businessId } });
  if (!table) throw new ApiError(404, 'NOT_FOUND', 'Table not found');
  await table.destroy();
  res.json({ success: true, data: { id: req.params.id } });
});
