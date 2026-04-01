import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { errorHandler } from './middlewares/errorHandler';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/v1/health', (_request, response) => {
  response.status(200).json({
    message: 'Finance backend is running.',
  });
});

app.use(errorHandler);

export { app };
