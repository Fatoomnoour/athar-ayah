import React, { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';
import { trackOfflineUsage } from '../lib/analytics';

export default function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => {
      setIsOffline(true);
      trackOfflineUsage();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="bg-amber-100 text-amber-800 text-xs font-bold py-2 px-4 flex items-center justify-center gap-2 sticky top-0 z-50">
      <WifiOff className="h-4 w-4" />
      <span>أنت حالياً في وضع عدم الاتصال. بعض الميزات قد لا تتوفر، ولكن يمكنك الاستمرار في القراءة من السور المحفوظة.</span>
    </div>
  );
}
