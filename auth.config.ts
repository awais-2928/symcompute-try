// auth.config.ts
import type { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import bcrypt from "bcryptjs"

export default {
    pages: {
        signIn: "/login",
    },
    providers: [
        Credentials({
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null
                }

                // Dynamic import to avoid Edge Runtime issues with Prisma
                const { prisma } = await import("@/prisma/prisma")

                const user = await prisma.user.findUnique({
                    where: {
                        email: credentials.email as string,
                    },
                    select: {
                        id: true,
                        email: true,
                        password: true,
                        name: true,
                        image: true,
                        isActive: true,
                        roleAssignments: {
                            include: {
                                role: {
                                    select: { name: true }
                                }
                            }
                        }
                    },
                })

                if (!user || !user.password || !user.isActive) {
                    return null
                }

                const passwordMatch = await bcrypt.compare(
                    credentials.password as string,
                    user.password
                )

                if (!passwordMatch) {
                    return null
                }

                // Get the primary role name
                const primaryRole = user.roleAssignments[0]?.role?.name || "User"

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    image: user.image,
                    role: primaryRole,
                }
            }
        }),
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
    ],
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            if (user) {
                token.id = user.id
                token.role = (user as { role?: string }).role
            }

            if (trigger === "update" && session) {
                return { ...token, ...session }
            }

            return token
        },
        async session({ session, token }) {
            if (token) {
                session.user.id = token.id as string
                ;(session.user as { role?: string }).role = token.role as string
            }
            return session
        }
    }
} satisfies NextAuthConfig