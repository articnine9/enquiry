import type { Metadata } from 'next'
import LoginForm from '@/features/auth/components/LoginForm'

export const metadata: Metadata = { title: 'Sign In' }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>
}) {
  const { error, callbackUrl } = await searchParams
  return (
    <LoginForm
      callbackUrl={callbackUrl}
      errorCode={error}
    />
  )
}
