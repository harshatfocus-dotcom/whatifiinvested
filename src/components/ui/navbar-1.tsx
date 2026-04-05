"use client" 

import * as React from "react"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Menu, X } from "lucide-react"

export function Navbar1() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <header className="fixed top-4 left-0 w-full z-50 pt-2 px-4 flex justify-center pointer-events-none">
      <div className="w-full max-w-2xl bg-white/90 border border-gray-300/80 shadow-[0_15px_40px_-5px_rgba(0,0,0,0.15)] rounded-2xl px-6 py-3 flex items-center justify-between backdrop-blur-xl pointer-events-auto transition-all">
        
        {/* Logo area */}
        <div className="flex justify-start items-center">
          <div className="relative w-10 h-10 ml-1" suppressHydrationWarning>
            <img src="/logo.svg" alt="Zen Logo" className="w-full h-full object-contain" />
          </div>
        </div>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-7 text-[14px] font-medium text-gray-500 tracking-tight">
          {["Home", "Features", "Docs"].map((item) => (
            <motion.a
              key={item}
              href="#"
              whileHover={{ y: -1, color: "#000" }}
              className="hover:text-black transition-colors"
            >
              {item}
            </motion.a>
          ))}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden md:flex justify-end items-center">
          <a
            href="/backtest"
            className="text-[14px] font-bold text-white transition-all duration-200 hover:brightness-110"
            style={{
              background: '#2c4a35',
              boxShadow: '0 4px 14px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '10px',
              padding: '12px 28px',
            }}
          >
            Get Started
          </a>
        </div>

        {/* Mobile Toggle */}
        <button className="md:hidden p-2 text-gray-800" onClick={() => setIsOpen(true)}>
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-50 bg-white/95 backdrop-blur-md px-6 pt-24 pb-8 flex flex-col md:hidden"
          >
            <button className="absolute top-6 right-6 p-2" onClick={() => setIsOpen(false)}>
              <X className="w-6 h-6" />
            </button>
            <div className="flex flex-col gap-6 text-lg font-medium text-gray-900">
              {["Home", "Features", "Docs"].map((item) => (
                <a key={item} href="#" className="py-2 border-b border-gray-100" onClick={() => setIsOpen(false)}>
                  {item}
                </a>
              ))}
              <a
                href="/backtest"
                className="mt-4 px-6 py-4 text-center text-white bg-black rounded-xl shadow-lg"
                onClick={() => setIsOpen(false)}
              >
                Get Started
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
