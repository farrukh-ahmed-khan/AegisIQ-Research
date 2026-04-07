"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./Footer.module.css";
import Image from "next/image";

const Footer = () => {
  const router = useRouter();

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.top}>
          <div className={styles.brand}>
            <Image
              src="/assets/aegisiq-logo.png"
              alt="AegisIQ"
              width={160}
              height={48}
              className={styles.logo}
              onClick={() => {
                router.push("/");
              }}
            />
            <p className={styles.brandDesc}>
              AI-powered equity research and analytics platform helping
              investors make smarter decisions.
            </p>
          </div>

          <div>
            <h4 className={styles.colTitle}>Product</h4>
            <ul className={styles.colLinks}>
              <li>
                <Link href="/features">Features</Link>
              </li>
              <li>
                <Link href="/pricing">Pricing</Link>
              </li>
              <li>
                <Link href="/reports">Reports</Link>
              </li>
              <li>
                <Link href="/reports/new">AI Report Builder</Link>
              </li>
              <li>
                <Link href="/investor-growth">Investor Growth</Link>
              </li>
              <li>
                <Link href="/investor-growth/campaigns">
                  Campaign Dashboard
                </Link>
              </li>
              <li>
                <Link href="/investor-growth/channels">Channel Execution</Link>
              </li>
              <li>
                <Link href="/investor-growth/calendar">Posting Calendar</Link>
              </li>
              <li>
                <Link href="/investor-growth/contacts">Investor Contacts</Link>
              </li>
              <li>
                <Link href="/investor-growth/segments">Investor Segments</Link>
              </li>
              <li>
                <Link href="/investor-growth/approvals">Approval Queue</Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className={styles.colTitle}>Company</h4>
            <ul className={styles.colLinks}>
              <li>
                <Link href="/about">About</Link>
              </li>
              <li>
                <Link href="/contact">Contact</Link>
              </li>
              <li>
                <Link href="/screener">Screener</Link>
              </li>
              <li>
                <Link href="/watchlists">Watchlists</Link>
              </li>
              <li>
                <Link href="/workspace">Workspace</Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className={styles.colTitle}>Legal</h4>
            <ul className={styles.colLinks}>
              <li>
                <Link href="#">Privacy Policy</Link>
              </li>
              <li>
                <Link href="#">Terms & Conditions</Link>
              </li>
              <li>
                <Link href="#">Cookie Policy</Link>
              </li>
            </ul>
          </div>
        </div>

        <div className={styles.bottom}>
          <p className={styles.copyright}>
            © 2025 AegisIQ. All rights reserved.
          </p>
          <div className={styles.bottomLinks}>
            <Link href="#">Twitter</Link>
            <Link href="#">LinkedIn</Link>
            <Link href="#">GitHub</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
