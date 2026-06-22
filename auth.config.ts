// app/auth.config.ts
import type { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import GitHub from "next-auth/providers/github"
import bcrypt from "bcryptjs"
import {prisma} from "@/prisma/prisma"

export default {
    pages: {
        signIn: "/login",
    },
    providers: [
        Credentials({
            async authorize(credentials) {
                console.log("Check here")
                if (!credentials?.email || !credentials?.password) {
                    return null
                }

                const user = await prisma.user.findUnique({
                    where: {
                        email: credentials.email,
                    },
                    select: {
                        id: true,
                        email: true,
                        password: true,
                        firstName: true,
                        lastName: true,
                        role: true,
                        image: true,
                    },
                })
                console.log("user",user)
                if (!user || !user.password) {
                    console.log("user detail returning null")

                    return null
                }

                const passwordMatch = await bcrypt.compare(
                    credentials.password,
                    user.password
                )

                console.log("passwordMatch",passwordMatch)

                if (!passwordMatch) {
                    return null
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: `${user.firstName} ${user.lastName}`,
                    image: user.image,
                    role: user.role,
                }
            }
        }),
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
        GitHub({
            clientId: process.env.GITHUB_CLIENT_ID!,
            clientSecret: process.env.GITHUB_CLIENT_SECRET!,
        }),
    ],
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            console.log("user in callback",token)
            if (user) {
                token.id = user.id
                token.role = user.role
            }

            if (trigger === "update" && session) {
                return { ...token, ...session }
            }

            return token
        },
        async session({ session, token }) {
            if (token) {
                session.user.id = token.id
                session.user.role = token.role
            }
            return session
        }
    }
} satisfies NextAuthConfig