import type { ReactNode } from "react";
import { CalendarDays, CircleHelp, LayoutDashboard, LogOut, Settings, Stethoscope, Users, UserRound, Wrench } from "lucide-react";
import { Brand } from "./brand";

const nav = [
  [LayoutDashboard, "Overview"], [CalendarDays, "Appointments"], [Users, "Patients"], [Stethoscope, "Dentists"], [Wrench, "Services"], [UserRound, "Team"], [Settings, "Settings"]
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  return <div className="grid min-h-svh grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)]">
    <aside className="hidden border-r bg-sidebar p-5 md:flex md:flex-col">
      <Brand />
      <nav className="mt-10 flex flex-col gap-1" aria-label="Clinic navigation">
        {nav.map(([Icon, label]) => <button key={label} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm ${label === "Appointments" ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}><Icon aria-hidden="true" />{label}</button>)}
      </nav>
      <div className="mt-auto flex flex-col gap-1"><button className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted"><CircleHelp aria-hidden="true" />Help</button><button className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted"><LogOut aria-hidden="true" />Log out</button></div>
    </aside>
    <main className="min-w-0">{children}</main>
  </div>;
}
