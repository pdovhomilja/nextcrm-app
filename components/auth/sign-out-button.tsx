"use client"

import { Button } from "@/components/ui/button"
import { signOutUser } from "@/actions/auth-actions"
import { useTransition } from "react"

export const SignOutButton = () => {
  const [isPending, startTransition] = useTransition()

  const handleSignOut = () => {
    startTransition(async () => {
      await signOutUser()
    })
  }

  return (
    <Button 
      variant="outline" 
      onClick={handleSignOut}
      disabled={isPending}
    >
      {isPending ? "Signing out..." : "Sign Out"}
    </Button>
  )
}
