'use client';

import { motion } from 'motion/react';
import { SetupWizard } from '../components/setup-wizard';
import pkg from '../../../../package.json';

export function SetupScreen() {
  return (
    <div className="w-full h-screen overflow-y-auto bg-background relative selection:bg-primary/20">
      {/* Animated Background Gradients */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
            x: [0, 50, 0],
            y: [0, 30, 0]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
          className="absolute -top-[20%] -right-[10%] w-[80vw] h-[80vw] max-w-[800px] max-h-[800px] rounded-full bg-primary/20 blur-[100px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.2, 0.4, 0.2],
            x: [0, -40, 0],
            y: [0, -20, 0]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className="absolute -bottom-[20%] -left-[10%] w-[60vw] h-[60vw] max-w-[600px] max-h-[600px] rounded-full bg-blue-500/20 blur-[120px]"
        />
      </div>

      {/* Noise overlay */}
      <div 
        className="fixed inset-0 opacity-[0.4] mix-blend-overlay pointer-events-none" 
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 400 400\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }}
      />

      {/* Main Content Container */}
      <div className="min-h-full w-full flex flex-col items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-5xl space-y-10 relative z-10 py-12">
          {/* Header */}
          <motion.div
            className="text-center space-y-6"
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mx-auto inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-4 shadow-[0_0_15px_rgba(var(--primary),0.2)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              Setup Instance
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight text-balance sm:text-5xl md:text-6xl lg:text-7xl !leading-[1.1] bg-clip-text text-transparent bg-gradient-to-br from-foreground via-foreground/90 to-muted-foreground pb-2">
              Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-500">UI SyncUp</span>
            </h1>

            <p className="mx-auto max-w-[650px] text-muted-foreground text-md md:text-lg leading-relaxed">
              Let&apos;s get your new instance configured and ready for your team. This will only take a few minutes.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-muted-foreground/60 font-mono pt-2">
              <span className="px-2.5 py-1 rounded-md bg-muted/50 ">v{pkg.version}</span>
            </div>
          </motion.div>

          {/* Wizard Container */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-2xl mx-auto"
          >
            {/* Soft glow behind wizard */}
            <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/10 to-transparent blur-3xl rounded-[2rem] opacity-60 transform scale-105" />

            <SetupWizard />
          </motion.div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="text-center text-sm text-muted-foreground pt-4 pb-8"
          >
            <p>Build with Love</p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
