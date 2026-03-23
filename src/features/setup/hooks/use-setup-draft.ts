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
    setDraftState(prev => {
      const next = { ...prev, ...update };
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const clearDraft = () => {
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
    setDraftState({});
  };

  return { draft, setDraft, clearDraft };
}
