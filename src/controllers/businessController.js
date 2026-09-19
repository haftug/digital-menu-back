import bcrypt from "bcryptjs";
import { z } from "zod";
import {
  Business,
  BusinessProfile,
  BusinessSocial,
  Branch,
  User,
} from "../models/index.js";
import { asyncHandler, ApiError } from "../middlewares/errorHandler.js";

/* ─────────────────────────────────────────────
   Helper: load business with profile + social + branches
   and flatten into one object for the frontend.
   ───────────────────────────────────────────── */
async function loadFlattenedBusiness(businessId) {
  const business = await Business.findByPk(businessId, {
    include: [
      { model: BusinessProfile, as: "profile" },
      { model: BusinessSocial, as: "social" },
      { model: Branch, as: "branches" },
    ],
  });
  if (!business) return null;

  const json = business.toJSON();
  const { profile, social, ...core } = json;

  const merged = {
    ...core,
    ...(profile ? omitMeta(profile) : {}),
    ...(social ? omitMeta(social) : {}),
  };

  if (merged.currencyCode == null) merged.currencyCode = "ETB";
  for (const k of SOCIAL_FIELDS) if (merged[k] == null) merged[k] = null;
  for (const k of PROFILE_FIELDS) if (merged[k] == null) merged[k] = null;

  return merged;
}

function omitMeta(row) {
  const { id, businessId, createdAt, updatedAt, deletedAt, ...rest } = row;
  return rest;
}

/* ─────────────────────────────────────────────
   GET /business/profile
   ───────────────────────────────────────────── */
export const getMyBusiness = asyncHandler(async (req, res) => {
  const data = await loadFlattenedBusiness(req.auth.businessId);
  if (!data) throw new ApiError(404, "NOT_FOUND", "Business not found");
  res.json({ success: true, data });
});

/* ─────────────────────────────────────────────
   Validation helpers — null-safe AND undefined-safe
   ─────────────────────────────────────────────
   THE FIX: previously this transform collapsed a
   *missing* key (undefined, meaning "client didn't
   send this field") into `null` ("client wants this
   field cleared"). Zod then included that null in the
   parsed object, `k in data` became true for every
   field, and the controller wrote NULL over columns
   the client never touched.

   Now: undefined stays undefined (Zod omits the key
   from the parsed result → `k in data` is false →
   the column is left alone). Only an explicit null or
   an explicit empty string means "clear this field".
   ───────────────────────────────────────────── */
const nullableTrimmed = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => {
    if (v === undefined) return undefined; // not sent → don't touch the column
    if (v === null) return null; // explicit clear
    const t = v.trim();
    return t === "" ? null : t; // "" also means clear
  });

const optionalString = (max = 500) =>
  nullableTrimmed.refine(
    (v) => v === undefined || v === null || v.length <= max,
    {
      message: `Must be at most ${max} characters`,
    },
  );

const urlOrEmpty = nullableTrimmed.refine(
  (v) => v === undefined || v === null || /^https?:\/\/.+/i.test(v),
  { message: "Must be a valid http(s) URL" },
);

const emailOrEmpty = nullableTrimmed.refine(
  (v) => v === undefined || v === null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  { message: "Must be a valid email" },
);

/* ─────────────────────────────────────────────
   Field maps — which keys belong to which table
   ───────────────────────────────────────────── */
const PROFILE_FIELDS = [
  "description",
  "phone",
  "email",
  "address",
  "logoUrl",
  "coverUrl",
  "currencyCode",
];

const SOCIAL_FIELDS = [
  "instagramUrl",
  "facebookUrl",
  "twitterUrl",
  "youtubeUrl",
  "tiktokUrl",
  "whatsappUrl",
  "websiteUrl",
];

/* ─────────────────────────────────────────────
   Schemas — one per table
   ───────────────────────────────────────────── */
const updateProfileSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    description: optionalString(2000),
    phone: optionalString(40),
    email: emailOrEmpty,
    address: optionalString(300),
    logoUrl: urlOrEmpty,
    coverUrl: urlOrEmpty,
    currencyCode: z.string().length(3).toUpperCase().optional(),
  })
  .strict();

const updateSocialSchema = z
  .object({
    instagramUrl: urlOrEmpty,
    facebookUrl: urlOrEmpty,
    twitterUrl: urlOrEmpty,
    youtubeUrl: urlOrEmpty,
    tiktokUrl: urlOrEmpty,
    whatsappUrl: urlOrEmpty,
    websiteUrl: urlOrEmpty,
  })
  .strict();

/* ─────────────────────────────────────────────
   PUT /business/profile
   Writes to `businesses` (name) and `business_profiles`
   (everything else). Two separate UPDATEs. Cannot touch
   business_socials.
   ───────────────────────────────────────────── */
export const updateMyBusiness = asyncHandler(async (req, res) => {
  const data = updateProfileSchema.parse(req.body);

  // ── 1. name → businesses ─────────────────────────
  if (data.name !== undefined) {
    const [affected] = await Business.update(
      { name: data.name },
      {
        where: { id: req.auth.businessId },
        fields: ["name"],
      },
    );
    if (!affected) {
      throw new ApiError(404, "NOT_FOUND", "Business not found");
    }
  }

  // ── 2. everything else → business_profiles ───────
  const profilePatch = {};
  for (const k of PROFILE_FIELDS) {
    // `k in data` is now only true for keys the client actually sent,
    // because the transform above no longer manufactures nulls for
    // absent keys.
    if (k in data) profilePatch[k] = data[k];
  }

  const profileKeys = Object.keys(profilePatch);
  if (profileKeys.length > 0) {
    await BusinessProfile.findOrCreate({
      where: { businessId: req.auth.businessId },
      defaults: { businessId: req.auth.businessId },
    });

    await BusinessProfile.update(profilePatch, {
      where: { businessId: req.auth.businessId },
      fields: profileKeys, // ← genuinely only these columns now
    });
  }

  // ── 3. Return the merged fresh state ─────────────
  const fresh = await loadFlattenedBusiness(req.auth.businessId);
  res.json({ success: true, data: fresh });
});

/* ─────────────────────────────────────────────
   PUT /business/socials
   Writes ONLY to business_socials. Cannot touch any
   other table.
   ───────────────────────────────────────────── */
export const updateMyBusinessSocials = asyncHandler(async (req, res) => {
  const data = updateSocialSchema.parse(req.body);

  // Strip keys the client didn't actually send (now genuinely undefined
  // instead of a manufactured null) before handing to Sequelize.
  const socialPatch = {};
  for (const k of SOCIAL_FIELDS) {
    if (k in data) socialPatch[k] = data[k];
  }

  const keys = Object.keys(socialPatch);
  if (keys.length === 0) {
    return res.status(400).json({
      success: false,
      error: { code: "EMPTY_PATCH", message: "No social fields to update" },
    });
  }

  await BusinessSocial.findOrCreate({
    where: { businessId: req.auth.businessId },
    defaults: { businessId: req.auth.businessId },
  });

  await BusinessSocial.update(socialPatch, {
    where: { businessId: req.auth.businessId },
    fields: keys, // ← only these columns
  });

  const fresh = await loadFlattenedBusiness(req.auth.businessId);
  res.json({ success: true, data: fresh });
});

/* ─────────────────────────────────────────────
   Branches
   ───────────────────────────────────────────── */

const branchSchema = z.object({
  name: z.string().trim().min(2).max(120),
  address: z.string().trim().max(300).optional(),
  openTime: z.string().optional(),
  closeTime: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const listBranches = asyncHandler(async (req, res) => {
  const branches = await Branch.findAll({
    where: { businessId: req.auth.businessId },
    order: [["createdAt", "ASC"]],
  });
  res.json({ success: true, data: branches });
});

export const createBranch = asyncHandler(async (req, res) => {
  const data = branchSchema.parse(req.body);
  const branch = await Branch.create({
    ...data,
    businessId: req.auth.businessId,
  });
  res.status(201).json({ success: true, data: branch });
});

export const updateBranch = asyncHandler(async (req, res) => {
  const data = branchSchema.partial().parse(req.body);
  const branch = await Branch.findOne({
    where: { id: req.params.id, businessId: req.auth.businessId },
  });
  if (!branch) throw new ApiError(404, "NOT_FOUND", "Branch not found");
  await branch.update(data);
  res.json({ success: true, data: branch });
});

export const deleteBranch = asyncHandler(async (req, res) => {
  const branch = await Branch.findOne({
    where: { id: req.params.id, businessId: req.auth.businessId },
  });
  if (!branch) throw new ApiError(404, "NOT_FOUND", "Branch not found");
  await branch.destroy();
  res.json({ success: true, data: { id: req.params.id } });
});

/* ─────────────────────────────────────────────
   Staff
   ───────────────────────────────────────────── */

const staffSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  password: z.string().min(8),
  role: z.enum(["staff", "business_owner"]).default("staff"),
  branchId: z.string().uuid().nullable().optional(),
});

export const listStaff = asyncHandler(async (req, res) => {
  const staff = await User.findAll({
    where: { businessId: req.auth.businessId },
    attributes: { exclude: ["passwordHash"] },
  });
  res.json({ success: true, data: staff });
});

export const createStaff = asyncHandler(async (req, res) => {
  const data = staffSchema.parse(req.body);

  const existing = await User.findOne({ where: { email: data.email } });
  if (existing)
    throw new ApiError(409, "EMAIL_TAKEN", "Email already registered");

  const passwordHash = await bcrypt.hash(data.password, 10);

  const user = await User.create({
    name: data.name,
    email: data.email,
    passwordHash,
    role: data.role,
    businessId: req.auth.businessId,
    branchId: data.branchId || null,
  });

  res.status(201).json({
    success: true,
    data: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});

export const deleteStaff = asyncHandler(async (req, res) => {
  const user = await User.findOne({
    where: { id: req.params.id, businessId: req.auth.businessId },
  });
  if (!user) throw new ApiError(404, "NOT_FOUND", "Staff member not found");
  if (user.id === req.auth.id)
    throw new ApiError(
      400,
      "CANNOT_DELETE_SELF",
      "Cannot delete your own account",
    );

  await user.destroy();
  res.json({ success: true, data: { id: req.params.id } });
});
