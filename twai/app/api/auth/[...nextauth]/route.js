import { prisma } from '../../../../lib/prisma'
import NextAuth from 'next-auth/next'
import GoogleProvider from 'next-auth/providers/google'

const GOOGLE_CLIENT_ID = process.env.AUTH_GOOGLE_ID
const GOOGLE_CLIENT_SECRET = process.env.AUTH_GOOGLE_SECRET
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET

// @ts-expect-error: Suppressing TypeScript error due to non-TypeScript usage
export const authOptions = {
  session: {
    strategy: 'jwt',
  },
  providers: [
    GoogleProvider({
      clientId: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
    }),
  ],
  secret: NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ profile }) {
      if (!profile?.email) {
        throw new Error('No profile');
      }

      // Find the user by email to check if they're blocked
      const existingUser = await prisma.user.findUnique({
        where: {
          email: profile.email,
        },
        select: {
          blocked: true
        }
      });

      // If the user exists and is blocked, prevent sign in
      if (existingUser && existingUser.blocked) {
        return false; // Prevents the sign in
      }

      await prisma.user.upsert({
        where: {
          email: profile.email,
        },
        create: {
          email: profile.email,
          name: profile.name,
        },
        update: {
          name: profile.name,
        },
      });
      return true;
    },
    async session({ session, token }) {
      if (token?.id) {
        session.user.id = token.id;
        
        // Pass the blocked status from token to session
        session.isBlocked = token.isBlocked || false;
      }
      return session;
    },
    async jwt({ token, profile }) {
      if (profile) {
        const fetchedUser = await prisma.user.findUnique({
          where: {
            email: profile.email,
          },
          select: {
            id: true,
            blocked: true
          }
        });
        if (!fetchedUser) {
          throw new Error('No user found');
        }

        token.id = fetchedUser.id;
        token.isBlocked = fetchedUser.blocked;
      } else if (token.id) {
        // Check if the user has been blocked since the token was issued
        const user = await prisma.user.findUnique({
          where: { id: token.id },
          select: { blocked: true }
        });
        
        if (user) {
          token.isBlocked = user.blocked;
        }
      }
      return token;
    },
  },
};

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
