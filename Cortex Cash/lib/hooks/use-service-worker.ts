/**
 * Hook for Service Worker Management
 */

import { useState, useEffect, useCallback } from 'react';

export interface ServiceWorkerState {
  registration: ServiceWorkerRegistration | null;
  isSupported: boolean;
  isRegistered: boolean;
  isOnline: boolean;
  updateAvailable: boolean;
  error: Error | null;
}

export function useServiceWorker() {
  const [state, setState] = useState<ServiceWorkerState>({
    registration: null,
    isSupported: typeof window !== 'undefined' && 'serviceWorker' in navigator,
    isRegistered: false,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    updateAvailable: false,
    error: null,
  });

  const register = useCallback(async () => {
    if (!state.isSupported) {
      console.warn('[SW] Service Workers not supported');
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      console.log('[SW] Service Worker registered:', registration);

      setState((prev) => ({
        ...prev,
        registration,
        isRegistered: true,
        error: null,
      }));

      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;

        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[SW] New version available');
              setState((prev) => ({
                ...prev,
                updateAvailable: true,
              }));
            }
          });
        }
      });

      return registration;
    } catch (error) {
      console.error('[SW] Registration failed:', error);
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error : new Error('Registration failed'),
      }));
      return null;
    }
  }, [state.isSupported]);

  const unregister = useCallback(async () => {
    if (!state.registration) {
      return false;
    }

    try {
      const success = await state.registration.unregister();
      console.log('[SW] Service Worker unregistered:', success);

      if (success) {
        setState((prev) => ({
          ...prev,
          registration: null,
          isRegistered: false,
        }));
      }

      return success;
    } catch (error) {
      console.error('[SW] Unregistration failed:', error);
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error : new Error('Unregistration failed'),
      }));
      return false;
    }
  }, [state.registration]);

  const update = useCallback(async () => {
    if (!state.registration) {
      return;
    }

    try {
      await state.registration.update();
      console.log('[SW] Update check completed');
    } catch (error) {
      console.error('[SW] Update check failed:', error);
    }
  }, [state.registration]);

  const skipWaiting = useCallback(() => {
    if (!state.registration?.waiting) {
      return;
    }

    state.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    console.log('[SW] Sent SKIP_WAITING message');

    // Reload page after new SW activates
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }, [state.registration]);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      console.log('[SW] Online');
      setState((prev) => ({ ...prev, isOnline: true }));
    };

    const handleOffline = () => {
      console.log('[SW] Offline');
      setState((prev) => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-register on mount (adiado para tempo ocioso para não disputar thread de UI)
  useEffect(() => {
    if (state.isSupported && !state.isRegistered) {
      const schedule = () => register();
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        (window as any).requestIdleCallback(schedule, { timeout: 3000 });
      } else {
        const id = setTimeout(schedule, 0);
        return () => clearTimeout(id);
      }
    }
  }, [state.isSupported, state.isRegistered, register]);

  return {
    ...state,
    register,
    unregister,
    update,
    skipWaiting,
  };
}
