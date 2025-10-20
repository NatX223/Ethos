import React from 'react';

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-dark/80 backdrop-blur border-b border-dark/60">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-3">
        {/* Logo */}
        <div className="text-accent font-bold text-2xl tracking-tight">EtherStake</div>
        {/* Nav Links */}
        <div className="hidden md:flex items-center gap-8">
          <a href="#how" className="text-gray-100 hover:underline underline-offset-8 transition">How It Works</a>
          <a href="#explore" className="text-gray-100 hover:underline underline-offset-8 transition">Explore</a>
          <button className="ml-4 bg-accent text-dark font-semibold rounded-lg shadow px-5 py-2 transition hover:scale-105">Connect Wallet</button>
        </div>
        {/* Mobile menu (optional: can add hamburger menu here) */}
      </div>
    </nav>
  );
} 