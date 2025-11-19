// Jest setup file
import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      pathname: '/',
      query: {},
      asPath: '/',
    }
  },
  usePathname() {
    return '/'
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  useParams() {
    return {}
  },
}))

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: null,
    status: 'unauthenticated',
  })),
  signIn: jest.fn(),
  signOut: jest.fn(),
  SessionProvider: ({ children }) => children,
}))

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key) => key,
  useLocale: () => 'en',
}))

// Set up environment variables before any tests run
process.env.NEXTAUTH_URL = 'http://localhost:3000'
process.env.JWT_SECRET = 'test-secret-key-for-testing-purposes-only'
process.env.DATABASE_URL = 'mongodb://localhost:27017/test'
process.env.GOOGLE_ID = 'test-google-id'
process.env.GOOGLE_SECRET = 'test-google-secret'
process.env.GITHUB_ID = 'test-github-id'
process.env.GITHUB_SECRET = 'test-github-secret'
process.env.STRIPE_SECRET_KEY = 'sk_test_123'
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret'

// Mock Next.js server-side APIs
global.Request = class Request {
  constructor(url, init) {
    this.url = url
    this.method = init?.method || 'GET'
    this.headers = new Map(Object.entries(init?.headers || {}))
    this._body = init?.body
  }

  async json() {
    return JSON.parse(this._body)
  }

  async text() {
    return this._body
  }
}

global.Response = class Response {
  constructor(body, init) {
    this.body = body
    this.status = init?.status || 200
    this.headers = new Map(Object.entries(init?.headers || {}))
  }

  async json() {
    return JSON.parse(this.body)
  }

  async text() {
    return this.body
  }
}

global.Headers = class Headers extends Map {
  get(key) {
    return super.get(key.toLowerCase())
  }

  set(key, value) {
    return super.set(key.toLowerCase(), value)
  }
}

// Suppress console errors during tests (optional)
const originalError = console.error
const originalWarn = console.warn

beforeAll(() => {
  console.error = (...args) => {
    // Suppress known warnings
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('[STRIPE_WEBHOOK]') ||
       args[0].includes('[AUTH_SESSION]'))
    ) {
      return
    }
    originalError.call(console, ...args)
  }

  console.warn = (...args) => {
    // Suppress known warnings
    if (typeof args[0] === 'string' && args[0].includes('deprecated')) {
      return
    }
    originalWarn.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
  console.warn = originalWarn
})
