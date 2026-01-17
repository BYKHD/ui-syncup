import type { Metadata } from 'next';
import { SetupScreen } from '@/features/setup/screens/setup-screen';

export const metadata: Metadata = {
  title: 'Setup | Kiro',
  description: 'Initial setup wizard for Kiro instance.',
};

export default function SetupPage() {
  return <SetupScreen />;
}
