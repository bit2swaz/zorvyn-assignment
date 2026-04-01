import { Router } from 'express';

import { login, register } from '../controllers/auth.controller';
import { validateResource } from '../middlewares/validateResource';
import { loginSchema, registerSchema } from '../schemas/auth.schema';

const authRoutes = Router();

authRoutes.post('/register', validateResource(registerSchema), register);
authRoutes.post('/login', validateResource(loginSchema), login);

export { authRoutes };