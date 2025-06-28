// Service Worker للإشعارات اليومية
const CACHE_NAME = 'quotes-app-v1';
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
  
  event.waitUntil(
    clients.openWindow('/')
  );
});

// إرسال إشعار يومي
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SCHEDULE_DAILY_NOTIFICATION') {
    scheduleDailyNotification();
  }
});

function scheduleDailyNotification() {
  // جدولة الإشعار التالي بعد 24 ساعة
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0); // 9 صباحاً
  
  const timeUntilTomorrow = tomorrow.getTime() - now.getTime();
  
  setTimeout(() => {
    showDailyQuote();
    scheduleDailyNotification(); // جدولة الإشعار التالي
  }, timeUntilTomorrow);
}

async function showDailyQuote() {
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
      self.registration.showNotification('🌟 حكمة اليوم', {
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
        }
      });
    }
  } catch (error) {
    console.error('خطأ في إرسال الإشعار اليومي:', error);
  }
}