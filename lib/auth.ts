import { cookies } from "next/headers"
import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

export type AuthUserRecord = {
  firstName: string
  lastName: string
  dob: string
  username: string
  passwordSalt: string
  passwordHash: string
  createdAt: string
}

const USERS_FILE_PATH = path.join(process.cwd(), "data", "users.csv")
const USERS_FILE_HEADER =
  "firstName,lastName,dob,username,passwordSalt,passwordHash,createdAt"
const SESSION_COOKIE_NAME = "settlement-hub-session"
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7
const HASH_ITERATIONS = 120_000
const HASH_KEY_LENGTH = 64
const HASH_DIGEST = "sha512"

function getAuthSecret() {
  return process.env.AUTH_SECRET ?? "local-dev-auth-secret-change-me"
}

function escapeCsvValue(value: string) {
  const normalized = value.replaceAll("\r", " ").replaceAll("\n", " ").trim()
  if (normalized.includes(",") || normalized.includes('"')) {
    return `"${normalized.replaceAll('"', '""')}"`
  }
  return normalized
}

function parseCsvLine(line: string) {
  const values: string[] = []
  let current = ""
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]

    if (character === '"') {
      const nextCharacter = line[index + 1]
      if (inQuotes && nextCharacter === '"') {
        current += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (character === "," && !inQuotes) {
      values.push(current)
      current = ""
      continue
    }

    current += character
  }

  values.push(current)
  return values
}

async function ensureUsersFile() {
  await mkdir(path.dirname(USERS_FILE_PATH), { recursive: true })

  try {
    await readFile(USERS_FILE_PATH, "utf8")
  } catch {
    await writeFile(USERS_FILE_PATH, `${USERS_FILE_HEADER}\n`, "utf8")
  }
}

async function readUsers() {
  await ensureUsersFile()
  const fileContents = await readFile(USERS_FILE_PATH, "utf8")
  const lines = fileContents
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length <= 1) {
    return [] as AuthUserRecord[]
  }

  return lines.slice(1).map((line) => {
    const [firstName, lastName, dob, username, passwordSalt, passwordHash, createdAt] =
      parseCsvLine(line)

    return {
      firstName,
      lastName,
      dob,
      username,
      passwordSalt,
      passwordHash,
      createdAt,
    }
  })
}

async function writeUsers(users: AuthUserRecord[]) {
  await ensureUsersFile()
  const rows = users.map((user) =>
    [
      user.firstName,
      user.lastName,
      user.dob,
      user.username,
      user.passwordSalt,
      user.passwordHash,
      user.createdAt,
    ]
      .map(escapeCsvValue)
      .join(","),
  )

  const nextContents = [USERS_FILE_HEADER, ...rows].join("\n")
  await writeFile(USERS_FILE_PATH, `${nextContents}\n`, "utf8")
}

function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  const passwordHash = pbkdf2Sync(
    password,
    salt,
    HASH_ITERATIONS,
    HASH_KEY_LENGTH,
    HASH_DIGEST,
  ).toString("hex")

  return {
    passwordSalt: salt,
    passwordHash,
  }
}

function verifyPassword(password: string, user: Pick<AuthUserRecord, "passwordSalt" | "passwordHash">) {
  const { passwordHash } = hashPassword(password, user.passwordSalt)
  return timingSafeEqual(Buffer.from(passwordHash, "hex"), Buffer.from(user.passwordHash, "hex"))
}

function createSessionValue(username: string) {
  const expiresAt = Date.now() + SESSION_DURATION_MS
  const payload = `${username}:${expiresAt}`
  const signature = createHmac("sha256", getAuthSecret()).update(payload).digest("hex")
  return Buffer.from(`${payload}:${signature}`, "utf8").toString("base64url")
}

function parseSessionValue(sessionValue: string | undefined) {
  if (!sessionValue) return null

  try {
    const decoded = Buffer.from(sessionValue, "base64url").toString("utf8")
    const [username, expiresAt, signature] = decoded.split(":")
    if (!username || !expiresAt || !signature) {
      return null
    }

    const payload = `${username}:${expiresAt}`
    const expectedSignature = createHmac("sha256", getAuthSecret()).update(payload).digest("hex")
    const isValidSignature = timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSignature, "hex"),
    )

    if (!isValidSignature || Number(expiresAt) < Date.now()) {
      return null
    }

    return {
      username,
      expiresAt: Number(expiresAt),
    }
  } catch {
    return null
  }
}

export async function registerUser(input: {
  firstName: string
  lastName: string
  dob: string
  username: string
  password: string
}) {
  const users = await readUsers()
  const username = input.username.trim().toLowerCase()

  if (users.some((user) => user.username.toLowerCase() === username)) {
    throw new Error("That username is already registered.")
  }

  const hashedPassword = hashPassword(input.password)
  const nextUser: AuthUserRecord = {
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    dob: input.dob,
    username,
    ...hashedPassword,
    createdAt: new Date().toISOString(),
  }

  await writeUsers([...users, nextUser])
  return nextUser
}

export async function authenticateUser(username: string, password: string) {
  const users = await readUsers()
  const normalizedUsername = username.trim().toLowerCase()
  const user = users.find((item) => item.username.toLowerCase() === normalizedUsername)

  if (!user || !verifyPassword(password, user)) {
    return null
  }

  return user
}

export async function resetPasswordWithDob(input: {
  username: string
  dob: string
  newPassword: string
}) {
  const users = await readUsers()
  const normalizedUsername = input.username.trim().toLowerCase()
  const userIndex = users.findIndex((user) => user.username.toLowerCase() === normalizedUsername)

  if (userIndex === -1) {
    throw new Error("No account was found for that username.")
  }

  if (users[userIndex].dob !== input.dob) {
    throw new Error("The date of birth does not match our records.")
  }

  const hashedPassword = hashPassword(input.newPassword)
  users[userIndex] = {
    ...users[userIndex],
    ...hashedPassword,
  }

  await writeUsers(users)
  return users[userIndex]
}

export async function createSession(username: string) {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, createSessionValue(username), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DURATION_MS / 1000,
  })
}

export async function clearSession() {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  })
}

export async function getCurrentSessionUser() {
  const cookieStore = await cookies()
  const session = parseSessionValue(cookieStore.get(SESSION_COOKIE_NAME)?.value)

  if (!session) {
    return null
  }

  const users = await readUsers()
  return users.find((user) => user.username.toLowerCase() === session.username.toLowerCase()) ?? null
}
