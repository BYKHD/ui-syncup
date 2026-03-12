/**
 * Email service module
 * 
 * Provides email sending functionality with interchangeable providers
 * (Resend, SMTP, Console) using React-based email templates and
 * queue-based delivery.
 */

export { sendEmail, resolveProvider } from './client';
export type { EmailJob } from './client';
export { renderTemplate, getEmailSubject } from './render-template';
export type { EmailTemplate } from './render-template';
export { enqueueEmail, processEmailQueue } from './queue';
export type { EmailJobInput } from './queue';
export { 
  startEmailWorker, 
  stopEmailWorker, 
  getWorkerStatus, 
  processQueueOnce 
} from './worker';
