"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, AlertTriangle, Check } from "lucide-react";
import { ROLE_LABELS } from "@/config/roles";
import { formatDistanceToNow, isPast, differenceInHours } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

interface TeamInvitationAcceptanceScreenProps {
  token: string;
  invitationId: string;
  invitation: {
    email: string;
    managementRole: string | null;
    operationalRole: string;
    expiresAt: Date;
  };
  teamName: string;
  inviterName: string;
  currentUserEmail: string;
}

export function TeamInvitationAcceptanceScreen({
  token,
  invitationId,
  invitation,
  teamName,
  inviterName,
  currentUserEmail,
}: TeamInvitationAcceptanceScreenProps) {
  const router = useRouter();
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [isDeclined, setIsDeclined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const emailMismatch = currentUserEmail.toLowerCase() !== invitation.email.toLowerCase();

  const getExpirationDisplay = () => {
    if (isPast(invitation.expiresAt)) {
      return { text: "Expired", color: "text-destructive", urgent: false };
    }
    const hoursRemaining = differenceInHours(invitation.expiresAt, new Date());
    const isUrgent = hoursRemaining < 24;
    return {
      text: `Expires ${formatDistanceToNow(invitation.expiresAt, { addSuffix: true })}`,
      color: isUrgent ? "text-orange-600 dark:text-orange-500" : "text-muted-foreground",
      urgent: isUrgent,
    };
  };

  const expirationDisplay = getExpirationDisplay();

  const handleAccept = async () => {
    setIsAccepting(true);
    setError(null);
    try {
      const response = await fetch(`/api/teams/invitations/${token}/accept`);
      if (response.redirected) {
        setShowSuccess(true);
        toast.success("Invitation accepted successfully");
        setTimeout(() => {
          router.push("/projects");
        }, 1500);
        return;
      }
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error?.message || "Failed to accept invitation");
      }
      setShowSuccess(true);
      toast.success("Invitation accepted successfully");
      setTimeout(() => {
        router.push("/projects");
      }, 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to accept invitation";
      setError(message);
      toast.error(message);
      setIsAccepting(false);
    }
  };

  const handleDecline = async () => {
    setIsDeclining(true);
    setError(null);
    try {
      const response = await fetch(`/api/teams/invitations/by-id/${invitationId}/decline`, {
        method: "POST",
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error?.message || "Failed to decline invitation");
      }
      toast.success("Invitation declined");
      setIsDeclined(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to decline invitation";
      setError(message);
      toast.error(message);
      setIsDeclining(false);
    }
  };

  if (isDeclined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invitation Declined</CardTitle>
            <CardDescription>
              You have declined the invitation to join <strong>{teamName}</strong>.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button variant="outline" onClick={() => router.push("/projects")}>
              Go to Projects
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const operationalRoleLabel = ROLE_LABELS[invitation.operationalRole as keyof typeof ROLE_LABELS] ?? invitation.operationalRole;
  const managementRoleLabel = invitation.managementRole
    ? (ROLE_LABELS[invitation.managementRole as keyof typeof ROLE_LABELS] ?? invitation.managementRole)
    : null;

  return (
    <>
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
        <Card className="w-full max-w-md shadow-lg transition-all hover:shadow-xl">
          <CardHeader className="text-center">
            <div className="mb-2 flex justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <span className="text-xl font-bold text-primary">
                  {teamName.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
            <CardTitle className="text-2xl">Team Invitation</CardTitle>
            <CardDescription>
              You have been invited to join <strong>{teamName}</strong>
            </CardDescription>
          </CardHeader>

          {emailMismatch && (
            <div className="mx-6 mb-4" role="alert">
              <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-900 dark:bg-orange-950/30">
                <div className="flex gap-3">
                  <AlertTriangle className="h-5 w-5 flex-shrink-0 text-orange-600 dark:text-orange-500" />
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
                      Email Mismatch
                    </p>
                    <p className="text-sm text-orange-800 dark:text-orange-200">
                      You are logged in as <strong>{currentUserEmail}</strong>, but this invitation was sent to <strong>{invitation.email}</strong>.
                    </p>
                    <p className="text-xs text-orange-700 dark:text-orange-300">
                      Accepting will add you ({currentUserEmail}) to the team.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <CardContent className="space-y-6">
            <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Invited by:</span>
                <span className="font-medium text-right">{inviterName}</span>

                <span className="text-muted-foreground">Role:</span>
                <span className="flex justify-end">
                  <Badge variant="secondary" className="font-normal">
                    {operationalRoleLabel}
                  </Badge>
                </span>

                {managementRoleLabel && (
                  <>
                    <span className="text-muted-foreground">Admin role:</span>
                    <span className="flex justify-end">
                      <Badge variant="secondary" className="font-normal">
                        {managementRoleLabel}
                      </Badge>
                    </span>
                  </>
                )}

                <span className="text-muted-foreground">Expires:</span>
                <span className={`text-right text-sm font-medium ${expirationDisplay.color}`}>
                  <span className="flex items-center justify-end gap-1.5">
                    {expirationDisplay.urgent && (
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75"></span>
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500"></span>
                      </span>
                    )}
                    <span aria-label={`Expires on ${invitation.expiresAt.toLocaleDateString()}`}>
                      {expirationDisplay.text}
                    </span>
                  </span>
                </span>
              </div>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              By accepting, you will gain access to this team&apos;s projects and collaboration tools.
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3">
            {error && (
              <div className="mb-2 flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}
            <Button
              className="w-full"
              size="lg"
              onClick={handleAccept}
              disabled={isAccepting || isDeclining}
              aria-label={`Accept invitation to join ${teamName}`}
            >
              {isAccepting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Joining Team...
                </>
              ) : (
                "Accept Invitation"
              )}
            </Button>

            {error && (
              <Button
                variant="outline"
                className="w-full"
                onClick={handleAccept}
                disabled={isAccepting || isDeclining}
              >
                Try Again
              </Button>
            )}

            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={handleDecline}
              disabled={isAccepting || isDeclining}
              aria-label={`Decline invitation to join ${teamName}`}
            >
              {isDeclining ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Decline
            </Button>
          </CardFooter>
        </Card>
      </div>

      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
            aria-live="polite"
            aria-atomic="true"
          >
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", duration: 0.5, delay: 0.1 }}
              className="flex flex-col items-center gap-4"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }}
                className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500 shadow-lg"
              >
                <Check className="h-10 w-10 text-white" strokeWidth={3} />
              </motion.div>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-lg font-medium"
              >
                Joined {teamName}!
              </motion.p>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-sm text-muted-foreground"
              >
                Redirecting to projects...
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
