import swaggerJsdoc from 'swagger-jsdoc';

const publicApiBaseUrl = process.env.PUBLIC_API_BASE_URL?.trim();

const resolvedServerUrl = (
  publicApiBaseUrl && publicApiBaseUrl.length > 0
    ? publicApiBaseUrl
    : `http://localhost:${process.env.PORT ?? '3000'}`
).replace(/\/$/, '');

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
        description: publicApiBaseUrl
          ? 'Configured public API server'
          : 'Local development server',
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