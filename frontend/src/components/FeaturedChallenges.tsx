import React from 'react';
import { motion } from 'framer-motion';

const challenges = [
  {
    title: 'Run a Marathon',
    stake: '1.5 ETH',
    deadline: '2024-08-01',
  },
  {
    title: '30-Day Coding Streak',
    stake: '0.8 ETH',
    deadline: '2024-07-15',
  },
  {
    title: 'Lose 10kg',
    stake: '2.0 ETH',
    deadline: '2024-09-10',
  },
  {
    title: 'Read 12 Books',
    stake: '0.5 ETH',
    deadline: '2024-12-31',
  },
];

export default function FeaturedChallenges() {
  return (
    <section id="explore" className="bg-gradient-to-b from-dark to-primary py-20 px-4">
      <h2 className="text-accent text-3xl md:text-4xl font-bold text-center mb-12">Featured Challenges</h2>
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        {challenges.map((ch, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, delay: i * 0.15 }}
            className="bg-dark border border-accent rounded-xl p-6 shadow-lg flex flex-col gap-4 hover:scale-105 hover:shadow-accent/40 transition-transform duration-300"
          >
            <h3 className="text-accent font-bold text-xl mb-2">{ch.title}</h3>
            <div className="flex items-center justify-between text-gray-200 text-sm mb-2">
              <span>Stake: <span className="font-semibold">{ch.stake}</span></span>
              <span>Deadline: <span className="font-semibold">{ch.deadline}</span></span>
            </div>
            <button className="mt-auto bg-accent text-dark rounded-lg px-5 py-2 font-semibold shadow hover:scale-105 transition">View / Bet</button>
          </motion.div>
        ))}
      </div>
    </section>
  );
} 