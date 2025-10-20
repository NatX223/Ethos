'use client';

import { motion } from 'framer-motion';
import { CastCard } from './CastCard';
import { TimelineData } from '~/types/timeline';

interface SnapcastProps {
  timeline: TimelineData;
}

export function Snapcast({ timeline }: SnapcastProps) {
  return (
    <div className="relative py-12">
      {/* Horizontal Line */}
      <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-gradient-to-r from-primary to-accent2" />

      {/* Casts */}
      <div className="flex items-center justify-between">
        {timeline.casts.map((cast, index) => (
          <motion.div
            key={cast.hash}
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="relative flex flex-col items-center"
          >
            {/* Node on the line */}
            <div className="absolute top-1/2 -translate-y-1/2">
              <div className="h-4 w-4 rounded-full bg-primary" />
            </div>

            {/* Cast Card */}
            <div className="mt-8 w-[200px]">
              <CastCard cast={cast} />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
} 