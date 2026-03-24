import styles from "./Footer.module.css";
import Image from "next/image";

const Footer = () => (
    <footer className={styles.footer}>
        <div className={styles.container}>
            <div className={styles.top}>
                <div className={styles.brand}>
                    <Image src="/assets/aegisiq-logo.png" alt="AegisIQ" width={160} height={48} className={styles.logo} />
                    <p className={styles.brandDesc}>
                        AI-powered equity research and analytics platform helping investors make smarter decisions.
                    </p>
                </div>
                <div>
                    <h4 className={styles.colTitle}>Product</h4>
                    <ul className={styles.colLinks}>
                        <li><a href="#features">Features</a></li>
                        <li><a href="#pricing">Pricing</a></li>
                        <li><a href="#">API</a></li>
                        <li><a href="#">Integrations</a></li>
                    </ul>
                </div>
                <div>
                    <h4 className={styles.colTitle}>Company</h4>
                    <ul className={styles.colLinks}>
                        <li><a href="#about">About</a></li>
                        <li><a href="#">Careers</a></li>
                        <li><a href="#">Blog</a></li>
                        <li><a href="#contact">Contact</a></li>
                    </ul>
                </div>
                <div>
                    <h4 className={styles.colTitle}>Legal</h4>
                    <ul className={styles.colLinks}>
                        <li><a href="#">Privacy Policy</a></li>
                        <li><a href="#">Terms of Service</a></li>
                        <li><a href="#">Cookie Policy</a></li>
                    </ul>
                </div>
            </div>
            <div className={styles.bottom}>
                <p className={styles.copyright}>© 2025 AegisIQ. All rights reserved.</p>
                <div className={styles.bottomLinks}>
                    <a href="#">Twitter</a>
                    <a href="#">LinkedIn</a>
                    <a href="#">GitHub</a>
                </div>
            </div>
        </div>
    </footer>
);

export default Footer;
