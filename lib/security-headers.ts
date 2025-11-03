/**
 * Security Headers Configuration
 * Implements comprehensive security headers for production deployment
 */

import crypto from "crypto";

/**
 * Generate a Content Security Policy nonce
 */
export function generateNonce(): string {
  return crypto.randomBytes(16).toString("base64");
}

/**
 * Get Content Security Policy header value
 */
export function getCSPHeader(nonce?: string): string {
  const nonceStr = nonce ? `'nonce-${nonce}'` : "";

  const cspDirectives = [
    "default-src 'self'",
    `script-src 'self' ${nonceStr} 'unsafe-eval' 'unsafe-inline' https://js.stripe.com`,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: https: blob:",
    "media-src 'self' https:",
    "connect-src 'self' https://api.stripe.com https://*.cloudinary.com",
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ];

  return cspDirectives.join("; ");
}

/**
 * Get all security headers
 */
export function getSecurityHeaders(nonce?: string): Record<string, string> {
  return {
    // DNS Prefetch Control
    "X-DNS-Prefetch-Control": "on",

    // Strict Transport Security
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",

    // Frame Options
    "X-Frame-Options": "SAMEORIGIN",

    // Content Type Options
    "X-Content-Type-Options": "nosniff",

    // XSS Protection (legacy but still useful)
    "X-XSS-Protection": "1; mode=block",

    // Referrer Policy
    "Referrer-Policy": "origin-when-cross-origin",

    // Permissions Policy
    "Permissions-Policy":
      "camera=(), microphone=(), geolocation=(), interest-cohort=()",

    // Content Security Policy
    "Content-Security-Policy": getCSPHeader(nonce),
  };
}

/**
 * Next.js headers configuration
 */
export const nextSecurityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  {
    key: "Referrer-Policy",
    value: "origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
];

/**
 * Security recommendations for production
 */
export const SECURITY_RECOMMENDATIONS = {
  HSTS: {
    name: "HTTP Strict Transport Security",
    description: "Forces HTTPS connections for enhanced security",
    recommendation: "Ensure SSL certificate is properly configured",
  },
  CSP: {
    name: "Content Security Policy",
    description: "Prevents XSS and data injection attacks",
    recommendation: "Review and test CSP directives for your use case",
  },
  CORS: {
    name: "Cross-Origin Resource Sharing",
    description: "Controls which domains can access your API",
    recommendation: "Configure CORS appropriately for your frontend domain",
  },
  RATE_LIMITING: {
    name: "Rate Limiting",
    description: "Prevents abuse and DDoS attacks",
    recommendation: "Use Redis for distributed rate limiting in production",
  },
};

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Check if running with HTTPS
 */
export function isSecureConnection(protocol?: string): boolean {
  return protocol === "https:" || process.env.NODE_ENV === "development";
}
