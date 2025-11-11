"use client";

import { PropsWithChildren } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PrioritySelector } from "./priority-selector";
import { TypeSelector } from "./type-selector";
import { RiImageAddLine } from "@remixicon/react";
import type { IssuePriority, IssueType } from "@/features/issues/types";

type IssuePriorityValue = IssuePriority | null
type IssueTypeValue = IssueType | null

interface IssueFormData {
  title: string
  description: string
  type: IssueTypeValue
  priority: IssuePriorityValue
}

interface IssuesCreateDialogProps extends PropsWithChildren {
  open: boolean
  onOpenChange: (open: boolean) => void
  formData: IssueFormData
  errors?: {
    title?: string
    description?: string
    type?: string
    priority?: string
  }
  isSubmitting?: boolean
  onTitleChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onTypeChange: (value: IssueTypeValue) => void
  onPriorityChange: (value: IssuePriorityValue) => void
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  onCancel: () => void
  // Visual upload mockup props
  attachmentCount?: number
  onBrowseAttachments?: () => void
}

export function IssuesCreateDialog({
  open,
  onOpenChange,
  formData,
  errors = {},
  isSubmitting = false,
  onTitleChange,
  onDescriptionChange,
  onTypeChange,
  onPriorityChange,
  onSubmit,
  onCancel,
  attachmentCount = 0,
  onBrowseAttachments,
  children,
}: IssuesCreateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="flex sm:min-w-[600px] max-h-[min(600px,80vh)] flex-col gap-0 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="sr-only">Create Issue</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate>
          <ScrollArea className="min-h-[100px] max-h-[600px] w-full">
            <FieldSet className="space-y-6 p-1">
              <FieldGroup className="space-y-2 m-0">
                <FieldGroup className="space-y-0">
                  <Field>
                    <FieldContent>
                      <Input
                        type="text"
                        placeholder="Enter issue title"
                        className="bg-transparent dark:bg-transparent border-none rounded-none w-full shadow-none outline-none px-0 h-auto focus-visible:ring-0 overflow-hidden md:text-xl font-medium text-ellipsis whitespace-normal break-words"
                        value={formData.title}
                        onChange={(e) => onTitleChange(e.target.value)}
                        aria-invalid={!!errors.title}
                        maxLength={80}
                      />
                    </FieldContent>
                    {errors.title && (
                      <FieldDescription className="text-destructive">
                        {errors.title}
                      </FieldDescription>
                    )}
                  </Field>
                  <Field>
                    <Textarea
                      placeholder="Enter issue description"
                      className="bg-transparent dark:bg-transparent border-none rounded-none w-full shadow-none outline-none resize-none px-0 min-h-24 focus-visible:ring-0 break-words whitespace-normal overflow-wrap"
                      value={formData.description}
                      onChange={(e) => onDescriptionChange(e.target.value)}
                      aria-invalid={!!errors.description}
                      maxLength={5000}
                    />
                    {errors.description && (
                      <FieldDescription className="text-destructive">
                        {errors.description}
                      </FieldDescription>
                    )}
                  </Field>
                </FieldGroup>

                {/* Visual mockup: Attachment area */}
                {attachmentCount > 0 && (
                  <div className="border rounded-md p-4 bg-muted/30">
                    <p className="text-sm text-muted-foreground">
                      {attachmentCount} attachment{attachmentCount > 1 ? 's' : ''} selected
                    </p>
                  </div>
                )}
              </FieldGroup>

              <div className="flex items-top justify-between gap-2">
                <div className="flex items-top justify-start gap-2 m-0 flex-wrap">
                  <Field className="w-fit">
                    <FieldLabel className="sr-only">Type</FieldLabel>
                    <FieldContent>
                      <TypeSelector
                        value={formData.type}
                        onChange={onTypeChange}
                      />
                    </FieldContent>
                    {errors.type && (
                      <FieldDescription className="text-destructive">
                        {errors.type}
                      </FieldDescription>
                    )}
                  </Field>
                  <Field className="w-fit">
                    <FieldLabel className="sr-only">Priority</FieldLabel>
                    <FieldContent>
                      <PrioritySelector
                        value={formData.priority}
                        onChange={onPriorityChange}
                      />
                    </FieldContent>
                    {errors.priority && (
                      <FieldDescription className="text-destructive">
                        {errors.priority}
                      </FieldDescription>
                    )}
                  </Field>
                </div>
                {onBrowseAttachments && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon-sm"
                    onClick={onBrowseAttachments}
                  >
                    <RiImageAddLine className="size-4" />
                  </Button>
                )}
              </div>
            </FieldSet>
          </ScrollArea>
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Issue"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
