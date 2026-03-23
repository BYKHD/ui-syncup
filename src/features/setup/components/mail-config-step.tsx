'use client';

import { motion } from 'motion/react';
import {
  Zap,
  Server,
  CheckCircle2,
  XCircle,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useServiceHealth } from '../hooks';
import type { UseSetupWizardReturn } from '../hooks';

interface MailConfigStepProps {
  wizard: UseSetupWizardReturn;
}

interface EnvVar {
  key: string;
  required: boolean;
  description: string;
}

interface ProviderConfig {
  id: string;
  name: string;
  Icon: React.ElementType;
  envVars: EnvVar[];
}

const PROVIDERS: ProviderConfig[] = [
  {
    id: 'resend',
    name: 'Resend',
    Icon: Zap,
    envVars: [
      {
        key: 'RESEND_API_KEY',
        required: true,
        description: 'Your Resend API key (starts with re_)',
      },
      {
        key: 'RESEND_FROM_EMAIL',
        required: false,
        description: 'Sender address (defaults to noreply@ui-syncup.com)',
      },
    ],
  },
  {
    id: 'smtp',
    name: 'SMTP',
    Icon: Server,
    envVars: [
      {
        key: 'SMTP_HOST',
        required: true,
        description: 'Mail server hostname (e.g. mailpit for Docker, smtp.example.com for production)',
      },
      {
        key: 'SMTP_PORT',
        required: true,
        description: 'Mail server port (e.g. 1025 for Mailpit, 587 or 465 for production)',
      },
      { key: 'SMTP_FROM_EMAIL', required: true, description: 'Sender address' },
      {
        key: 'SMTP_USER',
        required: false,
        description: 'SMTP username (optional, but co-required with password)',
      },
      {
        key: 'SMTP_PASSWORD',
        required: false,
        description: 'SMTP password (optional, but co-required with username)',
      },
    ],
  },
];

export function MailConfigStep({ wizard }: MailConfigStepProps) {
  const { data: health, isLoading, isError, refetch } = useServiceHealth();

  const emailStatus = health?.email;
  const isConfigured = emailStatus?.status === 'connected';
  const hasError = emailStatus?.status === 'error';

  const handleContinue = () => {
    wizard.markStepComplete('mail-config');
    wizard.goToNextStep();
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight text-balance">Email Configuration</h2>
        <p className="text-muted-foreground">
          Set environment variables to configure an email provider. This step is optional — you
          can configure it later and restart your instance.
        </p>
      </div>

      {/* Status banner */}
      <div className="flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin motion-reduce:animate-none" />
            <span>Checking email status…</span>
          </div>
        ) : isError ? (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Failed to fetch service status.</span>
          </div>
        ) : emailStatus ? (
          <div
            className={cn(
              'flex items-center gap-2 text-sm',
              isConfigured
                ? 'text-green-600 dark:text-green-400'
                : hasError
                  ? 'text-destructive'
                  : 'text-muted-foreground',
            )}
          >
            {isConfigured ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{emailStatus.message}</span>
          </div>
        ) : null}

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading}
          className="shrink-0"
        >
          <RefreshCw
            className={cn('mr-1.5 h-3.5 w-3.5', isLoading && 'animate-spin motion-reduce:animate-none')}
          />
          Recheck
        </Button>
      </div>

      {/* Provider env var reference */}
      <motion.div
        className="space-y-3"
        initial="hidden"
        animate="show"
        variants={{
          hidden: { opacity: 0 },
          show: { opacity: 1, transition: { staggerChildren: 0.08 } },
        }}
      >
        {PROVIDERS.map((provider) => (
          <motion.div
            key={provider.id}
            variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
            className="rounded-lg border bg-card"
          >
            <div className="flex items-center gap-2.5 border-b px-4 py-3">
              <provider.Icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{provider.name}</span>
            </div>
            <div className="space-y-2 px-4 py-3">
              {provider.envVars.map((envVar) => (
                <div key={envVar.key} className="flex items-start gap-3">
                  <code
                    className={cn(
                      'mt-px shrink-0 rounded px-1.5 py-0.5 font-mono text-xs',
                      envVar.required
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {envVar.key}
                  </code>
                  <span className="text-xs text-muted-foreground">{envVar.description}</span>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </motion.div>


      <div className="flex items-center justify-between gap-4 pt-2">
        <Button variant="ghost" onClick={() => wizard.goToPreviousStep()}>
          Back
        </Button>
        <Button onClick={handleContinue}>
          Continue
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
