import { NextResponse } from "next/server"

import { authenticateUser, createSession } from "@/lib/auth"

type SigninBody = {
  username?: string
  password?: string
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SigninBody
    const username = body.username?.trim() ?? ""
    const password = body.password ?? ""

    if (!username || !password) {
      throw new Error("Enter your username and password.")
    }

    const user = await authenticateUser(username, password)
    if (!user) {
      throw new Error("Invalid username or password.")
    }

    await createSession(user.username)

    return NextResponse.json({
      ok: true,
      username: user.username,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sign in failed."
    return NextResponse.json({ ok: false, message }, { status: 400 })
  }
}
