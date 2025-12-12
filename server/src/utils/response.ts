import { Response } from 'express';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: Record<string, string>;
}

export const successResponse = <T>(res: Response, data: T, status = 200) => {
  return res.status(status).json({
    success: true,
    data,
  } as ApiResponse<T>);
};

export const errorResponse = (
  res: Response,
  error: string,
  status = 400,
  details?: Record<string, string>
) => {
  return res.status(status).json({
    success: false,
    error,
    ...(details && { details }),
  } as ApiResponse);
};

export const validationErrorResponse = (
  res: Response,
  details: Record<string, string>
) => {
  return res.status(400).json({
    success: false,
    error: 'Validation failed',
    details,
  } as ApiResponse);
};
