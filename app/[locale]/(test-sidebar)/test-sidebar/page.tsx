"use client"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset
} from "@/components/ui/sidebar"
import { Home, Settings } from "lucide-react"

export default function TestSidebarPage() {
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="p-2 text-lg font-bold">Test Sidebar</div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton>
                    <Home />
                    <span>Home</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton>
                    <Settings />
                    <span>Settings</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <div className="p-2 text-xs text-gray-500">
            Build: 0.0.3-beta-test
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-16 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <h1 className="text-lg font-semibold">Test Sidebar Component</h1>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="rounded-xl bg-muted/50 p-8">
            <h2 className="text-2xl font-bold mb-4">Sidebar Test Page</h2>
            <div className="space-y-2">
              <p><strong>Test Instructions:</strong></p>
              <ul className="list-disc list-inside space-y-1">
                <li>Click the hamburger menu icon to toggle the sidebar</li>
                <li>Test on desktop: Sidebar should collapse/expand</li>
                <li>Test on mobile: Sidebar should open as an overlay</li>
                <li>Verify the build version shows in the footer when expanded</li>
                <li>Verify smooth animations during transitions</li>
              </ul>
            </div>

            <div className="mt-6 space-y-2">
              <p><strong>Test Results:</strong></p>
              <div className="p-4 bg-green-100 dark:bg-green-900 rounded-md">
                <p className="text-green-800 dark:text-green-200">
                  If you can see this page and the sidebar is functional, the component is working correctly!
                </p>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
