'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';

interface PortalAuthLayoutProps {
  hero: ReactNode;
  topBar?: ReactNode;
  children: ReactNode;
  contentClassName?: string;
  heroWidthClassName?: string;
}

export function PortalAuthLayout({
  hero,
  topBar,
  children,
  contentClassName = 'max-w-[420px]',
  heroWidthClassName = 'w-[50%]',
}: PortalAuthLayoutProps) {
  return (
    <div className="flex min-h-screen w-full overflow-hidden bg-[#fbf8f3] font-sans lg:h-screen">
      <motion.aside
        initial={{ x: '-100%' }}
        animate={{ x: 0 }}
        transition={{ type: 'spring', stiffness: 80, damping: 20 }}
        className={`relative hidden h-screen flex-col overflow-hidden shadow-2xl lg:flex ${heroWidthClassName}`}
      >
        {hero}
      </motion.aside>

      <div className="relative z-0 flex flex-1 flex-col overflow-y-auto bg-white/80 lg:h-screen">
        {topBar ? (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex shrink-0 items-center justify-between px-8 pb-2 pt-6 sm:px-10"
          >
            {topBar}
          </motion.div>
        ) : null}

        <div className="flex flex-1 items-start justify-center px-6 pb-10 pt-6 sm:px-12 sm:pt-8 lg:pt-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className={`w-full ${contentClassName}`}
          >
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

interface PortalAuthHeroPanelProps {
  backgroundImageSrc: string;
  backgroundImageAlt?: string;
  backgroundImageClassName?: string;
  overlay: ReactNode;
  decoration?: ReactNode;
  header: ReactNode;
  body: ReactNode;
  footer?: ReactNode;
}

export function PortalAuthHeroPanel({
  backgroundImageSrc,
  backgroundImageAlt = '',
  backgroundImageClassName = 'absolute inset-0 h-full w-full object-cover mix-blend-luminosity opacity-30',
  overlay,
  decoration,
  header,
  body,
  footer,
}: PortalAuthHeroPanelProps) {
  return (
    <>
      <div className="absolute inset-0 bg-slate-900">
        <div className="absolute inset-0">
          <Image
            src={backgroundImageSrc}
            alt={backgroundImageAlt}
            fill
            className={backgroundImageClassName}
          />
        </div>
        {overlay}
      </div>

      {decoration}

      <div className="relative z-10 flex h-full flex-col justify-between p-12 text-white xl:p-16">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          {header}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.7, duration: 0.8 }}
        >
          {body}
        </motion.div>

        {footer ? (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
          >
            {footer}
          </motion.div>
        ) : null}
      </div>
    </>
  );
}
