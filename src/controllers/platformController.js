import { z } from 'zod';
import { Business, Branch, User, Order } from '../models/index.js';
import { asyncHandler, ApiError } from '../middlewares/errorHandler.js';

export const listBusinesses = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.status) where.status = req.query.status;
  const businesses = await Business.findAll({
    where,
    include: [{ model: Branch, as: 'branches' }],
    order: [['createdAt', 'DESC']]
  });
  res.json({ success: true, data: businesses });
});

const statusSchema = z.object({ status: z.enum(['pending', 'active', 'inactive', 'suspended']) });

export const updateBusinessStatus = asyncHandler(async (req, res) => {
  const { status } = statusSchema.parse(req.body);
  const business = await Business.findByPk(req.params.id);
  if (!business) throw new ApiError(404, 'NOT_FOUND', 'Business not found');
  await business.update({ status });
  res.json({ success: true, data: business });
});

export const platformStats = asyncHandler(async (req, res) => {
  const [totalBusinesses, activeBusinesses, pendingBusinesses, totalBranches, totalOrders, totalStaff] =
    await Promise.all([
      Business.count(),
      Business.count({ where: { status: 'active' } }),
      Business.count({ where: { status: 'pending' } }),
      Branch.count(),
      Order.count(),
      User.count({ where: { role: ['business_owner', 'staff'] } })
    ]);
  res.json({
    success: true,
    data: { totalBusinesses, activeBusinesses, pendingBusinesses, totalBranches, totalOrders, totalStaff }
  });
});
