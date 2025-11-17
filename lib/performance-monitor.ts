import { getCLS, getFID, getFCP, getLCP, getTTFB, Metric } from 'web-vitals';
import * as Sentry from '@sentry/nextjs';

/**
 * Performance Monitoring for NextCRM
 *
 * Tracks Core Web Vitals and reports to Sentry and Vercel Analytics
 */

interface PerformanceThresholds {
  good: number;
  needsImprovement: number;
}

const THRESHOLDS: Record<string, PerformanceThresholds> = {
  CLS: { good: 0.1, needsImprovement: 0.25 },
  FID: { good: 100, needsImprovement: 300 },
  FCP: { good: 1800, needsImprovement: 3000 },
  LCP: { good: 2500, needsImprovement: 4000 },
  TTFB: { good: 800, needsImprovement: 1800 },
};

function getRating(metric: Metric): 'good' | 'needs-improvement' | 'poor' {
  const threshold = THRESHOLDS[metric.name];
  if (!threshold) return 'good';

  if (metric.value <= threshold.good) return 'good';
  if (metric.value <= threshold.needsImprovement) return 'needs-improvement';
  return 'poor';
}

export function reportWebVitals(metric: Metric) {
  const rating = getRating(metric);

  // Send to Sentry for tracking
  Sentry.captureMessage(
    `Web Vital: ${metric.name}=${metric.value.toFixed(2)}`,
    {
      level: rating === 'poor' ? 'warning' : 'info',
      tags: {
        metric_name: metric.name,
        metric_rating: rating,
      },
      contexts: {
        metric: {
          name: metric.name,
          value: metric.value,
          rating,
          id: metric.id,
          delta: metric.delta,
        },
      },
    }
  );

  // Log poor performance to console in development
  if (process.env.NODE_ENV === 'development' && rating === 'poor') {
    console.warn(
      `⚠️ Poor ${metric.name}: ${metric.value.toFixed(2)}ms (threshold: ${THRESHOLDS[metric.name]?.needsImprovement}ms)`
    );
  }

  // Send to Vercel Analytics if available
  if (window.va) {
    window.va('track', 'web-vitals', {
      name: metric.name,
      value: metric.value,
      rating,
    });
  }
}

/**
 * Initialize performance monitoring
 */
export function initPerformanceMonitoring() {
  // Collect all Core Web Vitals
  getCLS(reportWebVitals);
  getFID(reportWebVitals);
  getFCP(reportWebVitals);
  getLCP(reportWebVitals);
  getTTFB(reportWebVitals);

  // Track custom performance metrics
  if (typeof window !== 'undefined' && window.performance) {
    // Navigation timing
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

      if (navigation) {
        const metrics = {
          dns: navigation.domainLookupEnd - navigation.domainLookupStart,
          tcp: navigation.connectEnd - navigation.connectStart,
          request: navigation.responseStart - navigation.requestStart,
          response: navigation.responseEnd - navigation.responseStart,
          domProcessing: navigation.domComplete - navigation.domInteractive,
          onLoad: navigation.loadEventEnd - navigation.loadEventStart,
        };

        Sentry.captureMessage('Navigation Timing', {
          level: 'info',
          contexts: {
            navigation: metrics,
          },
        });
      }
    });
  }
}

/**
 * Track custom performance metric
 */
export function trackPerformance(
  name: string,
  duration: number,
  metadata?: Record<string, any>
) {
  Sentry.captureMessage(`Performance: ${name}`, {
    level: 'info',
    tags: {
      metric_name: name,
    },
    contexts: {
      performance: {
        duration,
        ...metadata,
      },
    },
  });
}

/**
 * Measure async operation performance
 */
export async function measureAsync<T>(
  name: string,
  operation: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  try {
    const result = await operation();
    const duration = performance.now() - start;
    trackPerformance(name, duration);
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    trackPerformance(name, duration, { error: true });
    throw error;
  }
}

// Type declaration for Vercel Analytics
declare global {
  interface Window {
    va?: (event: string, metric: string, data: any) => void;
  }
}
