"use server"

import { auth } from "@/auth"
import { PrismaClient } from "@/lib/generated/prisma"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

const prisma = new PrismaClient()

// Get user's company memberships
export async function getUserMemberships() {
  const session = await auth()
  
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" }
  }

  try {
    const memberships = await prisma.companyMembership.findMany({
      where: { userId: session.user.id },
      include: { 
        company: {
          include: {
            _count: {
              select: {
                memberships: true,
                boards: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    return { success: true, memberships }
  } catch (error) {
    console.error('Error fetching memberships:', error)
    return { success: false, error: "Failed to fetch memberships" }
  }
}

// Switch active company (updates session)
export async function switchActiveCompany(companyId: string) {
  const session = await auth()
  
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" }
  }

  try {
    // Verify user has access to this company
    const membership = await prisma.companyMembership.findUnique({
      where: {
        companyId_userId: {
          companyId,
          userId: session.user.id
        }
      },
      include: { company: true }
    })

    if (!membership) {
      return { success: false, error: "Access denied to company" }
    }

    // We'll redirect and let the frontend handle the session update
    // The middleware and client-side code should handle company switching
    redirect(`/${companyId}/dashboard`)
    
  } catch (error) {
    console.error('Error switching company:', error)
    return { success: false, error: "Failed to switch company" }
  }
}

// Create a new company
export async function createCompany(name: string) {
  const session = await auth()
  
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" }
  }

  try {
    const company = await prisma.company.create({
      data: {
        name,
        memberships: {
          create: {
            userId: session.user.id,
            role: 'OWNER'
          }
        }
      }
    })

    revalidatePath('/dashboard')
    return { success: true, company }
  } catch (error) {
    console.error('Error creating company:', error)
    return { success: false, error: "Failed to create company" }
  }
}

// Invite user to company
export async function inviteUserToCompany(companyId: string, email: string, role: 'MEMBER' | 'ADMIN' = 'MEMBER') {
  const session = await auth()
  
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" }
  }

  try {
    // Check if current user is admin/owner of the company
    const currentMembership = await prisma.companyMembership.findUnique({
      where: {
        companyId_userId: {
          companyId,
          userId: session.user.id
        }
      }
    })

    if (!currentMembership || !['ADMIN', 'OWNER'].includes(currentMembership.role)) {
      return { success: false, error: "Insufficient permissions" }
    }

    // Find the user to invite
    const userToInvite = await prisma.user.findUnique({
      where: { email }
    })

    if (!userToInvite) {
      return { success: false, error: "User not found" }
    }

    // Check if user is already a member
    const existingMembership = await prisma.companyMembership.findUnique({
      where: {
        companyId_userId: {
          companyId,
          userId: userToInvite.id
        }
      }
    })

    if (existingMembership) {
      return { success: false, error: "User is already a member" }
    }

    // Create membership
    const membership = await prisma.companyMembership.create({
      data: {
        companyId,
        userId: userToInvite.id,
        role
      },
      include: {
        user: true,
        company: true
      }
    })

    revalidatePath(`/${companyId}/settings`)
    return { success: true, membership }
  } catch (error) {
    console.error('Error inviting user:', error)
    return { success: false, error: "Failed to invite user" }
  }
}

// Remove user from company
export async function removeUserFromCompany(companyId: string, userId: string) {
  const session = await auth()
  
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" }
  }

  try {
    // Check if current user is admin/owner
    const currentMembership = await prisma.companyMembership.findUnique({
      where: {
        companyId_userId: {
          companyId,
          userId: session.user.id
        }
      }
    })

    if (!currentMembership || !['ADMIN', 'OWNER'].includes(currentMembership.role)) {
      return { success: false, error: "Insufficient permissions" }
    }

    // Prevent removing the last owner
    if (currentMembership.role === 'OWNER') {
      const ownerCount = await prisma.companyMembership.count({
        where: { companyId, role: 'OWNER' }
      })

      if (ownerCount <= 1 && userId === session.user.id) {
        return { success: false, error: "Cannot remove the last owner" }
      }
    }

    await prisma.companyMembership.delete({
      where: {
        companyId_userId: {
          companyId,
          userId
        }
      }
    })

    revalidatePath(`/${companyId}/settings`)
    return { success: true }
  } catch (error) {
    console.error('Error removing user:', error)
    return { success: false, error: "Failed to remove user" }
  }
}

// Update user role in company
export async function updateUserRole(companyId: string, userId: string, newRole: 'MEMBER' | 'ADMIN' | 'OWNER') {
  const session = await auth()
  
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" }
  }

  try {
    // Check if current user is owner
    const currentMembership = await prisma.companyMembership.findUnique({
      where: {
        companyId_userId: {
          companyId,
          userId: session.user.id
        }
      }
    })

    if (!currentMembership || currentMembership.role !== 'OWNER') {
      return { success: false, error: "Only owners can change roles" }
    }

    // Update role
    const updatedMembership = await prisma.companyMembership.update({
      where: {
        companyId_userId: {
          companyId,
          userId
        }
      },
      data: { role: newRole },
      include: {
        user: true,
        company: true
      }
    })

    revalidatePath(`/${companyId}/settings`)
    return { success: true, membership: updatedMembership }
  } catch (error) {
    console.error('Error updating role:', error)
    return { success: false, error: "Failed to update role" }
  }
}

// Get company details with members
export async function getCompanyDetails(companyId: string) {
  const session = await auth()
  
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" }
  }

  try {
    // Verify user has access to this company
    const userMembership = await prisma.companyMembership.findUnique({
      where: {
        companyId_userId: {
          companyId,
          userId: session.user.id
        }
      }
    })

    if (!userMembership) {
      return { success: false, error: "Access denied" }
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                createdAt: true
              }
            }
          },
          orderBy: [
            { role: 'desc' }, // OWNER first, then ADMIN, then MEMBER
            { createdAt: 'asc' }
          ]
        },
        _count: {
          select: {
            boards: true,
            memberships: true
          }
        }
      }
    })

    if (!company) {
      return { success: false, error: "Company not found" }
    }

    return { success: true, company, userRole: userMembership.role }
  } catch (error) {
    console.error('Error fetching company details:', error)
    return { success: false, error: "Failed to fetch company details" }
  }
}

// Helper function to check if user has access to company
export async function hasCompanyAccess(companyId: string, requiredRole?: 'MEMBER' | 'ADMIN' | 'OWNER') {
  const session = await auth()
  
  if (!session?.user?.id) {
    return false
  }

  try {
    const membership = await prisma.companyMembership.findUnique({
      where: {
        companyId_userId: {
          companyId,
          userId: session.user.id
        }
      }
    })

    if (!membership) return false

    if (requiredRole) {
      const roleHierarchy = { 'MEMBER': 1, 'ADMIN': 2, 'OWNER': 3 }
      return roleHierarchy[membership.role] >= roleHierarchy[requiredRole]
    }

    return true
  } catch (error) {
    console.error('Error checking company access:', error)
    return false
  }
}