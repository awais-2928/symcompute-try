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
}: Omit<CredentialsLoginParams, 'callbackUrl'>) {
    try {

        console.log("password",password)
        const result = await signIn("credentials", {
            email,
            password,
            redirect: false,
        })

        return result
    } catch {
        throw new Error("Failed to sign in")
    }
}
