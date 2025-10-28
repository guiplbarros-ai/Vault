/**
 * Custom Error Classes
 * Agent CORE: Implementador
 *
 * Structured error handling for better error management and user feedback
 */

/**
 * Base application error class
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }

    this.name = this.constructor.name;
  }
}

/**
 * Error thrown when a requested resource is not found
 */
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id
      ? `${resource} com ID '${id}' não encontrado`
      : `${resource} não encontrado`;
    super(message, 404);
  }
}

/**
 * Error thrown when validation fails
 */
export class ValidationError extends AppError {
  public readonly errors: string[];

  constructor(message: string, errors?: string[]) {
    super(message, 400);
    this.errors = errors || [message];
  }
}

/**
 * Error thrown when a database operation fails
 */
export class DatabaseError extends AppError {
  public readonly originalError?: Error;

  constructor(message: string, originalError?: Error) {
    super(message, 500);
    this.originalError = originalError;
  }
}

/**
 * Error thrown when a business rule is violated
 */
export class BusinessRuleError extends AppError {
  constructor(message: string) {
    super(message, 422);
  }
}

/**
 * Error thrown when a duplicate entry is detected
 */
export class DuplicateError extends AppError {
  public readonly field?: string;

  constructor(resource: string, field?: string) {
    const message = field
      ? `${resource} duplicado: ${field} já existe`
      : `${resource} duplicado`;
    super(message, 409);
    this.field = field;
  }
}

/**
 * Error thrown when an operation is forbidden
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Operação não permitida') {
    super(message, 403);
  }
}

/**
 * Error thrown when authentication fails
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Não autorizado') {
    super(message, 401);
  }
}

/**
 * Error thrown when a conflict occurs (e.g., concurrent modification)
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}

/**
 * Helper function to check if an error is an operational error
 */
export function isOperationalError(error: Error): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Helper function to extract error message
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Erro desconhecido';
}

/**
 * Helper function to format error for logging
 */
export function formatErrorForLog(error: unknown): {
  message: string;
  stack?: string;
  statusCode?: number;
  isOperational?: boolean;
  errors?: string[];
} {
  if (error instanceof AppError) {
    return {
      message: error.message,
      stack: error.stack,
      statusCode: error.statusCode,
      isOperational: error.isOperational,
      errors: error instanceof ValidationError ? error.errors : undefined,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    message: getErrorMessage(error),
  };
}
