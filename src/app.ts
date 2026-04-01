import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';

import { swaggerSpec } from './config/swagger';
import { errorHandler } from './middlewares/errorHandler';
import { authRateLimiter, globalRateLimiter } from './middlewares/rateLimit';
import { authRoutes } from './routes/auth.routes';
import { dashboardRoutes } from './routes/dashboard.routes';
import { recordsRoutes } from './routes/records.routes';
import { usersRoutes } from './routes/users.routes';
import { sendSuccess } from './utils/response';

const app = express();

const swaggerDocsRedirectHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="refresh" content="0; url=/api/v1/api-docs/" />
    <title>Redirecting to API Docs</title>
  </head>
  <body>
    <p>Redirecting to <a href="/api/v1/api-docs/">/api/v1/api-docs/</a>...</p>
  </body>
</html>`;

app.use(globalRateLimiter);
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/v1/auth', authRateLimiter, authRoutes);
app.get('/api/v1/openapi.json', (_request, response) => {
  response.status(200).json(swaggerSpec);
});
app.get(/^\/api\/v1\/api-docs$/, (_request, response) => {
  response.status(200).type('html').send(swaggerDocsRedirectHtml);
});
app.use('/api/v1/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/records', recordsRoutes);
app.use('/api/v1/users', usersRoutes);

app.get('/api/v1/health', (_request, response) => {
  sendSuccess(response, {
    message: 'Finance backend is running.',
    data: {
      status: 'ok',
    },
  });
});

app.use(errorHandler);

export { app };
