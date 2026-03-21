import { NextResponse } from "next/server"

import { resetPasswordWithDob } from "@/lib/auth"

type ForgotPasswordBody = {
  username?: string
  dob?: string
  newPassword?: string
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ForgotPasswordBody
    const username = body.username?.trim() ?? ""
    const dob = body.dob?.trim() ?? ""
    const newPassword = body.newPassword ?? ""

    if (!username || !dob || !newPassword) {
      throw new Error("Enter your username, date of birth, and a new password.")
    }

    if (newPassword.length < 6) {
      throw new Error("New password must be at least 6 characters long.")
    }

    await resetPasswordWithDob({
      username,
      dob,
      newPassword,
    })

    return NextResponse.json({
      ok: true,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Password reset failed."
    return NextResponse.json({ ok: false, message }, { status: 400 })
  }
}
