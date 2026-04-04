import React from "react";
import styles from "./page-shell.module.css";

interface PageShellProps {
  children: React.ReactNode;
  className?: string;
}

export default function PageShell({
  children,
  className = "",
}: PageShellProps) {
  return (
    <div className={`${styles.pageShell} ${className}`}>
      <div className={styles.container}>{children}</div>
    </div>
  );
}
