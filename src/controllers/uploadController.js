import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { asyncHandler, ApiError } from "../middlewares/errorHandler.js";

const UPLOAD_DIR = path.resolve("public/uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    const name = crypto.randomBytes(16).toString("hex") + ext;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED.has(file.mimetype)) {
      return cb(
        new ApiError(400, "INVALID_FILE", "Only JPG, PNG, WEBP or GIF allowed"),
      );
    }
    cb(null, true);
  },
});

export const uploadSingle = upload.single("file");

export const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "NO_FILE", "No file uploaded");
  }

  const base =
    process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`;
  const url = `${base}/uploads/${req.file.filename}`;

  res.status(201).json({
    success: true,
    data: {
      url,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
    },
  });
});
