'use client';

import { SetupWizard } from '../components/setup-wizard';

export function SetupScreen() {
  return (
    <div className="container min-h-screen py-8 flex flex-col items-center justify-center bg-background">
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
            Welcome to UI Syncup
          </h1>
          <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
            Let&apos;s get your new instance configured and ready for your team.
          </p>
        </div>
        <SetupWizard />
      </div>
    </div>
  );
}
