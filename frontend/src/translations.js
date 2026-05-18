const translations = {
  tr: {
    // Notifications
    nearby_monument_title: "YAKININDA BİR ESER VAR!",
    nearby_monument_only: "Sadece",
    meters_away: "m ileride",
    dismiss: "Kapat",
    explore: "Keşfet",

    // Agent Section
    plan_with_ai: "AI ile Planla",
    agent_title: "MonuTell Agent",
    close_chat: "Sohbeti Kapat",
    send_message: "Mesaj gönder",
    placeholder_message: "Mesaj yazın...",
    agent_greeting:
      "Merhaba! Ben MonuTell asistanın. Macaristan'daki tarihi yerleri keşfetmene nasıl yardımcı olabilirim?",
    agent_thinking: "Düşünüyor...",
    error_message: "Üzgünüm, sunucuya bağlanırken bir hata oluştu.",
    tool_result: "Tool Sonucu",
    route_calculated: "Rota hesaplandı",
    total_distance: "toplam mesafe",
    walking_time: "yürüme süresi",
  },
  en: {
    // Notifications
    nearby_monument_title: "NEARBY MONUMENT!",
    nearby_monument_only: "Only",
    meters_away: "m away",
    dismiss: "Dismiss",
    explore: "Explore",

    // Agent Section
    plan_with_ai: "Plan with AI",
    agent_title: "MonuTell Agent",
    close_chat: "Close Chat",
    send_message: "Send message",
    placeholder_message: "Type a message...",
    agent_greeting:
      "Hello! I'm MonuTell assistant. How can I help you explore historical sites in Hungary?",
    agent_thinking: "Thinking...",
    error_message: "Sorry, there was an error connecting to the server.",
    tool_result: "Tool Result",
    route_calculated: "Route calculated",
    total_distance: "total distance",
    walking_time: "walking time",
  },
  hu: {
    // Notifications
    nearby_monument_title: "KÖZELI EMLÉKMŰ!",
    nearby_monument_only: "Csak",
    meters_away: "m távolságra",
    dismiss: "Bezárás",
    explore: "Felfedezés",

    // Agent Section
    plan_with_ai: "Tervezz az AI-val",
    agent_title: "MonuTell Agent",
    close_chat: "Chat bezárása",
    send_message: "Üzenet küldése",
    placeholder_message: "Írjon egy üzenetet...",
    agent_greeting:
      "Szia! Én a MonuTell asszisztens. Hogyan segíthetek a magyarországi történelmi helyek felfedezésében?",
    agent_thinking: "Gondolkozom...",
    error_message: "Sajnálom, hiba lépett fel a szerverre való csatlakozáskor.",
    tool_result: "Eszköz eredménye",
    route_calculated: "Útvonal kiszámítva",
    total_distance: "teljes távolság",
    walking_time: "gyaloglás ideje",
  },
};

export const t = (key, language = "tr") => {
  return translations[language]?.[key] || translations.tr[key] || key;
};

export default translations;
