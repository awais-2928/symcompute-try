"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/components/ui/card"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Github, Mail } from "lucide-react"
import { useState } from "react"
import { registerUser, handleSocialRegistration } from "./actions"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import type { RegisterFormType } from "./actions"

export default function RegisterPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [role, setRole] = useState<string>("")

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        try {
            const formData = new FormData(e.currentTarget)
            const data: RegisterFormType = {
                email: formData.get("email") as string,
                password: formData.get("password") as string,
                confirmPassword: formData.get("confirmPassword") as string,
                firstName: formData.get("firstName") as string,
                lastName: formData.get("lastName") as string,
                phoneNumber: formData.get("phoneNumber") as string || undefined,
                role: role as "teacher" | "admin" | "staff",
            }

            const response = await registerUser(data)

            if (response.success) {
                // Sign in the user after successful registration
                const signInResult = await signIn("credentials", {
                    email: data.email,
                    password: data.password,
                    redirect: false,
                })

                if (signInResult?.error) {
                    setError("Registration successful but couldn't sign in automatically")
                    router.push("/login")
                    return
                }

                router.push("/dashboard")
                router.refresh()
            } else {
                setError(response.error || "Registration failed")
                if (response.issues) {
                    // Handle validation errors
                    const validationErrors = response.issues.map(issue => issue.message).join(", ")
                    setError(validationErrors)
                }
            }
        } catch (err) {
            setError("An unexpected error occurred")
        } finally {
            setIsLoading(false)
        }
    }

    const handleSocialLogin = async (provider: "github" | "google") => {
        try {
            await signIn(provider, {
                callbackUrl: "/dashboard",
            })
        } catch (err) {
            setError("Failed to login with " + provider)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <Card className="w-full max-w-lg shadow-xl">
                <CardHeader className="space-y-2">
                    <CardTitle className="text-2xl font-bold text-center">
                        Create an account
                    </CardTitle>
                    <CardDescription className="text-center">
                        Fill in the form below to create your account
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Social Sign-up Buttons */}
                        <div className="grid grid-cols-2 gap-4">
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full"
                                onClick={() => handleSocialLogin("github")}
                                disabled={isLoading}
                            >
                                <Github className="mr-2 h-4 w-4"/>
                                Github
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full"
                                onClick={() => handleSocialLogin("google")}
                                disabled={isLoading}
                            >
                                <Mail className="mr-2 h-4 w-4"/>
                                Google
                            </Button>
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <Separator/>
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">
                                    Or continue with
                                </span>
                            </div>
                        </div>

                        {/* Registration Form */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium" htmlFor="firstName">
                                    First Name
                                </label>
                                <Input
                                    id="firstName"
                                    name="firstName"
                                    placeholder="John"
                                    required
                                    disabled={isLoading}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium" htmlFor="lastName">
                                    Last Name
                                </label>
                                <Input
                                    id="lastName"
                                    name="lastName"
                                    placeholder="Doe"
                                    required
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium" htmlFor="email">
                                Email
                            </label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="john.doe@example.com"
                                required
                                disabled={isLoading}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium" htmlFor="phoneNumber">
                                Phone Number
                            </label>
                            <Input
                                id="phoneNumber"
                                name="phoneNumber"
                                type="tel"
                                placeholder="+1 (555) 000-0000"
                                disabled={isLoading}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium" htmlFor="role">
                                Role
                            </label>
                            <Select
                                value={role}
                                onValueChange={setRole}
                                required
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select your role"/>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="TEACHER">Teacher</SelectItem>
                                    <SelectItem value="ADMIN">Administrator</SelectItem>
                                    <SelectItem value="STAFF">Staff Member</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium" htmlFor="password">
                                Password
                            </label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                required
                                disabled={isLoading}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium" htmlFor="confirmPassword">
                                Confirm Password
                            </label>
                            <Input
                                id="confirmPassword"
                                name="confirmPassword"
                                type="password"
                                required
                                disabled={isLoading}
                            />
                        </div>

                        {error && (
                            <div className="text-sm text-red-500 text-center">
                                {error}
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full"
                            size="lg"
                            disabled={isLoading}
                        >
                            {isLoading ? "Creating Account..." : "Create Account"}
                        </Button>

                        <p className="text-center text-sm text-gray-600">
                            Already have an account?{" "}
                            <a href="/login" className="font-medium text-primary hover:underline">
                                Sign in
                            </a>
                        </p>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}