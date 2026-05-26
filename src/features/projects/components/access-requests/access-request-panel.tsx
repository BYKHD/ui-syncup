"use client";

import { useId, useState } from "react";
import {
  RiCalendarEventLine,
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiLock2Line,
  RiMailCheckLine,
  RiSendPlane2Line,
  RiShieldCheckLine,
  RiShieldCrossLine,
  RiTimeLine,
} from "@remixicon/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import type { AccessRequest } from "@/features/projects/api";
import {
  useCreateAccessRequest,
  useCancelAccessRequest,
  useMyAccessRequest,
} from "@/features/projects/hooks";

interface Props {
  projectId: string;
  projectName: string;
  teamName: string;
  existingRequest: AccessRequest | null;
}

function isCooldownActive(existingRequest: AccessRequest): boolean {
  if (existingRequest.status !== "declined") return false;
  if (!existingRequest.declineCooldownUntil) return false;
  return new Date(existingRequest.declineCooldownUntil) > new Date();
}

function formatCooldownDate(declineCooldownUntil: string): string {
  return new Date(declineCooldownUntil).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function AccessRequestPanel({
  projectId,
  projectName,
  teamName,
  existingRequest,
}: Props) {
  const [message, setMessage] = useState("");
  const noteId = useId();

  const { data: currentRequest } = useMyAccessRequest(
    projectId,
    existingRequest,
  );
  const create = useCreateAccessRequest();
  const cancel = useCancelAccessRequest();

  if (currentRequest?.status === "pending") {
    return (
      <Card className="w-full max-w-lg overflow-hidden border-border/80 bg-card py-0 shadow-xl shadow-black/5">
        <CardHeader className="border-b bg-muted/30 px-5 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="uppercase tracking-wide">
                  <RiTimeLine aria-hidden="true" />
                  Awaiting review
                </Badge>
                <Badge variant="outline" className="font-normal">
                  {teamName} team
                </Badge>
              </div>
              <div className="flex min-w-0 flex-col gap-2">
                <CardTitle className="text-2xl tracking-tight">
                  Request pending
                </CardTitle>
                <CardDescription className="max-w-sm leading-relaxed">
                  Your request to join{" "}
                  <span className="font-medium text-foreground">
                    {projectName}
                  </span>{" "}
                  is waiting for a project owner.
                </CardDescription>
              </div>
            </div>
            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground shadow-xs">
              <RiMailCheckLine className="size-5" aria-hidden="true" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-5 px-5 py-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-lg border bg-background/60 p-3">
              <RiCheckboxCircleLine
                className="mt-0.5 size-4 text-muted-foreground"
                aria-hidden="true"
              />
              <div className="flex min-w-0 flex-col gap-1">
                <p className="text-sm font-medium">Submitted</p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  We saved your request and note.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border bg-background/60 p-3">
              <RiTimeLine
                className="mt-0.5 size-4 text-muted-foreground"
                aria-hidden="true"
              />
              <div className="flex min-w-0 flex-col gap-1">
                <p className="text-sm font-medium">Owner review</p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  You&apos;ll be notified when a decision is made.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t bg-muted/20 px-5 py-4">
          <Button
            variant="outline"
            size="sm"
            disabled={cancel.isPending}
            className="w-full sm:w-auto"
            onClick={() =>
              cancel.mutate({ projectId, requestId: currentRequest.id })
            }
          >
            {cancel.isPending ? (
              <>
                <Spinner data-icon="inline-start" />
                Cancelling request...
              </>
            ) : (
              <>
                <RiCloseCircleLine data-icon="inline-start" />
                Cancel request
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (
    currentRequest?.status === "declined" &&
    isCooldownActive(currentRequest)
  ) {
    return (
      <Card className="w-full max-w-lg overflow-hidden border-border/80 bg-card py-0 shadow-xl shadow-black/5">
        <CardHeader className="border-b bg-destructive/5 px-5 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="destructive">Cooldown active</Badge>
                <Badge variant="outline" className="font-normal">
                  {teamName} team
                </Badge>
              </div>
              <div className="flex min-w-0 flex-col gap-2">
                <CardTitle className="text-2xl tracking-tight">
                  Request not approved
                </CardTitle>
                <CardDescription className="max-w-sm leading-relaxed">
                  Access to{" "}
                  <span className="font-medium text-foreground">
                    {projectName}
                  </span>{" "}
                  was declined for now. You can send a new request after the
                  cooldown ends.
                </CardDescription>
              </div>
            </div>
            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-destructive/20 bg-background text-destructive shadow-xs">
              <RiShieldCrossLine className="size-5" aria-hidden="true" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-5 py-5">
          <div className="flex items-center justify-between gap-4 rounded-lg border bg-background/60 p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <RiCalendarEventLine className="size-4" aria-hidden="true" />
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium">Request again</p>
                <p className="text-xs text-muted-foreground">
                  Next eligible date
                </p>
              </div>
            </div>
            <p className="shrink-0 text-sm font-medium">
              {formatCooldownDate(currentRequest.declineCooldownUntil!)}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Form: no request, cancelled, superseded, or declined without active cooldown
  return (
    <Card className="w-full max-w-lg overflow-hidden border-border/80 bg-card py-0 shadow-xl shadow-black/5">
      <CardHeader className="border-b bg-muted/30 px-5 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="uppercase tracking-wide">
                <RiLock2Line aria-hidden="true" />
                Private project
              </Badge>
              <Badge variant="outline" className="font-normal">
                {teamName} team
              </Badge>
            </div>
            <div className="flex min-w-0 flex-col gap-2">
              <CardTitle className="text-2xl tracking-tight">
                Request access
              </CardTitle>
              <p className="truncate text-lg font-medium leading-none">
                {projectName}
              </p>
              <CardDescription className="max-w-sm leading-relaxed">
                This project is private. Send a short request and a project
                owner will review it.
              </CardDescription>
            </div>
          </div>
          <div className="flex size-12 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground shadow-xs">
            <RiShieldCheckLine className="size-5" aria-hidden="true" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 px-5 py-5">
        <FieldGroup className="gap-3">
          <Field className="gap-2">
            <div className="flex items-center justify-between gap-3">
              <FieldLabel htmlFor={noteId}>Note to project owner</FieldLabel>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {message.length}/500
              </span>
            </div>
            <Textarea
              id={noteId}
              placeholder="Add a note (optional)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              maxLength={500}
              className="min-h-24 resize-none text-sm"
            />
            <FieldDescription>
              Include the context an owner needs to recognize why you need
              access.
            </FieldDescription>
          </Field>
        </FieldGroup>
      </CardContent>
      <CardFooter className="border-t bg-muted/20 px-5 py-4">
        <Button
          className="w-full"
          size="lg"
          disabled={create.isPending}
          onClick={() =>
            create.mutate({
              projectId,
              body: { message: message.trim() || undefined },
            })
          }
        >
          {create.isPending ? (
            <>
              <Spinner data-icon="inline-start" />
              Sending request...
            </>
          ) : (
            <>
              <RiSendPlane2Line data-icon="inline-start" />
              Request access
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
