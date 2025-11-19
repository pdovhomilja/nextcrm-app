/**
 * Make User Organization Owner Script
 * Sets organization_role to OWNER and updates organization ownerId
 *
 * Usage: node scripts/make-org-owner.js <email> <organization-name>
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function makeOrgOwner() {
  try {
    // Get email and org name from command line arguments
    const email = process.argv[2];
    const orgName = process.argv[3];

    if (!email || !orgName) {
      console.error('❌ Error: Please provide email and organization name');
      console.log('Usage: node scripts/make-org-owner.js <email> <organization-name>');
      process.exit(1);
    }

    console.log(`🔍 Looking for user: ${email}`);
    console.log(`🔍 Looking for organization: ${orgName}`);

    // Find user
    const user = await prisma.users.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        organizationId: true,
        organization_role: true,
        organization: {
          select: {
            id: true,
            name: true,
            ownerId: true,
          },
        },
      },
    });

    if (!user) {
      console.error(`❌ User not found: ${email}`);
      process.exit(1);
    }

    console.log(`\n✅ Found user:`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Current Role: ${user.organization_role}`);
    console.log(`   Current Organization: ${user.organization?.name || 'None'}`);

    // Find organization
    const org = await prisma.organizations.findFirst({
      where: { name: orgName },
      select: {
        id: true,
        name: true,
        slug: true,
        ownerId: true,
        owner: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!org) {
      console.error(`❌ Organization not found: ${orgName}`);
      process.exit(1);
    }

    console.log(`\n✅ Found organization:`);
    console.log(`   Name: ${org.name}`);
    console.log(`   Slug: ${org.slug}`);
    console.log(`   Current Owner: ${org.owner?.name || 'None'} (${org.owner?.email || 'N/A'})`);

    // Check if already owner
    if (user.organizationId === org.id && user.organization_role === 'OWNER' && org.ownerId === user.id) {
      console.log(`\n✅ User is already the OWNER of this organization!`);
      process.exit(0);
    }

    // Update user and organization in a transaction
    console.log(`\n⚡ Setting ${user.name} as OWNER of ${org.name}...`);

    const result = await prisma.$transaction([
      // Update user
      prisma.users.update({
        where: { id: user.id },
        data: {
          organizationId: org.id,
          organization_role: 'OWNER',
        },
      }),
      // Update organization
      prisma.organizations.update({
        where: { id: org.id },
        data: {
          ownerId: user.id,
        },
      }),
    ]);

    console.log(`\n🎉 SUCCESS! Updates completed:`);
    console.log(`\n👤 User Updates:`);
    console.log(`   organizationId: ${org.id} ✅`);
    console.log(`   organization_role: OWNER ✅`);
    console.log(`\n🏢 Organization Updates:`);
    console.log(`   ownerId: ${user.id} ✅`);
    console.log(`\n📍 You now have full OWNER permissions for "${org.name}":`);
    console.log(`   ✅ Manage billing and subscriptions`);
    console.log(`   ✅ Invite and manage team members`);
    console.log(`   ✅ Assign roles to team members`);
    console.log(`   ✅ Access all organization settings`);
    console.log(`   ✅ Delete organization (with caution!)`);
    console.log(`\n💡 Tip: Log out and log back in for changes to take effect in your session`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

makeOrgOwner();
