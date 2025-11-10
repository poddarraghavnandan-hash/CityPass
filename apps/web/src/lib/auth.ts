import { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@citypass/db';
import EmailProvider from 'next-auth/providers/email';
import GoogleProvider from 'next-auth/providers/google';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    // Only include EmailProvider if email server is configured
    ...(process.env.EMAIL_SERVER_HOST &&
        process.env.EMAIL_SERVER_USER &&
        process.env.EMAIL_SERVER_PASSWORD &&
        !process.env.EMAIL_SERVER_USER.includes('your-') &&
        !process.env.EMAIL_SERVER_PASSWORD.includes('your-') &&
        !process.env.EMAIL_SERVER_HOST.includes('example.com')
      ? [EmailProvider({
          server: {
            host: process.env.EMAIL_SERVER_HOST,
            port: Number(process.env.EMAIL_SERVER_PORT),
            auth: {
              user: process.env.EMAIL_SERVER_USER,
              pass: process.env.EMAIL_SERVER_PASSWORD,
            },
          },
          from: process.env.EMAIL_FROM,
        })]
      : []),
    // Only include GoogleProvider if credentials are configured
    ...(process.env.GOOGLE_CLIENT_ID &&
        process.env.GOOGLE_CLIENT_SECRET &&
        !process.env.GOOGLE_CLIENT_ID.includes('your-') &&
        !process.env.GOOGLE_CLIENT_SECRET.includes('your-')
      ? [GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        })]
      : []),
  ],
  pages: {
    signIn: '/auth/signin',
    verifyRequest: '/auth/verify',
    error: '/auth/error',
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        // @ts-expect-error - Adding custom id property to session
        session.user.id = user.id;

        // Fetch user profile for personalization
        const profile = await prisma.userProfile.findUnique({
          where: { userId: user.id },
        });

        if (profile) {
          // @ts-expect-error - Adding custom profile property to session
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
