'use client';

import { useState } from 'react';

const DRAFT_KEY = 'ui-syncup:setup-draft';

interface SetupDraft {
  includeSampleData?: boolean;
}

function readDraft(): SetupDraft {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as SetupDraft) : {};
  } catch {
    return {};
  }
}

export function useSetupDraft() {
  const [draft, setDraftState] = useState<SetupDraft>(readDraft);

  const setDraft = (update: Partial<SetupDraft>) => {
    // The localStorage write used to live inside the setState updater. Updaters must be
    // pure — React may invoke them twice (StrictMode, concurrent rendering), which
    // duplicated the write. Compute the next value here and keep the updater trivial.
    const next = { ...draft, ...update };
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(next)); } catch { /* ignore */ }
    setDraftState(next);
  };

  const clearDraft = () => {
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
    setDraftState({});
  };

  return { draft, setDraft, clearDraft };
}
