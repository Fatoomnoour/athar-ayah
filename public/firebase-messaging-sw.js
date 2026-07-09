importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyC322Gr_2b0NUoTEtU9phU96Rk8iUKPXoA",
  authDomain: "athar-ayah.firebaseapp.com",
  projectId: "athar-ayah",
  storageBucket: "athar-ayah.firebasestorage.app",
  messagingSenderId: "763969793869",
  appId: "BNYmebmOlVZZYIjqn6OhIspewwFzA4J7G3-6h5o2Lk_yorL8Z7bx0n9WVsXMsRiok31RsI83Or7A27pFlc5esUM"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icons/icon-192x192.jpg',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
