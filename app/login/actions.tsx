"use server"
import { signIn } from "@/auth"
// export const runtime = 'nodejs'

interface CredentialsLoginParams {
    email: string
    password: string
    callbackUrl: string
}

export async function handleCredentialsLogin({
                                                 email,
                                                 password,
                                                 callbackUrl,
                                             }: CredentialsLoginParams) {
    try {

        console.log("password",password)
        const result = await signIn("credentials", {
            email,
            password,
            redirect: false,
        })

        return result
    } catch (error) {
        throw new Error("Failed to sign in")
    }
}

export async function handleSocialLogin(
    provider: "github" | "google",
    callbackUrl: string
) {
    try {
        return await signIn(provider, {
            callbackUrl,
        })
    } catch (error) {
        throw new Error(`Failed to sign in with ${provider}`)
    }
}