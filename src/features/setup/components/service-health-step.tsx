import { motion } from 'motion/react';
import { AlertCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ServiceStatusBadge } from './service-status-badge';
import { useServiceHealth } from '../hooks';
import type { UseSetupWizardReturn } from '../hooks';

interface ServiceHealthStepProps {
  wizard: UseSetupWizardReturn;
}

export function ServiceHealthStep({ wizard }: ServiceHealthStepProps) {
  const { data: health, isLoading, isError, refetch } = useServiceHealth();

  // Determine if we can proceed
  const canProceed = health?.database.status === 'connected';

  // Warnings for optional services
  const hasWarnings =
    health &&
    (health.email.status !== 'connected' ||
      health.storage.status !== 'connected' ||
      health.redis.status !== 'connected');

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight text-balance">System Health Check</h2>
        <p className="text-muted-foreground">
          Verifying connectivity to required and optional services.
        </p>
      </div>

      {isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Connection Error</AlertTitle>
          <AlertDescription>
            Failed to fetch service status. Please ensure the backend is running.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground motion-reduce:animate-none" />
          </div>
        ) : health ? (
          <motion.div 
            className="grid gap-4"
            initial="hidden"
            animate="show"
            variants={{
              hidden: { opacity: 0 },
              show: {
                opacity: 1,
                transition: { staggerChildren: 0.1 }
              }
            }}
          >
            {/* Database (Required) */}
            <motion.div variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } }}>
              <Card className={cn("hover:border-primary/30 transition-colors duration-300", health.database.status !== 'connected' ? 'border-destructive' : '')}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-medium">Database</CardTitle>
                <ServiceStatusBadge status={health.database.status} />
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{health.database.message}</p>
                {health.database.status !== 'connected' && (
                  <p className="text-sm text-destructive font-medium mt-2">
                    Required: Application cannot function without a database connection.
                  </p>
                )}
              </CardContent>
            </Card>
            </motion.div>

            {/* Email (Optional) */}
            <motion.div variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } }}>
            <Card className="hover:border-primary/30 transition-colors duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-medium">Email Service</CardTitle>
                <ServiceStatusBadge status={health.email.status} />
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{health.email.message}</p>
                {health.email.status !== 'connected' && (
                  <div className="mt-2 text-sm bg-muted p-2 rounded border border-border">
                    <span className="font-semibold">Impact: </span>
                    {health.email.degradedBehavior}
                  </div>
                )}
              </CardContent>
            </Card>
            </motion.div>

            {/* Storage (Optional) */}
            <motion.div variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } }}>
            <Card className="hover:border-primary/30 transition-colors duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-medium">Object Storage</CardTitle>
                <ServiceStatusBadge status={health.storage.status} />
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{health.storage.message}</p>
                {health.storage.status !== 'connected' && (
                  <div className="mt-2 text-sm bg-muted p-2 rounded border border-border">
                    <span className="font-semibold">Impact: </span>
                    {health.storage.degradedBehavior}
                  </div>
                )}
              </CardContent>
            </Card>
            </motion.div>

            {/* Redis (Optional) */}
            <motion.div variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } }}>
            <Card className="hover:border-primary/30 transition-colors duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-medium">Redis Cache</CardTitle>
                <ServiceStatusBadge status={health.redis.status} />
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{health.redis.message}</p>
                {health.redis.status !== 'connected' && (
                  <div className="mt-2 text-sm bg-muted p-2 rounded border border-border">
                    <span className="font-semibold">Impact: </span>
                    {health.redis.degradedBehavior}
                  </div>
                )}
              </CardContent>
            </Card>
            </motion.div>
          </motion.div>
        ) : null}
      </div>

      {hasWarnings && canProceed && (
        <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-900/50">
          <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
          <AlertTitle className="text-yellow-800 dark:text-yellow-400">Partial Configuration</AlertTitle>
          <AlertDescription className="text-yellow-700 dark:text-yellow-300">
            Some optional services are not configured. The application will function with degraded features.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end gap-4 pt-4">
        <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw
            className={cn(
              "mr-2 h-4 w-4 motion-reduce:animate-none",
              isLoading && "animate-spin"
            )}
          />
          Recheck Status
        </Button>
        <Button
          onClick={() => {
              wizard.markStepComplete('health-check');
              wizard.goToNextStep();
          }}
          disabled={!canProceed || isLoading}
        >
          Continue to Create Admin Account
        </Button>
      </div>
    </div>
  );
}
