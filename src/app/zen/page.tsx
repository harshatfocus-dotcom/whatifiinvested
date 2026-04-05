"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, DollarSign, Wallet, LineChart, PieChart, Coins, Briefcase, Activity, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Navbar1 } from "@/components/ui/navbar-1";

// --- URL Bar CTA Button ---
const SolidButton = () => {
  return (
    <div
      className="group flex items-center gap-2 bg-[#1c1c1e] hover:bg-[#2c2c2e] transition-colors duration-200 rounded-full px-6 py-3.5 cursor-pointer select-none shadow-xl border border-white/5"
      style={{ minWidth: '280px' }}
    >
      {/* URL Text */}
      <span className="flex-1 text-[16px] font-medium tracking-tight">
        <span className="text-white">https://</span>
        <span className="text-gray-400">experience.zen</span>
      </span>

      {/* Info icon on right */}
      <svg className="w-5 h-5 text-gray-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="16" x2="12" y2="12"/>
        <line x1="12" y1="8" x2="12.01" y2="8"/>
      </svg>
    </div>
  );
};

const FLOATING_ICONS = [
  { Icon: TrendingUp, x: '8%', y: '20%', size: 38, delay: 0 },
  { Icon: Wallet, x: '85%', y: '15%', size: 42, delay: 1.5 },
  { Icon: LineChart, x: '5%', y: '50%', size: 36, delay: 0.8 },
  { Icon: PieChart, x: '88%', y: '45%', size: 48, delay: 2.2 },
  { Icon: Coins, x: '15%', y: '35%', size: 28, delay: 0.4 },
  { Icon: Briefcase, x: '78%', y: '70%', size: 34, delay: 1.1 },
  { Icon: DollarSign, x: '18%', y: '70%', size: 44, delay: 1.8 },
  { Icon: Activity, x: '72%', y: '25%', size: 30, delay: 0.9 },
];

const CARDS = [
  {
    id: "card1",
    image: "/cards/card1.png",
    rotation: -15,
    x: -360,
    y: 50,
    zIndex: 1,
  },
  {
    id: "card2",
    image: "/cards/card2.png",
    rotation: -10,
    x: -240,
    y: 20,
    zIndex: 2,
  },
  {
    id: "card3",
    image: "/cards/card6.png",
    rotation: -5,
    x: -120,
    y: 5,
    zIndex: 3,
  },
  {
    id: "card4",
    image: "/cards/card3.png",
    rotation: 0,
    x: 0,
    y: 0,
    zIndex: 4,
  },
  {
    id: "card5",
    image: "/cards/card7.png",
    rotation: 5,
    x: 120,
    y: 5,
    zIndex: 3,
  },
  {
    id: "card6",
    image: "/cards/card4.png",
    rotation: 10,
    x: 240,
    y: 20,
    zIndex: 2,
  },
  {
    id: "card7",
    image: "/cards/card5.png",
    rotation: 15,
    x: 360,
    y: 50,
    zIndex: 1,
  },
];

export default function ZenLanding() {
  const symbols = ["$", "₹", "€", "£", "¥", "₿"];
  const [symbolIndex, setSymbolIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSymbolIndex((prev) => (prev + 1) % symbols.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white min-h-screen text-black overflow-hidden font-poppins selection:bg-black selection:text-white">
      <Navbar1 />

      <main className="relative flex flex-col items-center justify-start min-h-screen pb-10">

        {/* Soft background glow */}
        <div className="absolute top-0 right-[10%] w-[600px] h-[600px] bg-gradient-to-tr from-gray-50 to-transparent rounded-full blur-[140px] pointer-events-none opacity-60" />

        {/* Realistic Stock Market Background Chart */}
        <div className="absolute top-[-50px] left-0 w-full h-[650px] pointer-events-none overflow-hidden flex items-start justify-center opacity-[0.05] z-0">
          <svg viewBox="0 0 1200 400" preserveAspectRatio="none" className="w-[120%] min-w-[1400px] h-full object-cover">
            {/* The jagged stock market line */}
            <path 
              d="M0,100 L20,180 L50,190 L80,185 L120,240 L150,260 L180,265 L220,320 L240,360 L260,320 L280,340 L300,370 L320,340 L340,340 L360,330 L380,340 L400,280 L420,295 L440,290 L460,305 L480,290 L500,295 L530,270 L550,265 L580,280 L600,285 L630,290 L660,275 L690,260 L720,265 L750,245 L780,240 L810,180 L840,150 L870,165 L900,120 L930,135 L960,110 L990,140 L1020,120 L1050,135 L1080,145 L1110,100 L1140,125 L1170,150 L1200,130" 
              fill="none" 
              stroke="#000000" 
              strokeWidth="3.5" 
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke" 
            />
            {/* The filled gradient area underneath */}
            <path 
              d="M0,100 L20,180 L50,190 L80,185 L120,240 L150,260 L180,265 L220,320 L240,360 L260,320 L280,340 L300,370 L320,340 L340,340 L360,330 L380,340 L400,280 L420,295 L440,290 L460,305 L480,290 L500,295 L530,270 L550,265 L580,280 L600,285 L630,290 L660,275 L690,260 L720,265 L750,245 L780,240 L810,180 L840,150 L870,165 L900,120 L930,135 L960,110 L990,140 L1020,120 L1050,135 L1080,145 L1110,100 L1140,125 L1170,150 L1200,130 L1200,400 L0,400 Z" 
              fill="url(#stock-fade)" 
              opacity="0.3"
            />
            {/* Final data point dot */}
            <circle cx="1200" cy="130" r="5" fill="#000000" />
            <defs>
              <linearGradient id="stock-fade" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#000000" stopOpacity="0.8" />
                <stop offset="90%" stopColor="#000000" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Unbreakable spacer to force heading below fixed navbar but keep it tight */}
        <div className="w-full h-[80px] md:h-[110px] shrink-0 pointer-events-none" />

        {/* Floating Background Icons */}
        {FLOATING_ICONS.map((pos, i) => (
          <motion.div
            key={i}
            className="absolute pointer-events-none text-gray-400/30 z-30 drop-shadow-sm"
            style={{ left: pos.x, top: pos.y }}
            animate={{ y: [0, -20, 0], rotate: [0, 10, -10, 0] }}
            transition={{ duration: 6, repeat: Infinity, delay: pos.delay, ease: "easeInOut" }}
          >
            <pos.Icon size={pos.size} strokeWidth={1.5} />
          </motion.div>
        ))}

        {/* Headings */}
        <div className="text-center relative z-20 w-full max-w-4xl px-4 flex flex-col items-center">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="text-5xl md:text-6xl lg:text-[5rem] leading-[1.1] font-bold tracking-tight mb-4 text-[#0f0f0f] flex items-center justify-center flex-wrap gap-x-2 md:gap-x-4"
          >
            <span>What if</span>
            <span className="relative flex items-center justify-center bg-[#2E4C3B] text-white rounded-lg w-[50px] md:w-[70px] h-[55px] md:h-[75px] overflow-hidden shadow-sm font-medium text-4xl md:text-5xl lg:text-[4.2rem]">
              <AnimatePresence mode="popLayout">
                <motion.span
                  key={symbols[symbolIndex]}
                  initial={{ y: 40, opacity: 0, rotateX: -90 }}
                  animate={{ y: 0, opacity: 1, rotateX: 0 }}
                  exit={{ y: -40, opacity: 0, rotateX: 90 }}
                  transition={{ duration: 0.5, type: "spring", stiffness: 120, damping: 14 }}
                  className="absolute"
                >
                  {symbols[symbolIndex]}
                </motion.span>
              </AnimatePresence>
            </span>
            <span>Invested?</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-lg md:text-[20px] text-gray-500 font-normal max-w-2xl mx-auto leading-relaxed"
          >
            Backtest historical market prices, understand proven investment strategies & objectively uncover hidden financial opportunities.
          </motion.p>
        </div>

        {/* Fanned Cards Section */}
        {/* Tight margin-top to snuggly fit under the sub-heading */}
        <div className="relative w-full max-w-[1200px] h-[380px] md:h-[460px] flex items-center justify-center z-10 mt-2 md:mt-4">

          {CARDS.map((card, i) => (
            <motion.div
              key={card.id}
              className="absolute w-44 md:w-64 aspect-[5/7] rounded-[1.2rem] md:rounded-[1.5rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.15)] bg-white ring-1 ring-black/5"
              style={{ zIndex: card.zIndex }}
              initial={{
                opacity: 0,
                y: 300, // Starts from deep below
                x: 0, 
                rotate: 0,
                scale: 0.5
              }}
              animate={{
                opacity: 1,
                y: card.y,
                x: card.x,
                rotate: card.rotation,
                scale: 1
              }}
              transition={{
                duration: 0.8,
                delay: 0.1 + ((6 - i) * 0.12), // Strict Right-to-Left deal animation
                type: "spring",
                stiffness: 80,
                damping: 20,
                mass: 1
              }}
              whileHover={{
                scale: 1.05,
                y: card.y - 15,
                zIndex: 50,
                transition: { duration: 0.3, type: "spring", stiffness: 400, damping: 25 }
              }}
            >
              <img
                src={card.image}
                alt="Strategy Card"
                className="absolute inset-0 w-full h-full object-cover z-10"
              />
            </motion.div>
          ))}
        </div>

        {/* Footer Text & CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-40 text-center w-full px-4 mt-2 md:mt-6 flex flex-col items-center"
        >
          <div className="flex flex-col sm:flex-row items-center justify-center w-full pb-10">
            <Link href="/backtest">
              <SolidButton />
            </Link>
          </div>
        </motion.div>

      </main>
    </div>
  );
}
