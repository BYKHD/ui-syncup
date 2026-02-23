import type { EmailJob } from '../client';

export interface EmailProvider {
  send(job: EmailJob, htmlContent: string): Promise<void>;
}
