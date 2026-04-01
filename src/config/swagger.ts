import swaggerJsdoc from 'swagger-jsdoc';

const resolvedServerUrl = `http://localhost:${process.env.PORT ?? '3000'}`;

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
        description: 'Local development server',
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