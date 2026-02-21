import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

const signupSchema = z.object({
  name: z.string().trim().optional(),
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  referralCode: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = signupSchema.safeParse(json);

    if (!parsed.success) {
      const message = parsed.error.issues.map((issue) => issue.message).join(", ");
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const { email, password, name, referralCode } = parsed.data;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "Email is already registered" }, { status: 409 });
    }

    // Find referrer if referral code provided
    let referrerId: string | null = null;
    if (referralCode) {
      const referrer = await prisma.user.findUnique({
        where: { referralCode },
        select: { id: true },
      });
      if (referrer) {
        referrerId = referrer.id;
      }
    }

    const passwordHash = await hash(password, 10);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        email,
        name: name?.trim() || null,
        passwordHash,
      },
    });

    // Create referral record if referrer found
    if (referrerId && referralCode) {
      await prisma.referral.create({
        data: {
          referrerId,
          referredId: newUser.id,
          referralCode,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("Signup error:", err.message);
    console.error("Signup error stack:", err.stack);
    console.error("Full signup error:", JSON.stringify(error, Object.getOwnPropertyNames(error as object)));
    return NextResponse.json(
      { error: "Unable to sign up right now", details: err.message },
      { status: 500 }
    );
  }
}
