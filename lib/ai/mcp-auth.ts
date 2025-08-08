import { auth } from "@/auth";
import { getUserByEmail } from "@/actions/user";
import { NextRequest } from "next/server";
import { randomBytes, createHash } from "crypto";
import db from "@/lib/db";

export interface MCPAuthContext {
  userId: string;
  companyId: string;
  email: string;
  name: string | null;
  role: string;
}

export interface MCPAuthResult {
  success: boolean;
  context?: MCPAuthContext;
  error?: {
    code: number;
    message: string;
  };
}

// Global token storage to persist across singleton instances and module reloads
// Use globalThis to ensure single instance across all contexts
declare global {
  var mcpTokenStorage: Map<string, { userId: string; expiresAt: Date }> | undefined;
}

const globalTokenStorage = globalThis.mcpTokenStorage ?? new Map<string, { userId: string; expiresAt: Date }>();
if (!globalThis.mcpTokenStorage) {
  globalThis.mcpTokenStorage = globalTokenStorage;
}

export class MCPAuthService {
  private static instance: MCPAuthService;
  private readonly INTERNAL_SERVICE_SECRET = process.env.MCP_INTERNAL_SECRET || 'mcp-internal-secret-key';

  static getInstance(): MCPAuthService {
    if (!MCPAuthService.instance) {
      MCPAuthService.instance = new MCPAuthService();
    }
    return MCPAuthService.instance;
  }

  // Use global storage instead of instance storage
  private get internalTokens() {
    return globalTokenStorage;
  }

  /**
   * Authenticate MCP request using multiple strategies
   */
  async authenticateRequest(request: NextRequest): Promise<MCPAuthResult> {
    // Strategy 1: Try Next-Auth session authentication
    const sessionAuth = await this.authenticateWithSession();
    if (sessionAuth.success) {
      return sessionAuth;
    }

    // Strategy 2: Try internal service token authentication
    const tokenAuth = await this.authenticateWithInternalToken(request);
    if (tokenAuth.success) {
      return tokenAuth;
    }

    // Strategy 3: Try API key authentication
    const apiKeyAuth = await this.authenticateWithAPIKey(request);
    if (apiKeyAuth.success) {
      return apiKeyAuth;
    }

    // All authentication methods failed
    return {
      success: false,
      error: {
        code: -32001,
        message: 'Authentication required - no valid credentials provided'
      }
    };
  }

  /**
   * Strategy 1: Authenticate using Next-Auth session
   */
  private async authenticateWithSession(): Promise<MCPAuthResult> {
    try {
      const session = await auth();
      
      if (!session?.user?.email) {
        return {
          success: false,
          error: {
            code: -32001,
            message: 'No active session found'
          }
        };
      }

      const user = await getUserByEmail(session.user.email);
      
      if (!user?.id) {
        return {
          success: false,
          error: {
            code: -32001,
            message: 'User not found in database'
          }
        };
      }

      return {
        success: true,
        context: {
          userId: user.id,
          companyId: user.cid || '',
          email: user.email,
          name: user.name,
          role: user.role
        }
      };
    } catch {
      return {
        success: false,
        error: {
          code: -32003,
          message: 'Session authentication failed'
        }
      };
    }
  }

  /**
   * Strategy 2: Authenticate using internal service token
   */
  private async authenticateWithInternalToken(request: NextRequest): Promise<MCPAuthResult> {
    const internalToken = request.headers.get('X-MCP-Internal-Token');
    const serviceHeader = request.headers.get('X-MCP-Service');
    
    console.log('Internal token auth attempt:', {
      hasToken: !!internalToken,
      hasService: !!serviceHeader,
      service: serviceHeader,
      tokenPreview: internalToken ? `${internalToken.substring(0, 8)}...` : 'none'
    });
    
    if (!internalToken || !serviceHeader) {
      return {
        success: false,
        error: {
          code: -32001,
          message: 'Internal token authentication not provided'
        }
      };
    }

    // Verify internal service token
    const isValidToken = this.verifyInternalToken(internalToken);
    console.log('Internal token validation:', {
      serviceCorrect: serviceHeader === 'mcp-agent',
      tokenValid: isValidToken,
      tokenLength: internalToken.length
    });
    
    if (serviceHeader !== 'mcp-agent' || !isValidToken) {
      return {
        success: false,
        error: {
          code: -32001,
          message: 'Invalid internal service token'
        }
      };
    }

    // Get user context from token
    const tokenData = this.internalTokens.get(internalToken);
    console.log('Token data lookup:', {
      tokenFound: !!tokenData,
      tokenCount: this.internalTokens.size,
      expired: tokenData ? tokenData.expiresAt < new Date() : 'N/A',
      globalStorageSize: globalTokenStorage.size,
      storageSame: this.internalTokens === globalTokenStorage,
      tokensInStorage: Array.from(this.internalTokens.keys()).map(k => k.substring(0, 8))
    });
    
    if (!tokenData || tokenData.expiresAt < new Date()) {
      return {
        success: false,
        error: {
          code: -32001,
          message: 'Internal token expired'
        }
      };
    }

    try {
      // TokenData.userId is actually the user ID, not email, so we need to get user by ID
      // For now, let's use a direct database query to get user by ID
      const user = await this.getUserById(tokenData.userId);
      if (!user) {
        return {
          success: false,
          error: {
            code: -32001,
            message: 'User associated with internal token not found'
          }
        };
      }

      return {
        success: true,
        context: {
          userId: user.id,
          companyId: user.cid || '',
          email: user.email,
          name: user.name,
          role: user.role
        }
      };
    } catch {
      return {
        success: false,
        error: {
          code: -32003,
          message: 'Internal token authentication failed'
        }
      };
    }
  }

  /**
   * Strategy 3: Authenticate using API key (for future use)
   */
  private async authenticateWithAPIKey(request: NextRequest): Promise<MCPAuthResult> {
    const apiKey = request.headers.get('X-API-Key') || request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!apiKey) {
      return {
        success: false,
        error: {
          code: -32001,
          message: 'API key not provided'
        }
      };
    }

    // TODO: Implement API key validation against database
    // For now, return failure to fallback to other methods
    return {
      success: false,
      error: {
        code: -32001,
        message: 'API key authentication not yet implemented'
      }
    };
  }

  /**
   * Generate internal service token for MCP client-to-server communication
   */
  async generateInternalToken(userId: string, expiresInMinutes = 60): Promise<string> {
    const token = this.createSecureToken();
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
    
    this.internalTokens.set(token, {
      userId,
      expiresAt
    });

    console.log('Generated internal token:', {
      tokenLength: token.length,
      tokenPreview: `${token.substring(0, 8)}...`,
      userId: userId,
      expiresAt: expiresAt.toISOString(),
      totalTokens: this.internalTokens.size
    });

    // Test immediate retrieval
    const testRetrieval = this.internalTokens.get(token);
    console.log('Immediate token test:', {
      canRetrieve: !!testRetrieval,
      storedUserId: testRetrieval?.userId,
      globalSize: globalTokenStorage.size
    });

    // Clean up expired tokens
    this.cleanupExpiredTokens();

    return token;
  }

  /**
   * Create secure token for internal communication
   */
  private createSecureToken(): string {
    const randomData = randomBytes(32);
    const timestamp = Date.now().toString();
    const combined = randomData.toString('hex') + timestamp;
    
    return createHash('sha256')
      .update(combined + this.INTERNAL_SERVICE_SECRET)
      .digest('hex');
  }

  /**
   * Verify internal service token
   */
  private verifyInternalToken(token: string): boolean {
    // Basic token format validation
    if (!token || token.length !== 64) {
      console.log('Token format invalid:', { length: token?.length, expected: 64 });
      return false;
    }

    // Check if token exists and is not expired
    const tokenData = this.internalTokens.get(token);
    const isValid = tokenData !== undefined && tokenData.expiresAt > new Date();
    
    console.log('Token verification details:', {
      tokenExists: !!tokenData,
      expired: tokenData ? tokenData.expiresAt <= new Date() : 'N/A',
      isValid: isValid,
      tokenPreview: `${token.substring(0, 8)}...`,
      storageSize: this.internalTokens.size,
      tokensInStorage: Array.from(this.internalTokens.keys()).map(k => k.substring(0, 8))
    });
    
    return isValid;
  }

  /**
   * Clean up expired tokens
   */
  private cleanupExpiredTokens(): void {
    const now = new Date();
    for (const [token, data] of this.internalTokens.entries()) {
      if (data.expiresAt < now) {
        this.internalTokens.delete(token);
      }
    }
  }

  /**
   * Get authentication headers for MCP client calls
   */
  async getMCPAuthHeaders(userId?: string): Promise<Record<string, string>> {
    // For MCP client calls, we should ALWAYS use internal tokens since
    // session auth won't work across HTTP boundaries
    
    // Try to get user info from session first
    const sessionAuth = await this.authenticateWithSession();
    
    if (sessionAuth.success) {
      console.log('Generating internal token from session context:', {
        userId: sessionAuth.context!.userId,
        companyId: sessionAuth.context!.companyId
      });
      
      const internalToken = await this.generateInternalToken(sessionAuth.context!.userId, 30);
      return {
        'X-MCP-Service': 'mcp-agent',
        'X-MCP-Internal-Token': internalToken,
        'X-MCP-User-ID': sessionAuth.context!.userId,
        'X-MCP-Company-ID': sessionAuth.context!.companyId,
      };
    }

    // Fall back to internal token if userId provided
    if (userId) {
      console.log(`Generating internal token for userId: ${userId}`);
      const internalToken = await this.generateInternalToken(userId, 30); // 30 minute expiry
      return {
        'X-MCP-Service': 'mcp-agent',
        'X-MCP-Internal-Token': internalToken,
        'X-MCP-User-ID': userId,
      };
    }

    console.log('No authentication available for MCP headers');
    // No authentication available
    return {};
  }

  /**
   * Validate MCP request permissions
   */
  validatePermissions(
    context: MCPAuthContext,
    requiredPermissions: string[] = []
  ): { allowed: boolean; reason?: string } {
    // Basic role-based permission checking
    const roleHierarchy: Record<string, number> = {
      'USER': 1,
      'CONTRIBUTOR': 2,
      'EDITOR': 3,
      'MEDIA': 4,
      'ADMIN': 5
    };

    const userRoleLevel = roleHierarchy[context.role] || 0;
    
    console.log('Permission validation:', {
      userRole: context.role,
      userLevel: userRoleLevel,
      requiredPermissions,
      userId: context.userId
    });

    // Check if user has minimum required permissions
    for (const permission of requiredPermissions) {
      switch (permission) {
        case 'read':
          if (userRoleLevel < 1) {
            return { allowed: false, reason: 'Insufficient read permissions' };
          }
          break;
        case 'write':
          if (userRoleLevel < 2) {
            return { allowed: false, reason: 'Insufficient write permissions' };
          }
          break;
        case 'admin':
          if (userRoleLevel < 5) {
            return { allowed: false, reason: 'Admin permissions required' };
          }
          break;
        default:
          // Unknown permission - deny by default
          return { allowed: false, reason: `Unknown permission: ${permission}` };
      }
    }

    return { allowed: true };
  }

  /**
   * Get user by ID for internal token authentication
   */
  private async getUserById(userId: string) {
    try {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          cid: true,
          role: true
        }
      });
      return user;
    } catch (error) {
      console.error('Error fetching user by ID:', error);
      return null;
    }
  }

  /**
   * Get authentication statistics
   */
  getAuthStats(): {
    activeInternalTokens: number;
    expiredTokensCleanedUp: number;
    authStrategiesAvailable: string[];
  } {
    const now = new Date();
    const activeTokens = Array.from(this.internalTokens.values()).filter(
      token => token.expiresAt > now
    ).length;

    return {
      activeInternalTokens: activeTokens,
      expiredTokensCleanedUp: this.internalTokens.size - activeTokens,
      authStrategiesAvailable: ['session', 'internal-token', 'api-key']
    };
  }
}

export const mcpAuthService = MCPAuthService.getInstance();