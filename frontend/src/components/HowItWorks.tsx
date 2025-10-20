'use client';

import React from 'react';
import { motion } from 'framer-motion';

const steps = [
  {
    title: 'Create a challenge',
    desc: 'Set your goal, deadline, and proof requirements.',
  },
  {
    title: 'Stake ETH & Publish',
    desc: 'Lock your ETH and make your challenge public.',
  },
  {
    title: 'Others Bet',
    desc: 'Friends and strangers bet on your success or failure.',
  },
  {
    title: 'Complete & Earn',
    desc: 'Achieve your goal and earn rewards if you succeed.',
  },
];

export default function HowItWorks() {
  return (
    <section id="how" className="bg-dark border-t-2 border-primary py-20 px-4">
      <h2 className="text-accent text-3xl md:text-4xl font-bold text-center mb-12">How It Works</h2>
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        {steps.map((step, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, delay: i * 0.15 }}
            className="flex flex-col items-center bg-dark border border-accent/40 rounded-xl p-6 shadow-lg transition-all"
          >
            <div className="w-12 h-12 flex items-center justify-center bg-accent text-dark font-bold text-xl rounded-full mb-4 shadow">
              {i + 1}
            </div>
            <h3 className="text-lg font-semibold text-accent mb-2 text-center">{step.title}</h3>
            <p className="text-gray-300 text-center text-sm">{step.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
} 