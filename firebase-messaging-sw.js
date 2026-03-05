// TaskFlow Firebase Service Worker v1.0
// Handles FCM push notifications (background)
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDxKm4WjGFaU5IIzIcoKuvsg4_txmV0qK4",
  authDomain: "taskflow-aff2b.firebaseapp.com",
  projectId: "taskflow-aff2b",
  storageBucket: "taskflow-aff2b.firebasestorage.app",
  messagingSenderId: "514083043856",
  appId: "1:514083043856:web:e8ed92c7acbee6f42b6895"
});

const messaging = firebase.messaging();

// Handle background push messages
messaging.onBackgroundMessage(payload => {
  const { title, body, icon } = payload.notification || {};
  return self.registration.showNotification(title || '⏰ TaskFlow', {
    body: body || 'Нагадування про задачу',
    icon: icon || './icons/icon-192.png',
    badge: './icons/icon-96.png',
    vibrate: [200, 100, 200],
    tag: payload.data?.taskId || 'taskflow',
    data: payload.data,
  });
});

// Handle notification click
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(list => list.length ? list[0].focus() : clients.openWindow('./index.html'))
  );
});

// Cache for offline
const CACHE = 'taskflow-v1';
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.add('./index.html')).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
