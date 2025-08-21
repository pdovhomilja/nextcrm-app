import { auth } from "@/auth"

// Helper to get current user's active company ID
export async function getCurrentCompanyId() {
  const session = await auth()
  
  if (!session?.user) {
    throw new Error("Not authenticated")
  }

  const companyId = session.user.activeCompanyId
  
  if (!companyId) {
    throw new Error("No active company found")
  }

  return companyId
}

// Helper to get current user session with company validation
export async function getCurrentUserWithCompany() {
  const session = await auth()
  
  if (!session?.user) {
    throw new Error("Not authenticated")
  }

  const companyId = session.user.activeCompanyId
  
  if (!companyId) {
    throw new Error("No active company found")
  }

  return {
    user: session.user,
    companyId
  }
}

// Helper to validate company access from route params
export async function validateCompanyAccess(companyIdFromRoute: string) {
  const session = await auth()
  
  if (!session?.user) {
    throw new Error("Not authenticated")
  }

  const userCompanyId = session.user.activeCompanyId
  
  if (!userCompanyId || userCompanyId !== companyIdFromRoute) {
    throw new Error("Access denied to company")
  }

  return {
    user: session.user,
    companyId: userCompanyId
  }
}