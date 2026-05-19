import React, { useState } from "react";
import { Play, X, MapPin } from "lucide-react";
import { t } from "../translations";
import { getCategoryEmoji } from "../utils/categoryEmoji";

export default function AmbientNotification({
  monument,
  onDismiss,
  language = "tr",
}) {
  const [imgFailed, setImgFailed] = useState(false);
  if (!monument) return null;

  const distanceM = Math.round(monument.distance * 1000);
  const emoji = getCategoryEmoji(monument.category);
  const showImage = monument.imageUrl && !imgFailed;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "12px 14px",
        borderRadius: "16px",
        background: "rgba(17, 17, 34, 0.92)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(212, 175, 55, 0.35)",
        boxShadow:
          "0 8px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(212,175,55,0.1)",
        maxWidth: "360px",
        width: "100%",
        animation: "ambientSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: "20%",
          bottom: "20%",
          width: "3px",
          borderRadius: "0 3px 3px 0",
          background: "linear-gradient(180deg, #D4AF37, #f0cc6e)",
        }}
      />

      {showImage ? (
        <img
          src={monument.imageUrl}
          alt={monument.name}
          onError={() => setImgFailed(true)}
          style={{
            width: "52px",
            height: "52px",
            borderRadius: "12px",
            objectFit: "cover",
            flexShrink: 0,
            border: "1px solid rgba(212,175,55,0.25)",
          }}
        />
      ) : (
        <div
          style={{
            width: "52px",
            height: "52px",
            borderRadius: "12px",
            background: "#c9a84c",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.6rem",
          }}
        >
          {emoji}
        </div>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontSize: "0.7rem",
            fontWeight: 700,
            color: "#D4AF37",
            textTransform: "uppercase",
            letterSpacing: "0.8px",
            marginBottom: "2px",
          }}
        >
          {t("nearby_monument_title", language)}
        </p>
        <p
          style={{
            margin: 0,
            fontSize: "0.95rem",
            fontWeight: 700,
            color: "#ffffff",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {monument.name}
        </p>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            marginTop: "4px",
          }}
        >
          <MapPin size={11} color="#D4AF37" />
          <span style={{ fontSize: "0.75rem", color: "#a0aec0" }}>
            {t("nearby_monument_only", language)} {distanceM}m{" "}
            {t("meters_away", language)}
          </span>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          alignItems: "center",
        }}
      >
        <button
          onClick={onDismiss}
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "none",
            borderRadius: "50%",
            width: "28px",
            height: "28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "#94a3b8",
            transition: "background 0.2s",
          }}
          aria-label={t("dismiss", language)}
        >
          <X size={14} />
        </button>
        <button
          style={{
            background: "linear-gradient(135deg, #D4AF37, #f0cc6e)",
            border: "none",
            borderRadius: "50%",
            width: "36px",
            height: "36px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(212,175,55,0.4)",
            transition: "transform 0.15s, box-shadow 0.15s",
            color: "#111122",
          }}
          aria-label="Ses rehberini dinle"
        >
          <Play size={15} fill="currentColor" />
        </button>
      </div>

      <style>{`
        @keyframes ambientSlideIn {
          from { opacity: 0; transform: translateY(-12px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
      `}</style>
    </div>
  );
}
