import React, { useEffect } from "react";
import { CheckCircle, AlertCircle, X, Info } from "lucide-react";

export interface ToastType {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastProps {
  toasts: ToastType[];
  onClose: (id: string) => void;
}

export default function Toast({ toasts, onClose }: ToastProps) {
  return (
    <div className="fixed top-4 left-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onClose }: { toast: ToastType; onClose: (id: string) => void; key?: string }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onClose]);

  const icons = {
    success: <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />,
    error: <AlertCircle className="h-5 w-5 text-rose-500 flex-shrink-0" />,
    info: <Info className="h-5 w-5 text-teal-500 flex-shrink-0" />
  };

  const bgColors = {
    success: "bg-white dark:bg-slate-900 border-emerald-100 dark:border-emerald-950/80 shadow-emerald-50/50",
    error: "bg-white dark:bg-slate-900 border-rose-100 dark:border-rose-950/80 shadow-rose-50/50",
    info: "bg-white dark:bg-slate-900 border-teal-100 dark:border-teal-950/80 shadow-teal-50/50"
  };

  return (
    <div
      className={`pointer-events-auto flex items-center justify-between p-4 rounded-xl border shadow-lg transition-all duration-300 transform translate-x-0 ${bgColors[toast.type]} text-right`}
      dir="rtl"
      id={`toast-${toast.id}`}
    >
      <div className="flex items-center gap-3">
        {icons[toast.type]}
        <p className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-relaxed">
          {toast.message}
        </p>
      </div>
      <button
        onClick={() => onClose(toast.id)}
        className="mr-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer p-1 rounded-md"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
