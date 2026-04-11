"use client";
import { Menu, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useUser, UserButton } from "@clerk/nextjs";
import { hasActiveSubscriptionFromUserPublicMetadata } from "@/lib/subscription-access";
import styles from "./navbar.module.css";

export default function SiteNavbar() {
  const router = useRouter();
  const { isSignedIn, user } = useUser();
  const [mobileOpen, setMobileOpen] = useState(false);
  const hasActiveSubscription = hasActiveSubscriptionFromUserPublicMetadata(
    user?.publicMetadata,
  );

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
          {isSignedIn && hasActiveSubscription ? (
            <a href="/transactions" className={styles.link}>
              Transactions
            </a>
          ) : null}
          {isSignedIn ? (
            <div className={styles.userProfile}>
              <UserButton afterSignOutUrl="/" />
            </div>
          ) : (
            <button
              onClick={() => router.push("/sign-up")}
              className={styles.signupBtn}
            >
              Sign Up
            </button>
          )}
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
        {isSignedIn && hasActiveSubscription ? (
          <a href="/transactions" className={styles.link}>
            Transactions
          </a>
        ) : null}
        {isSignedIn ? (
          <div className={styles.userProfileMobile}>
            <UserButton afterSignOutUrl="/" />
          </div>
        ) : (
          <button
            className={styles.signupBtn}
            onClick={() => router.push("/sign-up")}
          >
            Sign Up
          </button>
        )}
      </div>
    </nav>
  );
}
