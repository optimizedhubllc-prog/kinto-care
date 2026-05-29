'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Heart, Users, Calendar, Pill, CheckSquare, LogOut, Plus, X } from 'lucide-react'

type HubMember = { id: string; user_id: string; role: string; users: { name: string | null; email: string | null } | null }
type Appointment = { id: string; doctor_name: string | null; specialty: string | null; date_time: string; location: string | null; notes: string | null }
type Medication = { id: string; name: string; dosage: string | null; frequency: string | null; is_active: boolean }
type Task = { id: string; title: string; description: string | null; due_date: string | null; status: string; priority: string; assigned_to: string | null }

const FAMILY_MEMBERS = [
  { id: "89a84765-2f2f-4c77-a184-1ea044c1f5b5", name: "Pedro Jaime" },
  { id: "c588d7fa-bc8f-49ba-b336-ff3986a87ffd", name: "Ysel" },
  { id: "9890d720-6790-476f-8c7b-759c17972166", name: "Alberto" },
  { id: "595daabd-8d5e-4e01-b797-b4b92a0d1fb6", name: "Kevin" },
  { id: "f61a8d8a-8c2b-4c53-8ec8-3f02a1eed274", name: "Pedro Alberto" },
  { id: "42333315-6fb2-48b5-b4bb-04760e219560", name: "Gloria" },
]

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-semibold text-[#1A2B3C]">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-[#DC2626]"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-6 py-4 space-y-4">{children}</div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-[#1A2B3C] uppercase tracking-wide">{label}</label>
      {children}
    </div>
  )
}

const inputCls = "w-full border rounded-lg px-3 py-2 text-sm text-[#1A2B3C] focus:outline-none focus:ring-2 focus:ring-[#0D9488]"

function SaveBtn({ saving, onSave, onCancel }: { saving: boolean; onSave: () => void; onCancel: () => void }) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <button onClick={onCancel} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancel</button>
      <button onClick={onSave} className="px-4 py-2 text-sm bg-[#DC2626] text-white rounded-lg hover:bg-red-700 font-semibold">
        {saving ? 'Saving…' : 'Save'}
      </button>
    </div>
  )
}

export default function DashboardPage() {
  const params = useParams()
  const router = useRouter()
  const hubId = params.hubId as string

  const [patientName, setPatientName] = useState('')
  const [members, setMembers] = useState<HubMember[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [medications, setMedications] = useState<Medication[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Modal state
  const [apptModal, setApptModal] = useState<null | 'add' | Appointment>(null)
  const [medModal, setMedModal] = useState<null | 'add' | Medication>(null)
  const [taskModal, setTaskModal] = useState<null | 'add' | Task>(null)

  // Form state
  const [apptForm, setApptForm] = useState<Partial<Appointment>>({})
  const [medForm, setMedForm] = useState<Partial<Medication>>({})
  const [taskForm, setTaskForm] = useState<Partial<Task>>({})
  const [saving, setSaving] = useState(false)

  const supabase = createClient()

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const [hubRes, membersRes, apptRes, medsRes, tasksRes] = await Promise.all([
      supabase.from('patient_hubs').select('patient_name').eq('id', hubId).single(),
      supabase.from('hub_members').select('id, user_id, role, users(name, email)').eq('hub_id', hubId),
      supabase.from('appointments').select('id, doctor_name, specialty, date_time, location, notes').eq('hub_id', hubId).order('date_time', { ascending: true }),
      supabase.from('medications').select('id, name, dosage, frequency, is_active').eq('hub_id', hubId).eq('is_active', true).order('name', { ascending: true }),
      supabase.from('tasks').select('id, title, description, due_date, status, priority, assigned_to').eq('hub_id', hubId).order('created_at', { ascending: false }),
    ])

    if (hubRes.error) { setError('Could not load hub.'); setLoading(false); return }
    setPatientName(hubRes.data.patient_name)
    setMembers((membersRes.data as unknown as HubMember[]) ?? [])
    setAppointments(apptRes.data ?? [])
    setMedications(medsRes.data ?? [])
    setTasks(tasksRes.data ?? [])
    setLoading(false)
  }, [hubId, router, supabase])

  useEffect(() => { loadData() }, [loadData])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Appointments CRUD
  const openAddAppt = () => { setApptForm({}); setApptModal('add') }
  const openEditAppt = (a: Appointment) => { setApptForm(a); setApptModal(a) }
  const saveAppt = async () => {
    setSaving(true)
    try {
      if (apptModal === 'add') {
        await supabase.from('appointments').insert({ ...apptForm, hub_id: hubId })
      } else {
        await supabase.from('appointments').update(apptForm).eq('id', (apptModal as Appointment).id)
      }
      setApptModal(null)
      await loadData()
    } catch (e) { console.error(e) }
    setSaving(false)
  }
  const deleteAppt = async (id: string) => {
    await supabase.from('appointments').delete().eq('id', id)
    await loadData()
  }

  // Medications CRUD
  const openAddMed = () => { setMedForm({ is_active: true }); setMedModal('add') }
  const openEditMed = (m: Medication) => { setMedForm(m); setMedModal(m) }
  const saveMed = async () => {
    setSaving(true)
    try {
      if (medModal === 'add') {
        await supabase.from('medications').insert({ ...medForm, hub_id: hubId })
      } else {
        await supabase.from('medications').update(medForm).eq('id', (medModal as Medication).id)
      }
      setMedModal(null)
      await loadData()
    } catch (e) { console.error(e) }
    setSaving(false)
  }
  const deleteMed = async (id: string) => {
    await supabase.from('medications').delete().eq('id', id)
    await loadData()
  }

  // Tasks CRUD
  const openAddTask = () => { setTaskForm({ status: 'pending', priority: 'medium' }); setTaskModal('add') }
  const openEditTask = (t: Task) => { setTaskForm(t); setTaskModal(t) }
  const saveTask = async () => {
    setSaving(true)
    try {
      if (taskModal === 'add') {
        await supabase.from('tasks').insert({ ...taskForm, hub_id: hubId })
      } else {
        await supabase.from('tasks').update(taskForm).eq('id', (taskModal as Task).id)
      }
      setTaskModal(null)
      await loadData()
    } catch (e) { console.error(e) }
    setSaving(false)
  }
  const deleteTask = async (id: string) => {
    await supabase.from('tasks').delete().eq('id', id)
    await loadData()
  }

  const roleLabel = (role: string) => {
    if (role === 'family_admin') return 'Admin'
    if (role === 'family_viewer') return 'Viewer'
    if (role === 'caregiver') return 'Caregiver'
    return role
  }

  const priorityColor = (priority: string) => {
    if (priority === 'high') return 'text-[#DC2626]'
    if (priority === 'medium') return 'text-[#0D9488]'
    return 'text-muted-foreground'
  }

  const statusLabel = (status: string) => {
    if (status === 'in_progress') return 'In Progress'
    if (status === 'completed') return 'Completed'
    return 'Pending'
  }

  const getMember = (id: string | null) => FAMILY_MEMBERS.find(m => m.id === id)?.name ?? null

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDF8F2]">
        <div className="flex items-center gap-2">
          <Heart className="h-6 w-6 text-[#DC2626] animate-pulse" strokeWidth={1.5} />
          <span className="text-[#1A2B3C] font-serif">Loading...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDF8F2]">
        <p className="text-[#DC2626]">{error}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FDF8F2]">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart className="h-6 w-6 text-[#DC2626]" strokeWidth={1.5} />
          <span className="text-xl font-serif font-semibold text-[#1A2B3C]">Kinto Care</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">Care hub for <strong className="text-[#1A2B3C]">{patientName}</strong></span>
          <button onClick={handleSignOut} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-[#DC2626] transition-colors">
            <LogOut className="h-4 w-4" />Sign out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* Care Team */}
        <section className="bg-white rounded-xl border shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-[#0D9488]" />
            <h2 className="font-semibold text-[#1A2B3C]">Care Team</h2>
            <span className="ml-auto text-xs text-muted-foreground">{members.length} member{members.length !== 1 ? 's' : ''}</span>
          </div>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No team members yet.</p>
          ) : (
            <div className="space-y-2">
              {members.map(m => (
                <div key={m.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium text-[#1A2B3C]">{m.users?.name ?? m.users?.email ?? 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">{m.users?.email}</p>
                  </div>
                  <span className="text-xs bg-[#FDF8F2] border rounded-full px-2 py-0.5 text-[#1A2B3C]">{roleLabel(m.role)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Appointments */}
        <section className="bg-white rounded-xl border shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5 text-[#0D9488]" />
            <h2 className="font-semibold text-[#1A2B3C]">Appointments</h2>
            <span className="ml-auto text-xs text-muted-foreground mr-3">{appointments.length} upcoming</span>
            <button onClick={openAddAppt} className="flex items-center gap-1 text-xs bg-[#DC2626] text-white px-3 py-1.5 rounded-lg hover:bg-red-700 font-semibold">
              <Plus className="h-3 w-3" />Add
            </button>
          </div>
          {appointments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No appointments scheduled.</p>
          ) : (
            <div className="space-y-3">
              {appointments.map(a => (
                <div key={a.id} className="flex flex-col gap-1 py-2 border-b last:border-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#1A2B3C]">{a.doctor_name ?? 'Unknown provider'}</p>
                      {a.specialty && <p className="text-xs text-muted-foreground">{a.specialty}</p>}
                      {a.location && <p className="text-xs text-muted-foreground">📍 {a.location}</p>}
                      {a.notes && <p className="text-xs text-muted-foreground mt-1">{a.notes}</p>}
                    </div>
                    <div className="flex items-center gap-2 ml-4 shrink-0">
                      <p className="text-xs text-muted-foreground">{new Date(a.date_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
                      <button onClick={() => openEditAppt(a)} className="text-xs text-[#0D9488] hover:underline">Edit</button>
                      <button onClick={() => deleteAppt(a.id)} className="text-xs text-[#DC2626] hover:underline">Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Medications */}
        <section className="bg-white rounded-xl border shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Pill className="h-5 w-5 text-[#0D9488]" />
            <h2 className="font-semibold text-[#1A2B3C]">Active Medications</h2>
            <span className="ml-auto text-xs text-muted-foreground mr-3">{medications.length} active</span>
            <button onClick={openAddMed} className="flex items-center gap-1 text-xs bg-[#DC2626] text-white px-3 py-1.5 rounded-lg hover:bg-red-700 font-semibold">
              <Plus className="h-3 w-3" />Add
            </button>
          </div>
          {medications.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active medications.</p>
          ) : (
            <div className="space-y-2">
              {medications.map(m => (
                <div key={m.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium text-[#1A2B3C]">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{[m.dosage, m.frequency].filter(Boolean).join(' · ')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEditMed(m)} className="text-xs text-[#0D9488] hover:underline">Edit</button>
                    <button onClick={() => deleteMed(m.id)} className="text-xs text-[#DC2626] hover:underline">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Tasks */}
        <section className="bg-white rounded-xl border shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckSquare className="h-5 w-5 text-[#0D9488]" />
            <h2 className="font-semibold text-[#1A2B3C]">Tasks</h2>
            <span className="ml-auto text-xs text-muted-foreground mr-3">{tasks.filter(t => t.status !== 'completed').length} open</span>
            <button onClick={openAddTask} className="flex items-center gap-1 text-xs bg-[#DC2626] text-white px-3 py-1.5 rounded-lg hover:bg-red-700 font-semibold">
              <Plus className="h-3 w-3" />Add
            </button>
          </div>
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tasks yet.</p>
          ) : (
            <div className="space-y-2">
              {tasks.map(t => (
                <div key={t.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className={`text-sm font-medium ${t.status === 'completed' ? 'line-through text-muted-foreground' : 'text-[#1A2B3C]'}`}>{t.title}</p>
                    {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                    <div className="flex gap-3 mt-0.5">
                      {t.due_date && <p className="text-xs text-muted-foreground">Due {new Date(t.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>}
                      {t.assigned_to && <p className="text-xs text-muted-foreground">👤 {getMember(t.assigned_to)}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    <span className={`text-xs font-medium ${priorityColor(t.priority)}`}>{t.priority}</span>
                    <span className="text-xs bg-[#FDF8F2] border rounded-full px-2 py-0.5 text-[#1A2B3C]">{statusLabel(t.status)}</span>
                    <button onClick={() => openEditTask(t)} className="text-xs text-[#0D9488] hover:underline">Edit</button>
                    <button onClick={() => deleteTask(t.id)} className="text-xs text-[#DC2626] hover:underline">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <p className="text-xs text-center text-muted-foreground pb-4">
          Kinto Care is a logistics and coordination tool. No medical diagnosis provided.
        </p>
      </main>

      {/* Appointment Modal */}
      {apptModal && (
        <Modal title={apptModal === 'add' ? 'New Appointment' : 'Edit Appointment'} onClose={() => setApptModal(null)}>
          <Field label="Doctor / Provider">
            <input className={inputCls} value={apptForm.doctor_name ?? ''} onChange={e => setApptForm(p => ({ ...p, doctor_name: e.target.value }))} placeholder="Dr. Rodriguez" />
          </Field>
          <Field label="Specialty">
            <input className={inputCls} value={apptForm.specialty ?? ''} onChange={e => setApptForm(p => ({ ...p, specialty: e.target.value }))} placeholder="Neurology" />
          </Field>
          <Field label="Date & Time">
            <input className={inputCls} type="datetime-local" value={apptForm.date_time ? apptForm.date_time.slice(0, 16) : ''} onChange={e => setApptForm(p => ({ ...p, date_time: e.target.value }))} />
          </Field>
          <Field label="Location">
            <input className={inputCls} value={apptForm.location ?? ''} onChange={e => setApptForm(p => ({ ...p, location: e.target.value }))} placeholder="Tampa General Hospital" />
          </Field>
          <Field label="Notes">
            <textarea className={inputCls} rows={3} value={apptForm.notes ?? ''} onChange={e => setApptForm(p => ({ ...p, notes: e.target.value }))} placeholder="Post-op check, bring MRI scans…" />
          </Field>
          <SaveBtn saving={saving} onSave={saveAppt} onCancel={() => setApptModal(null)} />
        </Modal>
      )}

      {/* Medication Modal */}
      {medModal && (
        <Modal title={medModal === 'add' ? 'New Medication' : 'Edit Medication'} onClose={() => setMedModal(null)}>
          <Field label="Medication Name">
            <input className={inputCls} value={medForm.name ?? ''} onChange={e => setMedForm(p => ({ ...p, name: e.target.value }))} placeholder="Metoprolol 25mg" />
          </Field>
          <Field label="Dosage">
            <input className={inputCls} value={medForm.dosage ?? ''} onChange={e => setMedForm(p => ({ ...p, dosage: e.target.value }))} placeholder="1 tablet" />
          </Field>
          <Field label="Frequency">
            <select className={inputCls} value={medForm.frequency ?? ''} onChange={e => setMedForm(p => ({ ...p, frequency: e.target.value }))}>
              <option value="">Select…</option>
              <option>Daily</option>
              <option>Twice daily</option>
              <option>As needed</option>
              <option>Weekly</option>
            </select>
          </Field>
          <Field label="Instructions">
            <textarea className={inputCls} rows={2} value={(medForm as any).instructions ?? ''} onChange={e => setMedForm(p => ({ ...p, instructions: e.target.value }))} placeholder="Take with food…" />
          </Field>
          <div className="text-xs bg-amber-50 text-amber-800 rounded-lg px-3 py-2">
            ⚠️ Kinto Care is a logistics tool only. No medical advice provided.
          </div>
          <SaveBtn saving={saving} onSave={saveMed} onCancel={() => setMedModal(null)} />
        </Modal>
      )}

      {/* Task Modal */}
      {taskModal && (
        <Modal title={taskModal === 'add' ? 'New Task' : 'Edit Task'} onClose={() => setTaskModal(null)}>
          <Field label="Title">
            <input className={inputCls} value={taskForm.title ?? ''} onChange={e => setTaskForm(p => ({ ...p, title: e.target.value }))} placeholder="Pick up prescription" />
          </Field>
          <Field label="Description">
            <textarea className={inputCls} rows={2} value={taskForm.description ?? ''} onChange={e => setTaskForm(p => ({ ...p, description: e.target.value }))} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Priority">
              <select className={inputCls} value={taskForm.priority ?? 'medium'} onChange={e => setTaskForm(p => ({ ...p, priority: e.target.value }))}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </Field>
            <Field label="Status">
              <select className={inputCls} value={taskForm.status ?? 'pending'} onChange={e => setTaskForm(p => ({ ...p, status: e.target.value }))}>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </Field>
          </div>
          <Field label="Assign To">
            <select className={inputCls} value={taskForm.assigned_to ?? ''} onChange={e => setTaskForm(p => ({ ...p, assigned_to: e.target.value }))}>
              <option value="">Unassigned</option>
              {FAMILY_MEMBERS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </Field>
          <Field label="Due Date">
            <input className={inputCls} type="date" value={taskForm.due_date ?? ''} onChange={e => setTaskForm(p => ({ ...p, due_date: e.target.value }))} />
          </Field>
          <SaveBtn saving={saving} onSave={saveTask} onCancel={() => setTaskModal(null)} />
        </Modal>
      )}
    </div>
  )
}
