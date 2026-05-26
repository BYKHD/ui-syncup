"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import { RiArchiveLine } from "@remixicon/react";

interface ProjectArchivedCelebrationProps {
  projectName: string;
  onDismiss: () => void;
}

export function ProjectArchivedCelebration({
  projectName,
  onDismiss,
}: ProjectArchivedCelebrationProps) {
  useEffect(() => {
    void confetti({ particleCount: 150, spread: 80, origin: { y: 0.4 } });
    const timer = setTimeout(onDismiss, 2000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
      aria-live="polite"
      aria-atomic="true"
    >
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", duration: 0.5, delay: 0.1 }}
        className="flex flex-col items-center gap-4"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }}
          className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-500 shadow-lg"
        >
          <RiArchiveLine className="h-10 w-10 text-white" />
        </motion.div>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-lg font-medium"
        >
          {projectName} is a wrap!
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-sm text-muted-foreground"
        >
          All issues resolved. Project archived.
        </motion.p>
      </motion.div>
    </motion.div>
  );
}
