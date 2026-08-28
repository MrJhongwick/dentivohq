import type { Appointment } from "@/data";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const variant = { Confirmed: "outline", "Checked in": "secondary", Pending: "destructive" } as const;
export function AppointmentTable({ rows, selectedId, onSelect }: { rows: Appointment[]; selectedId: string; onSelect: (appointment: Appointment) => void }) {
  return <Table><TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Patient</TableHead><TableHead>Service</TableHead><TableHead>Dentist</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
    <TableBody>{rows.map((appointment) => <TableRow key={appointment.id} data-state={selectedId === appointment.id ? "selected" : undefined} onClick={() => onSelect(appointment)} className="h-16">
      <TableCell><div className="font-medium">{appointment.time}</div><div className="text-xs text-muted-foreground">{appointment.endTime}</div></TableCell>
      <TableCell><div className="flex items-center gap-3"><Avatar size="sm"><AvatarFallback>{appointment.patient.split(" ").map((part) => part[0]).join("")}</AvatarFallback></Avatar><span className="font-medium">{appointment.patient}</span></div></TableCell>
      <TableCell>{appointment.service}</TableCell><TableCell>{appointment.dentist}</TableCell><TableCell><Badge variant={variant[appointment.status]}>{appointment.status}</Badge></TableCell>
    </TableRow>)}</TableBody></Table>;
}
