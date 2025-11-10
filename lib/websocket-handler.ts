import { Server as HTTPServer } from 'http'
import { Server as SocketIOServer, Socket } from 'socket.io'
import { AuthService } from '@/lib/auth-service'
import { prismadb } from '@/lib/prisma'
import { WebhookService } from '@/lib/webhook-service'

export class WebSocketHandler {
  private static io: SocketIOServer | null = null

  /**
   * Initialize WebSocket server
   */
  static initialize(server: HTTPServer): SocketIOServer {
    if (this.io) return this.io

    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        credentials: true
      },
      transports: ['websocket', 'polling']
    })

    this.io.use(this.authMiddleware.bind(this))
    this.io.on('connection', this.handleConnection.bind(this))

    return this.io
  }

  /**
   * Authentication middleware
   */
  private static async authMiddleware(
    socket: Socket,
    next: (err?: any) => void
  ) {
    try {
      const token = socket.handshake.auth.token

      if (!token) {
        return next(new Error('No authentication token'))
      }

      const payload = AuthService.verifyToken(token)
      socket.data.user = payload
      socket.data.userId = payload.userId

      if ('tenantId' in payload) {
        socket.data.tenantId = payload.tenantId
      }

      next()
    } catch (error) {
      next(new Error('Authentication failed'))
    }
  }

  /**
   * Handle new WebSocket connections
   */
  private static handleConnection(socket: Socket) {
    const userId = socket.data.userId
    const tenantId = socket.data.tenantId

    console.log(`User ${userId} connected via WebSocket`)

    // Join user-specific room
    socket.join(`user:${userId}`)

    // Join tenant-specific room
    if (tenantId) {
      socket.join(`tenant:${tenantId}`)
    }

    // Handle messages
    socket.on('message', (data) => this.handleMessage(socket, data))
    socket.on('subscribe', (channel) => this.handleSubscribe(socket, channel))
    socket.on('unsubscribe', (channel) => this.handleUnsubscribe(socket, channel))

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User ${userId} disconnected`)
    })
  }

  /**
   * Handle incoming messages
   */
  private static async handleMessage(socket: Socket, data: any) {
    const { type, payload } = data

    try {
      switch (type) {
        case 'USAGE_UPDATE':
          await this.handleUsageUpdate(socket, payload)
          break

        case 'STATUS_CHANGE':
          await this.handleStatusChange(socket, payload)
          break

        case 'NOTIFICATION':
          await this.handleNotification(socket, payload)
          break

        case 'PING':
          socket.emit('PONG', { timestamp: Date.now() })
          break

        default:
          console.warn(`Unknown message type: ${type}`)
      }
    } catch (error) {
      socket.emit('error', {
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Handle subscription requests
   */
  private static handleSubscribe(socket: Socket, channel: string) {
    const validChannels = [
      'notifications',
      'updates',
      'analytics',
      'system_status'
    ]

    if (!validChannels.includes(channel)) {
      socket.emit('error', { message: 'Invalid channel' })
      return
    }

    socket.join(`channel:${channel}`)
    socket.emit('subscribed', { channel })
  }

  /**
   * Handle unsubscription requests
   */
  private static handleUnsubscribe(socket: Socket, channel: string) {
    socket.leave(`channel:${channel}`)
    socket.emit('unsubscribed', { channel })
  }

  /**
   * Handle usage updates
   */
  private static async handleUsageUpdate(socket: Socket, payload: any) {
    const tenantId = socket.data.tenantId

    if (!tenantId) return

    // Record usage metric
    await prismadb.usageMetric.create({
      data: {
        tenantId,
        metricType: payload.metricType,
        value: payload.value,
        details: payload.details || {}
      }
    })

    // Broadcast to tenant
    this.io?.to(`tenant:${tenantId}`).emit('usage_updated', {
      metricType: payload.metricType,
      value: payload.value,
      timestamp: new Date()
    })

    // Trigger webhook
    await WebhookService.triggerEvent({
      type: 'usage.recorded',
      resource: 'USAGE_METRIC',
      resourceId: tenantId,
      data: {
        tenantId,
        metricType: payload.metricType,
        value: payload.value
      }
    })
  }

  /**
   * Handle status changes
   */
  private static async handleStatusChange(socket: Socket, payload: any) {
    const tenantId = socket.data.tenantId

    if (!tenantId) return

    // Broadcast to tenant
    this.io?.to(`tenant:${tenantId}`).emit('status_changed', {
      resource: payload.resource,
      resourceId: payload.resourceId,
      oldStatus: payload.oldStatus,
      newStatus: payload.newStatus,
      timestamp: new Date()
    })

    // Trigger webhook
    await WebhookService.triggerEvent({
      type: 'status.changed',
      resource: payload.resource,
      resourceId: payload.resourceId,
      data: {
        tenantId,
        oldStatus: payload.oldStatus,
        newStatus: payload.newStatus
      }
    })
  }

  /**
   * Handle notifications
   */
  private static async handleNotification(socket: Socket, payload: any) {
    const userId = socket.data.userId

    // Store notification
    await prismadb.notificationLog.create({
      data: {
        adminUserId: userId,
        recipientEmail: payload.email,
        type: 'IN_APP',
        channel: 'WEBSOCKET',
        subject: payload.subject,
        content: payload.message,
        status: 'SENT'
      }
    })

    // Send to user
    this.io?.to(`user:${userId}`).emit('notification', {
      id: Math.random().toString(36),
      ...payload,
      timestamp: new Date()
    })
  }

  /**
   * Broadcast to tenant
   */
  static broadcastToTenant(tenantId: string, event: string, data: any) {
    if (!this.io) return

    this.io.to(`tenant:${tenantId}`).emit(event, {
      ...data,
      timestamp: new Date()
    })
  }

  /**
   * Broadcast to user
   */
  static broadcastToUser(userId: string, event: string, data: any) {
    if (!this.io) return

    this.io.to(`user:${userId}`).emit(event, {
      ...data,
      timestamp: new Date()
    })
  }

  /**
   * Broadcast to all
   */
  static broadcast(event: string, data: any) {
    if (!this.io) return

    this.io.emit(event, {
      ...data,
      timestamp: new Date()
    })
  }

  /**
   * Get connected users
   */
  static getConnectedUsers(tenantId: string): number {
    if (!this.io) return 0

    const room = this.io.sockets.adapter.rooms.get(`tenant:${tenantId}`)
    return room ? room.size : 0
  }
}
