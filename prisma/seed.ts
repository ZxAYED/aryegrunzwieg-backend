import {
  CustomerStatus,
  PrismaClient,
  Role,
  TechnicianStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

export async function seedDefaults(prisma: PrismaClient) {
  console.log('Seeding database...');

  const adminEmail = 'admin@gmail.com';
  const Password = await bcrypt.hash('123456', 10);
  const admin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!admin) {
    const created = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: Password,
        role: Role.ADMIN,
        isVerified: true,
      },
    });
    console.log('Created Admin:', created.email);
  }

  const customerEmail = 'customer@gmail.com';

  let customerUser = await prisma.user.findUnique({
    where: { email: customerEmail },
  });
  if (!customerUser) {
    customerUser = await prisma.user.create({
      data: {
        email: customerEmail,
        passwordHash: Password,
        role: Role.CUSTOMER,
        isVerified: true,
      },
    });
    console.log('Created Customer User:', customerUser.email);
  }

  const customerProfile = await prisma.customer.findUnique({
    where: { email: customerEmail },
  });
  if (!customerProfile) {
    const created = await prisma.customer.create({
      data: {
        customerCode: 'CUST-001',
        userId: customerUser.id,
        firstName: 'Customer',
        lastName: 'User',
        email: customerEmail,

        status: CustomerStatus.ACTIVE,
      },
    });
    console.log('Created Customer:', created.email);
  }

  const technicianEmail = 'technician@gmail.com';
  const technicianPassword = await bcrypt.hash('123456', 10);
  let technicianUser = await prisma.user.findUnique({
    where: { email: technicianEmail },
  });
  if (!technicianUser) {
    technicianUser = await prisma.user.create({
      data: {
        email: technicianEmail,
        passwordHash: technicianPassword,
        role: Role.TECHNICIAN,
        isVerified: true,
      },
    });
    console.log('Created Technician User:', technicianUser.email);
  }

  const technicianProfile = await prisma.technician.findUnique({
    where: { email: technicianEmail },
  });
  if (!technicianProfile) {
    const created = await prisma.technician.create({
      data: {
        userId: technicianUser.id,
        name: 'Technician User',
        email: technicianEmail,
        phone: '+1 (555) 123-4567',
        status: TechnicianStatus.AVAILABLE,
        isVerified: true,
      },
    });
    console.log('Created Technician:', created.email);
  }

  console.log('Seeding completed.');
}

if (require.main === module) {
  const prisma = new PrismaClient();
  seedDefaults(prisma)
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
