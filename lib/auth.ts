import { prisma } from "@/lib/prisma";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { z } from "zod";

declare module "next-auth" {
  interface User {
    username?: string | null;
    onboardingComplete: boolean;
    isAdmin?: boolean;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      username?: string | null;
      onboardingComplete: boolean;
      isAdmin?: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    username?: string | null;
    onboardingComplete: boolean;
    isAdmin?: boolean;
  }
}

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) {
          return null;
        }

        const isValid = await compare(password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          username: user.username ?? undefined,
          onboardingComplete: user.onboardingComplete,
          isAdmin: user.isAdmin,
        };
      },
    }),
  ],
  pages: {
    signIn: "/auth/login",
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.sub = user.id;
        token.email = user.email;
        token.name = user.name;
        token.username = user.username;
        token.onboardingComplete = user.onboardingComplete;
        token.isAdmin = user.isAdmin;
      }
      // Refresh onboardingComplete, username, and isAdmin on every request
      if (trigger === "update" || !token.onboardingComplete || !token.username) {
        if (token.sub) {
          try {
            const dbUser = await prisma.user.findUnique({
              where: { id: token.sub },
              select: { onboardingComplete: true, username: true, isAdmin: true },
            });
            if (dbUser) {
              token.onboardingComplete = dbUser.onboardingComplete;
              token.username = dbUser.username;
              token.isAdmin = dbUser.isAdmin;
            }
          } catch (error) {
            console.error("Error fetching user in JWT callback:", error);
            // Continue with existing token values on error
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.email = token.email ?? session.user.email ?? "";
        session.user.name = token.name as string | undefined;
        session.user.username = token.username as string | undefined;
        session.user.onboardingComplete = token.onboardingComplete ?? false;
        session.user.isAdmin = token.isAdmin ?? false;
      }
      return session;
    },
  },
};
