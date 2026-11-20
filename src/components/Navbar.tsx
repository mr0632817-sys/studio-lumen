"use client";

import React from "react";
import { Moon, Sun, Terminal } from "lucide-react";
import { PROFILE_DATA } from "@/data/portfolioData";

interface NavbarProps {
  isDark: boolean;
  onToggleTheme: () => void;
}

export default function Navbar({ isDark, onToggleTheme }: NavbarProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border-subtle)] bg-[var(--glass-bg)] backdrop-blur-md transition-colors duration-300">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a
          href="#"
          className="flex items-center gap-2.5 text-base font-bold tracking-tight text-[var(--text-primary)]"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--accent-primary)] shadow-xs">
            <Terminal className="h-4 w-4" />
          </span>
          <span>{PROFILE_DATA.brand}</span>
        </a>

        <nav className="hidden items-center gap-8 text-sm font-medium text-[var(--text-secondary)] md:flex">
          <a
            href="#projects"
            className="transition-colors hover:text-[var(--text-primary)]"
          >
            Projects
          </a>
          <a
            href="#creative"
            className="transition-colors hover:text-[var(--text-primary)]"
          >
            Writing & Media
          </a>
          <a
            href="#about"
            className="transition-colors hover:text-[var(--text-primary)]"
          >
            About
          </a>
          <a
            href="#contact"
            className="transition-colors hover:text-[var(--text-primary)]"
          >
            Contact
          </a>
        </nav>

        <button
          onClick={onToggleTheme}
          aria-label="Toggle color theme"
          className="flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3.5 py-1.5 text-xs font-semibold text-[var(--text-primary)] shadow-xs transition-all duration-200 hover:scale-105 active:scale-95"
        >
          {isDark ? (
            <>
              <Sun className="h-3.5 w-3.5 text-amber-400" />
              <span>Solar Light</span>
            </>
          ) : (
            <>
              <Moon className="h-3.5 w-3.5 text-indigo-600" />
              <span>Deep Orbit</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
}
