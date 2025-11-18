"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, RefreshCw, Home, Shield, Users, Settings } from "lucide-react";
import { useRouter } from "next/navigation";

// Error types for better error categorization
export enum SettingsErrorType {
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  TEAM_NOT_FOUND = 'TEAM_NOT_FOUND',
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export class SettingsError extends Error {
  public readonly type: SettingsErrorType;
  public readonly statusCode?: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string, 
    type: SettingsErrorType = SettingsErrorType.UNKNOWN_ERROR,
    statusCode?: number,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'SettingsError';
    this.type = type;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class PermissionError extends SettingsError {
  constructor(action: string, resource: string = 'resource') {
    super(
      `You don't have permission to ${action} ${resource}. Contact your team owner for access.`,
      SettingsErrorType.PERMISSION_DENIED,
      403
    );
  }
}

export class TeamNotFoundError extends SettingsError {
  constructor(teamId: string) {
    super(
      `Team not found or you don't have access to it.`,
      SettingsErrorType.TEAM_NOT_FOUND,
      404,
      { teamId }
    );
  }
}

export class NetworkError extends SettingsError {
  constructor(message: string = 'Network request failed') {
    super(message, SettingsErrorType.NETWORK_ERROR);
  }
}

export class ValidationError extends SettingsError {
  constructor(message: string, field?: string) {
    super(message, SettingsErrorType.VALIDATION_ERROR, 400, { field });
  }
}

interface SettingsErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  errorId?: string;
}

interface SettingsErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

class SettingsErrorBoundaryClass extends React.Component<
  SettingsErrorBoundaryProps,
  SettingsErrorBoundaryState
> {
  constructor(props: SettingsErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): SettingsErrorBoundaryState {
    // Generate unique error ID for tracking
    const errorId = `settings-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error with context
    this.logError(error, errorInfo);
    
    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });
  }

  private logError = (error: Error, errorInfo: React.ErrorInfo) => {
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Settings Error Boundary');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Error Data:', errorData);
      console.groupEnd();
    }

    // In production, you would send this to your error reporting service
    // Example: Sentry, LogRocket, Bugsnag, etc.
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to error reporting service
      // errorReportingService.captureException(error, errorData);
    }
  };

  retry = () => {
    this.setState({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined,
      errorId: undefined 
    });
  };

  render() {
    if (this.state.hasError) {
      const { fallback: Fallback } = this.props;
      
      if (Fallback && this.state.error) {
        return <Fallback error={this.state.error} retry={this.retry} />;
      }

      return (
        <DefaultSettingsErrorFallback 
          error={this.state.error} 
          errorId={this.state.errorId}
          retry={this.retry} 
        />
      );
    }

    return this.props.children;
  }
}

interface DefaultSettingsErrorFallbackProps {
  error?: Error;
  errorId?: string;
  retry: () => void;
}

function DefaultSettingsErrorFallback({ error, errorId, retry }: DefaultSettingsErrorFallbackProps) {
  const router = useRouter();

  const handleGoHome = () => {
    router.push('/');
  };

  const handleGoToGlobalSettings = () => {
    router.push('/settings');
  };

  const handleGoToTeamList = () => {
    router.push('/teams');
  };

  // Determine error type and appropriate messaging
  const getErrorDetails = (error?: Error) => {
    if (error instanceof SettingsError) {
      switch (error.type) {
        case SettingsErrorType.PERMISSION_DENIED:
          return {
            title: 'Access Denied',
            message: error.message,
            icon: Shield,
            variant: 'destructive' as const,
            actions: ['globalSettings', 'home']
          };
        case SettingsErrorType.TEAM_NOT_FOUND:
          return {
            title: 'Team Not Found',
            message: error.message,
            icon: Users,
            variant: 'destructive' as const,
            actions: ['teamList', 'globalSettings', 'home']
          };
        case SettingsErrorType.NETWORK_ERROR:
          return {
            title: 'Connection Error',
            message: 'Unable to connect to the server. Please check your internet connection and try again.',
            icon: AlertTriangle,
            variant: 'destructive' as const,
            actions: ['retry', 'home']
          };
        case SettingsErrorType.VALIDATION_ERROR:
          return {
            title: 'Validation Error',
            message: error.message,
            icon: AlertTriangle,
            variant: 'destructive' as const,
            actions: ['retry']
          };
        default:
          return {
            title: 'Settings Error',
            message: error.message,
            icon: Settings,
            variant: 'destructive' as const,
            actions: ['retry', 'globalSettings', 'home']
          };
      }
    }

    // Legacy error detection for backwards compatibility
    const isTeamContextError = error?.message?.includes('team') || error?.message?.includes('Team');
    const isPermissionError = error?.message?.toLowerCase().includes('permission') || 
                             error?.message?.toLowerCase().includes('forbidden') ||
                             error?.message?.toLowerCase().includes('unauthorized');

    if (isPermissionError) {
      return {
        title: 'Access Denied',
        message: 'You don\'t have permission to access this settings page. Contact your team owner for access.',
        icon: Shield,
        variant: 'destructive' as const,
        actions: ['globalSettings', 'home']
      };
    }

    if (isTeamContextError) {
      return {
        title: 'Team Context Error',
        message: 'There was an issue with the team context. This might happen when switching between teams or if you don\'t have access to the requested team.',
        icon: Users,
        variant: 'destructive' as const,
        actions: ['teamList', 'globalSettings', 'home']
      };
    }

    return {
      title: 'Unexpected Error',
      message: 'An unexpected error occurred while loading the settings page.',
      icon: AlertTriangle,
      variant: 'destructive' as const,
      actions: ['retry', 'globalSettings', 'home']
    };
  };

  const errorDetails = getErrorDetails(error);
  const ErrorIcon = errorDetails.icon;

  return (
    <div className="container mx-auto max-w-2xl px-6 py-8">
      <Alert variant={errorDetails.variant}>
        <ErrorIcon className="h-4 w-4" />
        <AlertTitle>{errorDetails.title}</AlertTitle>
        <AlertDescription className="mt-2">
          {errorDetails.message}
        </AlertDescription>
      </Alert>

      <div className="mt-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {errorDetails.actions.includes('retry') && (
            <Button onClick={retry} variant="default" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          )}
          
          {errorDetails.actions.includes('teamList') && (
            <Button onClick={handleGoToTeamList} variant="outline" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              View Teams
            </Button>
          )}
          
          {errorDetails.actions.includes('globalSettings') && (
            <Button onClick={handleGoToGlobalSettings} variant="outline" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Global Settings
            </Button>
          )}
          
          {errorDetails.actions.includes('home') && (
            <Button onClick={handleGoHome} variant="outline" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Go Home
            </Button>
          )}
        </div>

        {/* Error ID for support */}
        {errorId && (
          <div className="text-xs text-muted-foreground">
            Error ID: {errorId}
          </div>
        )}

        {/* Development error details */}
        {error && process.env.NODE_ENV === 'development' && (
          <details className="mt-4 p-4 bg-muted rounded-lg">
            <summary className="cursor-pointer font-medium">Error Details (Development)</summary>
            <div className="mt-2 space-y-2">
              <div>
                <strong>Message:</strong> {error.message}
              </div>
              {error instanceof SettingsError && (
                <>
                  <div>
                    <strong>Type:</strong> {error.type}
                  </div>
                  {error.statusCode && (
                    <div>
                      <strong>Status Code:</strong> {error.statusCode}
                    </div>
                  )}
                  {error.details && (
                    <div>
                      <strong>Details:</strong> {JSON.stringify(error.details, null, 2)}
                    </div>
                  )}
                </>
              )}
              <pre className="text-sm overflow-auto bg-background p-2 rounded border">
                {error.stack}
              </pre>
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

export function SettingsErrorBoundary(props: SettingsErrorBoundaryProps) {
  return <SettingsErrorBoundaryClass {...props} />;
}