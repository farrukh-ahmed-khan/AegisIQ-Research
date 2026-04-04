import React from "react";
import FormField from "./form-field";

interface TextAreaFieldProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  rows?: number;
  error?: string;
  required?: boolean;
  className?: string;
  helperText?: string;
}

export default function TextAreaField({
  label,
  value,
  onChange,
  placeholder = "",
  rows = 4,
  error,
  required = false,
  className = "",
  helperText,
}: TextAreaFieldProps) {
  return (
    <FormField
      label={label}
      error={error}
      required={required}
      className={className}
      helperText={helperText}
    >
      <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        style={{ resize: "vertical" }}
      />
    </FormField>
  );
}
