import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import requirementRoutes from './routes/requirements.js';
import testRoutes from './routes/tests.js';
import capaRoutes from './routes/capa.js';
import riskRoutes from './routes/risks.js';
import auditRoutes from './routes/audit.js';
import userRoutes from './routes/users.js';
import evidenceRoutes from './routes/evidence.js';
import approvalRoutes from './routes/approvals.js';
import signatureRoutes from './routes/signatures.js';
import exportRoutes from './routes/export.js';
import importRoutes from './routes/import.js';
import aiRoutes from './routes/ai.js';
import auditModeRoutes from './routes/auditmode.js';
import dashboardRoutes from './routes/dashboard.js';
import statusRoutes from './routes/status.js';
import ssoRoutes from './routes/sso.js';
import webhookRoutes from './routes/webhooks.js';
import jiraRoutes from './routes/integrations/jira.js';
import githubRoutes from './routes/integrations/github.js';
import complaintRoutes from './routes/complaints.js';
import supplierRoutes from './routes/suppliers.js';
import trainingRoutes from './routes/training.js';
import documentRoutes from './routes/documents.js';
import systemRoutes from './routes/systems.js';
import impactRoutes from './routes/impact.js';
import auditRecordRoutes from './routes/auditrecords.js';
import workflowRoutes from './routes/workflows.js';
import changeControlRoutes from './routes/changecontrol.js';
import deviationRoutes from './routes/deviations.js';
import notificationRoutes from './routes/notifications.js';
import commentRoutes from './routes/comments.js';
import taskRoutes from './routes/tasks.js';
import kpiRoutes from './routes/kpi.js';
import supplierPortalRoutes from './routes/supplierportal.js';
import analyticsRoutes from './routes/analytics.js';
import formRoutes from './routes/forms.js';
import realtimeRoutes from './routes/realtime.js';
import presenceRoutes from './routes/presence.js';
import predictiveRoutes from './routes/predictive.js';
import sapRoutes from './routes/integrations/sap.js';
import limsRoutes from './routes/integrations/lims.js';
import scheduledReportRoutes from './routes/scheduled-reports.js';
import searchRoutes from './routes/search.js';
import quizRoutes from './routes/quizzes.js';
import findingsRoutes from './routes/findings.js';
import catalogsRoutes from './routes/catalogs.js';
import * as fs from 'fs';
import * as path from 'path';

export function createApp() {
  const app = new Hono();

  app.use('*', cors({
    origin: [
      'http://localhost:5174',
      'http://localhost:5173',
      'http://127.0.0.1:5174',
      'http://127.0.0.1:5173',
    ],
    credentials: true,
  }));

  app.route('/api/auth', authRoutes);
  app.route('/api/projects', projectRoutes);
  app.route('/api/requirements', requirementRoutes);
  app.route('/api/tests', testRoutes);
  app.route('/api/capa', capaRoutes);
  app.route('/api/risks', riskRoutes);
  app.route('/api/audit', auditRoutes);
  app.route('/api/users', userRoutes);
  app.route('/api/evidence', evidenceRoutes);
  app.route('/api/approvals', approvalRoutes);
  app.route('/api/signatures', signatureRoutes);
  app.route('/api/export', exportRoutes);
  app.route('/api/import', importRoutes);
  app.route('/api/ai', aiRoutes);
  app.route('/api/audit-mode', auditModeRoutes);
  app.route('/api/dashboard', dashboardRoutes);
  app.route('/api/status', statusRoutes);
  app.route('/api/auth/sso', ssoRoutes);
  app.route('/api/webhooks', webhookRoutes);
  app.route('/api/integrations/jira', jiraRoutes);
  app.route('/api/integrations/github', githubRoutes);
  app.route('/api/complaints', complaintRoutes);
  app.route('/api/suppliers', supplierRoutes);
  app.route('/api/training', trainingRoutes);
  app.route('/api/documents', documentRoutes);
  app.route('/api/systems', systemRoutes);
  app.route('/api/impact', impactRoutes);
  app.route('/api/audit-records', auditRecordRoutes);
  app.route('/api/workflows', workflowRoutes);
  app.route('/api/change-control', changeControlRoutes);
  app.route('/api/deviations', deviationRoutes);
  app.route('/api/notifications', notificationRoutes);
  app.route('/api/comments', commentRoutes);
  app.route('/api/tasks', taskRoutes);
  app.route('/api/kpi', kpiRoutes);
  app.route('/api/supplier-portal', supplierPortalRoutes);
  app.route('/api/analytics', analyticsRoutes);
  app.route('/api/forms', formRoutes);
  app.route('/api/realtime', realtimeRoutes);
  app.route('/api/presence', presenceRoutes);
  app.route('/api/predictive', predictiveRoutes);
  app.route('/api/integrations/sap', sapRoutes);
  app.route('/api/integrations/lims', limsRoutes);
  app.route('/api/scheduled-reports', scheduledReportRoutes);
  app.route('/api/search', searchRoutes);
  app.route('/api/quizzes', quizRoutes);
  app.route('/api/findings', findingsRoutes);
  app.route('/api/catalogs', catalogsRoutes);

  app.get('/api/health', (c) => c.json({ status: 'ok', version: '5.0.0' }));

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use('/*', serveStatic({ root: './dist' }));
      app.get('*', (c) => {
        const indexPath = path.join(distPath, 'index.html');
        if (fs.existsSync(indexPath)) {
          const html = fs.readFileSync(indexPath, 'utf-8');
          return c.html(html);
        }
        return c.notFound();
      });
    }
  }

  return app;
}

export const app = createApp();
