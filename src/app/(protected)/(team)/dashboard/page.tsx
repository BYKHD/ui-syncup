import { AppHeaderConfigurator } from '@/components/layout/headers'
import { DashboardScreen } from '@/features/dashboard'

export default function DashboardPage() {
  return (
    <>
      <AppHeaderConfigurator pageName="Dashboard" breadcrumbs={[{ label: 'Dashboard' }]} />
      <DashboardScreen />
    </>
  )
}
