'use client';

import { motion } from 'framer-motion';
import { Button } from '~/components/ui/Button';
import { useState, useEffect } from 'react';
import { db } from '~/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon } from 'lucide-react';
interface Timeline {
  id: string;
  title: string;
  creator: {
    username: string;
    avatarUrl: string;
  };
  supporters: number;
  coverImage?: string;
}

export function ExplorePage() {
  const [timelines, setTimelines] = useState<Timeline[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchTimelines() {
      setIsLoading(true);
      const snapshot = await getDocs(collection(db, 'timelines'));
      const data: Timeline[] = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          title: d.name,
          creator: {
            username: d.creator?.username || '',
            avatarUrl: d.creator?.pfp_url || '',
          },
          supporters: d.totalSupporters || 0,
          coverImage: d.coverImage || '',
        };
      });
      setTimelines(data);
      setIsLoading(false);
    }
    fetchTimelines();
  }, []);

  return (
    <div className="bg-white py-16">
      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-16">
        <ArrowLeftIcon className="w-7 h-7 text-primary absolute top-6 left-6 cursor-pointer" onClick={() => router.back()} />
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold font-clash text-gray-800 mb-2">Explore Timelines</h1>
          <p className="text-lg text-gray-600">
            Discover curated moments by Farcaster creators – beautifully arranged, tokenized, and ready to explore.
          </p>
        </motion.div>

        {/* Grid Layout */}
        {isLoading ? (
          <div className="text-center py-12">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {timelines.map((timeline, index) => (
              <motion.a
                key={timeline.id}
                href={`/timeline/${timeline.id}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="block bg-white shadow-md rounded-2xl overflow-hidden border hover:shadow-lg hover:scale-105 transition-all duration-300"
              >
                <div className="h-40 bg-gray-100 flex items-center justify-center">
                  {timeline.coverImage ? (
                    <img
                      src={timeline.coverImage}
                      alt={timeline.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <p className="text-gray-400 text-sm">Timeline Preview</p>
                  )}
                </div>

                <div className="p-4 space-y-2">
                  <h3 className="text-xl font-semibold font-clash text-gray-800">{timeline.title}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <img
                      src={timeline.creator.avatarUrl}
                      alt={timeline.creator.username}
                      className="w-6 h-6 rounded-full"
                    />
                    <span className="text-sm text-gray-700">@{timeline.creator.username}</span>
                  </div>
                  <span className="text-xs text-gray-500 block mt-2">🌟 {timeline.supporters} supporters</span>
                </div>
              </motion.a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 