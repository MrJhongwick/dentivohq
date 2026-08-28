type AuthError = { code?: string; status?: number; message?: string };

const safeMessages: Record<string, string> = {
  EMAIL_NOT_VERIFIED: "Verify your email address before signing in.",
  INVALID_EMAIL_OR_PASSWORD: "The email or password is incorrect.",
  USER_ALREADY_EXISTS: "An account with this email already exists.",
  INVALID_TOKEN: "This link is invalid or has expired. Request a new one.",
  TOKEN_EXPIRED: "This link has expired. Request a new one.",
  PASSWORD_TOO_SHORT: "Password must be at least 8 characters.",
  PASSWORD_TOO_LONG: "Password must be 128 characters or fewer."
};

export function getSafeAuthError(error: unknown) {
  if (typeof error !== "object" || error === null) return "We could not complete that request. Please try again.";
  const authError = error as AuthError;
  if (authError.code && safeMessages[authError.code]) return safeMessages[authError.code];
  if (authError.status === 429) return "Too many attempts. Wait a moment and try again.";
  return "We could not complete that request. Please try again.";
}
