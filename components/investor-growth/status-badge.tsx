import React from "react";
import styles from "./status-badge.module.css";

type StatusType =
  | "draft"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "sent"
  | "in_progress";

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

export default function StatusBadge({
  status,
  className = "",
}: StatusBadgeProps) {
  const getStatusLabel = (s: StatusType): string => {
    switch (s) {
      case "draft":
        return "Draft";
      case "pending_approval":
        return "Pending Approval";
      case "approved":
        return "Approved";
      case "rejected":
        return "Rejected";
      case "sent":
        return "Sent";
      case "in_progress":
        return "In Progress";
      default:
        return s;
    }
  };

  const getStatusClass = (s: StatusType): string => {
    switch (s) {
      case "draft":
        return styles.draft;
      case "pending_approval":
        return styles.pending;
      case "approved":
        return styles.approved;
      case "rejected":
        return styles.rejected;
      case "sent":
        return styles.sent;
      case "in_progress":
        return styles.inProgress;
      default:
        return styles.draft;
    }
  };

  return (
    <span className={`${styles.badge} ${getStatusClass(status)} ${className}`}>
      {getStatusLabel(status)}
    </span>
  );
}
