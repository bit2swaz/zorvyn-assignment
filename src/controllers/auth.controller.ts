import type { Request, Response } from 'express';

import { authService } from '../services/auth.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import type { LoginInput, RegisterInput } from '../schemas/auth.schema';

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