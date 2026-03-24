"use client";
import { Menu, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./navbar.module.css";

export default function SiteNavbar() {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className={styles.nav}>
      <div className={styles.container}>
        <Image
          src="/assets/aegisiq-logo.png"
          alt="AegisIQ"
          width={160}
          height={58}
          className={styles.logo}
          onClick={() => {
            router.push("/");
          }}
        />

        <div className={styles.links}>
          <a href="/features" className={styles.link}>
            Features
          </a>
          <a href="/pricing" className={styles.link}>
            Pricing
          </a>
          <a href="/about" className={styles.link}>
            About
          </a>
          <a href="/contact" className={styles.link}>
            Contact
          </a>
          <button
            onClick={() => router.push("/sign-up")}
            className={styles.signupBtn}
          >
            Sign Up
          </button>
        </div>

        <button
          className={styles.menuToggle}
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <div className={`${styles.mobileMenu} ${mobileOpen ? styles.open : ""}`}>
        <a href="#features" className={styles.link}>
          Features
        </a>
        <a href="#pricing" className={styles.link}>
          Pricing
        </a>
        <a href="#about" className={styles.link}>
          About
        </a>
        <a href="#contact" className={styles.link}>
          Contact
        </a>
        <button className={styles.signupBtn}>Sign Up</button>
      </div>
    </nav>
  );
}
