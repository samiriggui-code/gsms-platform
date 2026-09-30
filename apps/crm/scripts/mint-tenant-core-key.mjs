import { createHash, randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const API_KEY_PREFIX = "crm_";
const db = new PrismaClient();

async function main() {
  const raw =
    API_KEY_PREFIX + randomBytes(24).toString("base64url");
  const hash = createHash("sha256").update(raw).digest("hex");
  const start = raw.slice(0, API_KEY_PREFIX.length + 8);

  const users = await db.user.findMany({
    take: 3,
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true },
  });
  if (!users.length) throw new Error("no users");
  const user = users[0];

  await db.apikey.updateMany({
    where: { referenceId: user.id, name: "tenant-core-bff" },
    data: { enabled: false },
  });

  const key = await db.apikey.create({
    data: {
      name: "tenant-core-bff",
      keyHash: hash,
      start,
      prefix: API_KEY_PREFIX,
      referenceId: user.id,
      enabled: true,
    },
  });

  const companies = await db.company.findMany({
    take: 20,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      domain: true,
      _count: { select: { deals: true } },
    },
  });

  console.log(
    JSON.stringify(
      {
        email: user.email,
        apiKey: raw,
        apiKeyId: key.id,
        companies: companies.map((c) => ({
          id: c.id,
          name: c.name,
          deals: c._count.deals,
        })),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
