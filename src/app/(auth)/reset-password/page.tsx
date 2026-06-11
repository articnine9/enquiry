import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import ResetPasswordForm from '@/features/auth/components/ResetPasswordForm'

export const metadata: Metadata = { title: 'Reset Password' }

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  // Token must be present in the URL
  if (!token) notFound()

  return <ResetPasswordForm token={token} />
}
