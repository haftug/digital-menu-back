import crypto from "crypto";

// Falls back to an insecure default in development so the app doesn't hard-crash
// if QR_SECRET is missing from .env — but warns loudly, because in production a
// missing/shared secret means QR tokens could be forged.
function getQrSecret() {
  const secret = process.env.QR_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "QR_SECRET is not set. Set a random secret in your .env before running in production.",
      );
    }
    console.warn(
      "[qrToken] WARNING: QR_SECRET is not set in your .env file — using an insecure development default. " +
        "Add QR_SECRET=<any random string> to backend/.env.",
    );
    return "insecure-dev-fallback-secret-do-not-use-in-production";
  }
  return secret;
}

// Signed, opaque QR token: "<randomId>.<hmac>". The random id is stored on the
// QRCode row; the hmac lets us cheaply reject tampered tokens before hitting the DB.
export function generateQrToken() {
  const raw = crypto.randomBytes(16).toString("hex");
  const hmac = crypto
    .createHmac("sha256", getQrSecret())
    .update(raw)
    .digest("hex")
    .slice(0, 16);
  return `${raw}.${hmac}`;
}

export function isValidQrTokenShape(token) {
  if (typeof token !== "string" || !token.includes(".")) return false;
  const [raw, hmac] = token.split(".");
  const expected = crypto
    .createHmac("sha256", getQrSecret())
    .update(raw)
    .digest("hex")
    .slice(0, 16);
  return hmac === expected;
}
