'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { GraduationCap, Menu, X, ArrowRight } from 'lucide-react';

const NAV_LINKS = [
  { label: 'HOME',       href: '/'            },
  { label: 'PROGRAMS',   href: '#programs'    },
  { label: 'FACILITIES', href: '#facilities'  },
  { label: 'EVENTS',     href: '#events'      },
  { label: 'ABOUT',      href: '#about'       },
  { label: 'CONTACT',    href: '#contact'     },
];

export function StickyNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 72);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile menu on resize to xl+
  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 1280) setOpen(false); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <header
      className="sticky top-0 z-50 transition-all duration-500"
      style={{
        background: scrolled ? 'rgba(250,250,248,0.95)' : 'transparent',
        backdropFilter: scrolled ? 'blur(24px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(24px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(15,23,42,0.09)' : '1px solid transparent',
        boxShadow: scrolled ? '0 4px 28px rgba(15,23,42,0.08)' : 'none',
      }}
      data-testid="main-nav"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">

        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-3 group" data-testid="nav-logo">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105"
            style={{ background: 'linear-gradient(135deg, #EA580C, #C2410C)' }}
          >
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <div className="hidden leading-tight sm:block">
            <p className="text-[8px] font-bold uppercase tracking-[0.24em] text-[#EA580C]">
              Al-Saud Training
            </p>
            <p
              className="text-sm font-bold uppercase tracking-[0.14em] transition-colors duration-500"
              style={{
                fontFamily: 'var(--font-display, Georgia, serif)',
                color: scrolled ? '#0F172A' : '#ffffff',
              }}
            >
              Institute
            </p>
          </div>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden items-center gap-7 xl:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-[10.5px] font-semibold tracking-[0.18em] transition-all duration-500 hover:opacity-100"
              style={{
                color: scrolled ? 'rgba(15,23,42,0.55)' : 'rgba(255,255,255,0.72)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color = scrolled ? '#0F172A' : '#ffffff';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color = scrolled ? 'rgba(15,23,42,0.55)' : 'rgba(255,255,255,0.72)';
              }}
              data-testid={`nav-${link.label.toLowerCase()}`}
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Right side: CTA + hamburger */}
        <div className="flex items-center gap-3">
          <Link
            href="/sign-in"
            className="rounded-full px-5 py-2.5 text-[10.5px] font-bold uppercase tracking-[0.18em] text-white transition-all active:scale-[0.97] hover:opacity-90"
            style={{
              background: 'linear-gradient(135deg, #EA580C, #C2410C)',
              boxShadow: '0 4px 14px rgba(234,88,12,0.38)',
            }}
            data-testid="nav-admin-login"
          >
            Admin Login
          </Link>

          {/* Hamburger — mobile/tablet only */}
          <button
            onClick={() => setOpen((prev) => !prev)}
            className="rounded-xl p-2.5 transition-all xl:hidden"
            style={{
              border: `1px solid ${scrolled ? 'rgba(15,23,42,0.14)' : 'rgba(255,255,255,0.22)'}`,
              color: scrolled ? '#0F172A' : '#ffffff',
              background: open ? (scrolled ? 'rgba(234,88,12,0.07)' : 'rgba(255,255,255,0.08)') : 'transparent',
            }}
            aria-label="Toggle navigation menu"
            aria-expanded={open}
            data-testid="nav-mobile-menu"
          >
            {open
              ? <X className="h-5 w-5" />
              : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* ── Mobile drawer ───────────────────────────────────────────── */}
      <div
        className="overflow-hidden transition-all duration-500 xl:hidden"
        style={{
          maxHeight: open ? '420px' : '0px',
          opacity: open ? 1 : 0,
          background: scrolled
            ? 'rgba(250,250,248,0.98)'
            : 'rgba(15,23,42,0.96)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}
        data-testid="mobile-menu"
      >
        <nav
          className="flex flex-col px-6 pb-6 pt-3"
          style={{ borderTop: `1px solid ${scrolled ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.1)'}` }}
        >
          {NAV_LINKS.map((link, i) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setOpen(false)}
              className="flex items-center justify-between py-3.5 text-[11px] font-bold tracking-[0.2em] transition-all"
              style={{
                color: scrolled ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.65)',
                borderBottom: i < NAV_LINKS.length - 1
                  ? `1px solid ${scrolled ? 'rgba(15,23,42,0.07)' : 'rgba(255,255,255,0.07)'}`
                  : 'none',
              }}
              data-testid={`mobile-nav-${link.label.toLowerCase()}`}
            >
              {link.label}
              <ArrowRight className="h-3.5 w-3.5 opacity-40" />
            </a>
          ))}

          {/* Mobile CTA */}
          <div className="mt-4">
            <Link
              href="/sign-in"
              onClick={() => setOpen(false)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white transition-all active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #EA580C, #C2410C)',
                boxShadow: '0 6px 20px rgba(234,88,12,0.4)',
              }}
              data-testid="mobile-admin-login"
            >
              Sign In as Admin
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
