/**
 * Unit Tests: Quota Enforcement
 * Tests quota checking and enforcement functions
 */

import {
  canCreateUser,
  canCreateContact,
  canCreateLead,
  canCreateAccount,
  canCreateOpportunity,
  canUploadFile,
  canCreateProject,
  canCreateDocument,
  canCreateTask,
  formatQuotaError,
  isResourceAtCritical,
  isResourceApproaching,
} from '@/lib/quota-enforcement'

// Mock the checkQuota action
jest.mock('@/actions/usage/check-quota', () => ({
  checkQuota: jest.fn(),
}))

import { checkQuota } from '@/actions/usage/check-quota'

const mockCheckQuota = checkQuota as jest.MockedFunction<typeof checkQuota>

describe('Quota Enforcement', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('canCreateUser', () => {
    it('should call checkQuota with correct parameters', async () => {
      const orgId = 'org-123'

      mockCheckQuota.mockResolvedValue({
        allowed: true,
        used: 5,
        limit: 10,
        unlimited: false,
        percentage: 50,
      })

      await canCreateUser(orgId)

      expect(mockCheckQuota).toHaveBeenCalledWith('users', orgId, 1)
    })

    it('should return allowed when under quota', async () => {
      mockCheckQuota.mockResolvedValue({
        allowed: true,
        used: 5,
        limit: 10,
        unlimited: false,
        percentage: 50,
      })

      const result = await canCreateUser('org-123')

      expect(result.allowed).toBe(true)
    })

    it('should return not allowed when quota exceeded', async () => {
      mockCheckQuota.mockResolvedValue({
        allowed: false,
        used: 10,
        limit: 10,
        unlimited: false,
        percentage: 100,
      })

      const result = await canCreateUser('org-123')

      expect(result.allowed).toBe(false)
    })
  })

  describe('canCreateContact', () => {
    it('should check quota for single contact by default', async () => {
      mockCheckQuota.mockResolvedValue({
        allowed: true,
        used: 50,
        limit: 100,
        unlimited: false,
        percentage: 50,
      })

      await canCreateContact('org-123')

      expect(mockCheckQuota).toHaveBeenCalledWith('contacts', 'org-123', 1)
    })

    it('should check quota for multiple contacts', async () => {
      mockCheckQuota.mockResolvedValue({
        allowed: true,
        used: 50,
        limit: 100,
        unlimited: false,
        percentage: 55,
      })

      await canCreateContact('org-123', 5)

      expect(mockCheckQuota).toHaveBeenCalledWith('contacts', 'org-123', 5)
    })

    it('should deny when bulk creation exceeds quota', async () => {
      mockCheckQuota.mockResolvedValue({
        allowed: false,
        used: 98,
        limit: 100,
        unlimited: false,
        percentage: 100,
      })

      const result = await canCreateContact('org-123', 10)

      expect(result.allowed).toBe(false)
    })
  })

  describe('canCreateLead', () => {
    it('should check lead quota', async () => {
      mockCheckQuota.mockResolvedValue({
        allowed: true,
        used: 100,
        limit: 500,
        unlimited: false,
        percentage: 20,
      })

      await canCreateLead('org-123')

      expect(mockCheckQuota).toHaveBeenCalledWith('leads', 'org-123', 1)
    })
  })

  describe('canCreateAccount', () => {
    it('should check account quota', async () => {
      mockCheckQuota.mockResolvedValue({
        allowed: true,
        used: 25,
        limit: 50,
        unlimited: false,
        percentage: 50,
      })

      await canCreateAccount('org-123')

      expect(mockCheckQuota).toHaveBeenCalledWith('accounts', 'org-123', 1)
    })
  })

  describe('canCreateOpportunity', () => {
    it('should check opportunity quota', async () => {
      mockCheckQuota.mockResolvedValue({
        allowed: true,
        used: 40,
        limit: 100,
        unlimited: false,
        percentage: 40,
      })

      await canCreateOpportunity('org-123')

      expect(mockCheckQuota).toHaveBeenCalledWith('opportunities', 'org-123', 1)
    })
  })

  describe('canUploadFile', () => {
    it('should check storage quota with file size', async () => {
      const fileSizeBytes = 5 * 1024 * 1024 // 5MB

      mockCheckQuota.mockResolvedValue({
        allowed: true,
        used: 100 * 1024 * 1024, // 100MB used
        limit: 1024 * 1024 * 1024, // 1GB limit
        unlimited: false,
        percentage: 10,
      })

      await canUploadFile('org-123', fileSizeBytes)

      expect(mockCheckQuota).toHaveBeenCalledWith('storage', 'org-123', fileSizeBytes)
    })

    it('should deny large file when storage quota exceeded', async () => {
      const fileSizeBytes = 100 * 1024 * 1024 // 100MB

      mockCheckQuota.mockResolvedValue({
        allowed: false,
        used: 950 * 1024 * 1024,
        limit: 1024 * 1024 * 1024,
        unlimited: false,
        percentage: 100,
      })

      const result = await canUploadFile('org-123', fileSizeBytes)

      expect(result.allowed).toBe(false)
    })
  })

  describe('canCreateProject', () => {
    it('should check project quota', async () => {
      mockCheckQuota.mockResolvedValue({
        allowed: true,
        used: 3,
        limit: 10,
        unlimited: false,
        percentage: 30,
      })

      await canCreateProject('org-123')

      expect(mockCheckQuota).toHaveBeenCalledWith('projects', 'org-123', 1)
    })
  })

  describe('canCreateDocument', () => {
    it('should check document quota', async () => {
      mockCheckQuota.mockResolvedValue({
        allowed: true,
        used: 75,
        limit: 200,
        unlimited: false,
        percentage: 37.5,
      })

      await canCreateDocument('org-123')

      expect(mockCheckQuota).toHaveBeenCalledWith('documents', 'org-123', 1)
    })
  })

  describe('canCreateTask', () => {
    it('should check task quota', async () => {
      mockCheckQuota.mockResolvedValue({
        allowed: true,
        used: 500,
        limit: 1000,
        unlimited: false,
        percentage: 50,
      })

      await canCreateTask('org-123')

      expect(mockCheckQuota).toHaveBeenCalledWith('tasks', 'org-123', 1)
    })
  })

  describe('formatQuotaError', () => {
    it('should return empty string for unlimited quota', () => {
      const result = {
        allowed: true,
        used: 100,
        limit: 1000,
        unlimited: true,
        percentage: 10,
      }

      const message = formatQuotaError(result, 'users')

      expect(message).toBe('')
    })

    it('should return error message when quota exceeded', () => {
      const result = {
        allowed: false,
        used: 100,
        limit: 100,
        unlimited: false,
        percentage: 100,
      }

      const message = formatQuotaError(result, 'contacts')

      expect(message).toContain('reached your contacts limit')
      expect(message).toContain('100/100')
      expect(message).toContain('upgrade')
    })

    it('should return warning message at 80% usage', () => {
      const result = {
        allowed: true,
        used: 80,
        limit: 100,
        unlimited: false,
        percentage: 80,
      }

      const message = formatQuotaError(result, 'leads')

      expect(message).toContain('Warning')
      expect(message).toContain('80%')
      expect(message).toContain('80/100')
    })

    it('should return warning message at 90% usage', () => {
      const result = {
        allowed: true,
        used: 90,
        limit: 100,
        unlimited: false,
        percentage: 90,
      }

      const message = formatQuotaError(result, 'accounts')

      expect(message).toContain('Warning')
      expect(message).toContain('90%')
    })

    it('should return empty string below 80% usage', () => {
      const result = {
        allowed: true,
        used: 70,
        limit: 100,
        unlimited: false,
        percentage: 70,
      }

      const message = formatQuotaError(result, 'tasks')

      expect(message).toBe('')
    })
  })

  describe('isResourceAtCritical', () => {
    it('should return true when quota exceeded', () => {
      const result = {
        allowed: false,
        used: 100,
        limit: 100,
        unlimited: false,
        percentage: 100,
      }

      expect(isResourceAtCritical(result)).toBe(true)
    })

    it('should return true at 90% usage', () => {
      const result = {
        allowed: true,
        used: 90,
        limit: 100,
        unlimited: false,
        percentage: 90,
      }

      expect(isResourceAtCritical(result)).toBe(true)
    })

    it('should return true at 95% usage', () => {
      const result = {
        allowed: true,
        used: 95,
        limit: 100,
        unlimited: false,
        percentage: 95,
      }

      expect(isResourceAtCritical(result)).toBe(true)
    })

    it('should return false below 90% usage', () => {
      const result = {
        allowed: true,
        used: 89,
        limit: 100,
        unlimited: false,
        percentage: 89,
      }

      expect(isResourceAtCritical(result)).toBe(false)
    })
  })

  describe('isResourceApproaching', () => {
    it('should return true at 80% usage', () => {
      const result = {
        allowed: true,
        used: 80,
        limit: 100,
        unlimited: false,
        percentage: 80,
      }

      expect(isResourceApproaching(result)).toBe(true)
    })

    it('should return true at 85% usage', () => {
      const result = {
        allowed: true,
        used: 85,
        limit: 100,
        unlimited: false,
        percentage: 85,
      }

      expect(isResourceApproaching(result)).toBe(true)
    })

    it('should return false at 90% usage (critical, not approaching)', () => {
      const result = {
        allowed: true,
        used: 90,
        limit: 100,
        unlimited: false,
        percentage: 90,
      }

      expect(isResourceApproaching(result)).toBe(false)
    })

    it('should return false below 80% usage', () => {
      const result = {
        allowed: true,
        used: 70,
        limit: 100,
        unlimited: false,
        percentage: 70,
      }

      expect(isResourceApproaching(result)).toBe(false)
    })

    it('should return false when quota exceeded', () => {
      const result = {
        allowed: false,
        used: 100,
        limit: 100,
        unlimited: false,
        percentage: 100,
      }

      expect(isResourceApproaching(result)).toBe(false)
    })
  })

  describe('Integration Scenarios', () => {
    it('should handle FREE plan hitting limits', async () => {
      // FREE plan: 100 contacts
      mockCheckQuota.mockResolvedValue({
        allowed: false,
        used: 100,
        limit: 100,
        unlimited: false,
        percentage: 100,
      })

      const result = await canCreateContact('org-free')

      expect(result.allowed).toBe(false)

      const errorMessage = formatQuotaError(result, 'contacts')
      expect(errorMessage).toContain('upgrade')
    })

    it('should handle PRO plan with unlimited resources', async () => {
      mockCheckQuota.mockResolvedValue({
        allowed: true,
        used: 5000,
        limit: Infinity,
        unlimited: true,
      })

      const result = await canCreateContact('org-pro')

      expect(result.allowed).toBe(true)
      expect(result.unlimited).toBe(true)

      const errorMessage = formatQuotaError(result, 'contacts')
      expect(errorMessage).toBe('')
    })
  })
})
