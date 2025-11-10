import { authenticator } from 'otplib'
import QRCode from 'qrcode'
import { prismadb } from '@/lib/prisma'

export class MFAService {
  /**
   * Generate MFA secret and QR code
   */
  static async generateMFASecret(
    email: string,
    appName: string = 'AutoCRM Pro'
  ): Promise<{
    secret: string
    qrCode: string
  }> {
    // Generate secret
    const secret = authenticator.generateSecret()

    // Generate QR code
    const otpauth_url = authenticator.keyuri(email, appName, secret)
    const qrCode = await QRCode.toDataURL(otpauth_url)

    return {
      secret,
      qrCode
    }
  }

  /**
   * Verify MFA code
   */
  static verifyMFACode(secret: string, token: string): boolean {
    try {
      return authenticator.verify({
        secret,
        encoding: 'base32',
        token
      })
    } catch (error) {
      return false
    }
  }

  /**
   * Enable MFA for admin user
   */
  static async enableMFAForAdmin(adminId: string, secret: string): Promise<void> {
    await prismadb.adminUser.update({
      where: { id: adminId },
      data: {
        mfaEnabled: true,
        mfaSecret: secret
      }
    })
  }

  /**
   * Disable MFA for admin user
   */
  static async disableMFAForAdmin(adminId: string): Promise<void> {
    await prismadb.adminUser.update({
      where: { id: adminId },
      data: {
        mfaEnabled: false,
        mfaSecret: null
      }
    })
  }

  /**
   * Generate backup codes
   */
  static generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = []
    for (let i = 0; i < count; i++) {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase()
      codes.push(code)
    }
    return codes
  }

  /**
   * Verify backup code and consume it
   */
  static async verifyAndConsumeBackupCode(
    adminId: string,
    code: string,
    backupCodes: string[]
  ): Promise<boolean> {
    if (!backupCodes.includes(code)) {
      return false
    }

    // Remove used code
    const updatedCodes = backupCodes.filter(c => c !== code)

    // Store updated codes (in real implementation, encrypt this)
    await prismadb.adminUser.update({
      where: { id: adminId },
      data: {
        mfaSecret: JSON.stringify(updatedCodes) // This should be encrypted in production
      }
    })

    return true
  }
}
