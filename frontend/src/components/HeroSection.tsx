import React from 'react';
import { motion } from 'framer-motion';

export default function HeroSection() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
      className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-b from-primary to-dark pt-24 pb-12 text-center"
    >
      <h1 className="text-accent font-extrabold text-4xl md:text-6xl drop-shadow-lg mb-6">Bet on Yourself. Win with ETH.</h1>
      <p className="max-w-xl mx-auto text-gray-200 text-lg md:text-2xl mb-8">Create goals, stake ETH, let others bet. Earn if you succeed.</p>
      <button className="bg-accent text-dark font-bold rounded-xl px-8 py-4 text-lg shadow-lg hover:scale-105 transition-transform duration-300">Start a Challenge</button>
    </motion.div>
  );
} 