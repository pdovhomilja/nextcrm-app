import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { hash } from "bcrypt";

export async function POST(req: Request) {
  try {
    const { name, email, password, confirmPassword } = await req.json();

    if (!name || !email || !password || !confirmPassword) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    if (password !== confirmPassword) {
      return new NextResponse("Passwords do not match", { status: 400 });
    }

    const existingCustomer = await prismadb.customer_portal_users.findFirst({
      where: {
        email: email,
      },
    });

    if (existingCustomer) {
      return new NextResponse("Customer already exists", { status: 409 });
    }

    const newCustomer = await prismadb.customers.create({
        data: {
            name,
            email,
            phone: '',
            address: '',
            city: '',
            zip: '',
            country: ''
        }
    })

    const hashedPassword = await hash(password, 12);

    const customerPortalUser = await prismadb.customer_portal_users.create({
      data: {
        customer_id: newCustomer.id,
        email,
        password_hash: hashedPassword,
        phone_number: '',
        verification_status: 'PENDING',
        two_factor_enabled: false,
      },
    });

    return NextResponse.json(customerPortalUser);
  } catch (error) {
    console.log("[CUSTOMER_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
