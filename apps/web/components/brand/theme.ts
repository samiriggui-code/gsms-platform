export const THEME_STORAGE_KEY = "gsms-theme";

export type ThemePreference = "light" | "dark" | "system";

/**
 * Script inline exécuté avant hydratation : pose data-theme sur <html>
 * uniquement si l'utilisateur a choisi explicitement un thème.
 * Sans choix, le CSS suit prefers-color-scheme.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t);}}catch(e){}})();`;
