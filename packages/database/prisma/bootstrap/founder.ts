/**
 * Founder bootstrap — SEPARATE from demo seeds.
 * Creates one Organization + FOUNDER user from env.
 * Safe to re-run (upserts by org code / email).
 *
 * Required env: DATABASE_URL, FOUNDER_EMAIL, FOUNDER_PASSWORD
 * Optional: FOUNDER_ORG_NAME, FOUNDER_ORG_CODE, FOUNDER_DISPLAY_NAME
 *
 * Usage: npx tsx packages/database/prisma/bootstrap/founder.ts
 */
import { PrismaClient, RoleCode, UserAccountStatus } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.FOUNDER_EMAIL || '').trim().toLowerCase();
  const password = process.env.FOUNDER_PASSWORD || '';
  const orgName = process.env.FOUNDER_ORG_NAME || 'Bhairava';
  const orgCode = (process.env.FOUNDER_ORG_CODE || 'BHAIRAVA').trim().toUpperCase();
  const displayName = process.env.FOUNDER_DISPLAY_NAME || 'Founder';

  if (!email || !password) {
    console.error('FOUNDER_EMAIL and FOUNDER_PASSWORD are required');
    process.exit(1);
  }
  if (password.length < 10) {
    console.error('FOUNDER_PASSWORD must be at least 10 characters');
    process.exit(1);
  }

  const org = await prisma.organization.upsert({
    where: { code: orgCode },
    update: { name: orgName },
    create: { name: orgName, code: orgCode },
  });

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

  const user = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: org.id, email } },
    update: {
      passwordHash,
      roleCode: RoleCode.FOUNDER,
      status: UserAccountStatus.ACTIVE,
      displayName,
    },
    create: {
      organizationId: org.id,
      email,
      passwordHash,
      displayName,
      roleCode: RoleCode.FOUNDER,
      status: UserAccountStatus.ACTIVE,
    },
  });

  await prisma.companySettings.upsert({
    where: { organizationId: org.id },
    update: {},
    create: {
      organizationId: org.id,
      settingsJson: {
        reservationHoldHoursDefault: 48,
        currency: 'INR',
        timezone: 'Asia/Kolkata',
        bootstrappedAt: new Date().toISOString(),
      },
    },
  });

  console.log(JSON.stringify({
    ok: true,
    organizationId: org.id,
    orgCode: org.code,
    founderUserId: user.id,
    founderEmail: user.email,
    note: 'Demo seeds were NOT applied. Run prisma db seed only for demo data.',
  }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
