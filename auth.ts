import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import authConfig from "./auth.config";
import { prisma } from "./prisma/prisma";
import { createLogger } from "./lib/logger";

const logger = createLogger('auth');

export const { auth, handlers: { GET, POST }, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  events: {
    signIn: async ({ user, account, profile, isNewUser }) => {
      logger.logAuth('signIn', user.id, {
        email: user.email,
        provider: account?.provider,
        isNewUser,
      });
    },
    signOut: async ({ session, token }) => {
      logger.logAuth('signOut', token?.sub, {
        email: session?.user?.email,
      });
    },
    createUser: async ({ user }) => {
      logger.logAuth('createUser', user.id, {
        email: user.email,
        name: user.name,
      });
    },
    linkAccount: async ({ user, account, profile }) => {
      logger.logAuth('linkAccount', user.id, {
        provider: account.provider,
        type: account.type,
      });
    },
    session: async ({ session, token }) => {
      logger.debug('Session accessed', {
        userId: token?.sub,
        email: session?.user?.email,
      });
    },
  },
  callbacks: {
    async jwt({ token, user, account, profile, trigger, session }) {
      if (user) {
        logger.debug('JWT token created/updated', {
          userId: user.id,
          email: user.email,
          trigger,
        });
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.sub) {
        session.user.id = token.sub;
        logger.debug('Session callback executed', {
          userId: token.sub,
          email: session.user?.email,
        });
      }
      return session;
    },
  },
  ...authConfig,
});
