"use client";

import { useLinkedAccounts, useLinkAccount, useUnlinkAccount } from "@/features/auth/hooks";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RiGoogleFill, RiMicrosoftFill, RiTentFill, RiLinkM, RiLoader4Line } from "@remixicon/react";
import type { OAuthProvider } from "@/features/auth/api/types";
import { useState } from "react";
import { PasswordSection } from "./password-section";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Provider configuration for UI display
const PROVIDER_CONFIG = {
  google: {
    name: "Google",
    icon: RiGoogleFill,
  },
  microsoft: {
    name: "Microsoft",
    icon: RiMicrosoftFill,
  },
  atlassian: {
    name: "Atlassian",
    icon: RiTentFill,
  },
} as const;

export interface SecuritySettingsProps {
  hasPassword: boolean;
}

export function SecuritySettings({ hasPassword }: SecuritySettingsProps) {
  const { data: linkedAccounts, isLoading: isLoadingAccounts, error: loadError } = useLinkedAccounts();
  const { mutate: linkAccount, isPending: isLinking } = useLinkAccount();
  const { mutate: unlinkAccount, isPending: isUnlinking } = useUnlinkAccount();

  const [error, setError] = useState<string | null>(null);

  // Check if a provider is already linked
  const isLinked = (provider: OAuthProvider) => {
    return linkedAccounts?.some((acc) => acc.providerId === provider);
  };

  // Handle linking a new provider
  const handleLink = (provider: OAuthProvider) => {
    setError(null);
    linkAccount({ provider, callbackURL: "/settings/security" }, {
      onError: (err) => setError(err.message),
    });
  };

  // Handle unlinking a provider
  const handleUnlink = (provider: OAuthProvider) => {
    setError(null);
    unlinkAccount({ providerId: provider }, {
      onError: (err) => setError(err.message),
    });
  };

  if (loadError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load linked accounts. Please try again.</AlertDescription>
      </Alert>
    );
  }

  const providers: OAuthProvider[] = ["google", "microsoft", "atlassian"];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Security</h3>
        <p className="text-sm text-muted-foreground">
          Manage your account security and authentication methods.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Password Management Section */}
      <PasswordSection hasPassword={hasPassword} />

      {/* Linked Accounts Section */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Connected Accounts
        </h4>
        
        {isLoadingAccounts ? (
             <div className="space-y-4">
               <div className="h-24 w-full animate-pulse rounded-lg bg-muted" />
               <div className="h-24 w-full animate-pulse rounded-lg bg-muted" />
             </div>
        ) : (
            <div className="grid gap-3">
              {providers.map((provider) => {
                const config = PROVIDER_CONFIG[provider];
                const Icon = config.icon;
                const linked = isLinked(provider);
                const isLoading = isLinking || isUnlinking;

                return (
                  <Card key={provider}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium">{config.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {linked ? "Connected" : "Not connected"}
                          </p>
                        </div>
                      </div>

                      {linked ? (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              disabled={isLoading}
                              className="border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            >
                              {isUnlinking ? (
                                <RiLoader4Line className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                "Disconnect"
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Unlink {config.name} account?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to disconnect your {config.name} account? 
                                Make sure you have another way (like a password) to sign in.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleUnlink(provider)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Disconnect
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ) : (
                        <Button
                          variant="ghost" 
                          onClick={() => handleLink(provider)}
                          disabled={isLoading}
                          className="border border-input"
                        >
                          {isLinking ? (
                            <RiLoader4Line className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <RiLinkM className="mr-2 h-4 w-4" />
                              Connect
                            </>
                          )}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
        )}
      </div>
    </div>
  );
}
