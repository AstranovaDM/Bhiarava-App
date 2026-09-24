import { PrismaClient, RoleCode, PlotStatus, ProjectLifecycle, UserAccountStatus } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.upsert({
    where: { code: 'BHAIRAVA-DEMO' },
    update: {},
    create: {
      name: 'Bhairava Demo Org',
      code: 'BHAIRAVA-DEMO',
    },
  });

  const passwordHash = await argon2.hash('Demo@12345', { type: argon2.argon2id });

  const users = [
    { email: 'founder@bhairava.demo', roleCode: RoleCode.FOUNDER, displayName: 'Demo Founder' },
    { email: 'admin@bhairava.demo', roleCode: RoleCode.ADMINISTRATOR, displayName: 'Demo Admin' },
    { email: 'finance@bhairava.demo', roleCode: RoleCode.FINANCE, displayName: 'Demo Finance' },
    { email: 'viewer@bhairava.demo', roleCode: RoleCode.VIEWER, displayName: 'Demo Viewer' },
    { email: 'agent@bhairava.demo', roleCode: RoleCode.AGENT, displayName: 'Demo Agent' },
    { email: 'customer@bhairava.demo', roleCode: RoleCode.CUSTOMER, displayName: 'Demo Customer' },
  ] as const;

  for (const u of users) {
    await prisma.user.upsert({
      where: { organizationId_email: { organizationId: org.id, email: u.email } },
      update: { passwordHash, roleCode: u.roleCode, status: UserAccountStatus.ACTIVE },
      create: {
        organizationId: org.id,
        email: u.email,
        passwordHash,
        displayName: u.displayName,
        roleCode: u.roleCode,
        status: UserAccountStatus.ACTIVE,
      },
    });
  }

  const project = await prisma.project.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'DEMO-1' } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Demo Township',
      code: 'DEMO-1',
      city: 'Hyderabad',
      lifecycleStatus: ProjectLifecycle.ACTIVE,
      agentVisible: true,
      customerListed: true,
    },
  });

  for (let i = 1; i <= 5; i++) {
    const number = `A-${String(i).padStart(2, '0')}`;
    await prisma.plot.upsert({
      where: { projectId_number: { projectId: project.id, number } },
      update: {},
      create: {
        organizationId: org.id,
        projectId: project.id,
        number,
        areaSqYd: 200,
        status: PlotStatus.AVAILABLE,
        ratePerSqYd: 10000,
        totalPrice: 2000000,
      },
    });
  }

  console.log('Seed complete.');
  console.log('Demo login: founder@bhairava.demo / Demo@12345 (and sibling role emails)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

