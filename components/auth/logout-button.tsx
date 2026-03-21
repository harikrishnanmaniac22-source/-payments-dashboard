"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { LogOut } from "lucide-react"

import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"

export function LogoutButton() {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)

  async function handleLogout() {
    setIsPending(true)

    try {
      const response = await fetch("/api/auth/signout", {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Could not sign out.")
      }

      router.push("/login")
      router.refresh()
    } catch (error) {
      toast({
        title: "Sign out failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Button
      className="justify-start group-data-[collapsible=icon]:justify-center"
      disabled={isPending}
      onClick={handleLogout}
      size="sm"
      variant="ghost"
    >
      <LogOut className="size-4" />
      <span className="group-data-[collapsible=icon]:hidden">{isPending ? "Signing out..." : "Sign out"}</span>
    </Button>
  )
}
