'use client';

import { useEffect, useRef, type ReactNode } from 'react';

interface AnimateInProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: 'up' | 'left' | 'right' | 'scale';
}

export function AnimateIn({
  children,
  className = '',
  delay = 0,
  direction = 'up',
}: AnimateInProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const initialTransform = {
      up: 'translateY(32px)',
      left: 'translateX(-32px)',
      right: 'translateX(32px)',
      scale: 'scale(0.9) translateY(16px)',
    }[direction];

    el.style.opacity = '0';
    el.style.transform = initialTransform;
    el.style.transition = `opacity 0.75s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.75s cubic-bezier(0.16,1,0.3,1) ${delay}ms`;
    el.style.willChange = 'opacity, transform';

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.opacity = '1';
          el.style.transform = 'translateY(0) translateX(0) scale(1)';
          observer.unobserve(el);
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -48px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay, direction]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
