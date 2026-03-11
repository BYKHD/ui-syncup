'use client';

import { motion } from 'motion/react';
import { SetupWizard } from '../components/setup-wizard';

export function SetupScreen() {
  return (
    <div className="container min-h-screen py-8 flex flex-col items-center justify-center bg-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none -z-10" />
      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay pointer-events-none -z-10" />
      
      <div className="w-full max-w-4xl space-y-8 relative z-10">
        <motion.div 
          className="text-center space-y-3"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <h1 className="text-3xl font-extrabold tracking-tight text-balance sm:text-4xl md:text-5xl lg:text-6xl bg-clip-text text-transparent bg-gradient-to-br from-foreground via-foreground/90 to-muted-foreground pb-2">
            Welcome to UI SyncUp
          </h1>
          <p className="mx-auto max-w-[600px] text-muted-foreground md:text-lg">
            Let&apos;s get your new instance configured and ready for your team in just a few steps.
          </p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
        >
          <SetupWizard />
        </motion.div>
      </div>
    </div>
  );
}
