'use server';

import { renderTemplate, EmailTemplate } from '@/server/email/render-template';
import { MOCK_EMAIL_TEMPLATES } from '@/mocks/email.fixtures';

export async function renderEmailPreview(templateKey: string): Promise<string> {
  const template = MOCK_EMAIL_TEMPLATES[templateKey];
  
  if (!template) {
    throw new Error(`Template not found: ${templateKey}`);
  }

  try {
    // renderTemplate uses renderToStaticMarkup which is synchronous,
    // but running it in a server action isolates it from the client component's render cycle.
    return await renderTemplate(template);
  } catch (error) {
    console.error('Error rendering email template:', error);
    return `<div style="color:red; padding: 20px;">Error rendering template: ${error instanceof Error ? error.message : 'Unknown error'}</div>`;
  }
}
