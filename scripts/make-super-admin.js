/**
 * Make User Super Admin Script
 * Sets is_admin: true for a specific user email
 *
 * Usage: node scripts/make-super-admin.js <email>
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function makeSuperAdmin() {
  try {
    // Get email from command line argument
    const email = process.argv[2];

    if (!email) {
      console.error('❌ Error: Please provide an email address');
      console.log('Usage: node scripts/make-super-admin.js <email>');
      process.exit(1);
    }

    console.log(`🔍 Looking for user with email: ${email}`);

    // Find user
    const user = await prisma.users.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        is_admin: true,
        is_account_admin: true,
        organizationId: true,
        organization_role: true,
      },
    });

    if (!user) {
      console.error(`❌ User not found with email: ${email}`);
      process.exit(1);
    }

    console.log(`\n✅ Found user:`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Current Admin Status: ${user.is_admin ? '✅ SuperAdmin' : '❌ Regular User'}`);
    console.log(`   Account Admin: ${user.is_account_admin ? '✅' : '❌'}`);
    console.log(`   Organization Role: ${user.organization_role}`);

    if (user.is_admin && user.is_account_admin) {
      console.log(`\n✅ User is already a Platform SuperAdmin!`);
      process.exit(0);
    }

    // Update user to SuperAdmin
    console.log(`\n⚡ Setting user as Platform SuperAdmin...`);

    const updatedUser = await prisma.users.update({
      where: { id: user.id },
      data: {
        is_admin: true,
        is_account_admin: true,
      },
    });

    console.log(`\n🎉 SUCCESS! User updated:`);
    console.log(`   is_admin: ${updatedUser.is_admin} ✅`);
    console.log(`   is_account_admin: ${updatedUser.is_account_admin} ✅`);
    console.log(`\n📍 Admin features now accessible at:`);
    console.log(`   - Admin Dashboard: http://localhost:3001/admin`);
    console.log(`   - User Management: http://localhost:3001/admin/users`);
    console.log(`   - Module Management: http://localhost:3001/admin/modules`);
    console.log(`\n💡 Tip: You may need to log out and log back in for changes to take effect`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

makeSuperAdmin();
