import { FeedbackErrorCode } from "@/types/feedback";

export class AppError extends Error {
  readonly code: FeedbackErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: FeedbackErrorCode, message: string, status: number, details?: unknown) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export const isAppError = (error: unknown): error is AppError => error instanceof AppError;
