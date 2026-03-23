import type { Metadata } from 'next'
import { HealthScreen } from '@/features/health'

export const metadata: Metadata = {
  title: 'Platform Health',
  description: 'Real-time status of all platform dependencies',
  robots: { index: false, follow: false },
}

export default function HealthPage() {
  return <HealthScreen />
}
