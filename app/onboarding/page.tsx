'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Heart } from 'lucide-react'

export default function OnboardingPage() {
  const [patientName, setPatientName] = useState('')
  const [patientDob, setPatientDob] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!patientName.trim()) {
      setError('Please enter the patient name.')
      return
    }
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/trpc/hubs.create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          json: {
            patientName: patientName.trim(),
            patientDob: patientDob || undefined,
          }
        }),
      })

      const data = await res.json()
      const hubId = data?.result?.data?.json?.hubId

      if (!hubId) throw new Error('Hub creation failed')
      router.push(`/dashboard/${hubId}`)
    } catch (err) {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDF8F2] px-4">
      <div className="w-full max-w-md">

        <div className="flex items-center justify-center gap-2 mb-8">
          <Heart className="h-8 w-8 text-[#DC2626]" strokeWidth={1.5} />
          <span className="text-2xl font-serif font-semibold text-[#1A2B3C]">Kinto Care</span>
        </div>

        <div className="bg-card rounded-xl border shadow-sm p-6">
          <div className="mb-6">
            <h1 className="text-lg font-semibold text-[#1A2B3C]">Set up your care hub</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Tell us who you're coordinating care for. You can update this anytime.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="patientName">
                Patient name
              </label>
              <input
                id="patientName"
                type="text"
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm"
                placeholder="e.g. Pedro Sr."
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="patientDob">
                Date of birth <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <input
                id="patientDob"
                type="date"
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm"
                value={patientDob}
                onChange={(e) => setPatientDob(e.target.value)}
              />
            </div>

            {error && (
              <p className="text-sm text-[#DC2626]">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center rounded-md h-9 px-4 py-2 text-sm font-medium text-white bg-[#DC2626] hover:bg-[#b91c1c] transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? 'Creating your hub...' : 'Create care hub'}
            </button>
          </form>

          <p className="mt-4 text-xs text-center text-muted-foreground">
            Kinto Care is a logistics and coordination tool. No medical diagnosis provided.
          </p>
        </div>

      </div>
    </div>
  )
}
