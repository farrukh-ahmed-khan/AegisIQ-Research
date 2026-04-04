import React from "react";
import styles from "./panel.module.css";

interface PanelProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  action?: React.ReactNode;
}

export default function Panel({
  title,
  subtitle,
  children,
  className = "",
  bodyClassName = "",
  action,
}: PanelProps) {
  return (
    <div className={`${styles.panel} ${className}`}>
      {(title || subtitle || action) && (
        <div className={styles.header}>
          <div className={styles.headerContent}>
            {title && <h3 className={styles.title}>{title}</h3>}
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
          {action && <div className={styles.headerAction}>{action}</div>}
        </div>
      )}
      <div className={`${styles.body} ${bodyClassName}`}>{children}</div>
    </div>
  );
}
