import { z } from 'zod';
import { Service, ServiceRequest, TableModel } from '../models/index.js';
import { asyncHandler, ApiError } from '../middlewares/errorHandler.js';

const serviceSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  priceAmount: z.number().int().nonnegative().optional(),
  isActive: z.boolean().optional()
});

export const listServices = asyncHandler(async (req, res) => {
  const services = await Service.findAll({ where: { businessId: req.auth.businessId } });
  res.json({ success: true, data: services });
});

export const createService = asyncHandler(async (req, res) => {
  const data = serviceSchema.parse(req.body);
  const service = await Service.create({ ...data, businessId: req.auth.businessId });
  res.status(201).json({ success: true, data: service });
});

export const updateService = asyncHandler(async (req, res) => {
  const data = serviceSchema.partial().parse(req.body);
  const service = await Service.findOne({ where: { id: req.params.id, businessId: req.auth.businessId } });
  if (!service) throw new ApiError(404, 'NOT_FOUND', 'Service not found');
  await service.update(data);
  res.json({ success: true, data: service });
});

export const deleteService = asyncHandler(async (req, res) => {
  const service = await Service.findOne({ where: { id: req.params.id, businessId: req.auth.businessId } });
  if (!service) throw new ApiError(404, 'NOT_FOUND', 'Service not found');
  await service.destroy();
  res.json({ success: true, data: { id: req.params.id } });
});

// --- Service requests ---

export const listServiceRequests = asyncHandler(async (req, res) => {
  const where = { businessId: req.auth.businessId };
  if (req.query.status) where.status = req.query.status;
  const requests = await ServiceRequest.findAll({
    where,
    include: [{ model: TableModel, as: 'table' }],
    order: [['createdAt', 'DESC']]
  });
  res.json({ success: true, data: requests });
});

const statusSchema = z.object({ status: z.enum(['accepted', 'in_progress', 'completed', 'cancelled']) });

export const updateServiceRequestStatus = asyncHandler(async (req, res) => {
  const { status } = statusSchema.parse(req.body);
  const request = await ServiceRequest.findOne({ where: { id: req.params.id, businessId: req.auth.businessId } });
  if (!request) throw new ApiError(404, 'NOT_FOUND', 'Service request not found');
  await request.update({ status });
  res.json({ success: true, data: request });
});
