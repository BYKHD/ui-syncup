import type { Metadata } from 'next';
import { SetupScreen } from '@/features/setup/screens/setup-screen';

export const metadata: Metadata = {
  title: 'Setup | UI Syncup',
  description: 'Initial setup wizard for UI Syncup instance.',
};

export default function SetupPage() {
  return <SetupScreen />;
}
