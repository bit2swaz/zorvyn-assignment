import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { errorHandler } from './middlewares/errorHandler';
import { authRoutes } from './routes/auth.routes';
import { dashboardRoutes } from './routes/dashboard.routes';
import { recordsRoutes } from './routes/records.routes';
import { usersRoutes } from './routes/users.routes';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/records', recordsRoutes);
app.use('/api/v1/users', usersRoutes);

app.get('/api/v1/health', (_request, response) => {
  response.status(200).json({
    message: 'Finance backend is running.',
  });
});

app.use(errorHandler);

export { app };
