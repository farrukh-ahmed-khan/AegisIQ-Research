"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Button, Input, Modal, message } from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  UserOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import styles from "./segments.module.css";

interface Contact {
  id: string;
  name: string;
  email?: string;
  organization?: string;
}

interface Segment {
  id: string;
  name: string;
  description?: string;
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

export default function SegmentsPage() {
  const { userId } = useAuth();
  const [segments, setSegments] = useState<Segment[]>([]);
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingMembers, setIsSavingMembers] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    per_page: 25,
    total: 0,
    total_pages: 0,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [editingSegment, setEditingSegment] = useState<Segment | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [availableSearch, setAvailableSearch] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  const selectedMembersSet = useMemo(
    () => new Set(selectedMembers),
    [selectedMembers],
  );
  const availableContacts = useMemo(
    () => allContacts.filter((contact) => !selectedMembersSet.has(contact.id)),
    [allContacts, selectedMembersSet],
  );
  const memberContacts = useMemo(
    () => allContacts.filter((contact) => selectedMembersSet.has(contact.id)),
    [allContacts, selectedMembersSet],
  );
  const filteredAvailableContacts = useMemo(() => {
    const term = availableSearch.trim().toLowerCase();
    if (!term) return availableContacts;

    return availableContacts.filter((contact) =>
      `${contact.name} ${contact.email ?? ""} ${contact.organization ?? ""}`
        .toLowerCase()
        .includes(term),
    );
  }, [availableContacts, availableSearch]);
  const filteredMemberContacts = useMemo(() => {
    const term = memberSearch.trim().toLowerCase();
    if (!term) return memberContacts;

    return memberContacts.filter((contact) =>
      `${contact.name} ${contact.email ?? ""} ${contact.organization ?? ""}`
        .toLowerCase()
        .includes(term),
    );
  }, [memberContacts, memberSearch]);

  async function getErrorMessage(response: Response, fallback: string) {
    try {
      const data = (await response.json()) as { error?: string };
      return data.error || fallback;
    } catch {
      return fallback;
    }
  }

  // Fetch all segments
  const fetchSegments = async (page: number) => {
    if (!userId) return;
    setLoading(true);
    try {
      const response = await fetch(
        `/api/investor-growth/segments?page=${page}`,
      );
      if (!response.ok) {
        throw new Error(
          await getErrorMessage(response, "Failed to fetch segments"),
        );
      }
      const data = await response.json();
      setSegments(data.segments);
      setPagination(data.pagination);
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "Failed to fetch segments",
      );
    } finally {
      setLoading(false);
    }
  };

  // Fetch all contacts for transfer
  const fetchAllContacts = async () => {
    try {
      const firstResponse = await fetch(`/api/investor-growth/contacts?page=1`);
      if (!firstResponse.ok) {
        throw new Error(
          await getErrorMessage(firstResponse, "Failed to fetch contacts"),
        );
      }

      const firstPage = await firstResponse.json();
      const contacts = [...(firstPage.contacts as Contact[])];
      const totalPages = Number(firstPage.pagination?.total_pages ?? 1);

      for (let page = 2; page <= totalPages; page += 1) {
        const response = await fetch(
          `/api/investor-growth/contacts?page=${page}`,
        );
        if (!response.ok) {
          throw new Error(
            await getErrorMessage(response, "Failed to fetch contacts"),
          );
        }

        const data = await response.json();
        contacts.push(...(data.contacts as Contact[]));
      }

      setAllContacts(contacts);
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "Failed to fetch contacts",
      );
      console.error("Failed to fetch contacts:", error);
    }
  };

  useEffect(() => {
    fetchSegments(1);
    fetchAllContacts();
  }, [userId]);

  // Fetch segment members
  const fetchSegmentMembers = async (segmentId: string) => {
    try {
      const response = await fetch(
        `/api/investor-growth/segments/${segmentId}`,
      );
      if (!response.ok) {
        throw new Error(
          await getErrorMessage(response, "Failed to fetch segment members"),
        );
      }
      const data = await response.json();
      const memberIds = data.contacts.map((c: Contact) => c.id);
      setSelectedMembers(memberIds);
    } catch (error) {
      message.error(
        error instanceof Error
          ? error.message
          : "Failed to fetch segment members",
      );
      console.error("Failed to fetch segment members:", error);
    }
  };

  // Handle form submit
  const handleSubmit = async () => {
    const newErrors: Record<string, string> = {};

    // Validation
    if (!formData.name.trim()) {
      newErrors.name = "Segment name is required";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      message.error("Please fix the errors in the form");
      return;
    }

    setIsSubmitting(true);
    try {
      const method = editingSegment ? "PATCH" : "POST";
      const url = editingSegment
        ? `/api/investor-growth/segments/${editingSegment.id}`
        : "/api/investor-growth/segments";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error(
          await getErrorMessage(response, "Failed to save segment"),
        );
      }

      message.success(editingSegment ? "Segment updated" : "Segment created");
      setIsModalOpen(false);
      resetForm();
      fetchSegments(1);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to save segment";
      message.error(errorMessage);
      console.error("Submit error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle save members
  const handleSaveMembers = async () => {
    if (!editingSegment) return;

    setIsSavingMembers(true);
    try {
      // Get current members
      const response = await fetch(
        `/api/investor-growth/segments/${editingSegment.id}`,
      );
      if (!response.ok) {
        throw new Error(
          await getErrorMessage(response, "Failed to load current members"),
        );
      }
      const data = await response.json();
      const currentMembers = new Set(data.contacts.map((c: Contact) => c.id));

      // Find added and removed
      const newSet = new Set(selectedMembers);
      const toAdd = selectedMembers.filter((id) => !currentMembers.has(id));
      const toRemove = Array.from(currentMembers).filter(
        (id: string) => !newSet.has(id),
      );

      // Add new members
      for (const contactId of toAdd) {
        const response = await fetch(
          `/api/investor-growth/segments/${editingSegment.id}/members`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contact_id: contactId }),
          },
        );

        if (!response.ok) {
          throw new Error(
            await getErrorMessage(response, "Failed to add contact to segment"),
          );
        }
      }

      // Remove old members
      for (const contactId of toRemove) {
        const response = await fetch(
          `/api/investor-growth/segments/${editingSegment.id}/members`,
          {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contact_id: contactId }),
          },
        );

        if (!response.ok) {
          throw new Error(
            await getErrorMessage(
              response,
              "Failed to remove contact from segment",
            ),
          );
        }
      }

      message.success("Segment members updated");
      setIsMembersModalOpen(false);
      setEditingSegment(null);
      setAvailableSearch("");
      setMemberSearch("");
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "Failed to update members",
      );
      console.error(error);
    } finally {
      setIsSavingMembers(false);
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    const segment = segments.find((s) => s.id === id);
    if (!segment) return;
    Modal.confirm({
      title: "Delete segment?",
      content: `This will permanently remove "${segment.name}" and its member assignments.`,
      okText: "Delete",
      okType: "danger",
      cancelText: "Cancel",
      centered: true,
      async onOk() {
        try {
          const response = await fetch(
            `/api/investor-growth/segments/${segment.id}`,
            {
              method: "DELETE",
            },
          );

          if (!response.ok) {
            throw new Error(
              await getErrorMessage(response, "Failed to delete segment"),
            );
          }

          message.success("Segment deleted");
          fetchSegments(pagination.page > 1 ? pagination.page : 1);
        } catch (error) {
          message.error(
            error instanceof Error ? error.message : "Failed to delete segment",
          );
          console.error("Delete error:", error);
          throw error;
        }
      },
    });
  };

  // Handle edit
  const handleEdit = (segment: Segment) => {
    setEditingSegment(segment);
    setFormData({
      name: segment.name,
      description: segment.description ?? "",
    });
    setIsModalOpen(true);
  };

  // Handle manage members
  const handleManageMembers = (segment: Segment) => {
    setEditingSegment(segment);
    setAvailableSearch("");
    setMemberSearch("");
    fetchSegmentMembers(segment.id);
    setIsMembersModalOpen(true);
  };

  // Reset form
  const resetForm = () => {
    setEditingSegment(null);
    setFormData({
      name: "",
      description: "",
    });
    setErrors({});
  };

  const renderContactMeta = (contact: Contact) => {
    const pieces = [contact.email, contact.organization].filter(Boolean);
    return pieces.length > 0 ? pieces.join(" | ") : "No email or organization";
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1>Investor Segments</h1>
          <p>Create and manage investor segment groups</p>
        </div>

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
          Add Segment
        </Button>
      </header>

      {loading ? (
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p className={styles.loadingText}>Loading segments...</p>
        </div>
      ) : segments.length === 0 ? (
        <div className={styles.emptyMessage}>
          <div className={styles.emptyIcon}>📊</div>
          <p>No segments yet. Create your first segment to get started.</p>
        </div>
      ) : (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Segment Name</th>
                  <th>Description</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {segments.map((segment) => (
                  <tr key={segment.id}>
                    <td>{segment.name}</td>
                    <td>{segment.description || "-"}</td>
                    <td>{formatDate(segment.created_at)}</td>
                    <td>
                      <div className={styles.actionButtons}>
                        <button
                          className={styles.actionButton}
                          onClick={() => handleEdit(segment)}
                          title="Edit segment"
                        >
                          <EditOutlined />
                        </button>
                        <button
                          className={styles.actionButton}
                          onClick={() => handleManageMembers(segment)}
                          title="Manage members"
                        >
                          <UserOutlined />
                        </button>
                        <button
                          className={`${styles.actionButton} ${styles.delete}`}
                          onClick={() => handleDelete(segment.id)}
                          title="Delete segment"
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
                onClick={() => fetchSegments(pagination.page - 1)}
                disabled={pagination.page === 1}
              >
                Previous
              </button>
              <span style={{ color: "#94a3b8" }}>
                Page {pagination.page} of {pagination.total_pages}
              </span>
              <button
                className={styles.actionButton}
                onClick={() => fetchSegments(pagination.page + 1)}
                disabled={pagination.page === pagination.total_pages}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

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
              {editingSegment ? "Edit Segment" : "Add Segment"}
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
              <label>Segment Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (errors.name) {
                    setErrors({ ...errors, name: "" });
                  }
                }}
                placeholder="e.g., Series A VCs, Angel Investors"
                className={errors.name ? styles.error : ""}
              />
              {errors.name && (
                <div className={styles.errorMessage}>{errors.name}</div>
              )}
            </div>

            <div className={styles.formGroup}>
              <label>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Describe this segment"
                rows={3}
                className={styles.textarea}
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
                : editingSegment
                  ? "Update"
                  : "Create"}
            </button>
          </div>
        </div>
      </div>

      <div
        className={`${styles.modalOverlay} ${isMembersModalOpen ? styles.open : ""}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setIsMembersModalOpen(false);
            setEditingSegment(null);
            setAvailableSearch("");
            setMemberSearch("");
          }
        }}
      >
        <div className={`${styles.modalContent} ${styles.membersModal}`}>
          <div className={styles.modalHeader}>
            <div className={styles.membersHeaderContent}>
              <h2 className={styles.modalTitle}>
                Manage Members: {editingSegment?.name}
              </h2>
              <p className={styles.membersSubtitle}>
                Add contacts to this segment and keep your outreach lists tidy.
              </p>
            </div>
            <button
              className={styles.modalClose}
              onClick={() => {
                setIsMembersModalOpen(false);
                setEditingSegment(null);
                setAvailableSearch("");
                setMemberSearch("");
              }}
            >
              <CloseOutlined />
            </button>
          </div>

          <div className={`${styles.modalBody} ${styles.membersModalBody}`}>
            <div className={styles.membersSummaryRow}>
              <div className={styles.membersStatCard}>
                <span className={styles.membersStatLabel}>Available</span>
                <strong className={styles.membersStatValue}>
                  {availableContacts.length}
                </strong>
              </div>
              <div className={styles.membersStatCard}>
                <span className={styles.membersStatLabel}>Selected</span>
                <strong className={styles.membersStatValue}>
                  {memberContacts.length}
                </strong>
              </div>
            </div>

            <div className={styles.membersGrid}>
              <section className={styles.memberPanel}>
                <div className={styles.memberPanelHeader}>
                  <div>
                    <h3>Available Contacts</h3>
                    <p>Choose who should be added to this segment.</p>
                  </div>
                  <span className={styles.memberBadge}>
                    {filteredAvailableContacts.length}
                  </span>
                </div>
                <Input
                  type="text"
                  value={availableSearch}
                  onChange={(e) => setAvailableSearch(e.target.value)}
                  placeholder="Search available contacts"
                  className={styles.memberSearch}
                />
                <div className={styles.memberList}>
                  {filteredAvailableContacts.length === 0 ? (
                    <div className={styles.memberEmptyState}>
                      No matching available contacts.
                    </div>
                  ) : (
                    filteredAvailableContacts.map((contact) => (
                      <div key={contact.id} className={styles.memberCard}>
                        <div className={styles.memberCardBody}>
                          <strong>{contact.name}</strong>
                          <span>{renderContactMeta(contact)}</span>
                        </div>
                        <button
                          className={`${styles.memberAction} ${styles.memberAdd}`}
                          onClick={() =>
                            setSelectedMembers((current) => [
                              ...current,
                              contact.id,
                            ])
                          }
                        >
                          Add
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className={styles.memberPanel}>
                <div className={styles.memberPanelHeader}>
                  <div>
                    <h3>Segment Members</h3>
                    <p>Review the contacts currently assigned.</p>
                  </div>
                  <span className={styles.memberBadge}>
                    {filteredMemberContacts.length}
                  </span>
                </div>
                <Input
                  type="text"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Search selected members"
                  className={styles.memberSearch}
                />
                <div className={styles.memberList}>
                  {filteredMemberContacts.length === 0 ? (
                    <div className={styles.memberEmptyState}>
                      No members match this search yet.
                    </div>
                  ) : (
                    filteredMemberContacts.map((contact) => (
                      <div key={contact.id} className={styles.memberCard}>
                        <div className={styles.memberCardBody}>
                          <strong>{contact.name}</strong>
                          <span>{renderContactMeta(contact)}</span>
                        </div>
                        <button
                          className={`${styles.memberAction} ${styles.memberRemove}`}
                          onClick={() =>
                            setSelectedMembers((current) =>
                              current.filter((id) => id !== contact.id),
                            )
                          }
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button
              className={`${styles.modalButton} ${styles.default}`}
              onClick={() => {
                setIsMembersModalOpen(false);
                setEditingSegment(null);
                setAvailableSearch("");
                setMemberSearch("");
              }}
              disabled={isSavingMembers}
            >
              Cancel
            </button>
            <button
              className={`${styles.modalButton} ${styles.primary}`}
              onClick={handleSaveMembers}
              disabled={isSavingMembers}
            >
              {isSavingMembers && <div className={styles.buttonLoader}></div>}
              {isSavingMembers ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
