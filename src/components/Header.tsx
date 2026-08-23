import logoImg from "../assets/images/athar_ayah_logo_1783253623984.jpg";
import React, { useState } from "react";
import { BookOpen, LogOut, Sun, Moon, Monitor, User, LogIn, Languages } from "lucide-react";
import { User as UserType } from "../types";
import { Theme, useDarkMode } from "../hooks/useDarkMode";
import { useLanguage } from "../i18n";

interface HeaderProps {
  currentUser: UserType | null;
  onLogout: () => void;
}

export default function Header({ 
  currentUser, 
  onLogout 
}: HeaderProps) {
  const { isDark, theme, setTheme } = useDarkMode();
  const { language, setLanguage, t } = useLanguage();
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="h-10 w-10 rounded-xl overflow-hidden shadow-sm border border-emerald-100 dark:border-emerald-900/30">
            <img src={logoImg} alt="أثر آية" className="h-full w-full object-cover" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-black tracking-tight text-slate-800 dark:text-white leading-none">
              {language === "ar" ? <><span className="text-emerald-600">أثر</span> آية</> : "Athar Ayah"}
            </h1>
            <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 mt-0.5 tracking-wide">{t("appTagline")}</p>
          </div>
        </div>

        {/* Action Tools */}
        <div className="flex items-center gap-3">
          {/* Language Toggle */}
          <label className="flex items-center gap-1.5 px-2.5 py-2 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold" title={t("switchLanguage")}>
            <Languages className="h-4 w-4 text-emerald-600" />
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value as "ar" | "en")}
              className="bg-transparent outline-none cursor-pointer"
              aria-label={t("switchLanguage")}
            >
              <option value="ar">{t("arabic")}</option>
              <option value="en">{t("english")}</option>
            </select>
          </label>

          {/* Theme Toggle */}
          <div className="relative">
            <button
              onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
              className="p-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 rounded-xl transition cursor-pointer"
              aria-label={t("theme")}
            >
              {theme === 'system' ? <Monitor className="h-5 w-5" /> : isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5 text-amber-500" />}
            </button>
            
            {isThemeMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsThemeMenuOpen(false)}></div>
                <div className="absolute top-12 left-0 w-36 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden z-50 flex flex-col text-sm font-semibold">
                  <button 
                    onClick={() => { setTheme('light'); setIsThemeMenuOpen(false); }}
                    className={`flex items-center gap-2 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 ${theme === 'light' ? 'text-emerald-600' : 'text-slate-600 dark:text-slate-300'}`}
                  >
                    <Sun className="h-4 w-4" /> {t("light")}
                  </button>
                  <button 
                    onClick={() => { setTheme('dark'); setIsThemeMenuOpen(false); }}
                    className={`flex items-center gap-2 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 ${theme === 'dark' ? 'text-emerald-600' : 'text-slate-600 dark:text-slate-300'}`}
                  >
                    <Moon className="h-4 w-4" /> {t("dark")}
                  </button>
                  <button 
                    onClick={() => { setTheme('system'); setIsThemeMenuOpen(false); }}
                    className={`flex items-center gap-2 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 border-t border-slate-100 dark:border-slate-700 ${theme === 'system' ? 'text-emerald-600' : 'text-slate-600 dark:text-slate-300'}`}
                  >
                    <Monitor className="h-4 w-4" /> {t("system")}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Profile / Auth Container */}
          {currentUser && (
            <div className="flex items-center gap-2.5">
              {/* User avatar and info */}
              <div className="hidden md:block text-left">
                <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  {currentUser.name}
                </span>
                <span className="block text-[9px] text-slate-400 font-medium">
                  {currentUser.email}
                </span>
              </div>
              <div className="h-9 w-9 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 flex items-center justify-center bg-emerald-50">
                {currentUser.photoURL ? (
                  <img 
                    src={currentUser.photoURL} 
                    alt={currentUser.name} 
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <User className="h-5 w-5 text-emerald-600" />
                )}
              </div>
              
              {/* Sign Out Button */}
              <button
                onClick={onLogout}
                className="p-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 text-rose-600 rounded-lg transition"
                title={t("logout")}
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
