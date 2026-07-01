import React from "react";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: "danger" | "warning" | "info";
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = "تأكيد",
  cancelText = "إلغاء",
  onConfirm,
  onCancel,
  type = "danger"
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const btnColors = {
    danger: "bg-rose-600 hover:bg-rose-700 focus:ring-rose-500",
    warning: "bg-amber-500 hover:bg-amber-600 focus:ring-amber-500",
    info: "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500"
  };

  const iconColors = {
    danger: "text-rose-600 bg-rose-50 dark:bg-rose-950/20",
    warning: "text-amber-500 bg-amber-50 dark:bg-amber-950/20",
    info: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20"
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-slate-950/40 backdrop-blur-xs" onClick={onCancel}></div>

        {/* This element is to trick the browser into centering the modal contents. */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div
          className="inline-block align-bottom bg-white dark:bg-slate-900 rounded-2xl text-right overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border border-slate-100 dark:border-slate-800"
          dir="rtl"
        >
          <div className="bg-white dark:bg-slate-900 px-6 pt-6 pb-4">
            <div className="sm:flex sm:items-start gap-4">
              <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full ${iconColors[type]} sm:mx-0 sm:h-10 sm:w-10`}>
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:text-right flex-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-6">
                  {title}
                </h3>
                <div className="mt-2">
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {message}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-950/50 px-6 py-4 sm:flex sm:flex-row-reverse gap-2">
            <button
              type="button"
              onClick={onConfirm}
              className={`w-full inline-flex justify-center rounded-xl border border-transparent shadow-xs px-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition cursor-pointer sm:w-auto ${btnColors[type]}`}
            >
              {confirmText}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="mt-3 w-full inline-flex justify-center rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs px-4 py-2.5 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition cursor-pointer sm:mt-0 sm:w-auto"
            >
              {cancelText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
