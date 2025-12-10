"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { type LucideIcon } from "lucide-react"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"

/**
 * NavSecondary Component - Task Group 2.1.4
 *
 * Secondary/utility navigation component for less prominent items.
 * Can be used for:
 * - Utility links
 * - Help/Support
 * - Settings
 * - Additional secondary navigation
 *
 * @param items - Array of secondary navigation items
 * @param className - Optional CSS classes
 */

export interface NavSecondaryItem {
  title: string
  url: string
  icon?: LucideIcon
  external?: boolean
}

interface NavSecondaryProps extends React.ComponentPropsWithoutRef<typeof SidebarGroup> {
  items: NavSecondaryItem[]
}

export function NavSecondary({ items, ...props }: NavSecondaryProps) {
  const pathname = usePathname()

  // Helper function to check if a route is active
  const isRouteActive = (url: string): boolean => {
    if (url === "/" || url === "") {
      return pathname === "/" || pathname === ""
    }
    return pathname.startsWith(url)
  }

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const isActive = isRouteActive(item.url)

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  size="sm"
                  tooltip={item.title}
                  isActive={isActive}
                >
                  {item.external ? (
                    <a href={item.url} target="_blank" rel="noopener noreferrer">
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                    </a>
                  ) : (
                    <Link href={item.url}>
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                    </Link>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
