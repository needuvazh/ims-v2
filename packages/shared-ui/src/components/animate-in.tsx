'use client';

import { useEffect, useRef, type ReactNode } from 'react';

export interface AnimateInProps {
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
    const element = ref.current;
    if (!element) {
      return;
    }

    const initialTransform = {
      up: 'translateY(32px)',
      left: 'translateX(-32px)',
      right: 'translateX(32px)',
      scale: 'scale(0.9) translateY(16px)',
    }[direction];

    element.style.opacity = '0';
    element.style.transform = initialTransform;
    element.style.transition = `opacity 0.75s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.75s cubic-bezier(0.16,1,0.3,1) ${delay}ms`;
    element.style.willChange = 'opacity, transform';

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          element.style.opacity = '1';
          element.style.transform = 'translateY(0) translateX(0) scale(1)';
          observer.unobserve(element);
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -48px 0px' },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [delay, direction]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
