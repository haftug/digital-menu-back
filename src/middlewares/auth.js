import { verifyAccessToken } from '../utils/jwt.js';

// Verifies the bearer token and attaches { id, role, businessId, branchId } to req.auth
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ success: false, error: { code: 'NO_TOKEN', message: 'Authentication required' } });
  }
  try {
    const payload = verifyAccessToken(token);
    req.auth = {
      id: payload.sub,
      role: payload.role,
      businessId: payload.businessId,
      branchId: payload.branchId
    };
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' } });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }
    next();
  };
}

// Every business-scoped route uses req.auth.businessId as the ONLY source of truth
// for tenant scoping — never req.body.businessId / req.query.businessId. This
// middleware just guarantees the authenticated user actually belongs to a business.
export function requireBusinessContext(req, res, next) {
  if (req.auth.role === 'super_admin') return next(); // platform routes handle their own scoping
  if (!req.auth.businessId) {
    return res.status(403).json({ success: false, error: { code: 'NO_BUSINESS_CONTEXT', message: 'User is not attached to a business' } });
  }
  next();
}
