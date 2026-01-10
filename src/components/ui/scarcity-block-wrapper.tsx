'use client';

import { useQueryState } from 'nuqs';
import { ScarcityBlock } from './scarcity-block';

interface ScarcityBlockWrapperProps {
  city: string;
  scarcity: {
    title: string;
    subtitle: string;
    cta: string;
  };
}

export function ScarcityBlockWrapper({ city, scarcity }: ScarcityBlockWrapperProps) {
  const [feed] = useQueryState('feed', { defaultValue: 'near' });

  // Hide ScarcityBlock for favorites feed
  if (feed === 'favorites') {
    return null;
  }

  return <ScarcityBlock city={city} scarcity={scarcity} />;
}
