export const ISSUE_WORKFLOW = {
    open: {
      label: "Open",
      description: "Created from design annotation; triage done. Ready for development.",
      stage: "creation",
      allowedTransitions: ["in_progress", "archived"],
      workflowNotes:
        "Issue has been created and triaged. Designer has provided clear requirements and assets. Ready for developer assignment.",
    },
    in_progress: {
      label: "In Progress",
      description: "Developer is implementing/fixing the issue.",
      stage: "development",
      allowedTransitions: ["in_review", "open", "archived"],
      workflowNotes: "Developer is actively working…",
    },
    in_review: {
      label: "In Review",
      description: "Waiting on design review. Implementation complete, needs approval.",
      stage: "review",
      allowedTransitions: ["resolved", "in_progress", "archived"],
    },
    resolved: {
      label: "Resolved",
      description: "Accepted by design; merged/deployed as defined.",
      stage: "completion",
      allowedTransitions: ["archived", "in_progress"],
      requiresConfirmation: true,
    },
    archived: {
      label: "Archived",
      description: "Long-term storage. No further edits expected.",
      stage: "storage",
      allowedTransitions: [],
      requiresConfirmation: true,
    },
  } as const