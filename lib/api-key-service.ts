import crypto from 'crypto'
import { prismadb } from '@/lib/prisma'

export interface ApiKeyPayload {
  apiKeyId: string
  tenantId: string
  name: string
  permissions: string[]
  createdAt: Date
  lastUsedAt?: Date
}

export class APIKeyService {
  /**
   * Generate API key
   */
  static generateAPIKey(): {
    key: string
    hash: string
  } {
    const key = `sk_${crypto.randomBytes(24).toString('hex')}`
    const hash = crypto.createHash('sha256').update(key).digest('hex')

    return { key, hash }
  }

  /**
   * Create API key for tenant
   */
  static async createAPIKey(data: {
    tenantId: string
    name: string
    permissions: string[]
  }) {
    const { key, hash } = this.generateAPIKey()

    const apiKey = await prismadb.apiKey.create({
      data: {
        tenantId: data.tenantId,
        name: data.name,
        keyHash: hash,
        permissions: data.permissions,
        isActive: true,
        expiresAt: null
      }
    })

    return {
      id: apiKey.id,
      key, // Only returned once at creation
      name: apiKey.name,
      createdAt: apiKey.createdAt
    }
  }

  /**
   * Verify API key
   */
  static async verifyAPIKey(key: string): Promise<ApiKeyPayload | null> {
    const hash = crypto.createHash('sha256').update(key).digest('hex')

    const apiKey = await prismadb.apiKey.findFirst({
      where: {
        keyHash: hash,
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      }
    })

    if (!apiKey) {
      return null
    }

    // Update last used timestamp
    await prismadb.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() }
    })

    return {
      apiKeyId: apiKey.id,
      tenantId: apiKey.tenantId,
      name: apiKey.name,
      permissions: apiKey.permissions,
      createdAt: apiKey.createdAt,
      lastUsedAt: apiKey.lastUsedAt
    }
  }

  /**
   * List API keys for tenant
   */
  static async listAPIKeys(tenantId: string) {
    return prismadb.apiKey.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        permissions: true,
        isActive: true,
        expiresAt: true,
        lastUsedAt: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    })
  }

  /**
   * Revoke API key
   */
  static async revokeAPIKey(apiKeyId: string) {
    return prismadb.apiKey.update({
      where: { id: apiKeyId },
      data: { isActive: false }
    })
  }

  /**
   * Rotate API key
   */
  static async rotateAPIKey(apiKeyId: string) {
    const oldKey = await prismadb.apiKey.findUnique({
      where: { id: apiKeyId }
    })

    if (!oldKey) {
      throw new Error('API key not found')
    }

    // Revoke old key
    await this.revokeAPIKey(apiKeyId)

    // Create new key with same permissions
    const newKey = await this.createAPIKey({
      tenantId: oldKey.tenantId,
      name: `${oldKey.name} (rotated)`,
      permissions: oldKey.permissions
    })

    return newKey
  }

  /**
   * Check API key permissions
   */
  static hasPermission(
    payload: ApiKeyPayload,
    requiredPermissions: string[]
  ): boolean {
    return requiredPermissions.every(perm =>
      payload.permissions.includes(perm) || payload.permissions.includes('*')
    )
  }
}
