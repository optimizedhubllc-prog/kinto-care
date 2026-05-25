'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      setError(error.message)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDF8F2] px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
            viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            className="h-8 w-8 text-[#DC2626]">
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
          </svg>
          <span className="text-2xl font-serif font-semibold text-[#1A2B3C]">Kinto Care</span>
        </div>

        <div className="bg-card rounded-xl border shadow-sm py-6">
          <div className="px-6 mb-6">
            <h1 className="text-lg font-semibold leading-none">Set new password</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Choose a strong password for your account.
            </p>
          </div>

          <div className="px-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="password">
                  New Password
                </label>
                <input
                  id="password"
                  type="password"
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="confirmPassword">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  required
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
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>

            <p className="mt-4 text-xs text-center text-muted-foreground">
              Kinto Care is a logistics and coordination tool. No medical diagnosis provided.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
