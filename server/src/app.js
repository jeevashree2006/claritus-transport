/**
 * Express app: global middleware + route registration.
 * To add a module: create src/modules/<name>/<name>.routes.js and register it below.
 */
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env, isProduction } from './config/env.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import auditLogRoutes from './modules/audit-logs/audit-logs.routes.js';
import authRoutes from './modules/auth/auth.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';
import healthRoutes from './modules/health/health.routes.js';
import requirementRoutes from './modules/requirements/requirements.routes.js';
import settingsRoutes from './modules/settings/settings.routes.js';
import successRateRoutes from './modules/success-rate/success-rate.routes.js';
import transporterRoutes from './modules/transporters/transporters.routes.js';

const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: env.clientUrl }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan(isProduction ? 'combined' : 'dev'));

// ---- Routes ---------------------------------------------------------------
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/requirements', requirementRoutes);
app.use('/api/transporters', transporterRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/success-rate', successRateRoutes);
app.use('/api/dashboard', dashboardRoutes);

// ---- Errors (keep last) ---------------------------------------------------
app.use(notFound);
app.use(errorHandler);

export default app;
