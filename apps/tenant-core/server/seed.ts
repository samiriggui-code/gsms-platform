import "dotenv/config";
import bcrypt from "bcryptjs";
import { db } from "./db.js";

async function main() {
  const email = "client@demo.gsms.local";
  const password = "Demo!2026";
  const crmLyon = process.env.CRM_COMPANY_ID_LYON?.trim() || null;
  const crmParis = process.env.CRM_COMPANY_ID_PARIS?.trim() || null;

  await db.membership.deleteMany();
  await db.workspace.deleteMany();
  await db.organization.deleteMany();
  await db.user.deleteMany();

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await db.user.create({
    data: {
      email,
      name: "Client Démo",
      passwordHash,
    },
  });

  const org = await db.organization.create({
    data: { name: "Groupe Dupont (démo)" },
  });

  const lyon = await db.workspace.create({
    data: {
      organizationId: org.id,
      name: "Lyon",
      label: "ERP — site Lyon",
      crmCompanyId: crmLyon,
    },
  });

  const paris = await db.workspace.create({
    data: {
      organizationId: org.id,
      name: "Paris",
      label: "Commerce — site Paris",
      crmCompanyId: crmParis,
    },
  });

  await db.membership.create({
    data: {
      userId: user.id,
      organizationId: org.id,
      role: "owner",
    },
  });

  console.log("Seed OK");
  console.log("  login:", email, "/", password);
  console.log(
    "  workspaces:",
    lyon.id,
    `(${lyon.name}, crm=${lyon.crmCompanyId ?? "—"})`,
    paris.id,
    `(${paris.name}, crm=${paris.crmCompanyId ?? "—"})`,
  );
  if (!crmLyon && !crmParis) {
    console.log(
      "  hint: set CRM_COMPANY_ID_LYON / CRM_COMPANY_ID_PARIS then re-seed for P0 CRM link",
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
