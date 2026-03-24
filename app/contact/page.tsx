import { Clock3, Mail, MapPin, Phone } from "lucide-react";
import styles from "./contact.module.css";

export default function ContactPage() {
  return (
    <main className={styles.page}>
      <div className={styles.glowBlue} />
      <div className={styles.glowGold} />

      <section className={styles.container}>
        <div className={styles.hero}>
          <span className={styles.badge}>Contact</span>
          <h1 className={styles.title}>Talk to the AegisIQ Team</h1>
          <p className={styles.subtitle}>
            Have questions or want a demo? Share a few details and we will
            follow up with the right product specialist.
          </p>
        </div>

        <div className={styles.grid}>
          <form className={styles.formCard}>
            <label className={styles.fieldLabel} htmlFor="full-name">
              Full name
            </label>
            <input
              id="full-name"
              className={styles.field}
              placeholder="Jane Doe"
              type="text"
            />

            <label className={styles.fieldLabel} htmlFor="work-email">
              Work email
            </label>
            <input
              id="work-email"
              className={styles.field}
              placeholder="jane@fund.com"
              type="email"
            />

            <label className={styles.fieldLabel} htmlFor="message">
              How can we help?
            </label>
            <textarea
              id="message"
              className={styles.textarea}
              placeholder="Tell us what you are building and your timeline."
            />

            <button type="button" className={styles.submitButton}>
              Send Message
            </button>
          </form>

          <aside className={styles.infoCard}>
            <h2 className={styles.infoTitle}>Reach Us Directly</h2>
            <p className={styles.infoIntro}>
              Prefer direct contact? Our team is available for onboarding,
              technical support, and enterprise setup.
            </p>

            <ul className={styles.contactList}>
              <li className={styles.contactItem}>
                <span className={`${styles.iconWrap} ${styles.iconBlue}`}>
                  <Mail size={18} />
                </span>
                <div>
                  <p className={styles.contactLabel}>Email</p>
                  <p className={styles.contactValue}>hello@aegisiq.ai</p>
                </div>
              </li>

              <li className={styles.contactItem}>
                <span className={`${styles.iconWrap} ${styles.iconGold}`}>
                  <Phone size={18} />
                </span>
                <div>
                  <p className={styles.contactLabel}>Phone</p>
                  <p className={styles.contactValue}>+1 (415) 555-0199</p>
                </div>
              </li>

              <li className={styles.contactItem}>
                <span className={`${styles.iconWrap} ${styles.iconBlue}`}>
                  <Clock3 size={18} />
                </span>
                <div>
                  <p className={styles.contactLabel}>Hours</p>
                  <p className={styles.contactValue}>
                    Mon-Fri, 9:00 AM - 6:00 PM PT
                  </p>
                </div>
              </li>

              <li className={styles.contactItem}>
                <span className={`${styles.iconWrap} ${styles.iconGold}`}>
                  <MapPin size={18} />
                </span>
                <div>
                  <p className={styles.contactLabel}>Location</p>
                  <p className={styles.contactValue}>San Francisco, CA</p>
                </div>
              </li>
            </ul>
          </aside>
        </div>
      </section>
    </main>
  );
}
