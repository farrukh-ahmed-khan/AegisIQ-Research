import styles from "./TestimonialsSection.module.css";

const testimonials = [
    { initials: "JR", name: "James Rodriguez", role: "Portfolio Manager", quote: "AegisIQ has completely transformed how I conduct equity research. The AI-powered insights save me hours every week." },
    { initials: "SK", name: "Sarah Kim", role: "Day Trader", quote: "The real-time alerts and predictive analytics are incredibly accurate. My returns have improved significantly since using AegisIQ." },
    { initials: "MP", name: "Michael Patel", role: "Financial Analyst", quote: "The depth of analysis is remarkable. It's like having an entire research team at your fingertips, available 24/7." },
];

const TestimonialsSection = () => (
    <section className={styles.section}>
        <div className={styles.container}>
            <div className={styles.textCenter}>
                <span className={styles.badge}>Testimonials</span>
                <h2 className={styles.heading}>
                    Trusted by <span className={styles.headingAccent}>Thousands of Investors</span>
                </h2>
                <p className={styles.subtitle}>
                    See what our users have to say about their experience with AegisIQ.
                </p>
            </div>
            <div className={styles.grid}>
                {testimonials.map((t, i) => (
                    <div key={i} className={styles.card}>
                        <div className={styles.stars}>★★★★★</div>
                        <p className={styles.quote}>"{t.quote}"</p>
                        <div className={styles.author}>
                            <div className={styles.avatar}>{t.initials}</div>
                            <div>
                                <div className={styles.authorName}>{t.name}</div>
                                <div className={styles.authorRole}>{t.role}</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </section>
);

export default TestimonialsSection;
