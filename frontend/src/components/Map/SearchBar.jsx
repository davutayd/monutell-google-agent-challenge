import React, { useState, useMemo } from "react";
import styles from "./SearchBar.module.css";

import {
  FaSearch,
  FaTimes,
  FaChessRook,
  FaLandmark,
  FaArchway,
  FaPlaceOfWorship,
  FaStar,
  FaMonument,
  FaFilter,
} from "react-icons/fa";

import { GiStoneBust } from "react-icons/gi";

const CATEGORIES = ["statue", "mini-statue", "monument", "castle", "museum", "church", "bridge"];

const CATEGORY_META = {
  statue:       { color: "#D4AF37" },
  "mini-statue":{ color: "#CD7F32" },
  monument:     { color: "#607D8B" },
  castle:       { color: "#E63946" },
  museum:       { color: "#7209B7" },
  church:       { color: "#2A9D8F" },
  religious:    { color: "#2A9D8F" },
  bridge:       { color: "#4361EE" },
};

const getCategoryMeta = (cat, language) => {
  const category = cat ? cat.toLowerCase() : "landmark";
  const isTr = language === "tr";
  const isHu = language === "hu";

  const labels = {
    statue:       isTr ? "Heykel"       : isHu ? "Szobor"    : "Statue",
    "mini-statue":isTr ? "Mini Heykel"  : isHu ? "Miniszobor": "Mini Statue",
    monument:     isTr ? "Anıt"         : isHu ? "Emlékmű"   : "Monument",
    castle:       isTr ? "Kale"         : isHu ? "Vár"        : "Castle",
    museum:       isTr ? "Müze"         : isHu ? "Múzeum"     : "Museum",
    church:       isTr ? "İbadethane"   : isHu ? "Templom"    : "Religious",
    religious:    isTr ? "İbadethane"   : isHu ? "Templom"    : "Religious",
    bridge:       isTr ? "Köprü"        : isHu ? "Híd"        : "Bridge",
  };

  const icons = {
    statue:       <GiStoneBust />,
    "mini-statue":<GiStoneBust />,
    monument:     <FaMonument />,
    castle:       <FaChessRook />,
    museum:       <FaLandmark />,
    church:       <FaPlaceOfWorship />,
    religious:    <FaPlaceOfWorship />,
    bridge:       <FaArchway />,
  };

  return {
    icon:  icons[category]  || <FaStar />,
    color: (CATEGORY_META[category] || {}).color || "#795548",
    label: labels[category] || (isTr ? "Simgesel Yapı" : isHu ? "Látnivaló" : "Landmark"),
  };
};

const CATEGORY_LABELS = {
  en: {
    statue: "Statue", "mini-statue": "Mini Statue", monument: "Monument",
    castle: "Castle", museum: "Museum", church: "Religious", bridge: "Bridge",
  },
  tr: {
    statue: "Heykel", "mini-statue": "Mini Heykel", monument: "Anıt",
    castle: "Kale", museum: "Müze", church: "İbadethane", bridge: "Köprü",
  },
  hu: {
    statue: "Szobor", "mini-statue": "Miniszobor", monument: "Emlékmű",
    castle: "Vár", museum: "Múzeum", church: "Templom", bridge: "Híd",
  },
};

function fuzzyScore(str, query) {
  if (!str) return 0;
  const s = str.toLocaleLowerCase("tr");
  const q = query.toLocaleLowerCase("tr");
  if (s.includes(q)) return 1;
  let qi = 0;
  let consecutive = 0;
  let score = 0;
  for (let i = 0; i < s.length && qi < q.length; i++) {
    if (s[i] === q[qi]) {
      qi++;
      consecutive++;
      score += consecutive;
    } else {
      consecutive = 0;
    }
  }
  if (qi < q.length) return 0;
  return score / (q.length * q.length);
}

const SearchBar = ({
  monuments,
  onSelectResult,
  language = "tr",
  onFiltersOpenChange,
}) => {
  const [query, setQuery]           = useState("");
  const [isActive, setIsActive]     = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  const catLabels = CATEGORY_LABELS[language] || CATEGORY_LABELS.en;

  const getDisplayName = (item) => {
    if (language === "tr") return item.name_tr || item.name_en;
    if (language === "hu") return item.name_hu || item.name_en;
    return item.name_en;
  };

  const getPlaceholder = () => {
    if (language === "tr") return "İsim veya adres ara...";
    if (language === "hu") return "Keresés név vagy cím szerint...";
    return "Search by name or address...";
  };

  const results = useMemo(() => {
    let pool = activeCategory
      ? monuments.filter((m) => {
          const cat = (m.category || "").toLowerCase();
          if (activeCategory === "church") return cat === "church" || cat === "religious";
          return cat === activeCategory;
        })
      : [...monuments];

    if (query.length < 2) {
      return activeCategory ? pool.slice(0, 20) : [];
    }

    const scored = pool.map((m) => {
      const names = [m.name_tr, m.name_en, m.name_hu, m.address].filter(Boolean);
      const best  = Math.max(...names.map((n) => fuzzyScore(n, query)));
      return { m, score: best };
    }).filter((x) => x.score > 0);

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 12).map((x) => x.m);
  }, [query, monuments, activeCategory]);

  const handleSearch = (e) => {
    const text = e.target.value;
    setQuery(text);
    setIsActive(text.length > 1 || !!activeCategory);
  };

  const clearSearch = () => {
    setQuery("");
    setActiveCategory(null);
    setIsActive(false);
    setShowFilters(false);
    onFiltersOpenChange?.(false);
  };

  const toggleFilters = () => {
    const next = !showFilters;
    setShowFilters(next);
    onFiltersOpenChange?.(next);
  };

  const handleCategoryToggle = (cat) => {
    const next = activeCategory === cat ? null : cat;
    setActiveCategory(next);
    setIsActive(query.length > 1 || !!next);
  };

  const showResults = isActive && results.length > 0;
  const showEmpty   = isActive && results.length === 0 && query.length > 1;

  return (
    <div className={styles.searchContainer}>
      <div className={styles.inputWrapper}>
        <FaSearch className={styles.searchIcon} />
        <input
          type="text"
          placeholder={getPlaceholder()}
          className={styles.searchInput}
          value={query}
          onChange={handleSearch}
          onFocus={() => (query.length > 1 || activeCategory) && setIsActive(true)}
        />
        <button
          onClick={toggleFilters}
          className={`${styles.filterToggleBtn} ${(activeCategory || showFilters) ? styles.filterToggleActive : ""}`}
          type="button"
          aria-label="Filtrele"
        >
          <FaFilter />
          {activeCategory && <span className={styles.filterDot} />}
        </button>
        {(query || activeCategory) && (
          <button onClick={clearSearch} className={styles.clearButton} type="button">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ display: "block" }}>
              <path d="M18 6L6 18M6 6L18 18" stroke="#333333" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>

      {showFilters && (
        <div className={styles.categoryRow}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`${styles.catChip} ${activeCategory === cat ? styles.catChipActive : ""}`}
              style={activeCategory === cat ? { borderColor: (CATEGORY_META[cat] || {}).color, color: (CATEGORY_META[cat] || {}).color } : {}}
              onClick={() => handleCategoryToggle(cat)}
              type="button"
            >
              {catLabels[cat] || cat}
            </button>
          ))}
        </div>
      )}

      {showResults && (
        <div className={styles.resultsList}>
          {results.map((item) => {
            const meta = getCategoryMeta(item.category, language);
            return (
              <div
                key={item.id}
                className={styles.resultItem}
                onClick={() => {
                  onSelectResult(item);
                  setIsActive(false);
                  setQuery(getDisplayName(item));
                  setShowFilters(false);
                  onFiltersOpenChange?.(false);
                }}
              >
                <div className={styles.iconBox} style={{ backgroundColor: meta.color }}>
                  {meta.icon}
                </div>
                <div className={styles.resultText}>
                  <div className={styles.resultName}>{getDisplayName(item)}</div>
                  <div className={styles.resultSub}>
                    <span style={{ whiteSpace: "nowrap" }}>{meta.label}</span>
                    {item.address && (
                      <>
                        <span style={{ margin: "0 6px", color: "#ccc" }}>|</span>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#888", flex: 1 }}>
                          {item.address}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showEmpty && (
        <div className={styles.noResults}>
          {language === "tr" ? "Sonuç bulunamadı" : language === "hu" ? "Nincs találat" : "No results found"}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
