import { prisma } from "@/lib/prisma";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcrypt";
import { z } from "zod";

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

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (!existingUser?.passwordHash) {
          return null;
        }

        const isValid = await compare(password, existingUser.passwordHash);
        if (!isValid) {
          return null;
        }

        const user =
          existingUser.citySlug === "denver"
            ? existingUser
            : await prisma.user.update({
                where: { id: existingUser.id },
                data: { citySlug: "denver" },
              });

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
        };
      },
    }),
  ],
  pages: {
    signIn: "/auth/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? session.user.id;
        session.user.email =
          (token.email as string | undefined) ?? session.user.email ?? "";
        session.user.name = (token.name as string | undefined) ?? session.user.name;
      }
      return session;
    },
  },
};
