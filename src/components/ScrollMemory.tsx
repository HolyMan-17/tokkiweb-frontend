// ─── Scroll memory — per-route scroll restoration ──────────────────
//
// Remembers the vertical position of every visited route and puts the
// user back there when they return; routes never visited open at the top.
//
// Two positions are tracked apart on purpose, because mixing them is what
// used to destroy the user's scroll:
//   • userOffsetRef — where the USER is. Only real user scrolls (and the
//     value stored for the route the user leaves) write to it.
//   • appliedRef — where WE last put the page. Only the restore writes.
//
// Screens fetch their content asynchronously, so a restore is re-applied
// for a short window — each time re-clamped to the current page height —
// until it lands or the user takes the scroll back with the wheel, a
// touch, the keyboard or a scroll of their own.

import { useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  clampOffset,
  loadScrollMap,
  persistScrollMap,
  readOffset,
  saveOffset,
  scrollKey,
  type ScrollMap,
} from '../store/scrollMemory';

const RESTORE_WINDOW_MS = 1500;

/** Tolerance (px) for "this is the position we applied". */
const LANDED_TOLERANCE = 2;

function viewportMax(): number {
  return document.documentElement.scrollHeight - window.innerHeight;
}

export function ScrollMemory() {
  const { pathname, search } = useLocation();
  const key = scrollKey(pathname, search);

  const mapRef = useRef<ScrollMap>({});
  const userOffsetRef = useRef(0);
  const appliedRef = useRef(0);
  const previousKeyRef = useRef<string | null>(null);
  const abortRestoreRef = useRef<(() => void) | null>(null);

  // Global wiring: native restoration off, the user's position tracked and
  // the user able to interrupt a pending restore.
  useLayoutEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    mapRef.current = loadScrollMap();
    userOffsetRef.current = window.scrollY;
    appliedRef.current = window.scrollY;

    const handleScroll = () => {
      const y = window.scrollY;
      const max = viewportMax();
      const abort = abortRestoreRef.current;

      if (abort) {
        const applied = appliedRef.current;

        // Our own scroll (or a negligible difference): keep restoring.
        if (Math.abs(y - applied) <= LANDED_TOLERANCE) {
          userOffsetRef.current = y;
          return;
        }

        // The browser clamped our request because the page is still too
        // short for it: ignore it and keep restoring.
        if (applied > max && y === max) {
          return;
        }

        // The user moved the page — the restore is over.
        abort();
        userOffsetRef.current = y;
        return;
      }

      userOffsetRef.current = y;
    };

    const takeControl = () => {
      abortRestoreRef.current?.();
    };

    // The position is captured at interaction time, before any navigation
    // can replace the page: a scroll event is dispatched a frame late, and
    // the browser clamps the position as soon as the next screen is shorter
    // — by then the real offset is already gone. Capturing the live
    // position on the interaction that may navigate keeps it accurate.
    const capturePosition = () => {
      userOffsetRef.current = window.scrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('wheel', takeControl, { passive: true });
    window.addEventListener('touchstart', takeControl, { passive: true });
    window.addEventListener('keydown', takeControl);
    window.addEventListener('pointerdown', capturePosition, { capture: true, passive: true });
    window.addEventListener('click', capturePosition, { capture: true, passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('wheel', takeControl);
      window.removeEventListener('touchstart', takeControl);
      window.removeEventListener('keydown', takeControl);
      window.removeEventListener('pointerdown', capturePosition, { capture: true });
      window.removeEventListener('click', capturePosition, { capture: true });
    };
  }, []);

  // Route change: remember where we leave, restore where we come back.
  useLayoutEffect(() => {
    const outgoingKey = previousKeyRef.current;
    previousKeyRef.current = key;

    // The outgoing position comes from the tracked user offset, never from
    // a fresh read: the browser clamps the scroll position when the next
    // screen is shorter than the one we are leaving. The outgoing key is
    // also skipped when it is the incoming one (the remount React's
    // StrictMode performs on mount would otherwise store a bogus 0).
    if (outgoingKey !== null && outgoingKey !== key) {
      // The live position covers a scroll whose event has not been
      // dispatched yet (the browser defers it to the next frame, so a
      // navigation in the same tick would remember the previous position).
      // The tracked offset is the floor, so a clamped live position can
      // never lower what the user had reached.
      const offset = Math.max(userOffsetRef.current, window.scrollY);
      mapRef.current = saveOffset(mapRef.current, outgoingKey, offset);
      persistScrollMap(mapRef.current);
    }

    const target = readOffset(mapRef.current, key);
    let frame: number | null = null;
    let timer: number | null = null;
    let observer: ResizeObserver | null = null;
    let stopped = false;

    const apply = () => {
      if (stopped) return;
      const y = clampOffset(target, viewportMax());
      appliedRef.current = y;
      window.scrollTo({ top: y, behavior: 'instant' });
    };

    const stop = () => {
      stopped = true;
      if (frame !== null) cancelAnimationFrame(frame);
      if (timer !== null) window.clearTimeout(timer);
      observer?.disconnect();
      observer = null;
      abortRestoreRef.current = null;
    };

    // The restore landed: the page sits where it was asked to sit.
    const hasLanded = () => {
      if (target === 0) return window.scrollY <= 1;
      return (
        Math.abs(window.scrollY - target) <= LANDED_TOLERANCE &&
        viewportMax() >= target
      );
    };

    const tick = () => {
      if (stopped) return;
      if (hasLanded()) {
        stop();
        return;
      }
      apply();
      frame = requestAnimationFrame(tick);
    };

    abortRestoreRef.current = stop;

    apply();
    frame = requestAnimationFrame(tick);

    if (typeof ResizeObserver !== 'undefined' && document.body) {
      observer = new ResizeObserver(() => apply());
      observer.observe(document.body);
    }

    timer = window.setTimeout(stop, RESTORE_WINDOW_MS);

    return stop;
  }, [key]);

  return null;
}

export default ScrollMemory;
