import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { isSetupComplete } from '@/server/setup';
import { SetupScreen } from '@/features/setup/screens/setup-screen';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Setup | UI Syncup',
  description: 'Initial setup wizard for UI Syncup instance.',
};

export default async function SetupPage() {
  const done = await isSetupComplete();
  if (done) redirect('/sign-in');
  return <SetupScreen />;
}
