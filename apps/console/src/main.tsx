import { StrictMode, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Brand, Button, Status } from "@dentivohq/ui";
import "@dentivohq/ui/styles.css";
import "./styles.css";

const clinics = [{ name: "Bright Smiles Clinic", owner: "Avery Brooks", plan: "MVP", status: "Active", locations: 2, created: "Aug 24, 2026" }, { name: "Northstar Dental Studio", owner: "Sarah Lee", plan: "MVP", status: "Active", locations: 1, created: "Aug 22, 2026" }, { name: "Harbor Dental Care", owner: "Michael Chen", plan: "MVP", status: "Review", locations: 3, created: "Aug 19, 2026" }];

function App() { const [query, setQuery] = useState(""); const rows = useMemo(() => clinics.filter((clinic) => clinic.name.toLowerCase().includes(query.toLowerCase())), [query]); return <div className="console"><aside><Brand/><nav><button className="active">Clinics</button><button>Subscriptions</button><button>Audit activity</button><button>Platform settings</button></nav><small>Platform administrators only</small></aside><main><header><div><h1>Clinic management</h1><p>Inspect tenant accounts and their MVP subscriptions.</p></div><Button>Export audit</Button></header><section className="toolbar"><label>Search clinics<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Clinic name"/></label><Button variant="outline">Filters</Button></section><div className="table-wrap"><table><thead><tr><th>Clinic</th><th>Owner</th><th>Plan</th><th>Status</th><th>Locations</th><th>Created</th></tr></thead><tbody>{rows.map((clinic) => <tr key={clinic.name}><td><strong>{clinic.name}</strong></td><td>{clinic.owner}</td><td>{clinic.plan}</td><td><Status tone={clinic.status === "Active" ? "success" : "warning"}>{clinic.status}</Status></td><td>{clinic.locations}</td><td>{clinic.created}</td></tr>)}</tbody></table></div></main></div>; }

createRoot(document.getElementById("root")!).render(<StrictMode><App/></StrictMode>);
