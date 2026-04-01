import type { Request, Response } from 'express';

import { dashboardService } from '../services/dashboard.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';

/**
 * @openapi
 * /api/v1/dashboard/summary:
 *   get:
 *     tags:
 *       - Dashboard
 *     summary: Get the aggregated dashboard summary
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard summary returned successfully.
 *       401:
 *         description: Unauthenticated or inactive user.
 *       403:
 *         description: Forbidden.
 */

export const getDashboardSummary = asyncHandler(async (_request: Request, response: Response) => {
  const summary = await dashboardService.getSummary();

  sendSuccess(response, {
    message: 'Operation successful',
    data: summary,
  });
});