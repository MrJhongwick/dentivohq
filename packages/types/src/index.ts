export type ApiSuccess<T> = { data: T };
export type ApiList<T> = { data: T[]; meta: { page: number; pageSize: number; total: number } };
export type ApiError = { error: { code: string; message: string } };

export type AppBindings = {
  DATABASE_URL: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM: string;
  LANDING_URL: string;
  DASHBOARD_URL: string;
  CONSOLE_URL: string;
  BOOKING_VERIFICATION_SECRET: string;
};

export type AuthUser = { id: string; email: string; name: string; platformAdmin: boolean };
export type RequestVariables = { user: AuthUser; clinicId: string; membershipRole: string };
