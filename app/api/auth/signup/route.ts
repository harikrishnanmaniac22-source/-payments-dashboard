import { NextResponse } from "next/server"

import { createSession, registerUser } from "@/lib/auth"

type SignupBody = {
  firstName?: string
  lastName?: string
  dob?: string
  username?: string
  password?: string
}

function validateSignupBody(body: SignupBody) {
  const firstName = body.firstName?.trim() ?? ""
  const lastName = body.lastName?.trim() ?? ""
  const dob = body.dob?.trim() ?? ""
  const username = body.username?.trim() ?? ""
  const password = body.password ?? ""

  if (!firstName || !lastName || !dob || !username || !password) {
    throw new Error("Please fill in all signup fields.")
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
    throw new Error("Please choose a valid date of birth.")
  }

  if (username.length < 3) {
    throw new Error("Username must be at least 3 characters long.")
  }

  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters long.")
  }

  return {
    firstName,
    lastName,
    dob,
    username,
    password,
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SignupBody
    const signupData = validateSignupBody(body)
    const user = await registerUser(signupData)
    await createSession(user.username)

    return NextResponse.json({
      ok: true,
      username: user.username,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Signup failed."
    return NextResponse.json({ ok: false, message }, { status: 400 })
  }
}
