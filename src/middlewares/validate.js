import { z } from "zod";
import { ApiError } from "./errorHandler.js";

const uuidSchema = z.string().uuid();

export const requireUuidParam =
  (paramName = "id") =>
  (req, res, next) => {
    const result = uuidSchema.safeParse(req.params[paramName]);
    if (!result.success) {
      return next(new ApiError(400, "INVALID_ID", `Invalid ${paramName}`));
    }
    next();
  };
