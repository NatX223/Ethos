'use client';

import { motion } from 'framer-motion';
import { Heart, Repeat2, MessageSquare } from 'lucide-react';
import { Cast } from '~/types/timeline';
import Image from 'next/image';

interface CastCardProps {
  cast: Cast;
  className?: string;
  onHover?: () => void;
}

export function CastCard({ cast, className = '', onHover }: CastCardProps) {
  return (
    <motion.div
      className={`bg-white rounded-xl shadow-sm overflow-hidden ${className}`}
      whileHover={{ scale: 1.02, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
      onHoverStart={onHover}
    >
      <div className="p-4">
        <div className="flex items-center space-x-3 mb-3">
          <div>
            <p className="text-xs text-gray-500">{cast.timestamp}</p>
          </div>
        </div>

        <p className="text-sm mb-3">{cast.text}</p>

        {Array.isArray(cast.media) && cast.media.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {cast.media.map((media, idx) => (
              media.type === 'image' ? (
                <Image
                  key={idx}
                  src={media.url}
                  alt="Cast media"
                  width={400}
                  height={225}
                  className="rounded-lg object-cover"
                />
              ) : media.type === 'video' ? (
                <video
                  key={idx}
                  src={media.url}
                  controls
                  className="rounded-lg max-w-full h-auto"
                  style={{ maxWidth: 400, maxHeight: 225 }}
                />
              ) : null
            ))}
          </div>
        )}

        <div className="flex items-center space-x-4 text-sm text-gray-500">
          <div className="flex items-center space-x-1">
            <Heart className="h-4 w-4" />
            <span>{cast.stats.likes}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Repeat2 className="h-4 w-4" />
            <span>{cast.stats.recasts}</span>
          </div>
          <div className="flex items-center space-x-1">
            <MessageSquare className="h-4 w-4" />
            <span>{cast.stats.replies}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
} 