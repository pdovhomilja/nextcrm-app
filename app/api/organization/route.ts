import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return new NextResponse("Unauthenticated", { status: 401 });
    }

    const body = await req.json();
    const { name, slug } = body;

    if (!name || !slug) {
      return new NextResponse("Name and slug are required", { status: 400 });
    }

    const user = await prismadb.users.findUnique({
      where: {
        email: session.user.email,
      },
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    if (user.organizationId) {
      return new NextResponse("User already belongs to an organization", { status: 400 });
    }

    const existingOrg = await prismadb.organizations.findUnique({
      where: {
        slug: slug,
      },
    });

    if (existingOrg) {
      return new NextResponse("Organization slug already exists", { status: 400 });
    }

    const organization = await prismadb.organizations.create({
      data: {
        v: 0,
        name,
        slug,
        ownerId: user.id,
        plan: "FREE",
        status: "ACTIVE",
      },
    });

    await prismadb.users.update({
      where: {
        id: user.id,
      },
      data: {
        organizationId: organization.id,
      },
    });

    return NextResponse.json(organization);
  } catch (error) {
    console.log("[ORGANIZATION_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return new NextResponse("Unauthenticated", { status: 401 });
    }

    const user = await prismadb.users.findUnique({
      where: {
        email: session.user.email,
      },
    });

    if (!user || !user.organizationId) {
      return NextResponse.json(null);
    }

    const organization = await prismadb.organizations.findUnique({
      where: {
        id: user.organizationId,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(organization);
  } catch (error) {
    console.log("[ORGANIZATION_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return new NextResponse("Unauthenticated", { status: 401 });
    }

    const body = await req.json();
    const { name } = body;

    if (!name) {
      return new NextResponse("Name is required", { status: 400 });
    }

    const user = await prismadb.users.findUnique({
      where: {
        email: session.user.email,
      },
    });

    if (!user || !user.organizationId) {
      return new NextResponse("User does not belong to an organization", { status: 400 });
    }

    const organization = await prismadb.organizations.findUnique({
      where: {
        id: user.organizationId,
      },
    });

    if (!organization) {
      return new NextResponse("Organization not found", { status: 404 });
    }

    if (organization.ownerId !== user.id && !user.is_admin) {
      return new NextResponse("Unauthorized", { status: 403 });
    }

    const updatedOrganization = await prismadb.organizations.update({
      where: {
        id: organization.id,
      },
      data: {
        name,
      },
    });

    return NextResponse.json(updatedOrganization);
  } catch (error) {
    console.log("[ORGANIZATION_PUT]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
