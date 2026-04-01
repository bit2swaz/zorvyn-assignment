import type { Request, Response } from 'express';

import { dashboardService } from '../services/dashboard.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';

export const getDashboardSummary = asyncHandler(async (_request: Request, response: Response) => {
  const summary = await dashboardService.getSummary();

  sendSuccess(response, {
    message: 'Operation successful',
    data: summary,
  });
});