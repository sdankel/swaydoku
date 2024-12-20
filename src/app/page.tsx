'use client';

import React from 'react';
import { FuelProvider } from '@fuels/react';
import { defaultConnectors } from '@fuels/connectors';
import { QueryClientProvider } from '@tanstack/react-query';
import './styles.css';
import { queryClient } from './queryClient';
import PuzzleBoard from './Board';

export default function Home() {
  return (
    <QueryClientProvider client={queryClient}>
      <FuelProvider
        fuelConfig={{
          connectors: defaultConnectors({ devMode: true }),
        }}>
        <PuzzleBoard />
      </FuelProvider>
    </QueryClientProvider>
  );
}
