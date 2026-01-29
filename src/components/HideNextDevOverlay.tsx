'use client';

import { useEffect } from 'react';

const SELECTORS = [
  '#nextjs-portal',
  '[data-nextjs-dialog]',
  '[data-nextjs-toast-errors-parent]',
  '[data-nextjs-portal]',
  'next-route-announcer',
];

function hide() {
  if (typeof document === 'undefined') return;
  SELECTORS.forEach((sel) => {
    try {
      const el = sel.startsWith('#') || sel.startsWith('[')
        ? document.querySelector(sel)
        : document.getElementsByTagName(sel)[0];
      if (el && el instanceof HTMLElement) {
        el.style.setProperty('display', 'none', 'important');
        el.style.setProperty('visibility', 'hidden', 'important');
        el.style.setProperty('opacity', '0', 'important');
        el.style.setProperty('pointer-events', 'none', 'important');
      }
    } catch {
      // ignore
    }
  });
  // Also hide any fixed element at bottom-left that looks like the N button (shadow host)
  document.querySelectorAll('[id*="next"], [class*="nextjs"]').forEach((el) => {
    if (el instanceof HTMLElement) {
      const style = window.getComputedStyle(el);
      if (style.position === 'fixed' && (el.id?.includes('next') || el.className?.includes('nextjs'))) {
        el.style.setProperty('display', 'none', 'important');
      }
    }
  });
}

export default function HideNextDevOverlay() {
  useEffect(() => {
    hide();
    const interval = setInterval(hide, 500);
    const observer = new MutationObserver(hide);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      clearInterval(interval);
      observer.disconnect();
    };
  }, []);
  return null;
}
