import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import styles from "./Toast.module.css";

const ToastContext = createContext(null);

let toastIdCounter = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.map((t) => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 320);
  }, []);

  const show = useCallback((message, type = "info", duration = 3500) => {
    const id = ++toastIdCounter;
    setToasts((prev) => [...prev, { id, message, type, exiting: false }]);
    setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  const success = useCallback((msg, dur) => show(msg, "success", dur), [show]);
  const error   = useCallback((msg, dur) => show(msg, "error",   dur ?? 5000), [show]);
  const warning = useCallback((msg, dur) => show(msg, "warning", dur), [show]);
  const info    = useCallback((msg, dur) => show(msg, "info",    dur), [show]);

  return (
    <ToastContext.Provider value={{ show, success, error, warning, info, dismiss }}>
      {children}
      <div className={styles.container} aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const ICONS = {
  success: "✓",
  error:   "✕",
  warning: "⚠",
  info:    "ℹ",
};

const ToastItem = ({ toast, onDismiss }) => {
  return (
    <div
      className={`${styles.toast} ${styles[toast.type]} ${toast.exiting ? styles.exit : styles.enter}`}
      role="alert"
      onClick={() => onDismiss(toast.id)}
    >
      <span className={styles.icon}>{ICONS[toast.type]}</span>
      <span className={styles.message}>{toast.message}</span>
      <button className={styles.closeBtn} onClick={() => onDismiss(toast.id)} aria-label="Kapat">×</button>
    </div>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
};
