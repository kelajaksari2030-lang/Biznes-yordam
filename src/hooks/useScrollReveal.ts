/**
 * useScrollReveal Hook
 * 
 * Shared, resilient scroll-reveal animation observer for BESTO.
 * Handles route changes, dynamic async content, reverse scrolling,
 * and accessibility prefers-reduced-motion fallbacks.
 */

import { useEffect, useRef } from 'react';

interface UseScrollRevealOptions {
  containerRef?: React.RefObject<HTMLElement | null>;
  threshold?: number;
  rootMargin?: string;
  reobserveOnScrollBack?: boolean;
}

export function useScrollReveal(
  deps: React.DependencyList = [],
  options: UseScrollRevealOptions = {}
) {
  const {
    containerRef,
    threshold = 0.05,
    rootMargin = '0px 0px -20px 0px',
    reobserveOnScrollBack = true,
  } = options;

  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // 1. Accessibility & Safety Fallback
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const rootElement = containerRef?.current || document;

    const revealAllImmediately = () => {
      const elements = rootElement.querySelectorAll<HTMLElement>(
        '.scroll-reveal, .scroll-reveal-scale'
      );
      elements.forEach((el) => {
        el.classList.add('is-revealed');
      });
    };

    if (
      typeof window === 'undefined' ||
      !('IntersectionObserver' in window) ||
      prefersReducedMotion
    ) {
      revealAllImmediately();
      return;
    }

    // 2. Disconnect any prior observer
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    // 3. Create IntersectionObserver
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
          } else if (reobserveOnScrollBack) {
            // Un-reveal when scrolled out downwards to allow smooth re-triggering on reverse scroll
            if (entry.boundingClientRect.top > 0) {
              entry.target.classList.remove('is-revealed');
            }
          }
        });
      },
      {
        root: null,
        rootMargin,
        threshold,
      }
    );

    observerRef.current = observer;

    // 4. Observe all currently present reveal elements
    const observeElements = () => {
      const elements = rootElement.querySelectorAll<HTMLElement>(
        '.scroll-reveal, .scroll-reveal-scale'
      );
      elements.forEach((el) => {
        observer.observe(el);
      });
    };

    observeElements();

    // 5. Observe dynamically rendered elements via MutationObserver
    let mutationObserver: MutationObserver | null = null;
    if ('MutationObserver' in window) {
      const targetNode = containerRef?.current || document.body;
      mutationObserver = new MutationObserver((mutations) => {
        let hasNewNodes = false;
        for (const mutation of mutations) {
          if (mutation.addedNodes.length > 0) {
            hasNewNodes = true;
            break;
          }
        }
        if (hasNewNodes) {
          observeElements();
        }
      });

      mutationObserver.observe(targetNode, {
        childList: true,
        subtree: true,
      });
    }

    // 6. Double check after a short frame to catch layout shifts or async state
    const timer = setTimeout(() => {
      observeElements();
    }, 120);

    return () => {
      clearTimeout(timer);
      if (mutationObserver) {
        mutationObserver.disconnect();
      }
      observer.disconnect();
      observerRef.current = null;
    };
  }, deps);
}
