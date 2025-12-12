import { prisma } from "@/lib/prisma";
import { hash } from "bcrypt";
import { NextResponse } from "next/server";
import { z } from "zod";

const signupSchema = z.object({
  name: z.string().trim().optional(),
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = signupSchema.safeParse(json);

    if (!parsed.success) {
      const message = parsed.error.issues.map((issue) => issue.message).join(", ");
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const { email, password, name } = parsed.data;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "Email is already registered" }, { status: 409 });
    }

    const passwordHash = await hash(password, 10);

    await prisma.user.create({
      data: {
        email,
        name: name?.trim() || null,
        passwordHash,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Signup error", error);
    return NextResponse.json({ error: "Unable to sign up right now" }, { status: 500 });
  }
}
