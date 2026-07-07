import { useEffect } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { messaging } from '../lib/firebase';
import { trackNotificationEnabled, logError } from '../lib/analytics';

export const useFCM = () => {
  useEffect(() => {
    const requestPermission = async () => {
      try {
        if (!messaging) return;
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          // You need a VAPID key to get a token, but we'll try without it first
          // or fallback to getting the token which might use the default if configured in Firebase
          const currentToken = await getToken(messaging);
          if (currentToken) {
            console.log('FCM Token:', currentToken);
            trackNotificationEnabled();
            // TODO: Save token to user profile in Firestore
          } else {
            console.log('No registration token available. Request permission to generate one.');
          }
        }
      } catch (err) {
        logError(err as Error, { context: 'FCM permission request' });
      }
    };

    requestPermission();

    if (messaging) {
      const unsubscribe = onMessage(messaging, (payload) => {
        console.log('Message received. ', payload);
        // We could show a toast here if we had access to the toast function
      });
      return () => unsubscribe();
    }
  }, []);
};
