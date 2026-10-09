'use client';

import { useEffect } from 'react';

export function PwaRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('MojahidX Service Worker registered:', registration.scope);
          })
          .catch((error) => {
            console.error('MojahidX Service Worker registration failed:', error);
          });
      });
    }
  }, []);

  return null;
}
