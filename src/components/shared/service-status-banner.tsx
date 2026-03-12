"use client";

/**
 * ServiceStatusBanner Component
 * 
 * Displays a warning banner when optional services (email, storage, Redis) 
 * are not configured. Shows degraded functionality for each service.
 * 
 * @requirements Requirement 9.4 - Display banner in admin settings for degraded state
 */

import { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useServiceHealth } from "@/features/setup";
import type { ServiceHealthDTO } from "@/features/setup/api";

interface ServiceInfo {
  key: keyof Omit<ServiceHealthDTO, 'database'>;
  label: string;
  docUrl: string;
}

const OPTIONAL_SERVICES: ServiceInfo[] = [
  {
    key: 'email',
    label: 'Email (Resend)',
    docUrl: '/docs/configuration#email',
  },
  {
    key: 'storage',
    label: 'Storage (R2/S3)',
    docUrl: '/docs/configuration#storage',
  },
  {
    key: 'redis',
    label: 'Redis',
    docUrl: '/docs/configuration#redis',
  },
];

export function ServiceStatusBanner() {
  const { data: health, isLoading } = useServiceHealth();
  const [isExpanded, setIsExpanded] = useState(false);

  // Don't render during loading or if health data not available
  if (isLoading || !health) {
    return null;
  }

  // Filter services that are not configured
  const unconfiguredServices = OPTIONAL_SERVICES.filter(
    (service) => health[service.key].status === 'not_configured'
  );

  // Don't render if all services are configured
  if (unconfiguredServices.length === 0) {
    return null;
  }

  return (
    <Alert className="mb-6 border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      <AlertTitle className="text-amber-800 dark:text-amber-200">
        Some services are not configured
      </AlertTitle>
      <AlertDescription className="text-amber-700 dark:text-amber-300">
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <div className="flex items-center justify-between">
            <p className="text-sm">
              {unconfiguredServices.length} optional service{unconfiguredServices.length > 1 ? 's are' : ' is'} running in degraded mode.
            </p>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 h-7 px-2">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <span className="ml-1">{isExpanded ? 'Hide' : 'Show'} details</span>
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent className="mt-3 space-y-2">
            {unconfiguredServices.map((service) => {
              const serviceHealth = health[service.key];
              return (
                <div
                  key={service.key}
                  className="rounded-md bg-amber-100/50 dark:bg-amber-900/20 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-medium text-sm text-amber-900 dark:text-amber-100">
                        {service.label}
                      </p>
                      <p className="text-sm text-amber-700 dark:text-amber-300 mt-0.5">
                        {serviceHealth.degradedBehavior || serviceHealth.message}
                      </p>
                    </div>
                    <a
                      href={service.docUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 hover:underline whitespace-nowrap"
                    >
                      Configure
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              );
            })}
          </CollapsibleContent>
        </Collapsible>
      </AlertDescription>
    </Alert>
  );
}
