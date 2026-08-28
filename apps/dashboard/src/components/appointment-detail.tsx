import { CalendarDays, Clock, Mail, MapPin, Phone, Stethoscope, UserRound } from "lucide-react";
import type { Appointment } from "@/data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export function AppointmentDetail({ appointment }: { appointment: Appointment }) {
  const details = [[Phone, appointment.phone], [Mail, appointment.email], [CalendarDays, "Thursday, May 15, 2025"], [Clock, `${appointment.time} – ${appointment.endTime}`], [Stethoscope, appointment.service], [UserRound, appointment.dentist], [MapPin, appointment.location]] as const;
  return <aside className="border-l p-6"><Badge variant="secondary">{appointment.status}</Badge><h2 className="mt-4 text-xl font-semibold">{appointment.patient}</h2><div className="mt-3 flex flex-col gap-3">{details.map(([Icon, value]) => <div className="flex items-start gap-3 text-sm" key={value}><Icon aria-hidden="true" /><span>{value}</span></div>)}</div><div className="mt-6 flex flex-col gap-2"><Button>Edit appointment</Button><Button variant="outline">Actions</Button></div><Separator className="my-6"/><h3 className="text-sm font-medium">Notes</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{appointment.notes}</p></aside>;
}
