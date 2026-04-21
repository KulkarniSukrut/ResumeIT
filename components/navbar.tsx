"use client";

import { Moon, Sparkles, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";

type NavbarProps = {
  lightMode: boolean;
  onToggleTheme: () => void;
};

export function Navbar({ lightMode, onToggleTheme }: NavbarProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-black/40 backdrop-blur-xl supports-[backdrop-filter]:bg-black/30">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 text-zinc-100">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-400">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="text-lg font-semibold tracking-tight">ResumeIT</span>
        </div>
        <Button variant="outline" size="sm" onClick={onToggleTheme} aria-label="Toggle theme">
          {lightMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </Button>
      </div>
    </header>
  );
}
