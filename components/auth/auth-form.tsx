"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { FormEvent, useState } from "react"
import { KeyRound, ShieldCheck, UserPlus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"

type AuthMode = "signin" | "signup" | "forgot-password"

const authModeConfig: Record<
  AuthMode,
  {
    title: string
    description: string
    icon: typeof ShieldCheck
    submitLabel: string
    endpoint: string
    successMessage: string
  }
> = {
  signin: {
    title: "Sign in",
    description: "Use your saved username and password to enter the dashboard.",
    icon: ShieldCheck,
    submitLabel: "Sign in",
    endpoint: "/api/auth/signin",
    successMessage: "Signed in successfully.",
  },
  signup: {
    title: "Create account",
    description: "Register once with your basic details so future sign-ins are quick.",
    icon: UserPlus,
    submitLabel: "Create account",
    endpoint: "/api/auth/signup",
    successMessage: "Account created successfully.",
  },
  "forgot-password": {
    title: "Reset password",
    description: "Confirm your username and date of birth, then set a new password.",
    icon: KeyRound,
    submitLabel: "Update password",
    endpoint: "/api/auth/forgot-password",
    successMessage: "Password updated. You can sign in now.",
  },
}

interface AuthFormProps {
  mode: AuthMode
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const config = authModeConfig[mode]
  const Icon = config.icon

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const payload = Object.fromEntries(formData.entries())

    setIsPending(true)

    try {
      const response = await fetch(config.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const result = (await response.json()) as { ok: boolean; message?: string }
      if (!response.ok || !result.ok) {
        throw new Error(result.message ?? "Something went wrong.")
      }

      toast({
        title: config.successMessage,
      })

      if (mode === "forgot-password") {
        router.push("/login")
        router.refresh()
        return
      }

      router.push("/")
      router.refresh()
    } catch (error) {
      toast({
        title: "Request failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Card className="border-white/10 bg-slate-950/75 shadow-2xl shadow-cyan-950/30 backdrop-blur">
      <CardHeader className="space-y-3">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-emerald-400 text-slate-950">
          <Icon className="size-5" />
        </div>
        <div className="space-y-1">
          <CardTitle className="text-2xl text-white">{config.title}</CardTitle>
          <CardDescription className="text-slate-400">{config.description}</CardDescription>
        </div>
      </CardHeader>

      <CardContent>
        <form className="space-y-5" onSubmit={handleSubmit}>
          {mode === "signup" && (
            <>
              <div className="grid gap-2">
                <Label htmlFor="firstName">First name</Label>
                <Input id="firstName" name="firstName" placeholder="Aarav" required />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input id="lastName" name="lastName" placeholder="Sharma" required />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="dob">Date of birth</Label>
                <Input id="dob" name="dob" type="date" required />
              </div>
            </>
          )}

          <div className="grid gap-2">
            <Label htmlFor="username">Username</Label>
            <Input id="username" name="username" placeholder="aarav01" required />
          </div>

          {mode !== "signin" && mode !== "signup" ? (
            <div className="grid gap-2">
              <Label htmlFor="dob">Date of birth</Label>
              <Input id="dob" name="dob" type="date" required />
            </div>
          ) : null}

          <div className="grid gap-2">
            <Label htmlFor={mode === "forgot-password" ? "newPassword" : "password"}>
              {mode === "forgot-password" ? "New password" : "Password"}
            </Label>
            <Input
              id={mode === "forgot-password" ? "newPassword" : "password"}
              name={mode === "forgot-password" ? "newPassword" : "password"}
              type="password"
              minLength={6}
              required
            />
          </div>

          <Button className="h-11 w-full bg-cyan-400 text-slate-950 hover:bg-cyan-300" disabled={isPending} type="submit">
            {isPending ? "Please wait..." : config.submitLabel}
          </Button>
        </form>

        <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-slate-400">
          {mode !== "signin" ? <Link className="text-cyan-300 hover:text-cyan-200" href="/login">Sign in instead</Link> : null}
          {mode !== "signup" ? <Link className="text-cyan-300 hover:text-cyan-200" href="/signup">Create an account</Link> : null}
          {mode !== "forgot-password" ? (
            <Link className="text-cyan-300 hover:text-cyan-200" href="/forgot-password">
              Forgot password?
            </Link>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
