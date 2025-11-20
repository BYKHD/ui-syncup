import EmailPreviewScreen from '@/features/email-preview/screens/email-preview-screen';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Email Preview - UI SyncUp',
  description: 'Preview email templates',
};

export default function EmailPreviewPage() {
  return <EmailPreviewScreen />;
}
