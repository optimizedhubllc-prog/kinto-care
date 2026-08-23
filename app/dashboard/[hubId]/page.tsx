'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Users, Calendar, Pill, CheckSquare, LogOut, Plus, X, Clock, AlertTriangle, FileText, MessageCircle, ChevronDown, ChevronUp, Send, Share2, ExternalLink } from 'lucide-react'
import { KintoLogo } from '@/components/ui/KintoLogo'
import { useTranslation } from '@/hooks/useTranslation'
import { KintoScan } from '@/components/ui/KintoScan'

type HubMember = { id: string; user_id: string; role: string; users: { name: string | null; email: string | null } | null }
type Appointment = { id: string; doctor_name: string | null; specialty: string | null; date_time: string; location: string | null; notes: string | null }
type Medication = { id: string; name: string; dosage: string | null; frequency: string | null; is_active: boolean }
type Task = { id: string; title: string; description: string | null; due_date: string | null; status: string; priority: string; assigned_to: string | null }
type ActivityItem = { id: string; action_type: string; entity_type: string; description: string; created_at: string; actor_id: string | null }
type EmergencyInfo = {
  id?: string; allergies: string | null; blood_type: string | null; primary_doctor: string | null
  primary_doctor_phone: string | null; insurance_provider: string | null; insurance_member_id: string | null
  emergency_contact_name: string | null; emergency_contact_phone: string | null; notes: string | null; updated_at?: string
}
type DocumentItem = { id: string; name: string; category: string; file_url: string | null; notes: string | null; created_at: string }
type TaskComment = { id: string; task_id: string; author_id: string | null; comment: string; created_at: string }
type ContactItem = { id: string; name: string; role: string; phone: string; country_code: string; language_preference: string; notes: string | null }

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

function SaveBtn({ saving, onSave, onCancel, saveLabel, cancelLabel }: {
  saving: boolean
  onSave: () => void
  onCancel: () => void
  saveLabel: string
  cancelLabel: string
}) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <button onClick={onCancel} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">{cancelLabel}</button>
      <button onClick={onSave} className="px-4 py-2 text-sm bg-[#DC2626] text-white rounded-lg hover:bg-red-700 font-semibold">
        {saving ? '...' : saveLabel}
      </button>
    </div>
  )
}

export default function DashboardPage() {
  const params = useParams()
  const router = useRouter()
  const hubId = params.hubId as string
  const { t, loading: langLoading } = useTranslation()

  const [patientName, setPatientName] = useState('')
  const [members, setMembers] = useState<HubMember[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [medications, setMedications] = useState<Medication[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [emergencyInfo, setEmergencyInfo] = useState<EmergencyInfo | null>(null)
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [contacts, setContacts] = useState<ContactItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [contactError, setContactError] = useState<string | null>(null)

  // Modal state
  const [apptModal, setApptModal] = useState<null | 'add' | Appointment>(null)
  const [medModal, setMedModal] = useState<null | 'add' | Medication>(null)
  const [taskModal, setTaskModal] = useState<null | 'add' | Task>(null)
  const [scanModal, setScanModal] = useState(false)
  const [emergencyModal, setEmergencyModal] = useState(false)
  const [docModal, setDocModal] = useState(false)
  const [contactModal, setContactModal] = useState<null | 'add' | ContactItem>(null)

  // Form state
  const [apptForm, setApptForm] = useState<Partial<Appointment>>({})
  const [medForm, setMedForm] = useState<Partial<Medication>>({})
  const [taskForm, setTaskForm] = useState<Partial<Task>>({})
  const [emergencyForm, setEmergencyForm] = useState<Partial<EmergencyInfo>>({})
  const [docForm, setDocForm] = useState<Partial<DocumentItem>>({ category: 'other' })
  const [contactForm, setContactForm] = useState<Partial<ContactItem>>({ country_code: 'US', language_preference: 'en' })
  const [saving, setSaving] = useState(false)

  // Task comments (loaded on-demand per task)
  const [expandedTask, setExpandedTask] = useState<string | null>(null)
  const [taskComments, setTaskComments] = useState<Record<string, TaskComment[]>>({})
  const [commentDraft, setCommentDraft] = useState('')
  const [commentsLoading, setCommentsLoading] = useState(false)

  const supabase = createClient()

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const [hubRes, membersRes, apptRes, medsRes, tasksRes, activityRes, emergencyRes, docsRes, contactsRes] = await Promise.all([
      supabase.from('patient_hubs').select('patient_name').eq('id', hubId).single(),
      supabase.from('hub_members').select('id, user_id, role, users(name, email)').eq('hub_id', hubId),
      supabase.from('appointments').select('id, doctor_name, specialty, date_time, location, notes').eq('hub_id', hubId).order('date_time', { ascending: true }),
      supabase.from('medications').select('id, name, dosage, frequency, is_active').eq('hub_id', hubId).eq('is_active', true).order('name', { ascending: true }),
      supabase.from('tasks').select('id, title, description, due_date, status, priority, assigned_to').eq('hub_id', hubId).order('created_at', { ascending: false }),
      supabase.from('activity_log').select('id, action_type, entity_type, description, created_at, actor_id').eq('hub_id', hubId).order('created_at', { ascending: false }).limit(10),
      supabase.from('emergency_info').select('*').eq('hub_id', hubId).maybeSingle(),
      supabase.from('documents').select('id, name, category, file_url, notes, created_at').eq('hub_id', hubId).order('created_at', { ascending: false }),
      supabase.from('contacts').select('id, name, role, phone, country_code, language_preference, notes').eq('hub_id', hubId).order('name', { ascending: true }),
    ])

    if (hubRes.error) { setError('Could not load hub.'); setLoading(false); return }
    setPatientName(hubRes.data.patient_name)
    setMembers((membersRes.data as unknown as HubMember[]) ?? [])
    setAppointments(apptRes.data ?? [])
    setMedications(medsRes.data ?? [])
    setTasks(tasksRes.data ?? [])
    setActivity(activityRes.data ?? [])
    setEmergencyInfo(emergencyRes.data ?? null)
    setDocuments(docsRes.data ?? [])
    setContacts(contactsRes.data ?? [])
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
  const openEditTask = (tk: Task) => { setTaskForm(tk); setTaskModal(tk) }
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

  // Emergency Info (single row per hub, upsert)
  const openEmergencyModal = () => { setEmergencyForm(emergencyInfo ?? {}); setEmergencyModal(true) }
  const saveEmergencyInfo = async () => {
    setSaving(true)
    try {
      await supabase.from('emergency_info').upsert({ ...emergencyForm, hub_id: hubId }, { onConflict: 'hub_id' })
      setEmergencyModal(false)
      await loadData()
    } catch (e) { console.error(e) }
    setSaving(false)
  }
  const shareEmergencyInfo = () => {
    if (!emergencyInfo) return
    const lines = [
      `${patientName} — ${t('emergency.title')}`,
      emergencyInfo.allergies && `${t('emergency.allergies')}: ${emergencyInfo.allergies}`,
      emergencyInfo.blood_type && `${t('emergency.bloodType')}: ${emergencyInfo.blood_type}`,
      emergencyInfo.primary_doctor && `${t('emergency.primaryDoctor')}: ${emergencyInfo.primary_doctor} ${emergencyInfo.primary_doctor_phone ?? ''}`,
      emergencyInfo.insurance_provider && `${t('emergency.insuranceProvider')}: ${emergencyInfo.insurance_provider} ${emergencyInfo.insurance_member_id ?? ''}`,
      emergencyInfo.emergency_contact_name && `${t('emergency.emergencyContactName')}: ${emergencyInfo.emergency_contact_name} ${emergencyInfo.emergency_contact_phone ?? ''}`,
    ].filter(Boolean).join('\n')
    if (navigator.share) {
      navigator.share({ title: t('emergency.title'), text: lines }).catch(() => {})
    } else {
      navigator.clipboard?.writeText(lines)
    }
  }

  // Documents
  const openAddDoc = () => { setDocForm({ category: 'other' }); setDocModal(true) }
  const saveDoc = async () => {
    setSaving(true)
    try {
      await supabase.from('documents').insert({ ...docForm, hub_id: hubId })
      setDocModal(false)
      await loadData()
    } catch (e) { console.error(e) }
    setSaving(false)
  }
  const deleteDoc = async (id: string) => {
    await supabase.from('documents').delete().eq('id', id)
    await loadData()
  }

  // Contacts
  const openAddContact = () => { setContactForm({ role: 'family_member', country_code: 'US', language_preference: 'en' }); setContactError(null); setContactModal('add') }
  const openEditContact = (c: ContactItem) => { setContactForm(c); setContactError(null); setContactModal(c) }
  const saveContact = async () => {
    setSaving(true)
    try {
      if (!contactForm.name?.trim()) { setContactError(t('contacts.nameRequired')); setSaving(false); return }
      if (!contactForm.phone?.trim()) { setContactError(t('contacts.phoneRequired')); setSaving(false); return }
      const { data: { user } } = await supabase.auth.getUser()
      const result = contactModal === 'add'
        ? await supabase.from('contacts').insert({ ...contactForm, hub_id: hubId, created_by: user?.id })
        : await supabase.from('contacts').update(contactForm).eq('id', (contactModal as ContactItem).id)
      if (result.error) {
        console.error('[Contacts] save failed:', result.error)
        setContactError(result.error.message)
        setSaving(false)
        return
      }
      setContactModal(null)
      setContactError(null)
      await loadData()
    } catch (e) {
      console.error(e)
      setContactError(e instanceof Error ? e.message : 'Failed to save contact')
    }
    setSaving(false)
  }
  const deleteContact = async (id: string) => {
    const { error: delError } = await supabase.from('contacts').delete().eq('id', id)
    if (delError) { console.error('[Contacts] delete failed:', delError); setContactError(delError.message); return }
    await loadData()
  }
  const isIntlContact = (c: ContactItem) => c.country_code !== 'US'
  const contactWhatsAppUrl = (c: ContactItem) => `https://wa.me/${c.phone.replace(/[^\d]/g, '')}`
  const contactRoleLabel = (role: string) => {
    const map: Record<string, string> = {
      family_member: t('contacts.familyMember'), caregiver: t('contacts.caregiver'),
      medical_facility: t('contacts.medicalFacility'), pharmacy: t('contacts.pharmacy'), other: t('contacts.other'),
    }
    return map[role] ?? role
  }

  // Task Comments
  const toggleTaskComments = async (taskId: string) => {
    if (expandedTask === taskId) { setExpandedTask(null); return }
    setExpandedTask(taskId)
    setCommentDraft('')
    if (!taskComments[taskId]) {
      setCommentsLoading(true)
      const { data } = await supabase.from('task_comments').select('id, task_id, author_id, comment, created_at').eq('task_id', taskId).order('created_at', { ascending: true })
      setTaskComments(prev => ({ ...prev, [taskId]: data ?? [] }))
      setCommentsLoading(false)
    }
  }
  const postComment = async (taskId: string) => {
    if (!commentDraft.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('task_comments').insert({ task_id: taskId, hub_id: hubId, author_id: user.id, comment: commentDraft.trim() })
    setCommentDraft('')
    const { data } = await supabase.from('task_comments').select('id, task_id, author_id, comment, created_at').eq('task_id', taskId).order('created_at', { ascending: true })
    setTaskComments(prev => ({ ...prev, [taskId]: data ?? [] }))
  }

  const timeAgo = (iso: string) => {
    const diffMs = Date.now() - new Date(iso).getTime()
    const mins = Math.round(diffMs / 60000)
    if (mins < 1) return 'now'
    if (mins < 60) return `${mins}m`
    const hrs = Math.round(mins / 60)
    if (hrs < 24) return `${hrs}h`
    const days = Math.round(hrs / 24)
    return `${days}d`
  }

  const docCategoryLabel = (cat: string) => {
    const map: Record<string, string> = {
      insurance: t('documents.categoryInsurance'), poa: t('documents.categoryPoa'),
      advance_directive: t('documents.categoryAdvanceDirective'), id: t('documents.categoryId'), other: t('documents.categoryOther'),
    }
    return map[cat] ?? cat
  }

  const roleLabel = (role: string) => {
    if (role === 'family_admin') return 'Admin'
    if (role === 'family_viewer') return 'Viewer'
    if (role === 'caregiver') return t('contacts.caregiver')
    return role
  }

  const priorityColor = (priority: string) => {
    if (priority === 'high') return 'text-[#DC2626]'
    if (priority === 'medium') return 'text-[#0D9488]'
    return 'text-muted-foreground'
  }

  const statusLabel = (status: string) => {
    if (status === 'in_progress') return t('tasks.inProgress')
    if (status === 'completed') return t('tasks.completed')
    return t('tasks.pending')
  }

  const getMember = (id: string | null) => FAMILY_MEMBERS.find(m => m.id === id)?.name ?? null

  if (loading || langLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDF8F2]">
        <div className="flex items-center gap-2">
          <KintoLogo size="sm" />
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
          <KintoLogo size="sm" />
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">Care hub for <strong className="text-[#1A2B3C]">{patientName}</strong></span>
          <button onClick={handleSignOut} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-[#DC2626] transition-colors">
            <LogOut className="h-4 w-4" />{t('nav.logout')}
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* Emergency Info */}
        <section className="bg-white rounded-xl border shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-[#DC2626]" />
            <h2 className="font-semibold text-[#1A2B3C]">{t('emergency.title')}</h2>
            <div className="ml-auto flex items-center gap-2">
              {emergencyInfo && (
                <button onClick={shareEmergencyInfo} className="flex items-center gap-1 text-xs text-[#0D9488] hover:underline">
                  <Share2 className="h-3 w-3" />{t('emergency.shareByText')}
                </button>
              )}
              <button onClick={openEmergencyModal} className="flex items-center gap-1 text-xs bg-[#DC2626] text-white px-3 py-1.5 rounded-lg hover:bg-red-700 font-semibold">
                {emergencyInfo ? t('emergency.edit') : t('emergency.setUp')}
              </button>
            </div>
          </div>
          {!emergencyInfo ? (
            <p className="text-sm text-muted-foreground">{t('emergency.empty')}</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              {emergencyInfo.allergies && <div><p className="text-xs text-muted-foreground">{t('emergency.allergies')}</p><p className="text-[#1A2B3C] font-medium">{emergencyInfo.allergies}</p></div>}
              {emergencyInfo.blood_type && <div><p className="text-xs text-muted-foreground">{t('emergency.bloodType')}</p><p className="text-[#1A2B3C] font-medium">{emergencyInfo.blood_type}</p></div>}
              {emergencyInfo.primary_doctor && <div><p className="text-xs text-muted-foreground">{t('emergency.primaryDoctor')}</p><p className="text-[#1A2B3C] font-medium">{emergencyInfo.primary_doctor} {emergencyInfo.primary_doctor_phone}</p></div>}
              {emergencyInfo.insurance_provider && <div><p className="text-xs text-muted-foreground">{t('emergency.insuranceProvider')}</p><p className="text-[#1A2B3C] font-medium">{emergencyInfo.insurance_provider} {emergencyInfo.insurance_member_id}</p></div>}
              {emergencyInfo.emergency_contact_name && <div><p className="text-xs text-muted-foreground">{t('emergency.emergencyContactName')}</p><p className="text-[#1A2B3C] font-medium">{emergencyInfo.emergency_contact_name} {emergencyInfo.emergency_contact_phone}</p></div>}
              {emergencyInfo.notes && <div className="col-span-2 sm:col-span-3"><p className="text-xs text-muted-foreground">{t('emergency.notes')}</p><p className="text-[#1A2B3C]">{emergencyInfo.notes}</p></div>}
            </div>
          )}
        </section>

        {/* Activity Feed */}
        <section className="bg-white rounded-xl border shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-[#0D9488]" />
            <h2 className="font-semibold text-[#1A2B3C]">{t('activity.title')}</h2>
          </div>
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('activity.empty')}</p>
          ) : (
            <div className="space-y-2">
              {activity.map(a => (
                <div key={a.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                  <p className="text-sm text-[#1A2B3C]">{a.description}</p>
                  <span className="text-xs text-muted-foreground shrink-0 ml-3">{timeAgo(a.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

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
            <h2 className="font-semibold text-[#1A2B3C]">{t('nav.appointments')}</h2>
            <span className="ml-auto text-xs text-muted-foreground mr-3">{appointments.length} {t('dashboard.upcomingAppointments').toLowerCase()}</span>
            <button onClick={openAddAppt} className="flex items-center gap-1 text-xs bg-[#DC2626] text-white px-3 py-1.5 rounded-lg hover:bg-red-700 font-semibold">
              <Plus className="h-3 w-3" />{t('common.add')}
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
                      <button onClick={() => openEditAppt(a)} className="text-xs text-[#0D9488] hover:underline">{t('common.edit')}</button>
                      <button onClick={() => deleteAppt(a.id)} className="text-xs text-[#DC2626] hover:underline">{t('common.delete')}</button>
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
            <h2 className="font-semibold text-[#1A2B3C]">{t('nav.medications')}</h2>
            <span className="ml-auto text-xs text-muted-foreground mr-3">{medications.length} {t('medications.title').toLowerCase()}</span>
            <button
              onClick={() => setScanModal(true)}
              className="flex items-center gap-1 text-xs bg-[#0D9488] text-white px-3 py-1.5 rounded-lg hover:bg-teal-700 font-semibold mr-2"
            >
              {t('medications.scanLabel')}
            </button>
            <button onClick={openAddMed} className="flex items-center gap-1 text-xs bg-[#DC2626] text-white px-3 py-1.5 rounded-lg hover:bg-red-700 font-semibold">
              <Plus className="h-3 w-3" />{t('common.add')}
            </button>
          </div>
          {medications.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('medications.noMeds')}</p>
          ) : (
            <div className="space-y-2">
              {medications.map(m => (
                <div key={m.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium text-[#1A2B3C]">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{[m.dosage, m.frequency].filter(Boolean).join(' · ')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEditMed(m)} className="text-xs text-[#0D9488] hover:underline">{t('common.edit')}</button>
                    <button onClick={() => deleteMed(m.id)} className="text-xs text-[#DC2626] hover:underline">{t('common.delete')}</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Documents */}
        <section className="bg-white rounded-xl border shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5 text-[#0D9488]" />
            <h2 className="font-semibold text-[#1A2B3C]">{t('documents.title')}</h2>
            <span className="ml-auto text-xs text-muted-foreground mr-3">{documents.length}</span>
            <button onClick={openAddDoc} className="flex items-center gap-1 text-xs bg-[#DC2626] text-white px-3 py-1.5 rounded-lg hover:bg-red-700 font-semibold">
              <Plus className="h-3 w-3" />{t('common.add')}
            </button>
          </div>
          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('documents.empty')}</p>
          ) : (
            <div className="space-y-2">
              {documents.map(d => (
                <div key={d.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium text-[#1A2B3C]">{d.name}</p>
                    <div className="flex gap-2 items-center mt-0.5">
                      <span className="text-xs bg-[#FDF8F2] border rounded-full px-2 py-0.5 text-[#1A2B3C]">{docCategoryLabel(d.category)}</span>
                      {d.notes && <p className="text-xs text-muted-foreground">{d.notes}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-4 shrink-0">
                    {d.file_url && (
                      <a href={d.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-[#0D9488] hover:underline">
                        <ExternalLink className="h-3 w-3" />{t('documents.openLink')}
                      </a>
                    )}
                    <button onClick={() => deleteDoc(d.id)} className="text-xs text-[#DC2626] hover:underline">{t('common.delete')}</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Contacts */}
        <section className="bg-white rounded-xl border shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-[#0D9488]" />
            <h2 className="font-semibold text-[#1A2B3C]">{t('contacts.title')}</h2>
            <span className="ml-auto text-xs text-muted-foreground mr-3">{contacts.length}</span>
            <button onClick={openAddContact} className="flex items-center gap-1 text-xs bg-[#DC2626] text-white px-3 py-1.5 rounded-lg hover:bg-red-700 font-semibold">
              <Plus className="h-3 w-3" />{t('common.add')}
            </button>
          </div>
          {contactError && !contactModal && (
            <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2 mb-3">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              {contactError}
            </div>
          )}
          {contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('contacts.noCaregivers')}</p>
          ) : (
            <div className="space-y-2">
              {contacts.map(c => (
                <div key={c.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-[#1A2B3C]">{c.name}</p>
                      <span className="text-xs bg-[#FDF8F2] border rounded-full px-2 py-0.5 text-[#1A2B3C]">{contactRoleLabel(c.role)}</span>
                      {isIntlContact(c) && <span className="text-xs bg-teal-100 text-teal-800 rounded-full px-2 py-0.5">{t('contacts.international')}</span>}
                    </div>
                    {c.phone && <p className="text-xs text-muted-foreground font-mono mt-0.5">{c.phone}</p>}
                    {c.notes && <p className="text-xs text-muted-foreground mt-0.5">{c.notes}</p>}
                  </div>
                  <div className="flex items-center gap-3 ml-4 shrink-0">
                    {c.phone && isIntlContact(c) && (
                      <a href={contactWhatsAppUrl(c)} target="_blank" rel="noopener noreferrer" className="text-xs bg-green-500 text-white px-2 py-1 rounded-lg hover:bg-green-600">
                        {t('contacts.whatsapp')}
                      </a>
                    )}
                    {c.phone && (
                      <a href={`tel:${c.phone}`} className="text-xs bg-[#0D9488] text-white px-2 py-1 rounded-lg hover:bg-teal-700">
                        {t('contacts.call')}
                      </a>
                    )}
                    <button onClick={() => openEditContact(c)} className="text-xs text-[#0D9488] hover:underline">{t('common.edit')}</button>
                    <button onClick={() => deleteContact(c.id)} className="text-xs text-[#DC2626] hover:underline">{t('common.delete')}</button>
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
            <h2 className="font-semibold text-[#1A2B3C]">{t('tasks.title')}</h2>
            <span className="ml-auto text-xs text-muted-foreground mr-3">{tasks.filter(tk => tk.status !== 'completed').length} {t('tasks.pending').toLowerCase()}</span>
            <button onClick={openAddTask} className="flex items-center gap-1 text-xs bg-[#DC2626] text-white px-3 py-1.5 rounded-lg hover:bg-red-700 font-semibold">
              <Plus className="h-3 w-3" />{t('common.add')}
            </button>
          </div>
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('tasks.noTasks')}</p>
          ) : (
            <div className="space-y-2">
              {tasks.map(tk => (
                <div key={tk.id} className="py-2 border-b last:border-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm font-medium ${tk.status === 'completed' ? 'line-through text-muted-foreground' : 'text-[#1A2B3C]'}`}>{tk.title}</p>
                      {tk.description && <p className="text-xs text-muted-foreground">{tk.description}</p>}
                      <div className="flex gap-3 mt-0.5">
                        {tk.due_date && <p className="text-xs text-muted-foreground">{t('tasks.due')} {new Date(tk.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>}
                        {tk.assigned_to && <p className="text-xs text-muted-foreground">👤 {getMember(tk.assigned_to)}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4 shrink-0">
                      <span className={`text-xs font-medium ${priorityColor(tk.priority)}`}>{tk.priority}</span>
                      <span className="text-xs bg-[#FDF8F2] border rounded-full px-2 py-0.5 text-[#1A2B3C]">{statusLabel(tk.status)}</span>
                      <button onClick={() => toggleTaskComments(tk.id)} className="flex items-center gap-1 text-xs text-[#0D9488] hover:underline">
                        <MessageCircle className="h-3 w-3" />
                        {taskComments[tk.id]?.length ? taskComments[tk.id].length : ''}
                        {expandedTask === tk.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>
                      <button onClick={() => openEditTask(tk)} className="text-xs text-[#0D9488] hover:underline">{t('common.edit')}</button>
                      <button onClick={() => deleteTask(tk.id)} className="text-xs text-[#DC2626] hover:underline">{t('common.delete')}</button>
                    </div>
                  </div>

                  {expandedTask === tk.id && (
                    <div className="mt-2 ml-1 pl-3 border-l-2 border-[#FDF8F2] space-y-2">
                      {commentsLoading && !taskComments[tk.id] ? (
                        <p className="text-xs text-muted-foreground">{t('common.loading')}</p>
                      ) : (taskComments[tk.id]?.length ?? 0) === 0 ? (
                        <p className="text-xs text-muted-foreground">{t('taskComments.noComments')}</p>
                      ) : (
                        taskComments[tk.id].map(c => (
                          <div key={c.id} className="text-xs">
                            <span className="font-medium text-[#1A2B3C]">{getMember(c.author_id) ?? 'Someone'}</span>
                            <span className="text-muted-foreground ml-1">{timeAgo(c.created_at)}</span>
                            <p className="text-[#1A2B3C]">{c.comment}</p>
                          </div>
                        ))
                      )}
                      <div className="flex gap-2 pt-1">
                        <input
                          className="flex-1 border rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                          placeholder={t('taskComments.addComment')}
                          value={commentDraft}
                          onChange={e => setCommentDraft(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') postComment(tk.id) }}
                        />
                        <button onClick={() => postComment(tk.id)} className="text-xs bg-[#0D9488] text-white px-2 py-1 rounded-lg hover:bg-teal-700 flex items-center gap-1">
                          <Send className="h-3 w-3" />{t('taskComments.post')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <p className="text-xs text-center text-muted-foreground pb-4">
          {t('common.disclaimer')}
        </p>
      </main>

      {/* Appointment Modal */}
      {apptModal && (
        <Modal title={apptModal === 'add' ? t('nav.appointments') : t('common.edit')} onClose={() => setApptModal(null)}>
          <Field label="Doctor / Provider">
            <input className={inputCls} value={apptForm.doctor_name ?? ''} onChange={e => setApptForm(p => ({ ...p, doctor_name: e.target.value }))} placeholder="Dr. Rodriguez" />
          </Field>
          <Field label="Specialty">
            <input className={inputCls} value={apptForm.specialty ?? ''} onChange={e => setApptForm(p => ({ ...p, specialty: e.target.value }))} placeholder="Neurology" />
          </Field>
          <Field label="Date & Time">
            <input className={inputCls} type="datetime-local" value={apptForm.date_time ? apptForm.date_time.slice(0, 16) : ''} onChange={e => setApptForm(p => ({ ...p, date_time: e.target.value }))} />
          </Field>
          <Field label={t('contacts.notes')}>
            <textarea className={inputCls} rows={3} value={apptForm.notes ?? ''} onChange={e => setApptForm(p => ({ ...p, notes: e.target.value }))} placeholder="Post-op check, bring MRI scans…" />
          </Field>
          <SaveBtn saving={saving} onSave={saveAppt} onCancel={() => setApptModal(null)} saveLabel={t('common.save')} cancelLabel={t('common.cancel')} />
        </Modal>
      )}

      {/* Medication Modal */}
      {medModal && (
        <Modal title={medModal === 'add' ? t('medications.title') : t('common.edit')} onClose={() => setMedModal(null)}>
          <Field label={t('medications.medicationName')}>
            <input className={inputCls} value={medForm.name ?? ''} onChange={e => setMedForm(p => ({ ...p, name: e.target.value }))} placeholder="Metoprolol 25mg" />
          </Field>
          <Field label={t('medications.dosage')}>
            <input className={inputCls} value={medForm.dosage ?? ''} onChange={e => setMedForm(p => ({ ...p, dosage: e.target.value }))} placeholder="1 tablet" />
          </Field>
          <Field label={t('medications.frequency')}>
            <select className={inputCls} value={medForm.frequency ?? ''} onChange={e => setMedForm(p => ({ ...p, frequency: e.target.value }))}>
              <option value="">Select…</option>
              <option>Daily</option>
              <option>Twice daily</option>
              <option>As needed</option>
              <option>Weekly</option>
            </select>
          </Field>
          <Field label={t('medications.instructions') ?? 'Instructions'}>
            <textarea className={inputCls} rows={2} value={(medForm as any).instructions ?? ''} onChange={e => setMedForm(p => ({ ...p, instructions: e.target.value }))} placeholder="Take with food…" />
          </Field>
          <div className="text-xs bg-amber-50 text-amber-800 rounded-lg px-3 py-2">
            ⚠️ {t('medications.disclaimer')}
          </div>
          <SaveBtn saving={saving} onSave={saveMed} onCancel={() => setMedModal(null)} saveLabel={t('common.save')} cancelLabel={t('common.cancel')} />
        </Modal>
      )}

      {/* Task Modal */}
      {taskModal && (
        <Modal title={taskModal === 'add' ? t('tasks.createNewTask') : t('common.edit')} onClose={() => setTaskModal(null)}>
          <Field label={t('tasks.taskTitle')}>
            <input className={inputCls} value={taskForm.title ?? ''} onChange={e => setTaskForm(p => ({ ...p, title: e.target.value }))} placeholder={t('tasks.titlePlaceholder')} />
          </Field>
          <Field label={t('tasks.description')}>
            <textarea className={inputCls} rows={2} value={taskForm.description ?? ''} onChange={e => setTaskForm(p => ({ ...p, description: e.target.value }))} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('tasks.priority')}>
              <select className={inputCls} value={taskForm.priority ?? 'medium'} onChange={e => setTaskForm(p => ({ ...p, priority: e.target.value }))}>
                <option value="high">{t('tasks.high')}</option>
                <option value="medium">{t('tasks.medium')}</option>
                <option value="low">{t('tasks.low')}</option>
              </select>
            </Field>
            <Field label={t('tasks.status')}>
              <select className={inputCls} value={taskForm.status ?? 'pending'} onChange={e => setTaskForm(p => ({ ...p, status: e.target.value }))}>
                <option value="pending">{t('tasks.pending')}</option>
                <option value="in_progress">{t('tasks.inProgress')}</option>
                <option value="completed">{t('tasks.completed')}</option>
                <option value="cancelled">{t('common.cancel')}</option>
              </select>
            </Field>
          </div>
          <Field label={t('tasks.assignTo')}>
            <select className={inputCls} value={taskForm.assigned_to ?? ''} onChange={e => setTaskForm(p => ({ ...p, assigned_to: e.target.value }))}>
              <option value="">{t('tasks.unassigned')}</option>
              {FAMILY_MEMBERS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </Field>
          <Field label={t('tasks.dueDate')}>
            <input className={inputCls} type="date" value={taskForm.due_date ?? ''} onChange={e => setTaskForm(p => ({ ...p, due_date: e.target.value }))} />
          </Field>
          <SaveBtn saving={saving} onSave={saveTask} onCancel={() => setTaskModal(null)} saveLabel={t('common.save')} cancelLabel={t('common.cancel')} />
        </Modal>
      )}

      {/* Contact Modal */}
      {contactModal && (
        <Modal title={contactModal === 'add' ? t('contacts.addContact') : t('common.edit')} onClose={() => { setContactModal(null); setContactError(null) }}>
          {contactError && (
            <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              {contactError}
            </div>
          )}
          <Field label={t('contacts.name')}>
            <input className={inputCls} value={contactForm.name ?? ''} onChange={e => setContactForm(p => ({ ...p, name: e.target.value }))} placeholder={t('contacts.contactNamePlaceholder')} />
          </Field>
          <Field label={t('contacts.role')}>
            <select className={inputCls} value={contactForm.role ?? 'family_member'} onChange={e => setContactForm(p => ({ ...p, role: e.target.value }))}>
              <option value="family_member">{t('contacts.familyMember')}</option>
              <option value="caregiver">{t('contacts.caregiver')}</option>
              <option value="medical_facility">{t('contacts.medicalFacility')}</option>
              <option value="pharmacy">{t('contacts.pharmacy')}</option>
              <option value="other">{t('contacts.other')}</option>
            </select>
          </Field>
          <Field label={`${t('contacts.phoneNumber')} (E.164 ${t('contacts.format')})`}>
            <input className={inputCls} value={contactForm.phone ?? ''} onChange={e => setContactForm(p => ({ ...p, phone: e.target.value }))} placeholder="+18095551234" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('contacts.country')}>
              <select className={inputCls} value={contactForm.country_code ?? 'US'} onChange={e => setContactForm(p => ({ ...p, country_code: e.target.value }))}>
                <option value="US">🇺🇸 United States</option>
                <option value="DO">🇩🇴 Dominican Republic</option>
                <option value="MX">🇲🇽 Mexico</option>
                <option value="CA">🇨🇦 Canada</option>
                <option value="PR">🇵🇷 Puerto Rico</option>
                <option value="ES">🇪🇸 Spain</option>
                <option value="GB">🇬🇧 United Kingdom</option>
              </select>
            </Field>
            <Field label={t('contacts.languagePreference')}>
              <select className={inputCls} value={contactForm.language_preference ?? 'en'} onChange={e => setContactForm(p => ({ ...p, language_preference: e.target.value }))}>
                <option value="en">{t('common.english')}</option>
                <option value="es">{t('common.spanish')}</option>
              </select>
            </Field>
          </div>
          <Field label={t('contacts.notes')}>
            <textarea className={inputCls} rows={2} maxLength={280} value={contactForm.notes ?? ''} onChange={e => setContactForm(p => ({ ...p, notes: e.target.value }))} placeholder={t('contacts.notesPlaceholder')} />
          </Field>
          <SaveBtn saving={saving} onSave={saveContact} onCancel={() => setContactModal(null)} saveLabel={t('common.save')} cancelLabel={t('common.cancel')} />
        </Modal>
      )}

      {/* Emergency Info Modal */}
      {emergencyModal && (
        <Modal title={t('emergency.title')} onClose={() => setEmergencyModal(false)}>
          <Field label={t('emergency.allergies')}>
            <input className={inputCls} value={emergencyForm.allergies ?? ''} onChange={e => setEmergencyForm(p => ({ ...p, allergies: e.target.value }))} placeholder="Penicillin, shellfish…" />
          </Field>
          <Field label={t('emergency.bloodType')}>
            <input className={inputCls} value={emergencyForm.blood_type ?? ''} onChange={e => setEmergencyForm(p => ({ ...p, blood_type: e.target.value }))} placeholder="O+" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('emergency.primaryDoctor')}>
              <input className={inputCls} value={emergencyForm.primary_doctor ?? ''} onChange={e => setEmergencyForm(p => ({ ...p, primary_doctor: e.target.value }))} />
            </Field>
            <Field label={t('emergency.primaryDoctorPhone')}>
              <input className={inputCls} value={emergencyForm.primary_doctor_phone ?? ''} onChange={e => setEmergencyForm(p => ({ ...p, primary_doctor_phone: e.target.value }))} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('emergency.insuranceProvider')}>
              <input className={inputCls} value={emergencyForm.insurance_provider ?? ''} onChange={e => setEmergencyForm(p => ({ ...p, insurance_provider: e.target.value }))} />
            </Field>
            <Field label={t('emergency.insuranceMemberId')}>
              <input className={inputCls} value={emergencyForm.insurance_member_id ?? ''} onChange={e => setEmergencyForm(p => ({ ...p, insurance_member_id: e.target.value }))} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('emergency.emergencyContactName')}>
              <input className={inputCls} value={emergencyForm.emergency_contact_name ?? ''} onChange={e => setEmergencyForm(p => ({ ...p, emergency_contact_name: e.target.value }))} />
            </Field>
            <Field label={t('emergency.emergencyContactPhone')}>
              <input className={inputCls} value={emergencyForm.emergency_contact_phone ?? ''} onChange={e => setEmergencyForm(p => ({ ...p, emergency_contact_phone: e.target.value }))} />
            </Field>
          </div>
          <Field label={t('emergency.notes')}>
            <textarea className={inputCls} rows={2} value={emergencyForm.notes ?? ''} onChange={e => setEmergencyForm(p => ({ ...p, notes: e.target.value }))} />
          </Field>
          <SaveBtn saving={saving} onSave={saveEmergencyInfo} onCancel={() => setEmergencyModal(false)} saveLabel={t('common.save')} cancelLabel={t('common.cancel')} />
        </Modal>
      )}

      {/* Add Document Modal */}
      {docModal && (
        <Modal title={t('documents.addDocument')} onClose={() => setDocModal(false)}>
          <Field label={t('documents.name')}>
            <input className={inputCls} value={docForm.name ?? ''} onChange={e => setDocForm(p => ({ ...p, name: e.target.value }))} placeholder="Health Insurance Card" />
          </Field>
          <Field label={t('documents.category')}>
            <select className={inputCls} value={docForm.category ?? 'other'} onChange={e => setDocForm(p => ({ ...p, category: e.target.value }))}>
              <option value="insurance">{t('documents.categoryInsurance')}</option>
              <option value="poa">{t('documents.categoryPoa')}</option>
              <option value="advance_directive">{t('documents.categoryAdvanceDirective')}</option>
              <option value="id">{t('documents.categoryId')}</option>
              <option value="other">{t('documents.categoryOther')}</option>
            </select>
          </Field>
          <Field label={t('documents.link')}>
            <input className={inputCls} value={docForm.file_url ?? ''} onChange={e => setDocForm(p => ({ ...p, file_url: e.target.value }))} placeholder="https://…" />
          </Field>
          <Field label={t('documents.notes')}>
            <textarea className={inputCls} rows={2} value={docForm.notes ?? ''} onChange={e => setDocForm(p => ({ ...p, notes: e.target.value }))} />
          </Field>
          <SaveBtn saving={saving} onSave={saveDoc} onCancel={() => setDocModal(false)} saveLabel={t('common.save')} cancelLabel={t('common.cancel')} />
        </Modal>
      )}

      {/* KintoScan Modal */}
      {scanModal && (
        <KintoScan
          hubId={hubId}
          onClose={() => setScanModal(false)}
          onSave={async (med) => {
            await supabase.from('medications').insert({
              ...med,
              hub_id: hubId,
              is_active: true,
            })
            setScanModal(false)
            await loadData()
          }}
        />
      )}
    </div>
  )
}
