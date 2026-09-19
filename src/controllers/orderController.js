import { z } from 'zod';
import { Order, OrderItem, TableModel } from '../models/index.js';
import { asyncHandler, ApiError } from '../middlewares/errorHandler.js';

const VALID_TRANSITIONS = {
  pending: ['accepted', 'rejected'],
  accepted: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['served'],
  served: ['completed'],
  rejected: [],
  cancelled: [],
  completed: []
};

export const listOrders = asyncHandler(async (req, res) => {
  const where = { businessId: req.auth.businessId };
  if (req.query.status) where.status = req.query.status;
  if (req.query.branchId) where.branchId = req.query.branchId;
  const orders = await Order.findAll({
    where,
    include: [
      { model: OrderItem, as: 'items' },
      { model: TableModel, as: 'table' }
    ],
    order: [['createdAt', 'DESC']]
  });
  res.json({ success: true, data: orders });
});

const statusSchema = z.object({
  status: z.enum(['accepted', 'rejected', 'preparing', 'ready', 'served', 'completed', 'cancelled'])
});

export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = statusSchema.parse(req.body);
  const order = await Order.findOne({ where: { id: req.params.id, businessId: req.auth.businessId } });
  if (!order) throw new ApiError(404, 'NOT_FOUND', 'Order not found');

  const allowed = VALID_TRANSITIONS[order.status] || [];
  if (!allowed.includes(status)) {
    throw new ApiError(400, 'INVALID_TRANSITION', `Cannot move order from "${order.status}" to "${status}"`);
  }

  await order.update({ status });
  res.json({ success: true, data: order });
});
