import { CustomerStatus, PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function seed() {
  console.log('Seeding database...');

  const adminPassword = await bcrypt.hash('123456', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@gmail.com' },
    update: {},
    create: {
      email: 'admin@gmail.com',
      name: 'Admin User',
      passwordHash: adminPassword,
      role: Role.ADMIN,
      isVerified: true,
    },
  });
  console.log('Created Admin:', admin.email);

  const customerPassword = await bcrypt.hash('123456', 10);
  const customerUser = await prisma.user.upsert({
    where: { email: 'customer@gmail.com' },
    update: {},
    create: {
      email: 'customer@gmail.com',
      name: 'Customer User',
      passwordHash: customerPassword,
      role: Role.CUSTOMER,
      isVerified: true,
    },
  });

  const customerProfile = await prisma.customer.upsert({
    where: { email: 'customer@gmail.com' },
    update: {},
    create: {
      customerCode: 'CUST-001',
      userId: customerUser.id,
      name: 'Customer User',
      email: 'customer@gmail.com',
      status: CustomerStatus.ACTIVE,
    },
  });
  console.log('Created Customer:', customerProfile.email);

  console.log('Seeding completed.');
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
