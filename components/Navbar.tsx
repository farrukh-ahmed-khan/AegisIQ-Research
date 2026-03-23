"use client";

import Image from "next/image";
import { ChevronDown, Menu, X } from "lucide-react";
import { useState } from "react";


const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/30 backdrop-blur-md bg-background/60">
      <div className="container flex items-center justify-between h-20 px-6">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <Image
            src="/assets/aegisiq-logo.png"
            alt="AegisIQ"
            width={48} height={48}
          />
        </div>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-10">
          <div className="flex items-center gap-1 text-sm text-foreground/80 hover:text-foreground cursor-pointer transition-colors">
            Features
            <ChevronDown className="h-3.5 w-3.5 mt-0.5" />
          </div>
          <a href="#pricing" className="text-sm text-foreground/80 hover:text-foreground transition-colors">
            Pricing
          </a>
          <a href="#about" className="text-sm text-foreground/80 hover:text-foreground transition-colors">
            About
          </a>
          <a href="#contact" className="text-sm text-foreground/80 hover:text-foreground transition-colors">
            Contact
          </a>
          <button className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:brightness-110 transition glow-gold">
            Sign Up
          </button>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-foreground"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border/30 bg-background/95 backdrop-blur-xl px-6 py-6 space-y-4">
          <a href="#features" className="block text-sm text-foreground/80 hover:text-foreground">Features</a>
          <a href="#pricing" className="block text-sm text-foreground/80 hover:text-foreground">Pricing</a>
          <a href="#about" className="block text-sm text-foreground/80 hover:text-foreground">About</a>
          <a href="#contact" className="block text-sm text-foreground/80 hover:text-foreground">Contact</a>
          <button className="w-full px-6 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
            Sign Up
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
