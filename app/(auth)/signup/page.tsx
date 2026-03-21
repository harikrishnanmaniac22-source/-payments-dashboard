import { redirect } from "next/navigation"

import { AuthForm } from "@/components/auth/auth-form"
import { AuthShell } from "@/components/auth/auth-shell"
import { getCurrentSessionUser } from "@/lib/auth"

export default async function SignupPage() {
  const sessionUser = await getCurrentSessionUser()
  if (sessionUser) {
    redirect("/")
  }

  return (
    <AuthShell
      badge="Create Local Account"
      title="First-time signup"
      description="Register a user with first name, last name, date of birth, username, and password."
    >
      <AuthForm mode="signup" />
    </AuthShell>
  )
}
