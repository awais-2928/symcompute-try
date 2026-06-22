// app/actions/register.ts
"use server"

import { prisma } from "@/prisma/prisma"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { revalidatePath } from "next/cache"
import { UserRole } from "@prisma/client"

// Define the validation schema
const RegisterSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .regex(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
            "Password must contain at least one uppercase letter, one lowercase letter, and one number"
        ),
    confirmPassword: z.string(),
    firstName: z.string().min(2, "First name must be at least 2 characters"),
    lastName: z.string().min(2, "Last name must be at least 2 characters"),
    phoneNumber: z.string().optional(),
    role: z.enum(["TEACHER", "ADMIN", "STAFF"], {
        required_error: "Please select a role",
    }),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
})

export type RegisterFormType = z.infer<typeof RegisterSchema>

export async function registerUser(formData: RegisterFormType) {
    try {
        // Validate form data
        const validatedData = RegisterSchema.parse(formData)

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: validatedData.email },
        })

        if (existingUser) {
            return {
                error: "User with this email already exists",
            }
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(validatedData.password, 10)

        // Create user with role
        const user = await prisma.user.create({
            data: {
                email: validatedData.email,
                password: hashedPassword,
                firstName: validatedData.firstName,
                lastName: validatedData.lastName,
                phoneNumber: validatedData.phoneNumber,
                role: validatedData.role as UserRole,
            },
        })

        // Revalidate relevant paths
        revalidatePath("/login")
        revalidatePath("/dashboard")

        return {
            success: true,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
            },
        }
    } catch (error) {
        console.error("Registration error:", error)

        if (error instanceof z.ZodError) {
            return {
                error: "Validation error",
                issues: error.issues,
            }
        }

        return {
            error: "An error occurred during registration",
        }
    }
}

// Action to check email availability
export async function checkEmailAvailability(email: string) {
    try {
        const user = await prisma.user.findUnique({
            where: { email },
            select: { id: true },
        })

        return {
            available: !user,
        }
    } catch (error) {
        console.error("Email check error:", error)
        return {
            error: "Failed to check email availability",
        }
    }
}

// Action to handle social registration
export async function handleSocialRegistration(
    provider: "github" | "google",
    profileData: {
        email: string
        name?: string
        image?: string
    }
) {
    try {
        const [firstName, lastName] = (profileData.name || "").split(" ")

        const user = await prisma.user.upsert({
            where: { email: profileData.email },
            update: {
                image: profileData.image,
            },
            create: {
                email: profileData.email,
                firstName: firstName || "",
                lastName: lastName || "",
                image: profileData.image,
                role: "USER" as UserRole, // Default role for social login
            },
        })

        return {
            success: true,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
            },
        }
    } catch (error) {
        console.error("Social registration error:", error)
        return {
            error: "Failed to handle social registration",
        }
    }
}