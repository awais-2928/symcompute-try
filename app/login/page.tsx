"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
    CardFooter,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Github, Mail } from "lucide-react"
import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { handleCredentialsLogin, handleSocialLogin } from "./actions"

export default function LoginPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const callbackUrl = searchParams.get("callbackUrl") || "/dashboard"

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        try {
            const formData = new FormData(e.currentTarget)
            const response = await handleCredentialsLogin({
                email: formData.get("email") as string,
                password: formData.get("password") as string,
                callbackUrl,
            })

            if (response?.error) {
                setError("Invalid email or password")
                return
            }

            router.push(callbackUrl)
            router.refresh()
        } catch (error) {
            setError("An error occurred. Please try again.")
        } finally {
            setIsLoading(false)
        }
    }

    const handleSocialLoginClick = async (provider: "github" | "google") => {
        try {
            await handleSocialLogin(provider, callbackUrl)
        } catch (error) {
            setError(`Failed to login with ${provider}`)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <Card className="w-full max-w-lg shadow-xl">
                <CardHeader className="space-y-2">
                    <CardTitle className="text-2xl font-bold text-center">
                        Welcome back
                    </CardTitle>
                    <CardDescription className="text-center">
                        Sign in to your account to continue
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Social Login Buttons */}
                        <div className="grid grid-cols-2 gap-4">
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full"
                                onClick={() => handleSocialLoginClick("github")}
                                disabled={isLoading}
                            >
                                <Github className="mr-2 h-4 w-4" />
                                Github
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full"
                                onClick={() => handleSocialLoginClick("google")}
                                disabled={isLoading}
                            >
                                <Mail className="mr-2 h-4 w-4" />
                                Google
                            </Button>
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <Separator />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">
                                    Or continue with
                                </span>
                            </div>
                        </div>

                        {/* Login Form */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label
                                    className="text-sm font-medium"
                                    htmlFor="email"
                                >
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
                                <div className="flex items-center justify-between">
                                    <label
                                        className="text-sm font-medium"
                                        htmlFor="password"
                                    >
                                        Password
                                    </label>
                                    <Link
                                        href="/forgot-password"
                                        className="text-sm font-medium text-primary hover:underline"
                                    >
                                        Forgot password?
                                    </Link>
                                </div>
                                <Input
                                    id="password"
                                    name="password"
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
                                {isLoading ? "Signing in..." : "Sign in"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
                <CardFooter>
                    <p className="text-center text-sm text-gray-600 w-full">
                        Don't have an account?{" "}
                        <Link
                            href="/register"
                            className="font-medium text-primary hover:underline"
                        >
                            Create one
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    )
}