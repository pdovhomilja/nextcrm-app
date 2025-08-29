"use client"

import React, { createContext, useContext, useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { getUserMemberships } from "@/actions/company-actions"

type CompanyMembership = {
  companyId: string
  userId: string
  role: 'MEMBER' | 'ADMIN' | 'OWNER'
  createdAt: Date
  company: {
    id: string
    name: string
    createdAt: Date
    updatedAt: Date
    _count?: {
      memberships: number
      boards: number
    }
  }
}

type CompanyContextType = {
  // Current active company
  activeCompany: CompanyMembership['company'] | null
  activeCompanyId: string | null
  userRole: CompanyMembership['role'] | null
  
  // All user's company memberships
  memberships: CompanyMembership[]
  
  // Actions
  switchCompany: (companyId: string) => Promise<void>
  refreshMemberships: () => Promise<void>
  
  // Loading states
  isLoading: boolean
  isLoadingMemberships: boolean
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined)

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const { data: session, update } = useSession()
  const [memberships, setMemberships] = useState<CompanyMembership[]>([])
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMemberships, setIsLoadingMemberships] = useState(false)

  // Get active company and user role
  const activeCompany = memberships.find(m => m.companyId === activeCompanyId)?.company || null
  const userRole = memberships.find(m => m.companyId === activeCompanyId)?.role || null

  // Load user's company memberships
  const refreshMemberships = useCallback(async () => {
    if (!session?.user?.id) return

    setIsLoadingMemberships(true)
    try {
      const result = await getUserMemberships()
      if (result.success && result.memberships) {
        setMemberships(result.memberships)
        
        // Set active company from session or first membership
        const sessionActiveId = session.user.activeCompanyId
        const validCompanyId = result.memberships.find(m => 
          m.companyId === sessionActiveId
        )?.companyId || result.memberships[0]?.companyId
        
        setActiveCompanyId(validCompanyId || null)
      }
    } catch (error) {
      console.error('Failed to load company memberships:', error)
    } finally {
      setIsLoadingMemberships(false)
      setIsLoading(false)
    }
  }, [session?.user?.id, session?.user?.activeCompanyId])

  // Switch active company
  const switchCompany = async (companyId: string) => {
    const hasAccess = memberships.some(m => m.companyId === companyId)
    if (!hasAccess) return
    
    try {
      setActiveCompanyId(companyId)
      
      // Update the NextAuth session
      await update({ activeCompanyId: companyId })
      
      // Update URL to reflect new company
      const currentPath = window.location.pathname
      const pathSegments = currentPath.split('/').filter(Boolean)
      
      if (pathSegments.length > 0 && pathSegments[0] !== companyId) {
        // Replace first segment (current company ID) with new company ID
        pathSegments[0] = companyId
        const newPath = '/' + pathSegments.join('/')
        window.history.pushState({}, '', newPath)
        // Force a page refresh to ensure all data updates
        window.location.reload()
      }
    } catch (error) {
      console.error('Failed to switch company:', error)
    }
  }

  // Load memberships on session change
  useEffect(() => {
    if (session?.user?.id) {
      refreshMemberships()
    } else {
      setMemberships([])
      setActiveCompanyId(null)
      setIsLoading(false)
    }
  }, [session?.user?.id, refreshMemberships])

  const value: CompanyContextType = {
    activeCompany,
    activeCompanyId,
    userRole,
    memberships,
    switchCompany,
    refreshMemberships,
    isLoading,
    isLoadingMemberships,
  }

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  )
}

export function useCompany() {
  const context = useContext(CompanyContext)
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider')
  }
  return context
}

// Helper hooks for common use cases
export function useActiveCompany() {
  const { activeCompany, activeCompanyId, userRole } = useCompany()
  return { activeCompany, activeCompanyId, userRole }
}

export function useCompanyMemberships() {
  const { memberships, refreshMemberships, isLoadingMemberships } = useCompany()
  return { memberships, refreshMemberships, isLoadingMemberships }
}

export function useCompanySwitcher() {
  const { memberships, activeCompanyId, switchCompany } = useCompany()
  return { memberships, activeCompanyId, switchCompany }
}