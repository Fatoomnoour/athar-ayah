import { useEffect, useState } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, setDoc } from 'firebase/firestore';
import { messaging, db, auth } from '../lib/firebase';
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
          
          // Save token to Firestore if user is logged in
          if (auth?.currentUser && db) {
            try {
              await setDoc(doc(db, 'users', auth.currentUser.uid, 'fcmTokens', currentToken), {
                token: currentToken,
                updatedAt: new Date().toISOString(),
                device: navigator.userAgent
              }, { merge: true });
            } catch (e) {
              console.error('Error saving FCM token to Firestore', e);
            }
          }
          
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
