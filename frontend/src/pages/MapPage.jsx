import React, { useEffect, useRef, useState } from "react";
import { Bot } from "lucide-react";
import AgentChat from "../components/AgentChat";
import AmbientNotification from "../components/AmbientNotification";
import useAmbientAgent from "../hooks/useAmbientAgent";
import useLocation from "../hooks/useLocation";
import MapScreen from "../components/Map/MapScreen";
import MonumentDetailScreen from "../components/Detail/MonumentDetailScreen";
import { t } from "../translations";
import styles from "./MapPage.module.css";

const getInitialLanguage = () => {
  const saved = localStorage.getItem("monutell_language");
  return saved === "tr" || saved === "en" || saved === "hu" ? saved : "tr";
};

export default function MapPage() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isChatClosing, setIsChatClosing] = useState(false);
  const location = useLocation();
  const { ambientMonuments, dismissNotification } = useAmbientAgent(location);

  const [allMonuments, setAllMonuments] = useState([]);
  const [selectedMonument, setSelectedMonument] = useState(null);
  const [language, setLanguage] = useState(getInitialLanguage);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [monumentsLoading, setMonumentsLoading] = useState(true);
  const [monumentsError, setMonumentsError] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 900);
  const [mobilePanelSize, setMobilePanelSize] = useState("peek");
  const [pausedBySystem, setPausedBySystem] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSearchFiltersOpen, setIsSearchFiltersOpen] = useState(false);
  const scrollPanelRef = useRef(null);

  useEffect(() => {
    setMonumentsLoading(true);
    setMonumentsError(null);

    fetch("/api/monuments")
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "success") {
          setAllMonuments(data.monuments);
          return;
        }

        throw new Error(data.message || "Failed to load monuments");
      })
      .catch((error) => {
        console.error(error);
        setMonumentsError(error.message || "Failed to load monuments");
      })
      .finally(() => setMonumentsLoading(false));
  }, []);

  const handleSelectMonument = (monument) => {
    if (selectedMonument?.id === monument.id) {
      if (isMobile) {
        setMobilePanelSize((prev) => (prev === "peek" ? "medium" : "peek"));
      }
      setIsPanelOpen(true);
      return;
    }

    setSelectedMonument(monument);
    setMobilePanelSize("peek");
    setIsPanelOpen(true);
  };

  const handleClosePanel = () => {
    setIsPanelOpen(false);
    setPausedBySystem(false);
    setSelectedMonument(null);
  };

  const handleSnap = () => {
    setMobilePanelSize((prev) => (prev === "peek" ? "medium" : "peek"));
  };

  const handleCloseChat = () => {
    setIsChatClosing(true);
    setTimeout(() => {
      setIsChatOpen(false);
      setIsChatClosing(false);
    }, 300);
  };

  useEffect(() => {
    localStorage.setItem("monutell_language", language);
  }, [language]);

  useEffect(() => {
    if (isChatOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "auto";
      };
    }
  }, [isChatOpen]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 900);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (scrollPanelRef.current) {
      scrollPanelRef.current.scrollTop = 0;
    }
  }, [selectedMonument?.id]);

  const appContainerDynamicStyle = {
    flexDirection: isMobile ? "column" : "row",
  };

  const mobileHeight = mobilePanelSize === "peek" ? "220px" : "48vh";

  const panelDynamicStyle = {
    width: isMobile ? "100%" : isPanelOpen ? "clamp(380px, 40vw, 500px)" : "0px",
    height: isMobile ? (isPanelOpen ? mobileHeight : "0px") : "100vh",
    opacity: isPanelOpen ? 1 : 0,
    pointerEvents: isPanelOpen ? "auto" : "none",
    boxShadow: isPanelOpen
      ? isMobile
        ? "0px -4px 10px rgba(0,0,0,0.15)"
        : "2px 0 6px rgba(0,0,0,0.1)"
      : "none",
    position: isMobile ? "absolute" : "relative",
    bottom: isMobile ? "var(--total-nav-space, 0px)" : "auto",
    transition:
      "height 0.4s cubic-bezier(0.25, 0.8, 0.25, 1), width 0.3s ease",
    borderTopLeftRadius: isMobile ? "20px" : "0",
    borderTopRightRadius: isMobile ? "20px" : "0",
    overflow: "hidden",
  };

  const closeButtonDynamicStyle = {
    top: isMobile ? 15 : 10,
    right: isMobile ? 15 : 20,
    zIndex: 50,
  };

  const scrollPanelDynamicStyle = {
    opacity: isPanelOpen ? 1 : 0,
    height: "100%",
    overflowY: isMobile && mobilePanelSize === "peek" ? "hidden" : "auto",
    paddingTop: isMobile ? "30px" : "0",
  };

  const shouldHideFloatingUi = monumentsLoading || isSettingsOpen;
  const isFabBackgrounded = shouldHideFloatingUi || isPanelOpen;
  const fabStyle = {
    position: "absolute",
    bottom: "24px",
    right: "16px",
    zIndex: isFabBackgrounded ? 450 : 900,
    opacity: isFabBackgrounded ? 0 : 1,
    pointerEvents: isFabBackgrounded ? "none" : "auto",
    background: "linear-gradient(135deg, #D4AF37, #f0cc6e)",
    color: "#111122",
    border: "none",
    borderRadius: "32px",
    padding: "14px 20px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontWeight: 700,
    fontSize: "15px",
    boxShadow: "0 6px 20px rgba(212,175,55,0.45)",
    cursor: "pointer",
    transition: "opacity 0.2s ease, transform 0.15s, box-shadow 0.15s",
  };

  return (
    <div className={styles.appContainer} style={appContainerDynamicStyle}>
      <style>{`
        @keyframes chatSlideIn {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes chatSlideOut {
          from { transform: translateY(0); opacity: 1; }
          to { transform: translateY(100%); opacity: 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
      `}</style>

      <div className={styles.detailPanel} style={panelDynamicStyle}>
        {isMobile && isPanelOpen && (
          <div onClick={handleSnap} className={styles.dragHandleArea}>
            <div className={styles.dragHandlePill}></div>
          </div>
        )}

        {isPanelOpen && (
          <button
            onClick={handleClosePanel}
            className={styles.closeButton}
            style={closeButtonDynamicStyle}
            aria-label="Close"
          >
            X
          </button>
        )}

        {selectedMonument && (
          <div
            ref={scrollPanelRef}
            className={styles.scrollPanel}
            style={scrollPanelDynamicStyle}
          >
            <MonumentDetailScreen
              monument={selectedMonument}
              language={language}
              setLanguage={setLanguage}
              setPausedBySystem={setPausedBySystem}
            />
          </div>
        )}
      </div>

      <div className={styles.mapContainer}>
        <MapScreen
          language={language}
          setLanguage={setLanguage}
          allMonuments={allMonuments}
          onSelectMonument={handleSelectMonument}
          isPanelOpen={isPanelOpen}
          isMobile={isMobile}
          mobilePanelSize={mobilePanelSize}
          panelHeight={
            isMobile && isPanelOpen
              ? mobilePanelSize === "peek"
                ? 110
                : window.innerHeight * 0.36
              : 0
          }
          onClosePanel={handleClosePanel}
          monumentsLoading={monumentsLoading}
          monumentsError={monumentsError}
          selectedMonumentId={selectedMonument?.id}
          onSettingsOpenChange={setIsSettingsOpen}
          onSearchFiltersOpenChange={setIsSearchFiltersOpen}
          hideBranding={true}
        />
      </div>

      <button
        onClick={() => setIsChatOpen(true)}
        style={fabStyle}
        onMouseEnter={(e) => {
          if (!isFabBackgrounded) e.currentTarget.style.transform = "scale(1.04)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
        }}
      >
        <Bot size={22} />
        <span>{t("plan_with_ai", language)}</span>
      </button>

      {isChatOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 2000,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "flex-end",
            background: "rgba(10, 10, 20, 0.45)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            animation: isChatClosing
              ? "fadeOut 0.3s ease-out forwards"
              : "fadeIn 0.3s ease-out forwards",
          }}
        >
          <div
            style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}
            onClick={handleCloseChat}
          />
          <div
            style={{
              position: "fixed",
              bottom: 0,
              right: 0,
              width: "100%",
              maxWidth: "384px",
              height: "75vh",
              borderRadius: "24px 24px 0 0",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              border: "1px solid rgb(55, 65, 81)",
              background: "rgba(17, 17, 34, 0.92)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              boxShadow: "0 25px 60px rgba(0,0,0,0.5)",
              animation: isChatClosing
                ? "chatSlideOut 0.3s ease-out forwards"
                : "chatSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
            }}
          >
            <div
              style={{
                background: "#1a1a2e",
                padding: "16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid rgb(31, 41, 55)",
              }}
            >
              <h3
                style={{
                  fontWeight: "bold",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  margin: 0,
                }}
              >
                <Bot style={{ color: "#D4AF37" }} />
                {t("agent_title", language)}
              </h3>
              <button
                onClick={handleCloseChat}
                className={styles.chatCloseButton}
                aria-label={t("close_chat", language)}
              >
                X
              </button>
            </div>
            <AgentChat location={location} language={language} />
          </div>
        </div>
      )}

      {ambientMonuments.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: isSearchFiltersOpen ? "170px" : "80px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: shouldHideFloatingUi ? 400 : 1000,
            width: "calc(100% - 32px)",
            maxWidth: "380px",
            opacity: shouldHideFloatingUi ? 0 : 1,
            pointerEvents: shouldHideFloatingUi ? "none" : "auto",
            transition: "top 0.22s ease, opacity 0.18s ease",
          }}
        >
          <AmbientNotification
            monument={ambientMonuments[0]}
            onDismiss={() => dismissNotification(ambientMonuments[0].id)}
            language={language}
          />
        </div>
      )}
    </div>
  );
}
