import React from "react";
import styles from "./form-field.module.css";

interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
  helperText?: string;
}

export default function FormField({
  label,
  error,
  required = false,
  className = "",
  children,
  helperText,
}: FormFieldProps) {
  return (
    <div
      className={`${styles.field} ${error ? styles.hasError : ""} ${className}`}
    >
      <label className={styles.label}>
        {label}
        {required && <span className={styles.required}>*</span>}
      </label>
      <div className={styles.input}>{children}</div>
      {error && <p className={styles.error}>{error}</p>}
      {helperText && !error && <p className={styles.helper}>{helperText}</p>}
    </div>
  );
}
