"use client";

import { useEffect, useRef } from "react";
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const firedRef = useRef(false);

  // Auto-dismiss timer — runs on every mount so Strict Mode's fake remount
  // still schedules a dismiss after cleanup clears the first one.
  useEffect(() => {
    const dismissTimer = setTimeout(onDismiss, 2500);
    return () => clearTimeout(dismissTimer);
  }, [onDismiss]);

  // Fire confetti exactly once per component lifetime. The ref survives
  // Strict Mode's unmount/remount, so the second mount bails out. We
  // intentionally omit cleanup so in-flight particles are not reset —
  // letting them finish even through Strict Mode's fake unmount.
  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Canvas defaults to 300x150 unless given explicit pixel dimensions.
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const fire = confetti.create(canvas, { resize: true });

    const defaults = {
      spread: 360,
      ticks: 50,
      gravity: 0,
      decay: 0.94,
      startVelocity: 30,
      colors: ["FFE400", "FFBD00", "E89400", "FFCA6C", "FDFFB8"],
    };

    const shoot = () => {
      void fire({
        ...defaults,
        particleCount: 40,
        scalar: 1.2,
        shapes: ["star"],
      });
      void fire({
        ...defaults,
        particleCount: 10,
        scalar: 0.75,
        shapes: ["circle"],
      });
    };

    shoot();
    setTimeout(shoot, 100);
    setTimeout(shoot, 200);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
      aria-live="polite"
      aria-atomic="true"
    >
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full"
      />
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", duration: 0.5, delay: 0.1 }}
        className="relative flex flex-col items-center gap-4"
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
