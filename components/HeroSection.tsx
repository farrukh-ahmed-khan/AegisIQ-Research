"use client";

import Image from "next/image";
import { Search } from "lucide-react";
import { useState } from "react";

const HeroSection = () => {
    const [ticker, setTicker] = useState("");

    return (
        <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
            {/* Background image */}
            <Image
                src="/assets/hero-bg.jpg"
                alt=""
                fill
                sizes="100vw"
                className="absolute inset-0 h-full w-full object-cover"
                aria-hidden="true"
                priority
            />
            {/* Gradient overlays */}
            <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/70 to-background/40" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/50" />

            {/* Decorative glow orbs */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-glow/10 rounded-full blur-3xl animate-pulse-glow" />
            <div className="absolute bottom-1/4 right-1/3 w-64 h-64 bg-gold/8 rounded-full blur-3xl animate-pulse-glow" />

            <div className="container px-6 grid lg:grid-cols-2 gap-12 items-center relative z-10">
                {/* Left content */}
                <div className="space-y-8">
                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight">
                        AI-Powered{" "}
                        <span className="text-gradient-gold">Insights</span>
                        <br />
                        for Smarter Investment Decisions
                    </h1>
                    <p className="text-lg text-muted-foreground max-w-md leading-relaxed">
                        Leverage the power of AI and advanced analytics to make informed,
                        confident investment choices.
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-wrap items-center gap-4">
                        <button className="px-8 py-3.5 rounded-full bg-primary text-primary-foreground font-semibold hover:brightness-110 transition glow-gold text-base">
                            Get Started
                        </button>
                        <button className="px-8 py-3.5 rounded-full border border-foreground/30 text-foreground/80 hover:text-foreground hover:border-foreground/60 transition flex items-center gap-2 text-base">
                            <span className="text-sm">Play</span> Watch Demo
                        </button>
                    </div>

                    {/* Ticker input */}
                    <div className="flex items-center gap-3 max-w-md mt-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                value={ticker}
                                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                                placeholder="Enter ticker (e.g. AAPL)"
                                className="w-full pl-10 pr-4 py-3 rounded-lg bg-muted/60 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition backdrop-blur-sm"
                            />
                        </div>
                        <button className="px-5 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:brightness-110 transition text-sm whitespace-nowrap">
                            Analyze
                        </button>
                    </div>
                </div>

                {/* Right dashboard image */}
                <div className="hidden lg:block">
                    <div className="relative glow-blue rounded-2xl overflow-hidden">
                        <Image
                            src="/assets/aegisiq-hero.png"
                            alt="AegisIQ Financial Dashboard"
                            width={1200}
                            height={800}
                            className="h-auto w-full rounded-2xl"
                            priority
                        />
                    </div>
                </div>
            </div>
        </section>
    );
};

export default HeroSection;
