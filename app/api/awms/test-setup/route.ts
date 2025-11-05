import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { orgName, userName, userEmail } = await req.json();

    // First, create a user who will be the owner
    const user = await prisma.users.create({
      data: {
        name: userName,
        email: userEmail,
      },
    });

    // Then, create the organization
    const organization = await prisma.organizations.create({
      data: {
        name: orgName,
        slug: orgName.toLowerCase().replace(/\s+/g, '-'),
        ownerId: user.id,
      },
    });

    return NextResponse.json({ user, organization });
  } catch (error) {
    console.error('Error in test setup:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
