'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Heart, Users, Calendar, Pill, CheckSquare, LogOut } from 'lucide-react'

type HubMember = { id: string; user_id: string; role: string; users: { name: string | null; email: string | null } | null }
type Appointment = { id: string; doctor_name: string | null; specialty: string | null; date_time: string; location: string | null; notes: string | null }
type Medication = { id: string; name: string; dosage: string | null; frequency: string | null; is_active: boolean }
type Task = { id: string; title: string; description: string | null; due_date: string | null; status: string; priority: string }

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

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [hubRes, membersRes, apptRes, medsRes, tasksRes] = await Promise.all([
        supabase.from('patient_hubs').select('patient_name').eq('id', hubId).single(),
        supabase.from('hub_members').select('id, user_id, role, users(name, email)').eq('hub_id', hubId),
        supabase.from('appointments').select('id, doctor_name, specialty, date_time, location, notes').eq('hub_id', hubId).order('date_time', { ascending: true }),
        supabase.from('medications').select('id, name, dosage, frequency, is_active').eq('hub_id', hubId).eq('is_active', true).order('name', { ascending: true }),
        supabase.from('tasks').select('id, title, description, due_date, status, priority').eq('hub_id', hubId).order('created_at', { ascending: false }),
      ])

      if (hubRes.error) { setError('Could not load hub.'); setLoading(false); return }

      setPatientName(hubRes.data.patient_name)
      setMembers((membersRes.data as unknown as HubMember[]) ?? [])
      setAppointments(apptRes.data ?? [])
      setMedications(medsRes.data ?? [])
      setTasks(tasks => { void tasks; return tasksRes.data ?? [] })
      setLoading(false)
    }
    load()
  }, [hubId, router])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
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
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart className="h-6 w-6 text-[#DC2626]" strokeWidth={1.5} />
          <span className="text-xl font-serif font-semibold text-[#1A2B3C]">Kinto Care</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">Care hub for <strong className="text-[#1A2B3C]">{patientName}</strong></span>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-[#DC2626] transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign out
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
            <span className="ml-auto text-xs text-muted-foreground">{appointments.length} upcoming</span>
          </div>
          {appointments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No appointments scheduled.</p>
          ) : (
            <div className="space-y-3">
              {appointments.map(a => (
                <div key={a.id} className="flex flex-col gap-1 py-2 border-b last:border-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-[#1A2B3C]">{a.doctor_name ?? 'Unknown provider'}</p>
                    <p className="text-xs text-muted-foreground">{new Date(a.date_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
                  </div>
                  {a.specialty && <p className="text-xs text-muted-foreground">{a.specialty}</p>}
                  {a.location && <p className="text-xs text-muted-foreground">📍 {a.location}</p>}
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
            <span className="ml-auto text-xs text-muted-foreground">{medications.length} active</span>
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
            <span className="ml-auto text-xs text-muted-foreground">{tasks.filter(t => t.status !== 'completed').length} open</span>
          </div>
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tasks yet.</p>
          ) : (
            <div className="space-y-2">
              {tasks.map(t => (
                <div key={t.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className={`text-sm font-medium ${t.status === 'completed' ? 'line-through text-muted-foreground' : 'text-[#1A2B3C]'}`}>{t.title}</p>
                    {t.due_date && <p className="text-xs text-muted-foreground">Due {new Date(t.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${priorityColor(t.priority)}`}>{t.priority}</span>
                    <span className="text-xs bg-[#FDF8F2] border rounded-full px-2 py-0.5 text-[#1A2B3C]">{statusLabel(t.status)}</span>
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
    </div>
  )
}
