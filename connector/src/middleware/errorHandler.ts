// ============================================================
// ERROR HANDLER — Middleware global de tratamento de erros
// ============================================================

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error(`[Error] ${req.method} ${req.path}:`, err);
  res.status(500).json({
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
}
