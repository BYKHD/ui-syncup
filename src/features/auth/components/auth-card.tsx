"use client";

type AuthCardProps = {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  footer?: React.ReactNode;
};

export function AuthCard({
  children,
  title = "UI Feedback Tracker",
  subtitle = "Capture and triage UI fidelity issues",
  footer,
}: AuthCardProps) {
  return (
    <section className="bg-muted min-h-screen">
      <div className="flex min-h-screen items-center justify-center px-4 py-10">
        <div className="flex w-full max-w-sm flex-col items-center gap-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold">{title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          </div>

          {children}

          {footer && (
            <div className="flex justify-center gap-1 text-sm text-muted-foreground">
              {footer}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
