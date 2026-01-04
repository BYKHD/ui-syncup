"use client";

import { formatRelativeTime } from "@/lib/date";
import { cn } from "@/lib/utils";
import { HTMLAttributes, useEffect, useState } from "react";

interface RelativeTimeProps extends HTMLAttributes<HTMLTimeElement> {
  date: Date | string | number;
  /**
   * Update interval in milliseconds. Set to 0 to disable auto-update.
   * Default: 60000 (1 minute)
   */
  updateInterval?: number;
}

export function RelativeTime({ 
  date, 
  className, 
  updateInterval = 60000,
  ...props 
}: RelativeTimeProps) {
  // Use state to force re-renders for live updating
  const [timeString, setTimeString] = useState(() => formatRelativeTime(date));

  useEffect(() => {
    // Initial update in case prop changed
    setTimeString(formatRelativeTime(date));

    // Disable if interval is 0
    if (updateInterval <= 0) return;

    const intervalId = setInterval(() => {
      setTimeString(formatRelativeTime(date));
    }, updateInterval);

    return () => clearInterval(intervalId);
  }, [date, updateInterval]);

  // Use the time tag for semantic correctness
  // The dateTime attribute should be in machine-readable format (ISO string)
  const isoString = new Date(date).toISOString();

  return (
    <time 
      dateTime={isoString} 
      className={cn("whitespace-nowrap", className)}
      title={new Date(date).toLocaleString()} // Tooltip with exact date
      {...props}
    >
      {timeString}
    </time>
  );
}
