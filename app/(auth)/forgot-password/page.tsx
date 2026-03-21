import { redirect } from "next/navigation"

import { AuthForm } from "@/components/auth/auth-form"
import { AuthShell } from "@/components/auth/auth-shell"
import { getCurrentSessionUser } from "@/lib/auth"

export default async function ForgotPasswordPage() {
  const sessionUser = await getCurrentSessionUser()
  if (sessionUser) {
    redirect("/")
  }

  return (
    <AuthShell
      badge="Recover Access"
      title="Reset your password"
      description="Use the saved username and date of birth to choose a new password."
    >
      <AuthForm mode="forgot-password" />
    </AuthShell>
  )
}
