import { useEffect, useState } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { messaging } from '../lib/firebase';
import { trackNotificationEnabled, logError } from '../lib/analytics';

export const useFCM = () => {
  const [fcmToken, setFcmToken] = useState<string | null>(null);

  const requestPermission = async () => {
    try {
      if (!messaging) return false;
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
        const currentToken = await getToken(messaging, { vapidKey });
        if (currentToken) {
          console.log('FCM Token generated');
          setFcmToken(currentToken);
          trackNotificationEnabled();
          return true;
        } else {
          console.log('No registration token available.');
        }
      }
      return false;
    } catch (err) {
      logError(err as Error, { context: 'FCM permission request' });
      return false;
    }
  };

  useEffect(() => {
    if (messaging) {
      const unsubscribe = onMessage(messaging, (payload) => {
        console.log('Message received. ', payload);
        // We could show a toast here if we had access to the toast function
      });
      return () => unsubscribe();
    }
  }, []);

  return { requestPermission, fcmToken };
};
