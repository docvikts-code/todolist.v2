// TaskFlow Service Worker v3 — no external icon dependencies
const CACHE = 'taskflow-v3';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.add('./index.html')).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});

self.addEventListener('message', e => {
  if (e.data?.type === 'TASKS_UPDATED') {
    idbSet('tasks', e.data.tasks).then(() => checkAndNotify());
  }
  if (e.data?.type === 'SCHEDULE_CHECK') checkAndNotify();
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type:'window', includeUncontrolled:true })
      .then(list => list.length ? list[0].focus() : clients.openWindow('./index.html'))
  );
});

async function checkAndNotify() {
  const tasks = await idbGet('tasks') || [];
  const icon  = await idbGet('icon192') || '';
  const now = Date.now();
  const alerts = [
    { min:1440, label:'24 години', emoji:'📅', key:'24h' },
    { min:60,   label:'1 годину',  emoji:'⏰', key:'1h'  },
    { min:5,    label:'5 хвилин',  emoji:'🚨', key:'5m'  },
  ];
  for (const task of tasks) {
    if (!task.deadline || task.done) continue;
    const dl = new Date(`${task.deadline}T${task.time||'23:59'}`).getTime();
    for (const a of alerts) {
      const diffMin = (dl - now) / 60000;
      const key = `notif_${task.id}_${a.key}`;
      const sent = await idbGet(key);
      if (diffMin <= a.min && diffMin > a.min - 3 && !sent) {
        await self.registration.showNotification(`${a.emoji} «${task.title}»`, {
          body: `До дедлайну залишилось ${a.label}`,
          icon: icon || undefined,
          tag: key,
          vibrate: [200,100,200],
        });
        await idbSet(key, true);
      }
    }
  }
}

function openDB() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('taskflow-sw', 1);
    r.onupgradeneeded = e => e.target.result.createObjectStore('kv');
    r.onsuccess = e => res(e.target.result);
    r.onerror = rej;
  });
}
async function idbGet(key) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const r = db.transaction('kv','readonly').objectStore('kv').get(key);
    r.onsuccess = () => res(r.result ?? null);
    r.onerror = rej;
  });
}
async function idbSet(key, val) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction('kv','readwrite');
    tx.objectStore('kv').put(val, key);
    tx.oncomplete = res; tx.onerror = rej;
  });
}
