'use client';

import React, { useMemo } from 'react';
import { FuelProvider } from '@fuels/react';
import { defaultConnectors } from '@fuels/connectors';
import { QueryClientProvider } from '@tanstack/react-query';
import './styles.css';
import { queryClient } from './queryClient';
import PuzzleBoard from './Board';

export default function Home() {
  const connectors = useMemo(() => {
    if (typeof window !== 'undefined') {
      return defaultConnectors({ devMode: true });
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <FuelProvider
        fuelConfig={{
          connectors,
        }}>
        <PuzzleBoard />
      </FuelProvider>
    </QueryClientProvider>
  );
}
