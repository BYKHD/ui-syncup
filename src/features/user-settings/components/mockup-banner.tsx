import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { RiInformationLine } from '@remixicon/react'

/** Notice shown on settings screens that are still visual mockups. */
export function MockupBanner() {
  return (
    <Alert className="mb-6 bg-blue-50/50 text-blue-800 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900 border">
      <RiInformationLine className="h-4 w-4" />
      <AlertTitle>Mockup Preview</AlertTitle>
      <AlertDescription>
        These settings pages are currently a visual mockup. Layout and interactions are for
        demonstration purposes and are not yet wired to a backend API.
      </AlertDescription>
    </Alert>
  )
}
