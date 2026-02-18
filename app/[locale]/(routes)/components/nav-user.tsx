"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  ChevronsUpDown,
  LogOut,
  Settings,
  User,
  LayoutDashboard,
  BadgeDollarSign,
} from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import useAvatarStore from "@/store/useAvatarStore"

/**
 * NavUser Component - Task Group 3.1
 *
 * User profile section component for sidebar footer.
 * Displays user avatar, name, email, and provides dropdown menu with user actions.
 *
 * Features:
 * - User avatar display with fallback to default image
 * - User name and email display (when sidebar expanded)
 * - Avatar only display (when sidebar collapsed)
 * - Dropdown menu with user actions:
 *   - Todo Dashboard (navigation to /projects/dashboard)
 *   - Sales Dashboard (navigation to /crm/dashboard/{userId})
 *   - Profile Settings (navigation to /profile)
 *   - Logout (signOut action)
 * - Integrates with Zustand store for avatar state management
 * - Reuses logic from existing AvatarDropdown component
 *
 * @param user - User object containing id, name, email, avatar
 */

interface NavUserProps {
  user: {
    id: string
    name?: string | null
    email?: string | null
    avatar?: string | null
  }
}

export function NavUser({ user }: NavUserProps) {
  const router = useRouter()
  const { isMobile } = useSidebar()
  const setAvatar = useAvatarStore((state) => state.setAvatar)
  const getAvatar = useAvatarStore((state) => state.avatar)
  const [currentAvatar, setCurrentAvatar] = React.useState(getAvatar)

  // Sync avatar from props to store
  React.useEffect(() => {
    if (user.avatar) {
      setAvatar(user.avatar)
    }
  }, [user.avatar, setAvatar])

  // Update current avatar when store changes
  React.useEffect(() => {
    setCurrentAvatar(getAvatar)
  }, [getAvatar])

  // Get avatar URL or fallback to default
  const avatarUrl = currentAvatar || user.avatar || `${process.env.NEXT_PUBLIC_APP_URL}/images/nouser.png`

  // Get user initials for avatar fallback
  const userInitials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U"

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={avatarUrl} alt={user.name || "User"} />
                <AvatarFallback className="rounded-lg">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{user.name}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={avatarUrl} alt={user.name || "User"} />
                  <AvatarFallback className="rounded-lg">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/projects/dashboard")}>
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Todo Dashboard
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => router.push(`/crm/dashboard/${user.id}`)}
            >
              <BadgeDollarSign className="mr-2 h-4 w-4" />
              Sales Dashboard
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/profile")}>
              <Settings className="mr-2 h-4 w-4" />
              Profile Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut()}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
