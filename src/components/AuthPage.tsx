import React, { useState } from "react";
import { Compass, Mail, Lock, User as UserIcon, Sparkles, AlertCircle, ArrowRight } from "lucide-react";
import { User } from "../types";

interface AuthPageProps {
  onAuthSuccess: (user: User) => void;
  onGoogleLoginSimulate: (email: string, name: string) => Promise<void>;
}

export default function AuthPage({ onAuthSuccess, onGoogleLoginSimulate }: AuthPageProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // For quick Google authentication simulation
  const [googleEmail, setGoogleEmail] = useState("kidscodinghub1512@gmail.com");
  const [googleName, setGoogleName] = useState("أنس بن مالك");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password || (isRegister && !name)) {
      setError("الرجاء ملء جميع الحقول المطلوبة");
      return;
    }

    setIsLoading(true);
    try {
      const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";
      const body = isRegister ? { email, name, password } : { email, password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "حدث خطأ ما أثناء المصادقة");
      }

      onAuthSuccess(data.user);
    } catch (err: any) {
      setError(err.message || "فشل الاتصال بالخادم");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSimulate = async () => {
    setError("");
    if (!googleEmail.trim()) {
      setError("الرجاء إدخال البريد الإلكتروني للمحاكاة");
      return;
    }
    setIsLoading(true);
    try {
      await onGoogleLoginSimulate(googleEmail, googleName || googleEmail.split("@")[0]);
    } catch (err: any) {
      setError("حدث خطأ أثناء محاكاة تسجيل الدخول");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans" dir="rtl">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto h-16 w-16 rounded-2xl bg-white shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-center text-white mb-4 overflow-hidden">
          <img 
            src="https://file.notion.so/f/f/0bf2ebfd-e587-43ca-ad4b-bc9fc229d675/9519349e-b8cc-4d3f-b883-7dfdc06d9b4b/WhatsApp_Image_2025-02-13_at_16.03.45_2f790c61.jpg?table=block&id=199eb664-9be7-8051-b841-dbcfba074400&spaceId=0bf2ebfd-e587-43ca-ad4b-bc9fc229d675&expirationTimestamp=1738540800000&signature=jMOh0c1jF-nQ6O9Z03O30Nf0t25x7mK0s-h9gX0BqY0" 
            alt="شعار أثر آية" 
            className="h-full w-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement?.classList.add('bg-gradient-to-tr', 'from-emerald-600', 'to-teal-500', 'text-white');
              e.currentTarget.parentElement!.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-book-open animate-pulse"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>';
            }}
          />
        </div>
        
        <h2 className="text-2xl font-black text-slate-900 dark:text-white">
          {isRegister ? "إنشاء حساب جديد" : "تسجيل الدخول إلى أثر آية"}
        </h2>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          {isRegister ? "ابدأ رحلتك الإيمانية لتدبر القرآن الكريم وتتبع حفظك" : "عد لمتابعة خواطرك، تلاوتك اليومية ومراجعة حفظك"}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 shadow-sm border border-slate-100 dark:border-slate-800 rounded-2xl space-y-6">
          
          {error && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 rounded-xl flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-400">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Core Email/Password Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            {isRegister && (
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">الاسم الكامل</label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                    <UserIcon className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="عبد الله بن مسعود"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full pr-10 pl-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans text-slate-800 dark:text-white"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">البريد الإلكتروني</label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  placeholder="your-email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pr-10 pl-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans text-slate-800 dark:text-white text-left"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">كلمة المرور</label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pr-10 pl-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans text-slate-800 dark:text-white text-left"
                  dir="ltr"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-bold text-xs rounded-xl transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <span>{isRegister ? "إنشاء الحساب وبدء التجربة" : "تسجيل الدخول"}</span>
              )}
            </button>
          </form>

          <div className="relative my-4 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100 dark:border-slate-800"></div>
            </div>
            <span className="relative px-3 bg-white dark:bg-slate-900 text-[10px] text-slate-400 uppercase font-bold">أو</span>
          </div>

          {/* Google SSO simulated block */}
          <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100/50 dark:border-emerald-900/30 rounded-2xl space-y-3.5">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-400">
              <Sparkles className="h-4 w-4 animate-pulse" />
              <h4 className="text-xs font-black">الدخول السريع بحساب Google</h4>
            </div>
            
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
              يمكنك استخدام محاكاة تسجيل الدخول الموحّد (Google SSO) للبدء فوراً بحساب تجريبي مسبق أو مخصص.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[9px] font-bold text-slate-500 mb-1">بريد Google التجريبي</label>
                <input
                  type="email"
                  value={googleEmail}
                  onChange={(e) => setGoogleEmail(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-[11px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 ltr text-left"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-500 mb-1">الاسم الكريم</label>
                <input
                  type="text"
                  value={googleName}
                  onChange={(e) => setGoogleName(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-[11px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSimulate}
              disabled={isLoading}
              className="w-full py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <svg className="h-4 w-4 text-slate-500" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.47 14.97 1 12 1 7.24 1 3.2 3.74 1.24 7.74l3.84 2.98C6.01 7.25 8.79 5.04 12 5.04z" />
                <path fill="#4285F4" d="M23.49 12.275c0-.818-.073-1.609-.21-2.375H12v4.51h6.46c-.277 1.48-1.11 2.73-2.36 3.58l3.65 2.83c2.14-1.97 3.4-4.88 3.4-8.545z" />
                <path fill="#FBBC05" d="M5.08 14.72a7.126 7.126 0 010-4.44L1.24 7.3a11.97 11.97 0 000 9.4l3.84-2.98z" />
                <path fill="#34A853" d="M12 23c3.24 0 5.97-1.08 7.96-2.91l-3.65-2.83c-1.01.68-2.31 1.09-3.96 1.09-3.21 0-5.99-2.21-6.92-5.17L1.24 16.7C3.2 20.26 7.24 23 12 23z" />
              </svg>
              <span>تسجيل دخول موحّد بنقرة واحدة</span>
            </button>
          </div>

          <div className="text-center pt-2">
            <button
              onClick={() => setIsRegister(!isRegister)}
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-bold transition cursor-pointer"
            >
              {isRegister ? "تمتلك حساباً بالفعل؟ تسجيل الدخول" : "ليس لديك حساب؟ إنشاء حساب جديد"}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
