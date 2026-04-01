import { rateLimit } from 'express-rate-limit';

import { sendError } from '../utils/response';

const createRateLimitHandler = (message: string) => {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_request, response, _next, options) => {
      sendError(response, {
        statusCode: options.statusCode,
        message,
      });
    },
  });
};

export const globalRateLimiter = createRateLimitHandler('Too many requests');

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_request, response, _next, options) => {
    sendError(response, {
      statusCode: options.statusCode,
      message: 'Too many requests',
    });
  },
});