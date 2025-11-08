import { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@citypass/db';
import EmailProvider from 'next-auth/providers/email';
import GoogleProvider from 'next-auth/providers/google';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: Number(process.env.EMAIL_SERVER_PORT),
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM,
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],
  pages: {
    signIn: '/auth/signin',
    verifyRequest: '/auth/verify',
    error: '/auth/error',
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;

        // Fetch user profile for personalization
        const profile = await prisma.userProfile.findUnique({
          where: { userId: user.id },
        });

        if (profile) {
          session.user.profile = {
            homeCity: profile.homeCity,
            neighborhoods: profile.neighborhoods,
            favoriteCategories: profile.favoriteCategories,
            priceMin: profile.priceMin,
            priceMax: profile.priceMax,
            timeOfDay: profile.timeOfDay,
          };
        }

        // Update last seen
        await prisma.userProfile.upsert({
          where: { userId: user.id },
          create: {
            userId: user.id,
            lastSeenAt: new Date(),
          },
          update: {
            lastSeenAt: new Date(),
          },
        });
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
  },
  events: {
    async createUser({ user }) {
      // Create default user profile
      await prisma.userProfile.create({
        data: {
          userId: user.id,
          searchCount: 0,
        },
      });
    },
  },
  session: {
    strategy: 'database',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
};
