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
      className={cn('capitalize shadow-sm', config.className, className)}
    >
      {config.label}
    </Badge>
  );
}
