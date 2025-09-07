import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logMessage = `${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms - ${req.ip}`;

    if (res.statusCode >= 400) {
      logger.error(logMessage);
    } else {
      logger.http(logMessage);
    }
  });

  next();
};