import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, LogOut, Plus } from "lucide-react";
import { AppointmentDetail } from "@/components/appointment-detail";
import { AppointmentTable } from "@/components/appointment-table";
import { AppShell } from "@/components/app-shell";
import { appointments, type Appointment } from "@/data";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function DashboardHome() {
  const [dentist, setDentist] = useState("all");
  const [selected, setSelected] = useState<Appointment>(appointments[1]!);
  const [signingOut, setSigningOut] = useState(false);
  const filtered = useMemo(() => dentist === "all" ? appointments : appointments.filter((item) => item.dentist === dentist), [dentist]);

  function selectDentist(value: string | null) {
    const nextDentist = value ?? "all";
    setDentist(nextDentist);
    const firstMatch = appointments.find((item) => nextDentist === "all" || item.dentist === nextDentist);
    if (firstMatch) setSelected(firstMatch);
  }

  async function logOut() {
    setSigningOut(true);
    try {
      const result = await authClient.signOut();
      if (!result.error) window.location.assign("/login");
    } finally { setSigningOut(false); }
  }

  return (
    <AppShell onLogOut={logOut} loggingOut={signingOut}>
      <header className="flex h-16 items-center justify-between border-b px-5 md:px-8">
        <div className="text-sm font-medium">Bright Smiles Clinic</div>
        <div className="flex items-center gap-2"><Button className="md:hidden" variant="ghost" size="icon" aria-label="Log out" disabled={signingOut} onClick={logOut}><LogOut /></Button><div className="flex size-8 items-center justify-center rounded-full bg-accent text-xs font-semibold">AC</div></div>
      </header>
      <div className="p-5 md:p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div><h1 className="text-2xl font-semibold tracking-tight">Appointments</h1><p className="mt-1 text-sm text-muted-foreground">Manage your clinic schedule and patient visits.</p></div>
          <Button><Plus data-icon="inline-start" />New appointment</Button>
        </div>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2"><Button variant="outline" size="icon" aria-label="Previous day"><ChevronLeft /></Button><Button variant="outline" className="min-w-56"><CalendarDays data-icon="inline-start" />Thursday, May 15, 2025</Button><Button variant="outline" size="icon" aria-label="Next day"><ChevronRight /></Button></div>
          <div className="flex gap-2"><Select defaultValue="Bright Smiles Clinic"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="Bright Smiles Clinic">Bright Smiles Clinic</SelectItem></SelectGroup></SelectContent></Select><Select value={dentist} onValueChange={selectDentist}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">All dentists</SelectItem><SelectItem value="Dr. Sarah Lee">Dr. Sarah Lee</SelectItem><SelectItem value="Dr. Michael Chen">Dr. Michael Chen</SelectItem></SelectGroup></SelectContent></Select></div>
        </div>
        <div className="grid overflow-hidden rounded-xl border lg:grid-cols-[minmax(0,1fr)_320px]"><AppointmentTable rows={filtered} selectedId={selected.id} onSelect={setSelected} /><AppointmentDetail appointment={selected} /></div>
      </div>
    </AppShell>
  );
}
