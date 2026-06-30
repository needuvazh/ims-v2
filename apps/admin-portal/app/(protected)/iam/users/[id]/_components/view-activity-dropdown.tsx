'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { Button } from '@ims/shared-ui';

export function ViewActivityDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={menuRef}
      className="relative inline-block text-left"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Button variant="secondary" onClick={() => setIsOpen(!isOpen)}>
        <span>View Activity</span>
        <ChevronDown className={`ml-1.5 h-4 w-4 shrink-0 opacity-60 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 pt-2 w-48">
          <div className="rounded-xl border border-[#c1c7ce]/80 bg-white/95 backdrop-blur-xl p-2 shadow-[0_20px_50px_rgba(0,0,0,0.15)] animate-dropdown-reveal">
            <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--ims-muted)]">
              Activity & Logs
            </div>
            <div className="-mx-2 my-1 h-px bg-[color:var(--ims-border)]" />
            <div className="space-y-1">
              <Link
                href="/iam/sessions"
                className="flex w-full items-center rounded-lg px-3 py-2 text-sm text-[color:var(--ims-ink)] hover:bg-[color:var(--ims-accent-soft)] transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Active Sessions
              </Link>
              <Link
                href="/iam/login-history"
                className="flex w-full items-center rounded-lg px-3 py-2 text-sm text-[color:var(--ims-ink)] hover:bg-[color:var(--ims-accent-soft)] transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Login History
              </Link>
              <Link
                href="/iam/audit"
                className="flex w-full items-center rounded-lg px-3 py-2 text-sm text-[color:var(--ims-ink)] hover:bg-[color:var(--ims-accent-soft)] transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Audit Trail
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
