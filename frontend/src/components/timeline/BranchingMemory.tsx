'use client';

import { motion } from 'framer-motion';
import { CastCard } from './CastCard';
import { TimelineData } from '~/types/timeline';

interface BranchingMemoryProps {
  timeline: TimelineData;
}

export function BranchingMemory({ timeline }: BranchingMemoryProps) {
  return (
    <div className="relative py-12">
      {/* Root Node */}
      <div className="absolute left-1/2 top-0 -translate-x-1/2">
        <div className="h-6 w-6 rounded-full bg-primary" />
      </div>

      {/* Main Branch */}
      <div className="absolute left-1/2 top-6 bottom-0 w-0.5 bg-gradient-to-b from-primary to-accent2" />

      {/* Casts */}
      <div className="mt-12 space-y-8">
        {timeline.casts.map((cast, index) => (
          <motion.div
            key={cast.hash}
            initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className={`relative flex ${index % 2 === 0 ? 'justify-start' : 'justify-end'}`}
          >
            {/* Branch Line */}
            <div className="absolute left-1/2 top-0 h-8 w-0.5 bg-gradient-to-b from-primary to-accent2" />

            {/* Node */}
            <div className="absolute left-1/2 top-0 -translate-x-1/2">
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