"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card"
import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { handleCredentialsLogin } from "./actions"

function LoginFormContent() {
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
            })

            if (response?.error) {
                setError("Invalid email or password")
                return
            }

            router.push(callbackUrl)
            router.refresh()
        } catch {
            setError("An error occurred. Please try again.")
        } finally {
            setIsLoading(false)
        }
    }

    return (
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
        </Card>
    )
}

export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <Suspense fallback={
                <div className="text-sm text-slate-500 flex items-center justify-center h-64">
                    Loading...
                </div>
            }>
                <LoginFormContent />
            </Suspense>
        </div>
    )
}