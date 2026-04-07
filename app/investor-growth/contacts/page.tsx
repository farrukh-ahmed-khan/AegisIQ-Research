"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Button, Input, Modal, message } from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import MetricCard from "../../../components/investor-growth/metric-card";
import Panel from "../../../components/investor-growth/panel";
import SectionHeader from "../../../components/investor-growth/section-header";
import styles from "./contacts.module.css";

interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  organization?: string;
  role?: string;
  investor_type?: string;
  account_name?: string;
  relationship_stage?: string;
  interest_score?: number;
  next_follow_up_at?: string | null;
  notes?: string;
  tags_json?: Record<string, unknown>;
  created_at: string;
}

interface TimelineEntry {
  id: string;
  entry_type: string;
  title: string;
  note?: string | null;
  due_at?: string | null;
  created_at: string;
}

interface PaginationData {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

function formatDate(date: string): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function getErrorMessage(response: Response, fallback: string) {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error || fallback;
  } catch {
    return fallback;
  }
}

export default function ContactsPage() {
  const { userId } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    per_page: 25,
    total: 0,
    total_pages: 0,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    organization: "",
    role: "",
    investor_type: "",
    account_name: "",
    relationship_stage: "prospect",
    interest_score: "",
    next_follow_up_at: "",
    notes: "",
  });

  // Fetch contacts
  const fetchContacts = async (page: number) => {
    if (!userId) return;
    setLoading(true);
    try {
      const response = await fetch(
        `/api/investor-growth/contacts?page=${page}`,
      );
      const data = await response.json();
      setContacts(data.contacts);
      setPagination(data.pagination);
    } catch (error) {
      message.error("Failed to fetch contacts");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts(1);
  }, [userId]);

  const selectedContact =
    contacts.find((contact) => contact.id === selectedContactId) ?? null;

  useEffect(() => {
    async function loadTimeline() {
      if (!selectedContactId) {
        setTimeline([]);
        return;
      }

      try {
        const response = await fetch(
          `/api/investor-growth/contacts/${selectedContactId}/timeline`,
          {
            cache: "no-store",
          },
        );
        const data = (await response.json().catch(() => ({}))) as {
          timeline?: TimelineEntry[];
        };
        setTimeline(Array.isArray(data.timeline) ? data.timeline : []);
      } catch {
        setTimeline([]);
      }
    }

    void loadTimeline();
  }, [selectedContactId]);

  // Handle form submit
  const handleSubmit = async () => {
    const newErrors: Record<string, string> = {};

    // Validation
    if (!formData.name.trim()) {
      newErrors.name = "Contact name is required";
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      message.error("Please fix the errors in the form");
      return;
    }

    setIsSubmitting(true);
    try {
      const method = editingContact ? "PATCH" : "POST";
      const url = editingContact
        ? `/api/investor-growth/contacts/${editingContact.id}`
        : "/api/investor-growth/contacts";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          interest_score:
            formData.interest_score === ""
              ? undefined
              : Number(formData.interest_score),
        }),
      });

      if (!response.ok) {
        throw new Error(
          await getErrorMessage(response, "Failed to save contact"),
        );
      }

      message.success(editingContact ? "Contact updated" : "Contact created");
      setIsModalOpen(false);
      resetForm();
      setSelectedContactId(editingContact?.id ?? null);
      fetchContacts(1);
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "Failed to save contact",
      );
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: "Delete contact?",
      content: "This action cannot be undone.",
      okText: "Delete",
      okType: "danger",
      cancelText: "Cancel",
      centered: true,
      async onOk() {
        try {
          const response = await fetch(`/api/investor-growth/contacts/${id}`, {
            method: "DELETE",
          });

          if (!response.ok) {
            throw new Error(
              await getErrorMessage(response, "Failed to delete contact"),
            );
          }

          message.success("Contact deleted");
          if (selectedContactId === id) {
            setSelectedContactId(null);
          }
          fetchContacts(pagination.page);
        } catch (error) {
          message.error(
            error instanceof Error ? error.message : "Failed to delete contact",
          );
          console.error(error);
          throw error;
        }
      },
    });
  };

  // Handle edit
  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);
    setSelectedContactId(contact.id);
    setFormData({
      name: contact.name,
      email: contact.email ?? "",
      phone: contact.phone ?? "",
      organization: contact.organization ?? "",
      role: contact.role ?? "",
      investor_type: contact.investor_type ?? "",
      account_name: contact.account_name ?? "",
      relationship_stage: contact.relationship_stage ?? "prospect",
      interest_score:
        contact.interest_score === undefined ? "" : String(contact.interest_score),
      next_follow_up_at: contact.next_follow_up_at ?? "",
      notes: contact.notes ?? "",
    });
    setIsModalOpen(true);
  };

  // Reset form
  const resetForm = () => {
    setEditingContact(null);
    setFormData({
      name: "",
      email: "",
      phone: "",
      organization: "",
      role: "",
      investor_type: "",
      account_name: "",
      relationship_stage: "prospect",
      interest_score: "",
      next_follow_up_at: "",
      notes: "",
    });
    setErrors({});
  };

  return (
    <div className={styles.container}>
      <SectionHeader
        title="Investor Contacts"
        subtitle="Manage your investor contact database"
        action={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            size="large"
            style={{
              background: "#2563eb",
              borderColor: "#2563eb",
              height: "40px",
            }}
          >
            Add Contact
          </Button>
        }
      />

      <div className={styles.metricsRow}>
        <MetricCard
          label="Current Page Contacts"
          value={loading ? "--" : contacts.length}
        />
        <MetricCard label="Current Page" value={pagination.page} />
        <MetricCard label="Total Contacts" value={pagination.total} />
      </div>

      {loading ? (
        <Panel title="Contacts">
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
            <p className={styles.loadingText}>Loading contacts...</p>
          </div>
        </Panel>
      ) : contacts.length === 0 ? (
        <Panel title="Contacts">
          <div className={styles.emptyMessage}>
            <div className={styles.emptyIcon}>📋</div>
            <p>No contacts yet. Create your first contact to get started.</p>
          </div>
        </Panel>
      ) : (
        <Panel title="Contacts">
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Organization</th>
                  <th>Role</th>
                  <th>Investor Type</th>
                  <th>Stage</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact) => (
                  <tr key={contact.id}>
                    <td>
                      <button
                        type="button"
                        className={styles.rowButton}
                        onClick={() => setSelectedContactId(contact.id)}
                      >
                        {contact.name}
                      </button>
                    </td>
                    <td>{contact.email || "-"}</td>
                    <td>{contact.organization || "-"}</td>
                    <td>{contact.role || "-"}</td>
                    <td>{contact.investor_type || "-"}</td>
                    <td>{contact.relationship_stage || "-"}</td>
                    <td>{formatDate(contact.created_at)}</td>
                    <td>
                      <div className={styles.actionButtons}>
                        <button
                          className={styles.actionButton}
                          onClick={() => handleEdit(contact)}
                          title="Edit contact"
                        >
                          <EditOutlined />
                        </button>
                        <button
                          className={`${styles.actionButton} ${styles.delete}`}
                          onClick={() => handleDelete(contact.id)}
                          title="Delete contact"
                        >
                          <DeleteOutlined />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.total_pages > 1 && (
            <div className={styles.paginationContainer}>
              <button
                className={styles.actionButton}
                onClick={() => fetchContacts(pagination.page - 1)}
                disabled={pagination.page === 1}
              >
                Previous
              </button>
              <span style={{ color: "#94a3b8" }}>
                Page {pagination.page} of {pagination.total_pages}
              </span>
              <button
                className={styles.actionButton}
                onClick={() => fetchContacts(pagination.page + 1)}
                disabled={pagination.page === pagination.total_pages}
              >
                Next
              </button>
            </div>
          )}
        </Panel>
      )}

      <Panel title="Contact Detail">
        {!selectedContact ? (
          <p className={styles.detailEmpty}>
            Select a contact from the table to review their details.
          </p>
        ) : (
          <div className={styles.detailPanel}>
            <div className={styles.detailRow}>
              <span>Name</span>
              <strong>{selectedContact.name}</strong>
            </div>
            <div className={styles.detailRow}>
              <span>Email</span>
              <strong>{selectedContact.email || "-"}</strong>
            </div>
            <div className={styles.detailRow}>
              <span>Phone</span>
              <strong>{selectedContact.phone || "-"}</strong>
            </div>
            <div className={styles.detailRow}>
              <span>Organization</span>
              <strong>{selectedContact.organization || "-"}</strong>
            </div>
            <div className={styles.detailRow}>
              <span>Role</span>
              <strong>{selectedContact.role || "-"}</strong>
            </div>
            <div className={styles.detailRow}>
              <span>Investor Type</span>
              <strong>{selectedContact.investor_type || "-"}</strong>
            </div>
            <div className={styles.detailRow}>
              <span>Account</span>
              <strong>{selectedContact.account_name || "-"}</strong>
            </div>
            <div className={styles.detailRow}>
              <span>Relationship Stage</span>
              <strong>{selectedContact.relationship_stage || "-"}</strong>
            </div>
            <div className={styles.detailRow}>
              <span>Interest Score</span>
              <strong>{selectedContact.interest_score ?? 0}</strong>
            </div>
            <div className={styles.detailRow}>
              <span>Next Follow-up</span>
              <strong>
                {selectedContact.next_follow_up_at
                  ? formatDate(selectedContact.next_follow_up_at)
                  : "-"}
              </strong>
            </div>
            <div className={styles.detailRow}>
              <span>Created</span>
              <strong>{formatDate(selectedContact.created_at)}</strong>
            </div>
            <div className={styles.detailNotes}>
              <span>Notes</span>
              <p>{selectedContact.notes || "No notes added yet."}</p>
            </div>
            <div className={styles.detailNotes}>
              <span>Timeline</span>
              {timeline.length === 0 ? (
                <p>No outreach timeline entries yet.</p>
              ) : (
                timeline.map((entry) => (
                  <p key={entry.id}>
                    {entry.title} | {entry.note || entry.entry_type} |{" "}
                    {formatDate(entry.created_at)}
                  </p>
                ))
              )}
            </div>
          </div>
        )}
      </Panel>

      {/* Custom Modal */}
      <div
        className={`${styles.modalOverlay} ${isModalOpen ? styles.open : ""}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setIsModalOpen(false);
            resetForm();
          }
        }}
      >
        <div className={styles.modalContent}>
          <div className={styles.modalHeader}>
            <h2 className={styles.modalTitle}>
              {editingContact ? "Edit Contact" : "Add Contact"}
            </h2>
            <button
              className={styles.modalClose}
              onClick={() => {
                setIsModalOpen(false);
                resetForm();
              }}
            >
              <CloseOutlined />
            </button>
          </div>

          <div className={styles.modalBody}>
            <div className={styles.formGroup}>
              <label>Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (errors.name) {
                    setErrors({ ...errors, name: "" });
                  }
                }}
                placeholder="Contact Name"
                className={errors.name ? styles.error : ""}
                style={{
                  background: "#0f172a",
                  borderColor: errors.name ? "#dc2626" : "#334155",
                  color: "#e5e7eb",
                }}
              />
              {errors.name && (
                <div className={styles.errorMessage}>{errors.name}</div>
              )}
            </div>

            <div className={styles.formGroup}>
              <label>Email</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  if (errors.email) {
                    setErrors({ ...errors, email: "" });
                  }
                }}
                placeholder="email@example.com"
                className={errors.email ? styles.error : ""}
                style={{
                  background: "#0f172a",
                  borderColor: errors.email ? "#dc2626" : "#334155",
                  color: "#e5e7eb",
                }}
              />
              {errors.email && (
                <div className={styles.errorMessage}>{errors.email}</div>
              )}
            </div>

            <div className={styles.formGroup}>
              <label>Phone</label>
              <Input
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="Phone Number"
                style={{
                  background: "#0f172a",
                  borderColor: "#334155",
                  color: "#e5e7eb",
                }}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Organization</label>
              <Input
                value={formData.organization}
                onChange={(e) =>
                  setFormData({ ...formData, organization: e.target.value })
                }
                placeholder="Organization"
                style={{
                  background: "#0f172a",
                  borderColor: "#334155",
                  color: "#e5e7eb",
                }}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Role</label>
              <Input
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value })
                }
                placeholder="Job Role"
                style={{
                  background: "#0f172a",
                  borderColor: "#334155",
                  color: "#e5e7eb",
                }}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Investor Type</label>
              <Input
                value={formData.investor_type}
                onChange={(e) =>
                  setFormData({ ...formData, investor_type: e.target.value })
                }
                placeholder="e.g., Angel, VC, PE"
                style={{
                  background: "#0f172a",
                  borderColor: "#334155",
                  color: "#e5e7eb",
                }}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Account</label>
              <Input
                value={formData.account_name}
                onChange={(e) =>
                  setFormData({ ...formData, account_name: e.target.value })
                }
                placeholder="Fund or account name"
                style={{
                  background: "#0f172a",
                  borderColor: "#334155",
                  color: "#e5e7eb",
                }}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Relationship Stage</label>
              <Input
                value={formData.relationship_stage}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    relationship_stage: e.target.value,
                  })
                }
                placeholder="prospect, active, diligence, relationship"
                style={{
                  background: "#0f172a",
                  borderColor: "#334155",
                  color: "#e5e7eb",
                }}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Interest Score</label>
              <Input
                value={formData.interest_score}
                onChange={(e) =>
                  setFormData({ ...formData, interest_score: e.target.value })
                }
                placeholder="0 to 100"
                style={{
                  background: "#0f172a",
                  borderColor: "#334155",
                  color: "#e5e7eb",
                }}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Next Follow-up</label>
              <Input
                value={formData.next_follow_up_at}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    next_follow_up_at: e.target.value,
                  })
                }
                placeholder="2026-04-15T10:00:00Z"
                style={{
                  background: "#0f172a",
                  borderColor: "#334155",
                  color: "#e5e7eb",
                }}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Notes</label>
              <Input.TextArea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Additional Notes"
                rows={3}
                style={{
                  background: "#0f172a",
                  borderColor: "#334155",
                  color: "#e5e7eb",
                }}
              />
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button
              className={`${styles.modalButton} ${styles.default}`}
              onClick={() => {
                setIsModalOpen(false);
                resetForm();
              }}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              className={`${styles.modalButton} ${styles.primary}`}
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting && <div className={styles.buttonLoader}></div>}
              {isSubmitting
                ? "Processing..."
                : editingContact
                  ? "Update"
                  : "Create"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
