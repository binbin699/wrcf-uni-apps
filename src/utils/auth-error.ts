interface AuthErrorLike {
  code?: number;
  statusCode?: number;
}

function isAuthErrorLike(error: unknown): error is AuthErrorLike {
  return !!error && typeof error === 'object';
}

export function isAuthFailureError(error: unknown): boolean {
  if (!isAuthErrorLike(error)) {
    return false;
  }

  return (
    error.code === 401 ||
    error.code === 403 ||
    error.code === 1001 ||
    error.code === 2002 ||
    error.code === 2003 ||
    error.statusCode === 401 ||
    error.statusCode === 403
  );
}
