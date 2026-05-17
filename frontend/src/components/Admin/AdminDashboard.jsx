import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import SubmissionCard from "./SubmissionCard";
import styles from "./AdminDashboard.module.css";

const AdminDashboard = () => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [toast, setToast] = useState(null);

  const statusFilter = searchParams.get("status") || "pending";

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleStatusChange = (newStatus) => {
    setSearchParams(prev => {
      const p = new URLSearchParams(prev);
      p.set("status", newStatus);
      return p;
    });
  };

  const getHeaders = () => {
    const pwd = localStorage.getItem('admin_password');
    return { 'x-admin-password': pwd, 'Content-Type': 'application/json' };
  };

  const fetchSubmissions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/submissions`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to fetch submissions");
      const data = await res.json();
      
      const filtered = data.submissions.filter(s => s.status === statusFilter || statusFilter === 'all');
      setSubmissions(filtered);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [statusFilter]);

  const handleLogout = () => {
    localStorage.removeItem('admin_session');
    localStorage.removeItem('admin_password');
    window.location.href = "/";
  };

  const updateStatus = async (id, status) => {
    try {
      const res = await fetch(`/api/admin/submissions/${id}`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        setSubmissions(prev => prev.filter(s => s.id !== id));
        showToast(`Submission ${status}`);
      } else {
        showToast("Failed to update status", "error");
      }
    } catch {
      showToast("Error updating status", "error");
    }
  };

  return (
    <div className={styles.container}>
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 9999,
          padding: "12px 20px", borderRadius: 12, fontWeight: 600, fontSize: 14,
          background: toast.type === "error" ? "#fee2e2" : "#dcfce7",
          color: toast.type === "error" ? "#7f1d1d" : "#14532d",
          boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
        }}>
          {toast.msg}
        </div>
      )}

      <header className={styles.header}>
        <h1 className={styles.title}>Admin Dashboard</h1>
        <div className={styles.headerActions}>
          <a href="/" className={styles.backButton}>← Back to Map</a>
          <button onClick={handleLogout} className={styles.logoutButton}>Logout</button>
        </div>
      </header>

      <div className={styles.tabBar}>
        <button className={`${styles.tabButton} ${styles.tabActive}`}>
          📋 Submissions
        </button>
      </div>

      <div className={styles.filterBar}>
        {["pending", "approved", "rejected", "all"].map(s => (
          <button
            key={s}
            className={`${styles.filterButton} ${statusFilter === s ? styles.active : ""}`}
            onClick={() => handleStatusChange(s)}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>
      <div className={styles.contentArea}>
        {loading && <div className={styles.loadingContainer}><p>Loading submissions...</p></div>}
        {error && <div className={styles.errorContainer}><p>Error: {error}</p><button onClick={fetchSubmissions} className={styles.retryButton}>Retry</button></div>}
        {!loading && !error && submissions.length === 0 && (
          <div className={styles.emptyState}><p>No {statusFilter} submissions found</p></div>
        )}
        {!loading && !error && submissions.length > 0 && (
          <div className={styles.submissionsList}>
            {submissions.map((s) => (
              <SubmissionCard 
                key={s.id} 
                submission={s} 
                onApprove={() => updateStatus(s.id, 'approved')} 
                onReject={() => updateStatus(s.id, 'rejected')} 
                showActions={statusFilter === "pending"} 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
