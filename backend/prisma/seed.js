const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const { ensureSchemesSeeded } = require("../src/services/schemeSyncService");
const { syncDatabaseWithBlockchain } = require("../src/blockchain");

const prisma = new PrismaClient();

async function main() {
  const schemeSeedResult = await ensureSchemesSeeded();
  console.log(
    `Government schemes check: ${schemeSeedResult.total} verified schemes ready.`
  );

  const force = process.argv.includes("--force");
  if (!force) {
    const existingBatch = await prisma.batch.findUnique({
      where: { batchId: "ORG-BAS-001" },
      select: { id: true },
    });
    if (existingBatch) {
      await syncDatabaseWithBlockchain(prisma);
      console.log("Seed already present (fast-path skip).");
      return;
    }
  }

  const password = await bcrypt.hash("Demo@1234", 10);

  const [farmer, partner, admin] = await Promise.all([
    prisma.user.upsert({
      where: { email: "farmer@example.com" },
      update: {},
      create: { name: "Ramesh Kumar", email: "farmer@example.com", passwordHash: password, role: "FARMER" },
    }),
    prisma.user.upsert({
      where: { email: "partner@example.com" },
      update: {},
      create: { name: "Suresh Traders", email: "partner@example.com", passwordHash: password, role: "PARTNER" },
    }),
    prisma.user.upsert({
      where: { email: "admin@example.com" },
      update: {},
      create: { name: "Platform Admin", email: "admin@example.com", passwordHash: password, role: "ADMIN" },
    }),
  ]);

  const batch = await prisma.batch.upsert({
    where: { batchId: "ORG-BAS-001" },
    update: {},
    create: {
      batchId: "ORG-BAS-001",
      productName: "Organic Basmati Rice",
      cropType: "Basmati Rice",
      farmLocation: "Karnal, Haryana",
      harvestDate: new Date("2026-04-15"),
      quantity: 500,
      unit: "kg",
      organicCertId: "CERT-001",
      certificateHash: "0x6b9694f0659cd00c3e0204810903547610ee20301f3d19189d36ce7e39bf2c92",
      description: "Premium organic basmati rice grown without synthetic pesticides.",
      farmerId: farmer.id,
    },
  });

  await prisma.supplyChainEvent.createMany({
    data: [
      {
        batchId: batch.batchId,
        eventType: "RECEIVED_BY_PROCESSOR",
        participantId: partner.id,
        location: "Karnal Processing Unit",
      },
      {
        batchId: batch.batchId,
        eventType: "PACKAGED",
        participantId: partner.id,
        location: "Karnal Processing Unit",
      },
    ],
    skipDuplicates: true,
  });

  await syncDatabaseWithBlockchain(prisma);

  console.log("Seed complete.");
  console.log("Demo login credentials (password: Demo@1234):");
  console.log(` - Farmer:  ${farmer.email}`);
  console.log(` - Partner: ${partner.email}`);
  console.log(` - Admin:   ${admin.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
