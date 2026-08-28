import type { ButtonHTMLAttributes, ReactNode } from "react";

export function Brand() { return <div className="dhq-brand"><span className="dhq-brand-mark" aria-hidden="true">D</span><span>DentivoHQ</span></div>; }
export function Button({ variant = "default", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "outline" }) { return <button className={`dhq-button dhq-button-${variant}`} {...props}/>; }
export function Status({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "warning" }) { return <span className={`dhq-status dhq-status-${tone}`}>{children}</span>; }
