import type { NextWebVitalsMetric } from 'next/app';
import { track } from '@citypass/analytics';

const observedMetrics = new Set(['LCP', 'FID', 'CLS']);

export function reportWebVitals(metric: NextWebVitalsMetric) {
  if (!observedMetrics.has(metric.name)) return;

  track({
    type: 'WEB_VITAL',
    props: {
      name: metric.name,
      id: metric.id,
      value: metric.value,
      rating: metric.rating,
    },
  });
}
