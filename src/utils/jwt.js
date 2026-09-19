import jwt from "jsonwebtoken";

let warnedAccess = false;
let warnedRefresh = false;

function getAccessSecret() {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "JWT_ACCESS_SECRET is not set. Set a random secret in your .env before running in production.",
      );
    }
    if (!warnedAccess) {
      console.warn(
        "[jwt] WARNING: JWT_ACCESS_SECRET is not set in your .env file — using an insecure development default. " +
          "Add JWT_ACCESS_SECRET=<any random string> to backend/.env.",
      );
      warnedAccess = true;
    }
    return "insecure-dev-fallback-access-secret-do-not-use-in-production";
  }
  return secret;
}

function getRefreshSecret() {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "JWT_REFRESH_SECRET is not set. Set a random secret in your .env before running in production.",
      );
    }
    if (!warnedRefresh) {
      console.warn(
        "[jwt] WARNING: JWT_REFRESH_SECRET is not set in your .env file — using an insecure development default. " +
          "Add JWT_REFRESH_SECRET=<any random string> to backend/.env.",
      );
      warnedRefresh = true;
    }
    return "insecure-dev-fallback-refresh-secret-do-not-use-in-production";
  }
  return secret;
}

export function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      businessId: user.businessId,
      branchId: user.branchId,
    },
    getAccessSecret(),
    { expiresIn: process.env.JWT_ACCESS_EXPIRES || "15m" },
  );
}

export function signRefreshToken(user) {
  return jwt.sign({ sub: user.id }, getRefreshSecret(), {
    expiresIn: process.env.JWT_REFRESH_EXPIRES || "7d",
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, getAccessSecret());
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, getRefreshSecret());
}
