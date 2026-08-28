import { useState, type FormEvent, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, ShieldCheck } from "lucide-react";
import { authEmailActionSchema, loginSchema, registerSchema, resetPasswordSchema } from "@dentivohq/validation";
import { Brand } from "@/components/brand";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel, FieldSeparator } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";
import { getSafeAuthError } from "@/lib/auth-errors";

export type AuthPath = "/login" | "/register" | "/verify-email" | "/forgot-password" | "/reset-password";
type Notice = { type: "error" | "success"; title: string; message: string };
type FieldErrors = Record<string, string[] | undefined>;

function validationErrors(error: { flatten: () => { fieldErrors: unknown } }): FieldErrors {
  return error.flatten().fieldErrors as FieldErrors;
}

function NoticeAlert({ notice }: { notice: Notice }) {
  const Icon = notice.type === "error" ? AlertCircle : CheckCircle2;
  return <Alert variant={notice.type === "error" ? "destructive" : "default"}><Icon /><AlertTitle>{notice.title}</AlertTitle><AlertDescription>{notice.message}</AlertDescription></Alert>;
}

function SubmitButton({ pending, children }: { pending: boolean; children: ReactNode }) {
  return <Button type="submit" className="w-full" size="lg" disabled={pending}>{pending ? <Spinner data-icon="inline-start" /> : null}{children}</Button>;
}

function EmailField({ errors, defaultValue, autoComplete = "email" }: { errors: FieldErrors; defaultValue?: string; autoComplete?: string }) {
  return <Field data-invalid={Boolean(errors.email)}><FieldLabel htmlFor="email">Email address</FieldLabel><Input id="email" name="email" type="email" autoComplete={autoComplete} defaultValue={defaultValue} aria-invalid={Boolean(errors.email)} required /><FieldError errors={errors.email?.map((message) => ({ message }))} /></Field>;
}

function PasswordField({ id = "password", label = "Password", autoComplete, errors }: { id?: string; label?: string; autoComplete: string; errors: FieldErrors }) {
  return <Field data-invalid={Boolean(errors[id])}><FieldLabel htmlFor={id}>{label}</FieldLabel><Input id={id} name={id} type="password" autoComplete={autoComplete} aria-invalid={Boolean(errors[id])} required /><FieldError errors={errors[id]?.map((message) => ({ message }))} /></Field>;
}

function GoogleButton({ pending, onClick }: { pending: boolean; onClick: () => void }) {
  return <Button type="button" variant="outline" size="lg" className="w-full" disabled={pending} onClick={onClick}>Continue with Google</Button>;
}

function LoginForm({ googleEnabled, initialError }: { googleEnabled: boolean; initialError?: string }) {
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [notice, setNotice] = useState<Notice | undefined>(initialError ? { type: "error", title: "Sign-in unavailable", message: initialError } : undefined);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = loginSchema.safeParse({ email: form.get("email"), password: form.get("password") });
    if (!parsed.success) { setErrors(validationErrors(parsed.error)); return; }
    setErrors({}); setNotice(undefined); setPending(true);
    try {
      const result = await authClient.signIn.email({ ...parsed.data, callbackURL: `${window.location.origin}/` });
      if (result.error) { setNotice({ type: "error", title: "Unable to sign in", message: getSafeAuthError(result.error) }); setPending(false); return; }
      window.location.assign("/");
    } catch { setNotice({ type: "error", title: "Unable to sign in", message: getSafeAuthError(undefined) }); setPending(false); }
  }

  async function signInWithGoogle() {
    setPending(true);
    try {
      const result = await authClient.signIn.social({ provider: "google", callbackURL: `${window.location.origin}/`, errorCallbackURL: `${window.location.origin}/login?error=social` });
      if (result?.error) { setNotice({ type: "error", title: "Unable to use Google", message: getSafeAuthError(result.error) }); setPending(false); }
    } catch { setNotice({ type: "error", title: "Unable to use Google", message: getSafeAuthError(undefined) }); setPending(false); }
  }

  return <AuthCard title="Welcome back" description="Sign in to manage your clinic and appointments." footer={<>New to DentivoHQ? <a className="font-medium text-primary underline-offset-4 hover:underline" href="/register">Create an account</a></>}>
    <form onSubmit={submit}><FieldGroup>{notice ? <NoticeAlert notice={notice} /> : null}<EmailField errors={errors} /><PasswordField autoComplete="current-password" errors={errors} /><div className="text-right"><a className="text-sm font-medium text-primary underline-offset-4 hover:underline" href="/forgot-password">Forgot password?</a></div><SubmitButton pending={pending}>Sign in</SubmitButton>{googleEnabled ? <><FieldSeparator>or</FieldSeparator><GoogleButton pending={pending} onClick={signInWithGoogle} /></> : null}</FieldGroup></form>
  </AuthCard>;
}

function RegisterForm({ googleEnabled }: { googleEnabled: boolean }) {
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [notice, setNotice] = useState<Notice>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = registerSchema.safeParse({ name: form.get("name"), email: form.get("email"), password: form.get("password"), confirmPassword: form.get("confirmPassword") });
    if (!parsed.success) { setErrors(validationErrors(parsed.error)); return; }
    setErrors({}); setNotice(undefined); setPending(true);
    try {
      const result = await authClient.signUp.email({ name: parsed.data.name, email: parsed.data.email, password: parsed.data.password, callbackURL: `${window.location.origin}/` });
      setPending(false);
      if (result.error) { setNotice({ type: "error", title: "Unable to create account", message: getSafeAuthError(result.error) }); return; }
      setNotice({ type: "success", title: "Check your inbox", message: "We sent a verification link to your email address." });
    } catch { setNotice({ type: "error", title: "Unable to create account", message: getSafeAuthError(undefined) }); setPending(false); }
  }

  async function signUpWithGoogle() {
    setPending(true);
    try {
      const result = await authClient.signIn.social({ provider: "google", callbackURL: `${window.location.origin}/`, errorCallbackURL: `${window.location.origin}/register?error=social` });
      if (result?.error) { setNotice({ type: "error", title: "Unable to use Google", message: getSafeAuthError(result.error) }); setPending(false); }
    } catch { setNotice({ type: "error", title: "Unable to use Google", message: getSafeAuthError(undefined) }); setPending(false); }
  }

  return <AuthCard title="Create your clinic account" description="Start with your account. You can set up the clinic next." footer={<>Already have an account? <a className="font-medium text-primary underline-offset-4 hover:underline" href="/login">Sign in</a></>}>
    <form onSubmit={submit}><FieldGroup>{notice ? <NoticeAlert notice={notice} /> : null}<Field data-invalid={Boolean(errors.name)}><FieldLabel htmlFor="name">Full name</FieldLabel><Input id="name" name="name" autoComplete="name" aria-invalid={Boolean(errors.name)} required /><FieldError errors={errors.name?.map((message) => ({ message }))} /></Field><EmailField errors={errors} /><PasswordField autoComplete="new-password" errors={errors} /><PasswordField id="confirmPassword" label="Confirm password" autoComplete="new-password" errors={errors} /><SubmitButton pending={pending}>Create account</SubmitButton>{googleEnabled ? <><FieldSeparator>or</FieldSeparator><GoogleButton pending={pending} onClick={signUpWithGoogle} /></> : null}</FieldGroup></form>
  </AuthCard>;
}

function EmailActionForm({ mode }: { mode: "verify" | "reset" }) {
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [notice, setNotice] = useState<Notice>();
  const email = new URLSearchParams(window.location.search).get("email") ?? "";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = authEmailActionSchema.safeParse({ email: new FormData(event.currentTarget).get("email") });
    if (!parsed.success) { setErrors(validationErrors(parsed.error)); return; }
    setErrors({}); setNotice(undefined); setPending(true);
    try {
      const result = mode === "verify"
        ? await authClient.sendVerificationEmail({ email: parsed.data.email, callbackURL: `${window.location.origin}/` })
        : await authClient.requestPasswordReset({ email: parsed.data.email, redirectTo: `${window.location.origin}/reset-password` });
      setPending(false);
      if (result.error) { setNotice({ type: "error", title: "Unable to send email", message: getSafeAuthError(result.error) }); return; }
      setNotice({ type: "success", title: "Check your inbox", message: mode === "verify" ? "We sent a new verification link if the address is eligible." : "We sent password reset instructions if an account exists for that address." });
    } catch { setNotice({ type: "error", title: "Unable to send email", message: getSafeAuthError(undefined) }); setPending(false); }
  }

  const isVerify = mode === "verify";
  return <AuthCard title={isVerify ? "Verify your email" : "Reset your password"} description={isVerify ? "Enter your email to receive a fresh verification link." : "Enter your email and we will send secure reset instructions."} footer={<a className="font-medium text-primary underline-offset-4 hover:underline" href="/login">Back to sign in</a>}>
    <form onSubmit={submit}><FieldGroup>{notice ? <NoticeAlert notice={notice} /> : null}<EmailField errors={errors} defaultValue={email} /><SubmitButton pending={pending}>{isVerify ? "Send verification link" : "Send reset link"}</SubmitButton></FieldGroup></form>
  </AuthCard>;
}

function ResetPasswordForm() {
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [notice, setNotice] = useState<Notice>();
  const token = new URLSearchParams(window.location.search).get("token");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) { setNotice({ type: "error", title: "Invalid reset link", message: "Request a new password reset link and try again." }); return; }
    const form = new FormData(event.currentTarget);
    const parsed = resetPasswordSchema.safeParse({ password: form.get("password"), confirmPassword: form.get("confirmPassword") });
    if (!parsed.success) { setErrors(validationErrors(parsed.error)); return; }
    setErrors({}); setPending(true);
    try {
      const result = await authClient.resetPassword({ newPassword: parsed.data.password, token });
      setPending(false);
      if (result.error) { setNotice({ type: "error", title: "Unable to reset password", message: getSafeAuthError(result.error) }); return; }
      setNotice({ type: "success", title: "Password updated", message: "You can now sign in with your new password." });
    } catch { setNotice({ type: "error", title: "Unable to reset password", message: getSafeAuthError(undefined) }); setPending(false); }
  }

  return <AuthCard title="Choose a new password" description="Use at least 8 characters and keep it unique to DentivoHQ." footer={<a className="font-medium text-primary underline-offset-4 hover:underline" href="/login">Back to sign in</a>}>
    <form onSubmit={submit}><FieldGroup>{notice ? <NoticeAlert notice={notice} /> : null}<PasswordField autoComplete="new-password" errors={errors} /><PasswordField id="confirmPassword" label="Confirm new password" autoComplete="new-password" errors={errors} /><SubmitButton pending={pending}>Update password</SubmitButton></FieldGroup></form>
  </AuthCard>;
}

function AuthCard({ title, description, children, footer }: { title: string; description: string; children: ReactNode; footer: ReactNode }) {
  return <Card className="w-full max-w-md shadow-xl shadow-foreground/5"><CardHeader><CardTitle className="text-xl">{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader><CardContent>{children}</CardContent><CardFooter className="justify-center text-sm text-muted-foreground">{footer}</CardFooter></Card>;
}

export function AuthPage({ path, googleEnabled, initialError }: { path: AuthPath; googleEnabled: boolean; initialError?: string }) {
  let content: ReactNode;
  if (path === "/register") content = <RegisterForm googleEnabled={googleEnabled} />;
  else if (path === "/verify-email") content = <EmailActionForm mode="verify" />;
  else if (path === "/forgot-password") content = <EmailActionForm mode="reset" />;
  else if (path === "/reset-password") content = <ResetPasswordForm />;
  else content = <LoginForm googleEnabled={googleEnabled} initialError={initialError} />;

  return <main className="grid min-h-svh bg-muted/40 lg:grid-cols-[minmax(360px,0.8fr)_1.2fr]"><section className="hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex"><Brand /><div className="max-w-lg"><ShieldCheck className="mb-6 size-10" aria-hidden="true" /><h1 className="text-4xl font-semibold tracking-tight">Your clinic day, organized.</h1><p className="mt-4 text-lg text-primary-foreground/80">Securely manage appointments, staff, and patients from one calm workspace.</p></div><p className="text-sm text-primary-foreground/70">DentivoHQ clinic dashboard</p></section><section className="flex flex-col"><div className="p-6 lg:hidden"><Brand /></div><div className="flex flex-1 items-center justify-center p-6 md:p-10">{content}</div></section></main>;
}
