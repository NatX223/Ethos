'use client';

import { motion } from 'framer-motion';
import { TimelineTemplate } from '~/types/timeline';

interface TemplatePreviewProps {
  template: TimelineTemplate;
  isSelected: boolean;
  onSelect: (template: TimelineTemplate) => void;
}

export function TemplatePreview({ template, isSelected, onSelect }: TemplatePreviewProps) {
  const getTemplateComponent = () => {
    switch (template) {
      case 'pulse-thread':
        return (
          <div className="h-32 w-full overflow-hidden rounded-lg bg-white p-4 shadow-md">
            <div className="relative h-full">
              <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary to-accent2" />
              <div className="absolute left-1/2 top-1/4 -translate-x-1/2">
                <div className="h-3 w-3 rounded-full bg-primary" />
              </div>
              <div className="absolute left-1/2 top-3/4 -translate-x-1/2">
                <div className="h-3 w-3 rounded-full bg-primary" />
              </div>
            </div>
          </div>
        );
      case 'snapcast':
        return (
          <div className="h-32 w-full overflow-hidden rounded-lg bg-white p-4 shadow-md">
            <div className="relative h-full">
              <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-gradient-to-r from-primary to-accent2" />
              <div className="absolute left-1/4 top-1/2 -translate-y-1/2">
                <div className="h-3 w-3 rounded-full bg-primary" />
              </div>
              <div className="absolute left-3/4 top-1/2 -translate-y-1/2">
                <div className="h-3 w-3 rounded-full bg-primary" />
              </div>
            </div>
          </div>
        );
      case 'branching-memory':
        return (
          <div className="h-32 w-full overflow-hidden rounded-lg bg-white p-4 shadow-md">
            <div className="relative h-full">
              <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary to-accent2" />
              <div className="absolute left-1/2 top-0 -translate-x-1/2">
                <div className="h-4 w-4 rounded-full bg-primary" />
              </div>
              <div className="absolute left-1/4 top-1/2 -translate-y-1/2">
                <div className="h-3 w-3 rounded-full bg-primary" />
              </div>
              <div className="absolute left-3/4 top-1/2 -translate-y-1/2">
                <div className="h-3 w-3 rounded-full bg-primary" />
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(template)}
      className={`cursor-pointer rounded-lg border-2 p-4 transition-colors ${
        isSelected ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-primary/50'
      }`}
    >
      <h3 className="mb-2 text-lg font-semibold capitalize">{template.replace('-', ' ')}</h3>
      {getTemplateComponent()}
    </motion.div>
  );
} 