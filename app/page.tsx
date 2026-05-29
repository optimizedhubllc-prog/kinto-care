"use client";

import { useState, useEffect, useCallback } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

const HUB_ID = "8d26a727-e413-4a36-bee8-e0ae51ddad29";

const RED = "#DC2626";
const TEAL = "#0D9488";
const NAVY = "#1A2B3C";
const LINEN = "#FDF8F2";

const FAMILY_MEMBERS = [
  { id: "89a84765-2f2f-4c77-a184-1ea044c1f5b5", name: "Pedro Jaime", role: "family_admin" },
  { id: "c588d7fa-bc8f-49ba-b336-ff3986a87ffd", name: "Ysel", role: "family_admin" },
  { id: "9890d720-6790-476f-8c7b-759c17972166", name: "Alberto", role: "family_viewer" },
  { id: "595daabd-8d5e-4e01-b797-b4b92a0d1fb6", name: "Kevin", role: "family_viewer" },
  { id: "f61a8d8a-8c2b-4c53-8ec8-3f02a1eed274", name: "Pedro Alberto", role: "family_viewer" },
  { id: "42333315-6fb2-48b5-b4bb-04760e219560", name: "Gloria", role: "caregiver" },
];

const TABS = ["Appointments", "Medications", "Tasks", "Care Team"];

function useSupabaseTable(tableName) {
  const supabase = createClientComponentClient();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data: rows, error: err } = await supabase
      .from(tableName)
      .select("*")
      .eq("hub_id", HUB_ID)
      .order("created_at", { ascending: false });
    if (err) setError(err.message);
    else setData(rows);
    setLoading(false);
  }, [tableName, supabase]);

  const insert = useCallback(async (row) => {
    const { error: err } = await supabase
      .from(tableName)
      .insert({ ...row, hub_id: HUB_ID });
    if (err) throw new Error(err.message);
    await fetchAll();
  }, [tableName, supabase, fetchAll]);

  const update = useCallback(async (id, row) => {
    const { error: err } = await supabase
      .from(tableName)
      .update(row)
      .eq("id", id);
    if (err) throw new Error(err.message);
    await fetchAll();
  }, [tableName, supabase, fetchAll]);

  const remove = useCallback(async (id) => {
    const { error: err } = await supabase
      .from(tableName)
      .delete()
      .eq("id", id);
    if (err) throw new Error(err.message);
    await fetchAll();
  }, [tableName, supabase, fetchAll]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return { data, loading, error, insert, update, remove };
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(26,43,60,0.55)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
    }}>
      <div style={{
        background: LINEN, borderRadius: 16, padding: "28px 32px",
        width: 520, maxWidth: "92vw", maxHeight: "85vh", overflowY: "auto",
        boxShadow: "0 24px 60px rgba(26,43,60,0.22)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: 20, color: NAVY }}>{title}</h2>
          <button onClick={onClose} style={{
            background: "none", border: "none", fontSize: 22, cursor: "pointer", color: NAVY, lineHeight: 1
          }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: NAVY, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #CBD5E1",
  fontSize: 14, fontFamily: "Inter, sans-serif", color: NAVY, background: "#fff",
  boxSizing: "border-box", outline: "none"
};

function Btn({ onClick, children, variant = "primary", small }) {
  const bg = variant === "primary" ? RED : variant === "teal" ? TEAL : variant === "ghost" ? "transparent" : "#E2E8F0";
  const fg = variant === "primary" || variant === "teal" ? "#fff" : NAVY;
  return (
    <button onClick={onClick} style={{
      background: bg, color: fg, border: variant === "ghost" ? "1.5px solid #CBD5E1" : "none",
      borderRadius: 8, padding: small ? "6px 14px" : "10px 20px",
      fontSize: small ? 13 : 14, fontWeight: 600, cursor: "pointer",
      fontFamily: "Inter, sans-serif"
    }}>{children}</button>
  );
}

function Badge({ color, children }) {
  const colors = {
    red: { bg: "#FEE2E2", fg: "#991B1B" },
    teal: { bg: "#CCFBF1", fg: "#0F766E" },
    navy: { bg: "#E0E7EF", fg: NAVY },
    amber: { bg: "#FEF3C7", fg: "#92400E" },
    green: { bg: "#DCFCE7", fg: "#166534" },
  };
  const c = colors[color] || colors.navy;
  return (
    <span style={{
      background: c.bg, color: c.fg, borderRadius: 20, padding: "3px 10px",
      fontSize: 11, fontWeight: 700, letterSpacing: "0.04em"
    }}>{children}</span>
  );
}

function AppointmentsPanel() {
  const { data, loading, insert, update, remove } = useSupabaseTable("appointments");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const openAdd = () => { setForm({}); setModal("add"); };
  const openEdit = (row) => { setForm(row); setModal("edit"); };
  const save = async () => {
    setSaving(true);
    try {
      if (modal === "add") await insert(form);
      else await update(form.id, form);
      setModal(null);
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <span style={{ fontSize: 14, color: "#64748B" }}>{data.length} appointment{data.length !== 1 ? "s" : ""}</span>
        <Btn onClick={openAdd}>+ Add Appointment</Btn>
      </div>
      {loading && <p style={{ color: "#64748B", fontSize: 14 }}>Loading…</p>}
      {data.map(row => (
        <div key={row.id} style={{
          background: "#fff", borderRadius: 12, border: "1.5px solid #E2E8F0",
          padding: "16px 20px", marginBottom: 12
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 15, color: NAVY, fontFamily: "'Playfair Display', serif" }}>{row.doctor_name || "Unnamed"}</p>
              <p style={{ margin: "0 0 4px", fontSize: 13, color: "#64748B" }}>{row.location || "—"}</p>
              <p style={{ margin: 0, fontSize: 13, color: "#64748B" }}>{row.date_time ? new Date(row.date_time).toLocaleString() : "No date"}</p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn small variant="ghost" onClick={() => openEdit(row)}>Edit</Btn>
              <Btn small variant="ghost" onClick={() => remove(row.id)}>Delete</Btn>
            </div>
          </div>
          {row.notes && <p style={{ margin: "12px 0 0", fontSize: 13, color: "#475569", background: "#F8FAFC", borderRadius: 8, padding: "8px 12px" }}>{row.notes}</p>}
        </div>
      ))}
      {modal && (
        <Modal title={modal === "add" ? "New Appointment" : "Edit Appointment"} onClose={() => setModal(null)}>
          <Field label="Doctor / Provider Name">
            <input style={inputStyle} value={form.doctor_name || ""} onChange={e => f("doctor_name", e.target.value)} placeholder="Dr. Rodriguez" />
          </Field>
          <Field label="Date & Time">
            <input style={inputStyle} type="datetime-local" value={form.date_time ? form.date_time.slice(0, 16) : ""} onChange={e => f("date_time", e.target.value)} />
          </Field>
          <Field label="Location / Clinic">
            <input style={inputStyle} value={form.location || ""} onChange={e => f("location", e.target.value)} placeholder="Tampa General Hospital" />
          </Field>
          <Field label="Notes">
            <textarea style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} value={form.notes || ""} onChange={e => f("notes", e.target.value)} placeholder="Post-op check, bring MRI scans…" />
          </Field>
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
            <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn onClick={save}>{saving ? "Saving…" : "Save"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

function MedicationsPanel() {
  const { data, loading, insert, update, remove } = useSupabaseTable("medications");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const openAdd = () => { setForm({}); setModal("add"); };
  const openEdit = (row) => { setForm(row); setModal("edit"); };
  const save = async () => {
    setSaving(true);
    try {
      if (modal === "add") await insert(form);
      else await update(form.id, form);
      setModal(null);
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const freqColor = { Daily: "teal", "Twice daily": "navy", "As needed": "amber", Weekly: "green" };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <span style={{ fontSize: 14, color: "#64748B" }}>{data.length} medication{data.length !== 1 ? "s" : ""}</span>
        <Btn onClick={openAdd}>+ Add Medication</Btn>
      </div>
      {loading && <p style={{ color: "#64748B", fontSize: 14 }}>Loading…</p>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 12 }}>
        {data.map(row => (
          <div key={row.id} style={{
            background: "#fff", borderRadius: 12, border: `2px solid ${TEAL}22`,
            padding: "16px 18px", borderTop: `4px solid ${TEAL}`
          }}>
            <p style={{ margin: "0 0 6px", fontWeight: 700, fontSize: 15, color: NAVY, fontFamily: "'Playfair Display', serif" }}>{row.name || "Unnamed"}</p>
            <p style={{ margin: "0 0 8px", fontSize: 13, color: "#64748B" }}>{row.dosage || "—"}</p>
            {row.frequency && <div style={{ marginBottom: 8 }}><Badge color={freqColor[row.frequency] || "navy"}>{row.frequency}</Badge></div>}
            {row.instructions && <p style={{ margin: "0 0 12px", fontSize: 12, color: "#475569" }}>{row.instructions}</p>}
            <div style={{ display: "flex", gap: 8 }}>
              <Btn small variant="ghost" onClick={() => openEdit(row)}>Edit</Btn>
              <Btn small variant="ghost" onClick={() => remove(row.id)}>Delete</Btn>
            </div>
          </div>
        ))}
      </div>
      {modal && (
        <Modal title={modal === "add" ? "New Medication" : "Edit Medication"} onClose={() => setModal(null)}>
          <Field label="Medication Name">
            <input style={inputStyle} value={form.name || ""} onChange={e => f("name", e.target.value)} placeholder="Metoprolol 25mg" />
          </Field>
          <Field label="Dosage">
            <input style={inputStyle} value={form.dosage || ""} onChange={e => f("dosage", e.target.value)} placeholder="1 tablet" />
          </Field>
          <Field label="Frequency">
            <select style={inputStyle} value={form.frequency || ""} onChange={e => f("frequency", e.target.value)}>
              <option value="">Select…</option>
              <option>Daily</option>
              <option>Twice daily</option>
              <option>As needed</option>
              <option>Weekly</option>
            </select>
          </Field>
          <Field label="Instructions">
            <textarea style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} value={form.instructions || ""} onChange={e => f("instructions", e.target.value)} placeholder="Take with food, avoid grapefruit…" />
          </Field>
          <div style={{ background: "#FEF3C7", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "#92400E" }}>
            ⚠️ Kinto Care is a logistics tool only. No medical advice is provided.
          </div>
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn onClick={save}>{saving ? "Saving…" : "Save"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

function TasksPanel() {
  const { data, loading, insert, update, remove } = useSupabaseTable("tasks");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const openAdd = () => { setForm({}); setModal("add"); };
  const openEdit = (row) => { setForm(row); setModal("edit"); };
  const save = async () => {
    setSaving(true);
    try {
      if (modal === "add") await insert({ ...form, status: form.status || "pending" });
      else await update(form.id, form);
      setModal(null);
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const priorityColor = { high: "red", medium: "amber", low: "green" };
  const statusColor = { pending: "amber", in_progress: "teal", completed: "green", cancelled: "navy" };
  const getMember = (id) => FAMILY_MEMBERS.find(m => m.id === id)?.name || id;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <span style={{ fontSize: 14, color: "#64748B" }}>{data.length} task{data.length !== 1 ? "s" : ""}</span>
        <Btn onClick={openAdd}>+ Add Task</Btn>
      </div>
      {loading && <p style={{ color: "#64748B", fontSize: 14 }}>Loading…</p>}
      {data.map(row => (
        <div key={row.id} style={{
          background: "#fff", borderRadius: 12, border: "1.5px solid #E2E8F0",
          padding: "14px 18px", marginBottom: 10,
          borderLeft: `4px solid ${row.priority === "high" ? RED : row.priority === "medium" ? "#F59E0B" : TEAL}`
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: NAVY }}>{row.title || "Untitled"}</p>
                {row.priority && <Badge color={priorityColor[row.priority]}>{row.priority}</Badge>}
                {row.status && <Badge color={statusColor[row.status]}>{row.status.replace("_", " ")}</Badge>}
              </div>
              {row.description && <p style={{ margin: "0 0 6px", fontSize: 13, color: "#64748B" }}>{row.description}</p>}
              <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#94A3B8", flexWrap: "wrap" }}>
                {row.assigned_to && <span>👤 {getMember(row.assigned_to)}</span>}
                {row.due_date && <span>📅 {new Date(row.due_date).toLocaleDateString()}</span>}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginLeft: 12 }}>
              <Btn small variant="ghost" onClick={() => openEdit(row)}>Edit</Btn>
              <Btn small variant="ghost" onClick={() => remove(row.id)}>Delete</Btn>
            </div>
          </div>
        </div>
      ))}
      {modal && (
        <Modal title={modal === "add" ? "New Task" : "Edit Task"} onClose={() => setModal(null)}>
          <Field label="Title">
            <input style={inputStyle} value={form.title || ""} onChange={e => f("title", e.target.value)} placeholder="Pick up prescription" />
          </Field>
          <Field label="Description">
            <textarea style={{ ...inputStyle, minHeight: 72, resize: "vertical" }} value={form.description || ""} onChange={e => f("description", e.target.value)} />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Priority">
              <select style={inputStyle} value={form.priority || ""} onChange={e => f("priority", e.target.value)}>
                <option value="">Select…</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </Field>
            <Field label="Status">
              <select style={inputStyle} value={form.status || "pending"} onChange={e => f("status", e.target.value)}>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </Field>
          </div>
          <Field label="Assign To">
            <select style={inputStyle} value={form.assigned_to || ""} onChange={e => f("assigned_to", e.target.value)}>
              <option value="">Unassigned</option>
              {FAMILY_MEMBERS.map(m => <option key={m.id} value={m.id}>{m.name} ({m.role})</option>)}
            </select>
          </Field>
          <Field label="Due Date">
            <input style={inputStyle} type="date" value={form.due_date || ""} onChange={e => f("due_date", e.target.value)} />
          </Field>
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
            <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn onClick={save}>{saving ? "Saving…" : "Save"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

function CareTeamPanel() {
  const roleColor = { family_admin: "red", family_viewer: "navy", caregiver: "teal" };
  const initials = (name) => name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  const avatarBg = { family_admin: RED, family_viewer: NAVY, caregiver: TEAL };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 14, color: "#64748B", margin: "0 0 4px" }}>Papi Hub — {FAMILY_MEMBERS.length} members</p>
        <p style={{ fontSize: 12, color: "#94A3B8", margin: 0 }}>Hub ID: {HUB_ID}</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
        {FAMILY_MEMBERS.map(m => (
          <div key={m.id} style={{
            background: "#fff", borderRadius: 12, border: "1.5px solid #E2E8F0",
            padding: "16px 18px", display: "flex", alignItems: "center", gap: 14
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: "50%",
              background: avatarBg[m.role] || NAVY,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontWeight: 700, fontSize: 14, flexShrink: 0
            }}>{initials(m.name)}</div>
            <div>
              <p style={{ margin: "0 0 5px", fontWeight: 700, fontSize: 14, color: NAVY }}>{m.name}</p>
              <Badge color={roleColor[m.role]}>{m.role.replace("_", " ")}</Badge>
            </div>
          </div>
        ))}
      </div>
      <div style={{
        marginTop: 24, background: "#F0FDFA", border: `1.5px solid ${TEAL}44`,
        borderRadius: 12, padding: "14px 18px"
      }}>
        <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 600, color: TEAL }}>Invite New Member</p>
        <p style={{ margin: 0, fontSize: 12, color: "#64748B" }}>
          Full invite flow coming in Phase 2. Add members via Supabase until then.
        </p>
      </div>
    </div>
  );
}

export default function Page() {
  const [activeTab, setActiveTab] = useState(0);

  const panels = [
    <AppointmentsPanel />,
    <MedicationsPanel />,
    <TasksPanel />,
    <CareTeamPanel />,
  ];

  return (
    <div style={{ fontFamily: "Inter, sans-serif", minHeight: "100vh", background: LINEN }}>
      <header style={{ background: NAVY, padding: "0 32px", display: "flex", alignItems: "center", gap: 12, height: 60 }}>
        <span style={{ color: RED, fontSize: 22 }}>♥</span>
        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: "#fff", fontWeight: 700 }}>Kinto Care</span>
        <span style={{ fontSize: 12, color: "#94A3B8", marginLeft: 4 }}>— Papi Hub</span>
      </header>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ display: "flex", gap: 4, marginBottom: 28, borderBottom: "2px solid #E2E8F0" }}>
          {TABS.map((tab, i) => (
            <button key={tab} onClick={() => setActiveTab(i)} style={{
              background: "none", border: "none", cursor: "pointer",
              padding: "10px 20px", fontSize: 14, fontWeight: activeTab === i ? 700 : 500,
              color: activeTab === i ? RED : "#64748B",
              borderBottom: activeTab === i ? `3px solid ${RED}` : "3px solid transparent",
              marginBottom: -2, transition: "color 0.15s"
            }}>{tab}</button>
          ))}
        </div>
        {panels[activeTab]}
      </div>
      <footer style={{ borderTop: "1px solid #E2E8F0", padding: "16px 32px", textAlign: "center", fontSize: 11, color: "#94A3B8", marginTop: 40 }}>
        Kinto Care is a logistics and coordination tool. No medical diagnosis provided.
      </footer>
    </div>
  );
}
