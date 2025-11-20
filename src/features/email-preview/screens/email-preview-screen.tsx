'use client';

import * as React from 'react';
import { MOCK_EMAIL_TEMPLATES } from '@/mocks/email.fixtures';
import { renderEmailPreview } from '../actions/render-email';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function EmailPreviewScreen() {
  const [selectedTemplate, setSelectedTemplate] = React.useState<string>('welcome');
  const [htmlContent, setHtmlContent] = React.useState<string>('');
  const [isPending, startTransition] = React.useTransition();

  React.useEffect(() => {
    startTransition(async () => {
      try {
        const html = await renderEmailPreview(selectedTemplate);
        setHtmlContent(html);
      } catch (error) {
        console.error('Failed to render template:', error);
        setHtmlContent('<div style="color:red; padding: 20px;">Error rendering template. Check console.</div>');
      }
    });
  }, [selectedTemplate]);

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Email Templates Preview</h1>
          <div className="w-[300px]">
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate} disabled={isPending}>
              <SelectTrigger>
                <SelectValue placeholder="Select template" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(MOCK_EMAIL_TEMPLATES).map((key) => (
                  <SelectItem key={key} value={key}>
                    {key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="h-[800px] flex flex-col">
            <CardHeader>
              <CardTitle>Preview {isPending && <span className="text-sm font-normal text-muted-foreground ml-2">(Loading...)</span>}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden bg-gray-100 rounded-b-lg border-t">
              <iframe
                srcDoc={htmlContent}
                className="w-full h-full border-none bg-white"
                title="Email Preview"
              />
            </CardContent>
          </Card>

          <Card className="h-[800px] flex flex-col">
            <CardHeader>
              <CardTitle>HTML Source</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
              <pre className="w-full h-full p-4 overflow-auto text-xs font-mono bg-slate-950 text-slate-50 whitespace-pre-wrap break-all">
                {htmlContent}
              </pre>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
