import type { Request, Response } from 'express';

import { authService } from '../services/auth.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import type { LoginInput, RegisterInput } from '../schemas/auth.schema';

/**
 * @openapi
 * /api/v1/auth/register:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Register a viewer account
 *     description: Public endpoint that creates a new user with the default VIEWER role.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully.
 *       400:
 *         description: Invalid input or duplicate email.
 *       429:
 *         description: Too many requests.
 * /api/v1/auth/login:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Authenticate a user
 *     description: Public endpoint that validates credentials and returns a JWT.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful.
 *       401:
 *         description: Invalid credentials or inactive user.
 *       429:
 *         description: Too many requests.
 */

export const register = asyncHandler(async (request: Request, response: Response) => {
  const user = await authService.register(request.body as RegisterInput);

  sendSuccess(response, {
    statusCode: 201,
    message: 'Operation successful',
    data: user,
  });
});

export const login = asyncHandler(async (request: Request, response: Response) => {
  const result = await authService.login(request.body as LoginInput);

  sendSuccess(response, {
    message: 'Operation successful',
    data: result,
  });
});