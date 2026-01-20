import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  version: string;
  checks: {
    database: {
      status: 'up' | 'down';
      responseTime?: number;
      error?: string;
    };
    memory: {
      status: 'ok' | 'warning' | 'critical';
      used: number;
      total: number;
      percentage: number;
    };
  };
}

export async function GET(): Promise<NextResponse<HealthStatus>> {
  const startTime = Date.now();
  const checks: HealthStatus['checks'] = {
    database: { status: 'down' },
    memory: { status: 'ok', used: 0, total: 0, percentage: 0 },
  };

  // Check database connectivity
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    checks.database = {
      status: 'up',
      responseTime: Date.now() - dbStart,
    };
  } catch (error) {
    checks.database = {
      status: 'down',
      error: error instanceof Error ? error.message : 'Unknown database error',
    };
  }

  // Check memory usage
  const memUsage = process.memoryUsage();
  const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
  const heapPercentage = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);

  checks.memory = {
    status: heapPercentage > 90 ? 'critical' : heapPercentage > 75 ? 'warning' : 'ok',
    used: heapUsedMB,
    total: heapTotalMB,
    percentage: heapPercentage,
  };

  // Determine overall health
  const isHealthy = checks.database.status === 'up' && checks.memory.status !== 'critical';

  const healthStatus: HealthStatus = {
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.1.0',
    checks,
  };

  return NextResponse.json(healthStatus, {
    status: isHealthy ? 200 : 503,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}
