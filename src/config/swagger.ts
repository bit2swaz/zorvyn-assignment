import swaggerJsdoc from 'swagger-jsdoc';

import { env } from './env';

const resolvedServerUrl = (env.PUBLIC_API_BASE_URL ?? `http://localhost:${env.PORT}`).replace(/\/$/, '');

const swaggerSpec = swaggerJsdoc({
  failOnErrors: true,
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Zorvyn Finance Backend API',
      version: '1.0.0',
      description: 'Finance data processing and access control backend for the Zorvyn intern assignment.',
    },
    servers: [
      {
        url: resolvedServerUrl,
        description: env.PUBLIC_API_BASE_URL ? 'Configured public API server' : 'Local development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/controllers/*.ts'],
});

export { swaggerSpec };