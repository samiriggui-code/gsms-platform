import { Hono } from 'hono';
import { findAccessibleProject } from '../lib/projectAccess.js';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, getUser } from '../middleware/auth.js';

interface Anomaly {
  type: 'deviation_spike' | 'complaint_spike' | 'supplier_degradation';
  severity: 'warning' | 'critical';
  title: string;
  description: string;
  entityType?: string;
  entityId?: string;
  value: number;
  threshold: number;
  detectedAt: string;
}

const analytics = new Hono();
analytics.use('*', authMiddleware);

// ── Helper: simple statistics ───────────────────────────────────────────────

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function rollingAverage(values: number[], window: number): number {
  if (values.length === 0) return 0;
  const slice = values.slice(-window);
  return mean(slice);
}

async function ensureAccessibleProject(projectId: string, orgId: string | null) {
  return findAccessibleProject(projectId, orgId);
}

// ── GET /:projectId/anomalies — run ALL anomaly checks ─────────────────────

analytics.get('/:projectId/anomalies', async (c) => {
  try {
    const user = getUser(c);
    const { projectId } = c.req.param();
    const project = await ensureAccessibleProject(projectId, user.orgId);
    if (!project) {
      return c.json({ message: 'Project not found' }, 404);
    }
    const allAnomalies: Anomaly[] = [];

    // Run all checks in parallel
    const [deviations, complaints, suppliers] = await Promise.all([
      runDeviationAnomalies(projectId),
      runComplaintSpikes(projectId),
      runSupplierAnomalies(user.orgId),
    ]);

    allAnomalies.push(...deviations, ...complaints, ...suppliers);

    // Sort: critical first, then by date desc
    allAnomalies.sort((a, b) => {
      if (a.severity !== b.severity) return a.severity === 'critical' ? -1 : 1;
      return new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime();
    });

    return c.json({ anomalies: allAnomalies });
  } catch (error: any) {
    console.error('Anomalies error:', error);
    return c.json({ message: 'Failed to compute anomalies' }, 500);
  }
});

// ── GET /:projectId/deviation-anomalies ─────────────────────────────────────

analytics.get('/:projectId/deviation-anomalies', async (c) => {
  try {
    const user = getUser(c);
    const { projectId } = c.req.param();
    const project = await ensureAccessibleProject(projectId, user.orgId);
    if (!project) {
      return c.json({ message: 'Project not found' }, 404);
    }
    const anomalies = await runDeviationAnomalies(projectId);
    return c.json({ anomalies });
  } catch (error: any) {
    console.error('Deviation anomalies error:', error);
    return c.json({ message: 'Failed to compute deviation anomalies' }, 500);
  }
});

async function runDeviationAnomalies(projectId: string): Promise<Anomaly[]> {
  const anomalies: Anomaly[] = [];
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const deviations = await prisma.deviation.findMany({
    where: { projectId, detectedAt: { gte: twelveMonthsAgo } },
    select: { area: true, detectedAt: true },
  });

  // Group by area + month
  const areaMonthCounts: Record<string, Record<string, number>> = {};
  for (const dev of deviations) {
    const area = dev.area || 'Unknown';
    const monthKey = `${dev.detectedAt.getFullYear()}-${String(dev.detectedAt.getMonth() + 1).padStart(2, '0')}`;
    if (!areaMonthCounts[area]) areaMonthCounts[area] = {};
    areaMonthCounts[area][monthKey] = (areaMonthCounts[area][monthKey] || 0) + 1;
  }

  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  for (const [area, months] of Object.entries(areaMonthCounts)) {
    const counts = Object.values(months);
    const currentCount = months[currentMonthKey] || 0;
    const m = mean(counts);
    const sd = stddev(counts);
    const threshold = m + 2 * sd;

    if (currentCount > threshold && sd > 0) {
      anomalies.push({
        type: 'deviation_spike',
        severity: currentCount > m + 3 * sd ? 'critical' : 'warning',
        title: `Deviation spike in "${area}"`,
        description: `${currentCount} deviations this month, exceeding the expected range (mean: ${m.toFixed(1)}, threshold: ${threshold.toFixed(1)}).`,
        entityType: 'deviation_area',
        entityId: area,
        value: currentCount,
        threshold: Math.round(threshold * 10) / 10,
        detectedAt: new Date().toISOString(),
      });
    }
  }

  return anomalies;
}

// ── GET /:projectId/complaint-spikes ────────────────────────────────────────

analytics.get('/:projectId/complaint-spikes', async (c) => {
  try {
    const user = getUser(c);
    const { projectId } = c.req.param();
    const project = await ensureAccessibleProject(projectId, user.orgId);
    if (!project) {
      return c.json({ message: 'Project not found' }, 404);
    }
    const anomalies = await runComplaintSpikes(projectId);
    return c.json({ anomalies });
  } catch (error: any) {
    console.error('Complaint spikes error:', error);
    return c.json({ message: 'Failed to compute complaint spikes' }, 500);
  }
});

async function runComplaintSpikes(projectId: string): Promise<Anomaly[]> {
  const anomalies: Anomaly[] = [];
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const complaints = await prisma.complaint.findMany({
    where: { projectId, reportDate: { gte: sixMonthsAgo } },
    select: { productName: true, reportDate: true },
  });

  // Group by product + month
  const productMonths: Record<string, Record<string, number>> = {};
  for (const c of complaints) {
    const product = c.productName;
    const monthKey = `${c.reportDate.getFullYear()}-${String(c.reportDate.getMonth() + 1).padStart(2, '0')}`;
    if (!productMonths[product]) productMonths[product] = {};
    productMonths[product][monthKey] = (productMonths[product][monthKey] || 0) + 1;
  }

  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  for (const [product, months] of Object.entries(productMonths)) {
    const sortedKeys = Object.keys(months).sort();
    const currentIdx = sortedKeys.indexOf(currentMonthKey);
    if (currentIdx < 1) continue; // Need at least one prior month

    const currentCount = months[currentMonthKey] || 0;

    // 3-month rolling average (prior months only)
    const priorMonths = sortedKeys.slice(Math.max(0, currentIdx - 3), currentIdx);
    const priorCounts = priorMonths.map((k) => months[k] || 0);
    const avg = mean(priorCounts);
    const threshold = avg * 2;

    if (currentCount > threshold && avg > 0) {
      anomalies.push({
        type: 'complaint_spike',
        severity: currentCount > avg * 3 ? 'critical' : 'warning',
        title: `Complaint spike: ${product}`,
        description: `${currentCount} complaints this month for "${product}", exceeding 2x the rolling average (${avg.toFixed(1)}).`,
        entityType: 'complaint_product',
        entityId: product,
        value: currentCount,
        threshold: Math.round(threshold * 10) / 10,
        detectedAt: new Date().toISOString(),
      });
    }
  }

  return anomalies;
}

// ── GET /:projectId/supplier-anomalies ──────────────────────────────────────

analytics.get('/:projectId/supplier-anomalies', async (c) => {
  try {
    const user = getUser(c);
    const { projectId } = c.req.param();
    const project = await ensureAccessibleProject(projectId, user.orgId);
    if (!project) {
      return c.json({ message: 'Project not found' }, 404);
    }
    const anomalies = await runSupplierAnomalies(user.orgId);
    return c.json({ anomalies });
  } catch (error: any) {
    console.error('Supplier anomalies error:', error);
    return c.json({ message: 'Failed to compute supplier anomalies' }, 500);
  }
});

async function runSupplierAnomalies(orgId: string | null): Promise<Anomaly[]> {
  const anomalies: Anomaly[] = [];
  if (!orgId) {
    return anomalies;
  }
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const suppliers = await prisma.supplier.findMany({
    where: { orgId },
    include: {
      audits: {
        where: { status: 'completed', auditDate: { gte: twelveMonthsAgo } },
        orderBy: { auditDate: 'asc' },
      },
    },
  });

  for (const supplier of suppliers) {
    const scores = supplier.audits
      .filter((a) => a.score !== null)
      .map((a) => a.score as number);

    if (scores.length < 3) continue;

    const overallAvg = mean(scores);
    const recentAvg = rollingAverage(scores, 3);

    if (overallAvg - recentAvg > 15) {
      anomalies.push({
        type: 'supplier_degradation',
        severity: overallAvg - recentAvg > 25 ? 'critical' : 'warning',
        title: `Supplier degradation: ${supplier.name}`,
        description: `Recent 3-audit average (${recentAvg.toFixed(1)}) is ${(overallAvg - recentAvg).toFixed(1)} points below 12-month average (${overallAvg.toFixed(1)}).`,
        entityType: 'supplier',
        entityId: supplier.id,
        value: Math.round(recentAvg * 10) / 10,
        threshold: Math.round((overallAvg - 15) * 10) / 10,
        detectedAt: new Date().toISOString(),
      });
    }
  }

  return anomalies;
}

export default analytics;
