/**
 * FusionOS Load Testing Script — Phase 23
 *
 * k6-style load testing scenarios for FusionOS API.
 * Run with: npx ts-node load-testing/load-test.ts
 * Or adapt to k6: k6 run load-testing/load-test.k6.js
 *
 * This script uses Node.js fetch for environments without k6 installed.
 */

interface LoadTestResult {
  scenario: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  rps: number;
  errorRate: number;
  durationMs: number;
}

interface RequestResult {
  status: number;
  latencyMs: number;
  success: boolean;
}

const BASE_URL = process.env.API_URL || 'http://localhost:3001';
const AUTH_TOKEN = process.env.AUTH_TOKEN || '';

async function measureRequest(path: string, options: RequestInit = {}): Promise<RequestResult> {
  const start = Date.now();
  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}),
        ...((options.headers as Record<string, string>) || {}),
      },
    });
    const latencyMs = Date.now() - start;
    return {
      status: response.status,
      latencyMs,
      success: response.ok,
    };
  } catch {
    return {
      status: 0,
      latencyMs: Date.now() - start,
      success: false,
    };
  }
}

async function runScenario(
  name: string,
  requests: string[],
  concurrency: number = 5,
  durationMs: number = 10000,
): Promise<LoadTestResult> {
  const results: RequestResult[] = [];
  const startTime = Date.now();
  const endTime = startTime + durationMs;

  while (Date.now() < endTime) {
    const batch: Promise<RequestResult>[] = [];
    for (let i = 0; i < concurrency; i++) {
      const path = requests[i % requests.length];
      batch.push(measureRequest(path));
    }
    const batchResults = await Promise.all(batch);
    results.push(...batchResults);
  }

  const latencies = results.map((r) => r.latencyMs).sort((a, b) => a - b);
  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);
  const totalDurationMs = Date.now() - startTime;

  return {
    scenario: name,
    totalRequests: results.length,
    successfulRequests: successful.length,
    failedRequests: failed.length,
    avgLatencyMs: latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0,
    p50LatencyMs: latencies[Math.floor(latencies.length * 0.5)] || 0,
    p95LatencyMs: latencies[Math.floor(latencies.length * 0.95)] || 0,
    p99LatencyMs: latencies[Math.floor(latencies.length * 0.99)] || 0,
    rps: Math.round((results.length / totalDurationMs) * 1000),
    errorRate: results.length > 0 ? Math.round((failed.length / results.length) * 100) : 0,
    durationMs: totalDurationMs,
  };
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║         FusionOS Load Testing — Phase 23                    ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`Target: ${BASE_URL}`);
  console.log(`Duration per scenario: 10s`);
  console.log('');

  const scenarios = [
    {
      name: 'Health Check Baseline',
      requests: ['/api/v1/health', '/api/v1/health/live', '/api/v1/health/ready'],
      concurrency: 10,
    },
    {
      name: 'API Read Endpoints (authenticated)',
      requests: [
        '/api/v1/health',
        '/api/v1/ai/runtime/status',
        '/api/v1/ai/runtime/config',
        '/api/v1/employees', // full stack: guards + tenant context + Prisma
      ],
      concurrency: 5,
    },
    {
      name: 'AI Runtime Status',
      requests: ['/api/v1/ai/runtime/status', '/api/v1/ai/runtime/config'],
      concurrency: 5,
    },
    {
      name: 'Health Checks Mixed',
      requests: ['/api/v1/health', '/api/v1/health/live', '/api/v1/health/ready'],
      concurrency: 20,
    },
  ];

  const results: LoadTestResult[] = [];

  for (const scenario of scenarios) {
    console.log(`Running: ${scenario.name} (concurrency: ${scenario.concurrency})`);
    const result = await runScenario(scenario.name, scenario.requests, scenario.concurrency, 10000);
    results.push(result);
    console.log(`  → ${result.totalRequests} requests, ${result.rps} RPS, avg ${result.avgLatencyMs}ms, p95 ${result.p95LatencyMs}ms, errors ${result.errorRate}%`);
  }

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    RESULTS SUMMARY                          ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('| Scenario | RPS | Avg (ms) | p50 (ms) | p95 (ms) | p99 (ms) | Errors |');
  console.log('|----------|-----|----------|----------|----------|----------|--------|');

  for (const r of results) {
    console.log(
      `| ${r.scenario.substring(0, 20).padEnd(20)} | ${String(r.rps).padStart(4)} | ${String(r.avgLatencyMs).padStart(8)} | ${String(r.p50LatencyMs).padStart(8)} | ${String(r.p95LatencyMs).padStart(8)} | ${String(r.p99LatencyMs).padStart(8)} | ${String(r.errorRate + '%').padStart(6)} |`,
    );
  }

  console.log('');

  // Write results as JSON (self-documenting: methodology + environment)
  const reportPath = 'load-testing/results.json';
  const fs = require('fs');
  const report = {
    results,
    timestamp: new Date().toISOString(),
    methodology: {
      tool: 'load-testing/load-test.ts (Node fetch, no external deps)',
      durationMsPerScenario: 10000,
      note: 'Baseline capacity test. The general rate limiter (RATE_LIMIT_MAX) should be raised for the run so the numbers measure service capacity, not throttling.',
    },
    environment: {
      node: process.version,
      platform: process.platform,
      baseUrl: BASE_URL,
      rateLimitMax: process.env.RATE_LIMIT_MAX ?? 'default (100/15min)',
      authenticated: AUTH_TOKEN ? 'yes' : 'no',
    },
  };
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`Results written to ${reportPath}`);
}

main().catch(console.error);
