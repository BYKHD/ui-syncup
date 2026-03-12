import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ServiceStatus } from '../types';

interface ServiceStatusBadgeProps {
  status: ServiceStatus;
  className?: string;
}

export function ServiceStatusBadge({ status, className }: ServiceStatusBadgeProps) {
  const getStatusConfig = (status: ServiceStatus) => {
    switch (status) {
      case 'connected':
        return {
          variant: 'default' as const,
          label: 'Connected',
          className: 'bg-green-500 hover:bg-green-600',
        };
      case 'not_configured':
        return {
          variant: 'secondary' as const,
          label: 'Not Configured',
          className: 'bg-yellow-500 hover:bg-yellow-600 text-white',
        };
      case 'error':
        return {
          variant: 'destructive' as const,
          label: 'Error',
          className: '',
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Badge
      variant={config.variant}
      className={cn('capitalize shadow-sm flex items-center gap-1.5', config.className, className)}
    >
      {status === 'connected' && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
        </span>
      )}
      {config.label}
    </Badge>
  );
}
