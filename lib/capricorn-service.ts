import axios, { AxiosInstance } from 'axios'
import { prismadb } from '@/lib/prisma'

export class CapricornService {
  private static client: AxiosInstance | null = null

  /**
   * Initialize Capricorn API client
   */
  private static getClient(): AxiosInstance {
    if (!this.client) {
      this.client = axios.create({
        baseURL: process.env.CAPRICORN_API_URL || 'https://api.capricorn.com.au',
        headers: {
          Authorization: `Bearer ${process.env.CAPRICORN_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      })
    }

    return this.client
  }

  /**
   * Validate API credentials
   */
  static async validateCredentials(): Promise<boolean> {
    try {
      const client = this.getClient()
      const response = await client.get('/health')
      return response.status === 200
    } catch (error) {
      console.error('Capricorn API validation failed:', error)
      return false
    }
  }

  /**
   * Search for parts
   */
  static async searchParts(query: string): Promise<any[]> {
    try {
      const client = this.getClient()
      const response = await client.get('/products/search', {
        params: { q: query }
      })

      return response.data.products || []
    } catch (error) {
      console.error('Parts search failed:', error)
      throw new Error('Failed to search parts in Capricorn catalog')
    }
  }

  /**
   * Get product details
   */
  static async getProductDetails(productId: string): Promise<any> {
    try {
      const client = this.getClient()
      const response = await client.get(`/products/${productId}`)
      return response.data
    } catch (error) {
      console.error('Failed to get product details:', error)
      throw new Error('Failed to fetch product details')
    }
  }

  /**
   * Get available stock for product
   */
  static async getAvailableStock(productId: string): Promise<number> {
    try {
      const client = this.getClient()
      const response = await client.get(`/inventory/${productId}`)
      return response.data.availableStock || 0
    } catch (error) {
      console.error('Failed to get stock information:', error)
      return 0
    }
  }

  /**
   * Create order in Capricorn
   */
  static async createOrder(data: {
    tenantId: string
    items: Array<{
      productId: string
      quantity: number
      unitPrice: number
    }>
    deliveryType: string
    notes?: string
  }): Promise<any> {
    try {
      const client = this.getClient()

      // Calculate total
      const totalAmount = data.items.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0
      )

      const response = await client.post('/orders', {
        customerId: process.env.CAPRICORN_CUSTOMER_ID,
        items: data.items,
        deliveryType: data.deliveryType,
        notes: data.notes,
        totalAmount
      })

      // Store order in database
      const order = await prismadb.capricornOrder.create({
        data: {
          externalOrderId: response.data.orderId,
          tenantId: data.tenantId,
          items: JSON.stringify(data.items),
          status: 'PENDING',
          totalAmount,
          currency: 'AUD',
          capricornResponse: JSON.stringify(response.data)
        }
      })

      return {
        order,
        capricornOrder: response.data
      }
    } catch (error) {
      console.error('Failed to create Capricorn order:', error)

      // Log error for tenant
      if (data.tenantId) {
        await prismadb.capricornOrder.create({
          data: {
            externalOrderId: `FAILED-${Date.now()}`,
            tenantId: data.tenantId,
            items: JSON.stringify(data.items),
            status: 'FAILED',
            totalAmount: 0,
            currency: 'AUD',
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
          }
        }).catch(err => console.error('Failed to log order error:', err))
      }

      throw new Error('Failed to create order in Capricorn')
    }
  }

  /**
   * Get order status
   */
  static async getOrderStatus(orderId: string): Promise<any> {
    try {
      const client = this.getClient()
      const response = await client.get(`/orders/${orderId}`)

      // Update in database
      await prismadb.capricornOrder.updateMany({
        where: { externalOrderId: orderId },
        data: {
          status: response.data.status,
          capricornResponse: JSON.stringify(response.data),
          updatedAt: new Date()
        }
      })

      return response.data
    } catch (error) {
      console.error('Failed to get order status:', error)
      throw new Error('Failed to fetch order status')
    }
  }

  /**
   * Track order
   */
  static async trackOrder(orderId: string): Promise<any> {
    try {
      const client = this.getClient()
      const response = await client.get(`/orders/${orderId}/tracking`)
      return response.data
    } catch (error) {
      console.error('Failed to track order:', error)
      throw new Error('Failed to track order')
    }
  }

  /**
   * Sync inventory from Capricorn
   */
  static async syncInventory(): Promise<void> {
    try {
      const client = this.getClient()
      const response = await client.get('/inventory')

      // Store in database
      await prismadb.capricornInventory.upsert({
        where: { synId: 'capricorn_inventory_latest' },
        update: {
          data: JSON.stringify(response.data),
          lastSyncedAt: new Date(),
          updatedAt: new Date()
        },
        create: {
          synId: 'capricorn_inventory_latest',
          data: JSON.stringify(response.data),
          lastSyncedAt: new Date()
        }
      })

      console.log('Capricorn inventory synced successfully')
    } catch (error) {
      console.error('Failed to sync Capricorn inventory:', error)
      throw new Error('Failed to sync inventory')
    }
  }

  /**
   * Get sync status
   */
  static async getSyncStatus(): Promise<any> {
    try {
      const inventorySync = await prismadb.capricornInventory.findUnique({
        where: { synId: 'capricorn_inventory_latest' }
      })

      const recentOrders = await prismadb.capricornOrder.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10
      })

      return {
        lastInventorySyncAt: inventorySync?.lastSyncedAt,
        inventorySyncStatus: inventorySync ? 'SYNCED' : 'NOT_SYNCED',
        recentOrders
      }
    } catch (error) {
      console.error('Failed to get sync status:', error)
      throw new Error('Failed to get sync status')
    }
  }

  /**
   * Cancel order
   */
  static async cancelOrder(orderId: string): Promise<any> {
    try {
      const client = this.getClient()
      const response = await client.post(`/orders/${orderId}/cancel`)

      // Update in database
      await prismadb.capricornOrder.updateMany({
        where: { externalOrderId: orderId },
        data: {
          status: 'CANCELLED',
          updatedAt: new Date()
        }
      })

      return response.data
    } catch (error) {
      console.error('Failed to cancel order:', error)
      throw new Error('Failed to cancel order')
    }
  }

  /**
   * Get price quote for items
   */
  static async getPriceQuote(items: Array<{
    productId: string
    quantity: number
  }>): Promise<any> {
    try {
      const client = this.getClient()
      const response = await client.post('/quotes', {
        items,
        customerId: process.env.CAPRICORN_CUSTOMER_ID
      })

      return response.data
    } catch (error) {
      console.error('Failed to get price quote:', error)
      throw new Error('Failed to get price quote')
    }
  }

  /**
   * Get invoice for order
   */
  static async getOrderInvoice(orderId: string): Promise<any> {
    try {
      const client = this.getClient()
      const response = await client.get(`/orders/${orderId}/invoice`)
      return response.data
    } catch (error) {
      console.error('Failed to get order invoice:', error)
      throw new Error('Failed to get order invoice')
    }
  }
}
