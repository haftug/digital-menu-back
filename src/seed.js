import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import {
  sequelize,
  User,
  Business,
  Branch,
  Category,
  CatalogItem,
  TableModel,
  QRCode,
  Service,
} from "./models/index.js";
import { generateQrToken } from "./utils/qrToken.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Collects every credential this script creates/confirms so we can dump a single
// JSON file at the end — handy for testing each role without digging through logs.
const credentials = [];

async function upsertUser({
  name,
  email,
  password,
  role,
  businessId = null,
  branchId = null,
}) {
  let user = await User.findOne({ where: { email } });
  if (!user) {
    user = await User.create({
      name,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role,
      businessId,
      branchId,
    });
    console.log(`Created ${role}: ${email}`);
  } else {
    console.log(`${role} already exists, skipping: ${email}`);
  }
  credentials.push({ role, name, email, password, businessId, branchId });
  return user;
}

async function seed() {
  await sequelize.authenticate();
  await sequelize.sync();

  // --- 1. Platform super admin ---
  await upsertUser({
    name: "Platform Super Admin",
    email: process.env.SUPERADMIN_EMAIL || "admin@platform.local",
    password: process.env.SUPERADMIN_PASSWORD || "ChangeMe123!",
    role: "super_admin",
  });

  // --- 2. Demo business (active, so it's immediately viewable/orderable) ---
  let business = await Business.findOne({ where: { slug: "demo-cafe" } });
  let branch;

  if (!business) {
    business = await Business.create({
      name: "Demo Café",
      slug: "demo-cafe",
      businessType: "cafe",
      description: "A demo café seeded for local development and testing.",
      currencyCode: "ETB",
      status: "active",
    });

    branch = await Branch.create({
      businessId: business.id,
      name: "Main Branch",
      address: "Bole Road, Addis Ababa",
      openTime: "07:00",
      closeTime: "21:00",
    });

    const table1 = await TableModel.create({
      businessId: business.id,
      branchId: branch.id,
      tableNumber: "1",
      capacity: 2,
    });
    const table2 = await TableModel.create({
      businessId: business.id,
      branchId: branch.id,
      tableNumber: "2",
      capacity: 4,
    });

    for (const table of [table1, table2]) {
      await QRCode.create({
        businessId: business.id,
        branchId: branch.id,
        tableId: table.id,
        targetType: "table",
        token: generateQrToken(),
      });
    }

    const coffeeCat = await Category.create({
      businessId: business.id,
      name: "Coffee",
      sortOrder: 1,
    });
    const foodCat = await Category.create({
      businessId: business.id,
      name: "Light Bites",
      sortOrder: 2,
    });

    await CatalogItem.bulkCreate([
      {
        businessId: business.id,
        categoryId: coffeeCat.id,
        name: "Macchiato",
        priceAmount: 6000,
        itemType: "drink",
        sortOrder: 1,
      },
      {
        businessId: business.id,
        categoryId: coffeeCat.id,
        name: "Cappuccino",
        priceAmount: 8000,
        itemType: "drink",
        sortOrder: 2,
      },
      {
        businessId: business.id,
        categoryId: coffeeCat.id,
        name: "Iced Latte",
        priceAmount: 9500,
        itemType: "drink",
        sortOrder: 3,
        availabilityStatus: "sold_out",
      },
      {
        businessId: business.id,
        categoryId: foodCat.id,
        name: "Club Sandwich",
        priceAmount: 25000,
        itemType: "food",
        sortOrder: 1,
      },
      {
        businessId: business.id,
        categoryId: foodCat.id,
        name: "Croissant",
        priceAmount: 12000,
        itemType: "food",
        sortOrder: 2,
      },
    ]);

    await Service.create({
      businessId: business.id,
      name: "Call Waiter",
      description: "Ask a staff member to come to your table",
    });

    console.log(
      'Seeded demo business "demo-cafe" with branch, tables, QR codes, catalog, and a service.',
    );
  } else {
    branch = await Branch.findOne({ where: { businessId: business.id } });
    console.log("Demo business already exists, skipping catalog/branch seed.");
  }

  // --- 3. Business owner (role: business_owner) ---
  const owner = await upsertUser({
    name: "Demo Owner",
    email: "owner@demo-cafe.local",
    password: "Owner123!",
    role: "business_owner",
    businessId: business.id,
  });
  if (!business.ownerUserId) {
    business.ownerUserId = owner.id;
    await business.save();
  }

  // --- 4. Staff member (role: staff, scoped to the branch) ---
  await upsertUser({
    name: "Demo Staff",
    email: "staff@demo-cafe.local",
    password: "Staff123!",
    role: "staff",
    businessId: business.id,
    branchId: branch ? branch.id : null,
  });

  // --- Write all credentials to a JSON file for easy reference/testing ---
  const outputPath = path.join(__dirname, "..", "seed-credentials.json");
  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        note: "Local development credentials only — do not use these in production.",
        apiBaseUrl: "http://localhost:4000/api",
        loginEndpoint:
          'POST /api/auth/login  { "email": "...", "password": "..." }',
        demoBusinessSlug: business.slug,
        accounts: credentials,
      },
      null,
      2,
    ),
  );
  console.log(`\nWrote credentials for all seeded accounts to: ${outputPath}`);

  console.log("\nSeed complete. Accounts:");
  console.table(
    credentials.map(({ role, email, password }) => ({ role, email, password })),
  );

  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
