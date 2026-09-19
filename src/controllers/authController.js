import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User, Business } from '../models/index.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { asyncHandler, ApiError } from '../middlewares/errorHandler.js';

const registerBusinessSchema = z.object({
  ownerName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  businessName: z.string().min(2),
  businessType: z.enum(['restaurant', 'cafe', 'burger_shop', 'hotel', 'other']).default('restaurant')
});

function slugify(name) {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '') +
    '-' +
    Math.random().toString(36).slice(2, 6)
  );
}

// Self-service registration: creates a business_owner user + a PENDING business.
// A super_admin must activate the business before it's publicly visible (see platformController).
export const registerBusiness = asyncHandler(async (req, res) => {
  const data = registerBusinessSchema.parse(req.body);

  const existing = await User.findOne({ where: { email: data.email } });
  if (existing) throw new ApiError(409, 'EMAIL_TAKEN', 'Email already registered');

  const passwordHash = await bcrypt.hash(data.password, 10);

  const business = await Business.create({
    name: data.businessName,
    slug: slugify(data.businessName),
    businessType: data.businessType,
    status: 'pending'
  });

  const user = await User.create({
    name: data.ownerName,
    email: data.email,
    passwordHash,
    role: 'business_owner',
    businessId: business.id
  });

  business.ownerUserId = user.id;
  await business.save();

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  res.status(201).json({
    success: true,
    data: {
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      business: { id: business.id, name: business.name, slug: business.slug, status: business.status }
    }
  });
});

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

export const login = asyncHandler(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const user = await User.findOne({ where: { email } });
  if (!user || !user.isActive) throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  res.json({
    success: true,
    data: {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        businessId: user.businessId,
        branchId: user.branchId
      }
    }
  });
});

export const me = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.auth.id, { attributes: { exclude: ['passwordHash'] } });
  if (!user) throw new ApiError(404, 'NOT_FOUND', 'User not found');
  let business = null;
  if (user.businessId) {
    business = await Business.findByPk(user.businessId);
  }
  res.json({ success: true, data: { user, business } });
});

const refreshSchema = z.object({ refreshToken: z.string() });

export const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = refreshSchema.parse(req.body);
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new ApiError(401, 'INVALID_REFRESH', 'Invalid or expired refresh token');
  }
  const user = await User.findByPk(payload.sub);
  if (!user || !user.isActive) throw new ApiError(401, 'INVALID_REFRESH', 'Invalid refresh token');

  res.json({
    success: true,
    data: { accessToken: signAccessToken(user), refreshToken: signRefreshToken(user) }
  });
});
