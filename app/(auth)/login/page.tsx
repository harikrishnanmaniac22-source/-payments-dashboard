import { redirect } from "next/navigation"

import { AuthForm } from "@/components/auth/auth-form"
import { AuthShell } from "@/components/auth/auth-shell"
import { getCurrentSessionUser } from "@/lib/auth"

export default async function LoginPage() {
  const sessionUser = await getCurrentSessionUser()
  if (sessionUser) {
    redirect("/")
  }

  return (
    <AuthShell
      badge="Settlement Hub Access"
      title="Welcome back"
      description="Sign in to continue into the marketplace settlements dashboard."
    >
      <AuthForm mode="signin" />
    </AuthShell>
  )
}
