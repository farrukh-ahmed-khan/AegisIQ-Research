import { SignIn } from "@clerk/nextjs";
import styles from "./sign-in.module.css";

export default function SignInPage() {
  return (
    <main className={styles.page}>
      <div className={styles.glowBlue} />
      <div className={styles.glowGold} />

      <section className={styles.container}>
        <div className={styles.contentCard}>
          <span className={styles.badge}>Welcome Back</span>
          <h1 className={styles.title}>Sign in to AegisIQ</h1>
          <p className={styles.subtitle}>
            Access your research workspace, reports, and valuation tools.
          </p>

          <div className={styles.authWrap}>
            <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
          </div>
        </div>

        <div className={styles.sideCard}>
          <h2 className={styles.sideTitle}>Built for modern research teams</h2>
          <ul className={styles.sideList}>
            <li>Generate institutional-style reports with AI assistance.</li>
            <li>
              Track valuation assumptions and thesis updates in one place.
            </li>
            <li>
              Collaborate on notes, docs, and watchlists across your workspace.
            </li>
          </ul>
        </div>
      </section>
    </main>
  );
}
