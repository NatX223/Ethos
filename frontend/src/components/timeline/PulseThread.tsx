'use client';

import { motion } from 'framer-motion';
import { CastCard } from './CastCard';
import { TimelineData } from '~/types/timeline';

interface PulseThreadProps {
  timeline: TimelineData;
}

export function PulseThread({ timeline }: PulseThreadProps) {
  return (
    <div className="relative py-12">
      {/* Vertical Line */}
      <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary to-accent2" />

      {/* Casts */}
      <div className="space-y-8">
        {timeline.casts.map((cast, index) => (
          <motion.div
            key={cast.hash}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className={`relative flex ${index % 2 === 0 ? 'justify-start' : 'justify-end'}`}
          >
            {/* Node on the line */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="h-4 w-4 rounded-full bg-primary" />
            </div>

            {/* Cast Card */}
            <div className={`w-[45%] ${index % 2 === 0 ? 'pr-12' : 'pl-12'}`}>
              <CastCard cast={cast} />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
} 