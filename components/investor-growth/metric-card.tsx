import React from "react";
import styles from "./metric-card.module.css";

interface MetricCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  className?: string;
}

export default function MetricCard({
  label,
  value,
  icon,
  className = "",
}: MetricCardProps) {
  return (
    <div className={`${styles.card} ${className}`}>
      {icon && <div className={styles.icon}>{icon}</div>}
      <div className={styles.content}>
        <p className={styles.label}>{label}</p>
        <p className={styles.value}>{value}</p>
      </div>
    </div>
  );
}
