import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { prismadb } from '@/lib/prisma'

export interface AdminJWTPayload {
  userId: string
  email: string
  role: string
  permissions: string[]
  type: 'admin'
  iat: number
  exp: number
}

export interface TenantJWTPayload {
  userId: string
  email: string
  role: string
  tenantId: string
  type: 'tenant'
  iat: number
  exp: number
}

export type JWTPayload = AdminJWTPayload | TenantJWTPayload

export class AuthService {
  private static JWT_SECRET = process.env.JWT_SECRET!
  private static REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET!
  private static ACCESS_TOKEN_EXPIRY = '15m'
  private static REFRESH_TOKEN_EXPIRY = '7d'

  // ========================================================================
  // TOKEN GENERATION
  // ========================================================================

  /**
   * Generate JWT tokens for admin users
   */
  static generateAdminTokens(payload: {
    userId: string
    email: string
    role: string
    permissions?: string[]
  }) {
    const accessToken = jwt.sign(
      {
        ...payload,
        permissions: payload.permissions || [],
        type: 'admin'
      },
      this.JWT_SECRET,
      { expiresIn: this.ACCESS_TOKEN_EXPIRY }
    )

    const refreshToken = jwt.sign(
      {
        userId: payload.userId,
        email: payload.email,
        type: 'admin'
      },
      this.REFRESH_TOKEN_SECRET,
      { expiresIn: this.REFRESH_TOKEN_EXPIRY }
    )

    return { accessToken, refreshToken }
  }

  /**
   * Generate JWT tokens for tenant users
   */
  static generateTenantTokens(payload: {
    userId: string
    email: string
    role: string
    tenantId: string
  }) {
    const accessToken = jwt.sign(
      {
        ...payload,
        type: 'tenant'
      },
      this.JWT_SECRET,
      { expiresIn: this.ACCESS_TOKEN_EXPIRY }
    )

    const refreshToken = jwt.sign(
      {
        userId: payload.userId,
        email: payload.email,
        tenantId: payload.tenantId,
        type: 'tenant'
      },
      this.REFRESH_TOKEN_SECRET,
      { expiresIn: this.REFRESH_TOKEN_EXPIRY }
    )

    return { accessToken, refreshToken }
  }

  // ========================================================================
  // TOKEN VERIFICATION
  // ========================================================================

  /**
   * Verify JWT token and return payload
   */
  static verifyToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, this.JWT_SECRET) as JWTPayload
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token has expired')
      }
      throw new Error('Invalid or malformed token')
    }
  }

  /**
   * Verify refresh token and return payload
   */
  static verifyRefreshToken(token: string) {
    try {
      return jwt.verify(token, this.REFRESH_TOKEN_SECRET)
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Refresh token has expired')
      }
      throw new Error('Invalid refresh token')
    }
  }

  // ========================================================================
  // PASSWORD HASHING
  // ========================================================================

  /**
   * Hash password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10)
    return bcrypt.hash(password, salt)
  }

  /**
   * Compare plain password with hash
   */
  static async comparePasswords(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash)
    } catch (error) {
      return false
    }
  }

  // ========================================================================
  // ADMIN AUTHENTICATION
  // ========================================================================

  /**
   * Admin user login
   */
  static async adminLogin(email: string, password: string) {
    const user = await prismadb.adminUser.findUnique({
      where: { email }
    })

    if (!user) {
      throw new Error('Invalid email or password')
    }

    if (!user.isActive) {
      throw new Error('User account is inactive')
    }

    const isValidPassword = await this.comparePasswords(password, user.password)

    if (!isValidPassword) {
      throw new Error('Invalid email or password')
    }

    // Update last login
    await prismadb.adminUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    })

    const tokens = this.generateAdminTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
      permissions: [] // Can be extended with permissions management
    })

    return {
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role
      },
      tokens
    }
  }

  /**
   * Register new admin user (super admin only)
   */
  static async registerAdminUser(data: {
    firstName: string
    lastName: string
    email: string
    password: string
    role: string
    department?: string
  }) {
    // Check if user exists
    const existingUser = await prismadb.adminUser.findUnique({
      where: { email: data.email }
    })

    if (existingUser) {
      throw new Error('Email already in use')
    }

    // Hash password
    const hashedPassword = await this.hashPassword(data.password)

    const user = await prismadb.adminUser.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: hashedPassword,
        role: data.role,
        department: data.department
      }
    })

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role
    }
  }

  /**
   * Refresh admin access token
   */
  static async refreshAdminAccessToken(refreshToken: string) {
    const payload = this.verifyRefreshToken(refreshToken) as any

    if (payload.type !== 'admin') {
      throw new Error('Invalid refresh token type')
    }

    const user = await prismadb.adminUser.findUnique({
      where: { id: payload.userId }
    })

    if (!user || !user.isActive) {
      throw new Error('User not found or inactive')
    }

    const tokens = this.generateAdminTokens({
      userId: user.id,
      email: user.email,
      role: user.role
    })

    return { tokens }
  }

  // ========================================================================
  // TENANT AUTHENTICATION
  // ========================================================================

  /**
   * Tenant user login
   */
  static async tenantLogin(email: string, password: string, tenantId: string) {
    const user = await prismadb.tenantUser.findFirst({
      where: {
        email,
        tenantId
      }
    })

    if (!user) {
      throw new Error('Invalid email or password')
    }

    if (!user.isActive) {
      throw new Error('User account is inactive')
    }

    const isValidPassword = await this.comparePasswords(password, user.password)

    if (!isValidPassword) {
      throw new Error('Invalid email or password')
    }

    // Check tenant status
    const tenant = await prismadb.tenant.findUnique({
      where: { id: tenantId }
    })

    if (!tenant || tenant.status !== 'ACTIVE') {
      throw new Error('Tenant account is not active')
    }

    // Update last login
    await prismadb.tenantUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    })

    const tokens = this.generateTenantTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId
    })

    return {
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role
      },
      tokens
    }
  }

  /**
   * Register new tenant user
   */
  static async registerTenantUser(data: {
    firstName: string
    lastName: string
    email: string
    password: string
    tenantId: string
    role?: string
  }) {
    // Check if user exists in tenant
    const existingUser = await prismadb.tenantUser.findFirst({
      where: {
        email: data.email,
        tenantId: data.tenantId
      }
    })

    if (existingUser) {
      throw new Error('Email already in use for this tenant')
    }

    // Hash password
    const hashedPassword = await this.hashPassword(data.password)

    const user = await prismadb.tenantUser.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: hashedPassword,
        tenantId: data.tenantId,
        role: (data.role || 'USER') as any
      }
    })

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role
    }
  }

  /**
   * Refresh tenant access token
   */
  static async refreshTenantAccessToken(refreshToken: string) {
    const payload = this.verifyRefreshToken(refreshToken) as any

    if (payload.type !== 'tenant') {
      throw new Error('Invalid refresh token type')
    }

    const user = await prismadb.tenantUser.findUnique({
      where: { id: payload.userId }
    })

    if (!user || !user.isActive) {
      throw new Error('User not found or inactive')
    }

    const tenant = await prismadb.tenant.findUnique({
      where: { id: payload.tenantId }
    })

    if (!tenant || tenant.status !== 'ACTIVE') {
      throw new Error('Tenant is not active')
    }

    const tokens = this.generateTenantTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: payload.tenantId
    })

    return { tokens }
  }

  // ========================================================================
  // MFA (Multi-Factor Authentication)
  // ========================================================================

  /**
   * Generate MFA secret
   */
  static generateMFASecret(): string {
    // In production, use a proper TOTP library like 'speakeasy'
    return Math.random().toString(36).substring(2, 15) +
           Math.random().toString(36).substring(2, 15)
  }

  /**
   * Verify MFA code
   * Note: This is a placeholder. Implement with proper TOTP verification
   */
  static async verifyMFACode(secret: string, code: string): Promise<boolean> {
    // TODO: Implement with speakeasy or similar
    return code.length === 6 // Placeholder validation
  }
}
