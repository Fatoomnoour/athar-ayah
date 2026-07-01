import React, { useState } from "react";
import { 
  Compass, Moon, Sun, LogIn, LogOut, Sparkles, User, 
  Monitor, BookOpen
} from "lucide-react";
import { User as UserType } from "../types";
import { Theme, useDarkMode } from "../hooks/useDarkMode";

interface HeaderProps {
  currentUser: UserType | null;
  onLogin: (email: string, name: string) => Promise<void>;
  onLogout: () => void;
}

export default function Header({ 
  currentUser, 
  onLogin, 
  onLogout 
}: HeaderProps) {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [emailInput, setEmailInput] = useState("kidscodinghub1512@gmail.com");
  const [nameInput, setNameInput] = useState("أنس بن مالك");
  const [isLoading, setIsLoading] = useState(false);
  
  const { theme, setTheme, isDark } = useDarkMode();
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setIsLoading(true);
    try {
      await onLogin(emailInput, nameInput || emailInput.split("@")[0]);
      setIsLoginModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-850 sticky top-0 z-50 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo and App Title */}
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 flex items-center justify-center overflow-hidden rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-sm border border-slate-100 dark:border-slate-800 text-white">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight font-sans flex items-center gap-1.5">
                أثر آية
                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 rounded-md">
                  تدبر
                </span>
              </h1>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold leading-none hidden sm:block">تأملات قرآنيّة وتتبع حفظ منظم</p>
            </div>
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <div className="relative">
              <button
                onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
                className="p-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 rounded-xl transition cursor-pointer"
                aria-label="تبديل المظهر"
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
                      <Sun className="h-4 w-4" /> فاتح
                    </button>
                    <button 
                      onClick={() => { setTheme('dark'); setIsThemeMenuOpen(false); }}
                      className={`flex items-center gap-2 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 ${theme === 'dark' ? 'text-emerald-600' : 'text-slate-600 dark:text-slate-300'}`}
                    >
                      <Moon className="h-4 w-4" /> داكن
                    </button>
                    <button 
                      onClick={() => { setTheme('system'); setIsThemeMenuOpen(false); }}
                      className={`flex items-center gap-2 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 border-t border-slate-100 dark:border-slate-700 ${theme === 'system' ? 'text-emerald-600' : 'text-slate-600 dark:text-slate-300'}`}
                    >
                      <Monitor className="h-4 w-4" /> تلقائي
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Profile / Auth Container */}
            {currentUser ? (
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
                  title="تسجيل الخروج"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition flex items-center gap-1.5 shadow-sm"
              >
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">تسجيل الدخول</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Auth Modal Simulation */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
                <Sparkles className="h-4.5 w-4.5 text-emerald-600" />
                <span>محاكاة تسجيل الدخول الموحّد (Google SSO)</span>
              </h3>
              <button 
                onClick={() => setIsLoginModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-semibold p-1"
              >
                إلغاء
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleLoginSubmit} className="p-6 space-y-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs space-y-1">
                <p className="font-bold">✨ ميزة الدخول الذكي:</p>
                <p>يحفظ هذا التطبيق بيانات تفكرك، قراءتك وحفظك بالربط المباشر مع حسابك لسهولة الوصول إليها في أي وقت.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">البريد الإلكتروني لحساب Google</label>
                <input
                  type="email"
                  required
                  placeholder="name@gmail.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-right"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">الاسم الكامل</label>
                <input
                  type="text"
                  placeholder="مثال: عبد الرحمن بن عوف"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-bold text-sm rounded-xl transition shadow-sm flex items-center justify-center gap-1.5"
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <LogIn className="h-4 w-4" />
                      <span>ربط الحساب وتسجيل الدخول</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
