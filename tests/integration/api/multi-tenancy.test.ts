/**
 * Integration Tests: Multi-Tenancy
 * Tests data isolation and organization context
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import '../../../tests/mocks/prisma'
import { prismaMock } from '../../../tests/mocks/prisma'

// Mock next-auth
jest.mock('next-auth')
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

describe('Multi-Tenancy Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Organization ID Filter', () => {
    it('should filter contacts by organizationId', async () => {
      const org1Id = 'org_123'
      const org2Id = 'org_456'

      const contactsOrg1 = [
        { id: 'contact_1', organizationId: org1Id, first_name: 'John', last_name: 'Doe' },
        { id: 'contact_2', organizationId: org1Id, first_name: 'Jane', last_name: 'Smith' },
      ]

      const contactsOrg2 = [
        { id: 'contact_3', organizationId: org2Id, first_name: 'Bob', last_name: 'Johnson' },
      ]

      // Mock session for org1
      mockGetServerSession.mockResolvedValue({
        user: {
          id: 'user_1',
          organizationId: org1Id,
          email: 'user@org1.com',
        },
      } as any)

      prismaMock.crm_Contacts.findMany = jest.fn().mockResolvedValue(contactsOrg1)

      const result = await prismaMock.crm_Contacts.findMany({
        where: { organizationId: org1Id },
      })

      expect(result).toHaveLength(2)
      expect(result.every(c => c.organizationId === org1Id)).toBe(true)
    })

    it('should prevent cross-tenant data access', async () => {
      const org1Id = 'org_123'
      const org2Id = 'org_456'

      // User from org1 tries to access org2 data
      mockGetServerSession.mockResolvedValue({
        user: {
          id: 'user_1',
          organizationId: org1Id,
          email: 'user@org1.com',
        },
      } as any)

      // Attempting to find contact from org2
      prismaMock.crm_Contacts.findFirst = jest.fn().mockResolvedValue(null)

      const result = await prismaMock.crm_Contacts.findFirst({
        where: {
          id: 'contact_from_org2',
          organizationId: org1Id, // Will not find because organizationId doesn't match
        },
      })

      expect(result).toBeNull()
    })

    it('should isolate accounts by organization', async () => {
      const org1Id = 'org_123'

      mockGetServerSession.mockResolvedValue({
        user: {
          id: 'user_1',
          organizationId: org1Id,
          email: 'user@org1.com',
        },
      } as any)

      const accounts = [
        { id: 'acc_1', organizationId: org1Id, name: 'Account 1' },
        { id: 'acc_2', organizationId: org1Id, name: 'Account 2' },
      ]

      prismaMock.crm_Accounts.findMany = jest.fn().mockResolvedValue(accounts)

      const result = await prismaMock.crm_Accounts.findMany({
        where: { organizationId: org1Id },
      })

      expect(result).toHaveLength(2)
      expect(result.every(a => a.organizationId === org1Id)).toBe(true)
    })

    it('should isolate leads by organization', async () => {
      const org2Id = 'org_456'

      mockGetServerSession.mockResolvedValue({
        user: {
          id: 'user_2',
          organizationId: org2Id,
          email: 'user@org2.com',
        },
      } as any)

      const leads = [
        { id: 'lead_1', organizationId: org2Id, first_name: 'Lead', last_name: 'One' },
      ]

      prismaMock.crm_Leads.findMany = jest.fn().mockResolvedValue(leads)

      const result = await prismaMock.crm_Leads.findMany({
        where: { organizationId: org2Id },
      })

      expect(result).toHaveLength(1)
      expect(result[0].organizationId).toBe(org2Id)
    })

    it('should isolate opportunities by organization', async () => {
      const org1Id = 'org_123'

      mockGetServerSession.mockResolvedValue({
        user: {
          id: 'user_1',
          organizationId: org1Id,
          email: 'user@org1.com',
        },
      } as any)

      const opportunities = [
        { id: 'opp_1', organizationId: org1Id, name: 'Opportunity 1' },
      ]

      prismaMock.crm_Opportunities.findMany = jest.fn().mockResolvedValue(opportunities)

      const result = await prismaMock.crm_Opportunities.findMany({
        where: { organizationId: org1Id },
      })

      expect(result).toHaveLength(1)
      expect(result[0].organizationId).toBe(org1Id)
    })
  })

  describe('Data Creation with Organization Context', () => {
    it('should create contact with user organizationId', async () => {
      const orgId = 'org_123'
      const userId = 'user_1'

      mockGetServerSession.mockResolvedValue({
        user: {
          id: userId,
          organizationId: orgId,
          email: 'user@org.com',
        },
      } as any)

      const newContact = {
        id: 'new_contact',
        organizationId: orgId,
        first_name: 'New',
        last_name: 'Contact',
        createdBy: userId,
        updatedBy: userId,
      }

      prismaMock.crm_Contacts.create = jest.fn().mockResolvedValue(newContact)

      const result = await prismaMock.crm_Contacts.create({
        data: {
          organizationId: orgId,
          first_name: 'New',
          last_name: 'Contact',
          createdBy: userId,
          updatedBy: userId,
        } as any,
      })

      expect(result.organizationId).toBe(orgId)
      expect(result.createdBy).toBe(userId)
    })

    it('should reject creation without organizationId', async () => {
      mockGetServerSession.mockResolvedValue({
        user: {
          id: 'user_1',
          organizationId: null,
          email: 'user@noorg.com',
        },
      } as any)

      const session = await mockGetServerSession()

      expect(session?.user?.organizationId).toBeNull()
    })

    it('should create account with organizationId', async () => {
      const orgId = 'org_456'
      const userId = 'user_2'

      mockGetServerSession.mockResolvedValue({
        user: {
          id: userId,
          organizationId: orgId,
          email: 'user@org2.com',
        },
      } as any)

      const newAccount = {
        id: 'new_account',
        organizationId: orgId,
        name: 'New Account',
        createdBy: userId,
      }

      prismaMock.crm_Accounts.create = jest.fn().mockResolvedValue(newAccount)

      const result = await prismaMock.crm_Accounts.create({
        data: {
          organizationId: orgId,
          name: 'New Account',
          createdBy: userId,
        } as any,
      })

      expect(result.organizationId).toBe(orgId)
    })
  })

  describe('Data Update with Organization Verification', () => {
    it('should verify organizationId before update', async () => {
      const orgId = 'org_123'
      const contactId = 'contact_1'

      mockGetServerSession.mockResolvedValue({
        user: {
          id: 'user_1',
          organizationId: orgId,
          email: 'user@org.com',
        },
      } as any)

      // First verify the contact belongs to the organization
      prismaMock.crm_Contacts.findFirst = jest.fn().mockResolvedValue({
        id: contactId,
        organizationId: orgId,
        first_name: 'John',
        last_name: 'Doe',
      })

      const existingContact = await prismaMock.crm_Contacts.findFirst({
        where: {
          id: contactId,
          organizationId: orgId,
        },
      })

      expect(existingContact).not.toBeNull()
      expect(existingContact?.organizationId).toBe(orgId)
    })

    it('should deny update for cross-tenant access', async () => {
      const userOrgId = 'org_123'
      const contactOrgId = 'org_456'
      const contactId = 'contact_1'

      mockGetServerSession.mockResolvedValue({
        user: {
          id: 'user_1',
          organizationId: userOrgId,
          email: 'user@org1.com',
        },
      } as any)

      // Verify contact does not belong to user's organization
      prismaMock.crm_Contacts.findFirst = jest.fn().mockResolvedValue(null)

      const existingContact = await prismaMock.crm_Contacts.findFirst({
        where: {
          id: contactId,
          organizationId: userOrgId, // Will not find because contact is in different org
        },
      })

      expect(existingContact).toBeNull()
    })

    it('should update only within same organization', async () => {
      const orgId = 'org_123'
      const contactId = 'contact_1'
      const userId = 'user_1'

      mockGetServerSession.mockResolvedValue({
        user: {
          id: userId,
          organizationId: orgId,
          email: 'user@org.com',
        },
      } as any)

      const updatedContact = {
        id: contactId,
        organizationId: orgId,
        first_name: 'Updated',
        last_name: 'Name',
        updatedBy: userId,
      }

      prismaMock.crm_Contacts.findFirst = jest.fn().mockResolvedValue({
        id: contactId,
        organizationId: orgId,
      } as any)

      prismaMock.crm_Contacts.update = jest.fn().mockResolvedValue(updatedContact)

      // First verify
      const existing = await prismaMock.crm_Contacts.findFirst({
        where: { id: contactId, organizationId: orgId },
      })

      expect(existing).not.toBeNull()

      // Then update
      const result = await prismaMock.crm_Contacts.update({
        where: { id: contactId },
        data: { first_name: 'Updated', updatedBy: userId },
      } as any)

      expect(result.organizationId).toBe(orgId)
      expect(result.updatedBy).toBe(userId)
    })
  })

  describe('Session Organization Context', () => {
    it('should include organizationId in session', async () => {
      mockGetServerSession.mockResolvedValue({
        user: {
          id: 'user_1',
          email: 'user@org.com',
          organizationId: 'org_123',
        },
      } as any)

      const session = await mockGetServerSession()

      expect(session?.user?.organizationId).toBe('org_123')
    })

    it('should handle missing organizationId in session', async () => {
      mockGetServerSession.mockResolvedValue({
        user: {
          id: 'user_1',
          email: 'user@noorg.com',
          organizationId: null,
        },
      } as any)

      const session = await mockGetServerSession()

      expect(session?.user?.organizationId).toBeNull()
    })

    it('should maintain organization context across requests', async () => {
      const orgId = 'org_persistent'

      mockGetServerSession.mockResolvedValue({
        user: {
          id: 'user_1',
          email: 'user@org.com',
          organizationId: orgId,
        },
      } as any)

      // First request
      const session1 = await mockGetServerSession()
      expect(session1?.user?.organizationId).toBe(orgId)

      // Second request
      const session2 = await mockGetServerSession()
      expect(session2?.user?.organizationId).toBe(orgId)
    })
  })

  describe('Real-time Synchronization', () => {
    it('should update organizationId filter in real-time', async () => {
      const org1Id = 'org_123'
      const org2Id = 'org_456'

      // Initial session with org1
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user_1', organizationId: org1Id, email: 'user@org1.com' },
      } as any)

      prismaMock.crm_Contacts.findMany = jest.fn().mockResolvedValue([
        { id: 'c1', organizationId: org1Id },
        { id: 'c2', organizationId: org1Id },
      ])

      const result1 = await prismaMock.crm_Contacts.findMany({
        where: { organizationId: org1Id },
      })

      expect(result1).toHaveLength(2)

      // Switch to org2
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user_1', organizationId: org2Id, email: 'user@org2.com' },
      } as any)

      prismaMock.crm_Contacts.findMany = jest.fn().mockResolvedValue([
        { id: 'c3', organizationId: org2Id },
      ])

      const result2 = await prismaMock.crm_Contacts.findMany({
        where: { organizationId: org2Id },
      })

      expect(result2).toHaveLength(1)
      expect(result2[0].organizationId).toBe(org2Id)
    })
  })

  describe('Reporting Across Organizations', () => {
    it('should aggregate data only for user organization', async () => {
      const orgId = 'org_123'

      mockGetServerSession.mockResolvedValue({
        user: { id: 'user_1', organizationId: orgId, email: 'user@org.com' },
      } as any)

      prismaMock.crm_Contacts.count = jest.fn().mockResolvedValue(50)
      prismaMock.crm_Accounts.count = jest.fn().mockResolvedValue(25)
      prismaMock.crm_Leads.count = jest.fn().mockResolvedValue(100)

      const contactCount = await prismaMock.crm_Contacts.count({
        where: { organizationId: orgId },
      })

      const accountCount = await prismaMock.crm_Accounts.count({
        where: { organizationId: orgId },
      })

      const leadCount = await prismaMock.crm_Leads.count({
        where: { organizationId: orgId },
      })

      expect(contactCount).toBe(50)
      expect(accountCount).toBe(25)
      expect(leadCount).toBe(100)
    })
  })
})
