import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const orgName = "Symcompute";
  const email = "superadmin@symcompute.com";
  const password = "password123";
  const name = "Super Admin";

  console.log('Starting seed...');

  // Create or find the organization
  let organization = await prisma.organization.findFirst({
    where: { name: orgName }
  });

  if (!organization) {
    organization = await prisma.organization.create({
      data: { name: orgName }
    });
    console.log(`Created organization: ${organization.name} (${organization.id})`);
  } else {
    console.log(`Found existing organization: ${organization.name}`);
  }

  // Create or find the Super Admin role
  let superAdminRole = await prisma.role.findFirst({
    where: { 
      organizationId: organization.id,
      name: "Super Admin"
    }
  });

  if (!superAdminRole) {
    superAdminRole = await prisma.role.create({
      data: {
        organizationId: organization.id,
        name: "Super Admin"
      }
    });
    console.log(`Created role: ${superAdminRole.name}`);
  }

  // Create default system roles
  const defaultRoles = ["Admin", "Engineer", "Sales", "Finance", "Viewer"];
  for (const roleName of defaultRoles) {
    const existing = await prisma.role.findFirst({
      where: { organizationId: organization.id, name: roleName }
    });
    if (!existing) {
      await prisma.role.create({
        data: { organizationId: organization.id, name: roleName }
      });
      console.log(`Created role: ${roleName}`);
    }
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  // Create or find the super admin user
  let user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        organizationId: organization.id,
        email,
        name,
        password: hashedPassword,
        isActive: true,
      }
    });
    console.log(`Created user: ${user.name} (${user.email})`);
  } else {
    // Update password and ensure isActive
    user = await prisma.user.update({
      where: { email },
      data: { 
        password: hashedPassword,
        isActive: true,
        organizationId: organization.id
      }
    });
    console.log(`Updated user: ${user.name} (${user.email})`);
  }

  // Assign Super Admin role to user
  const existingAssignment = await prisma.userRoleAssignment.findUnique({
    where: { userId_roleId: { userId: user.id, roleId: superAdminRole.id } }
  });

  if (!existingAssignment) {
    await prisma.userRoleAssignment.create({
      data: { userId: user.id, roleId: superAdminRole.id }
    });
    console.log(`Assigned role "${superAdminRole.name}" to ${user.email}`);
  }

  console.log('\n✅ Seed completed successfully!');
  console.log(`📧 Login with: ${email}`);
  console.log(`🔑 Password: ${password}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
