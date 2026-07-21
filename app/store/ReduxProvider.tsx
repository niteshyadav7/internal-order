'use client';

import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from './store';
import { initAuth } from './authSlice';

export function ReduxProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Start Firebase Auth listener and state synchronization on mount
    const unsubscribe = store.dispatch(initAuth());
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  return <Provider store={store}>{children}</Provider>;
}
