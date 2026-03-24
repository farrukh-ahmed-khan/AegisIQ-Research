import { SignUp } from "@clerk/nextjs";
import styles from "./sign-up.module.css";

export default function SignUpPage() {
  return (
    <main className={styles.page}>
      <div className={styles.glowBlue} />
      <div className={styles.glowGold} />

      <section className={styles.container}>
        <div className={styles.contentCard}>
          <span className={styles.badge}>Get Started</span>
          <h1 className={styles.title}>Create your AegisIQ account</h1>
          <p className={styles.subtitle}>
            Start building faster equity research workflows with AI support.
          </p>

          <div className={styles.authWrap}>
            <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
          </div>
        </div>

        <div className={styles.sideCard}>
          <h2 className={styles.sideTitle}>Why teams choose AegisIQ</h2>
          <ul className={styles.sideList}>
            <li>
              Combine market data, valuation logic, and narrative in one
              workflow.
            </li>
            <li>
              Export polished reports for IC meetings and client communication.
            </li>
            <li>
              Scale analyst output with repeatable, transparent research
              processes.
            </li>
          </ul>
        </div>
      </section>
    </main>
  );
}
