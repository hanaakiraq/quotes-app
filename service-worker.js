// Service Worker للإشعارات اليومية المحسن
const CACHE_NAME = 'quotes-app-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  '/data/custom.json',
  '/data/wisdom.json',
  '/data/success.json',
  '/data/friendship.json',
  '/data/love.json',
  '/data/patience.json',
  '/data/knowledge.json',
  '/data/motivation.json',
  '/data/life.json'
];

// تثبيت Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// تفعيل Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// التعامل مع الطلبات
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

// التعامل مع النقر على الإشعار
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('/')
    );
  } else {
    event.waitUntil(
      clients.matchAll().then((clientList) => {
        if (clientList.length > 0) {
          return clientList[0].focus();
        }
        return clients.openWindow('/');
      })
    );
  }
});

// التعامل مع إغلاق الإشعار
self.addEventListener('notificationclose', (event) => {
  console.log('تم إغلاق الإشعار:', event.notification.tag);
});

// معالجة الرسائل من التطبيق الرئيسي
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SCHEDULE_DAILY_NOTIFICATION') {
    console.log('تم استلام طلب جدولة الإشعارات اليومية');
  }
});

// إرسال إشعار دوري (يتم استدعاؤه من التطبيق الرئيسي)
self.addEventListener('sync', (event) => {
  if (event.tag === 'daily-quote-sync') {
    event.waitUntil(sendDailyQuote());
  }
});

async function sendDailyQuote() {
  try {
    // تحميل جميع المقولات
    const allQuotes = [];
    const categories = ['custom', 'wisdom', 'success', 'friendship', 'love', 'patience', 'knowledge', 'motivation', 'life'];
    
    for (const category of categories) {
      try {
        const response = await fetch(`/data/${category}.json`);
        if (response.ok) {
          const quotes = await response.json();
          allQuotes.push(...quotes);
        }
      } catch (error) {
        console.error(`خطأ في تحميل ${category}:`, error);
      }
    }
    
    if (allQuotes.length > 0) {
      // اختيار مقولة عشوائية
      const randomQuote = allQuotes[Math.floor(Math.random() * allQuotes.length)];
      
      // إرسال الإشعار
      await self.registration.showNotification('🌟 حكمة اليوم', {
        body: randomQuote,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'daily-quote',
        requireInteraction: false,
        silent: false,
        vibrate: [200, 100, 200],
        data: {
          quote: randomQuote,
          timestamp: Date.now()
        },
        actions: [
          {
            action: 'open',
            title: 'فتح التطبيق',
            icon: '/icon-192.png'
          }
        ]
      });
      
      console.log('تم إرسال إشعار يومي بنجاح');
    }
  } catch (error) {
    console.error('خطأ في إرسال الإشعار اليومي:', error);
  }
}