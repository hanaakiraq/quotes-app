// تطبيق أقوال وحكم
class QuotesApp {
  constructor() {
    this.quotes = {};
    this.userQuotes = JSON.parse(localStorage.getItem('userQuotes')) || [];
    this.favorites = JSON.parse(localStorage.getItem('favorites')) || [];
    this.currentCategory = 'all';
    this.currentQuotes = [];
    this.notificationsEnabled = localStorage.getItem('notificationsEnabled') === 'true';
    this.init();
  }

  async init() {
    await this.loadQuotes();
    this.setupEventListeners();
    this.displayQuotes();
    await this.initializeNotifications();
  }

  async loadQuotes() {
    const categories = ['wisdom', 'success', 'friendship', 'love', 'patience', 'knowledge', 'motivation', 'life', 'custom'];
    
    for (const category of categories) {
      try {
        const response = await fetch(`data/${category}.json`);
        if (response.ok) {
          this.quotes[category] = await response.json();
        }
      } catch (error) {
        console.error(`خطأ في تحميل ${category}:`, error);
        this.quotes[category] = [];
      }
    }

    // إضافة المقولات المحفوظة محلياً
    this.quotes['user'] = this.userQuotes;
  }

  async initializeNotifications() {
    // تسجيل Service Worker
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/service-worker.js');
        console.log('Service Worker مسجل بنجاح:', registration);
        
        // إضافة زر التحكم في الإشعارات
        this.addNotificationControls();
        
        // بدء الإشعارات إذا كانت مفعلة
        if (this.notificationsEnabled) {
          await this.enableNotifications();
        }
      } catch (error) {
        console.warn('Service Worker غير مدعوم في هذه البيئة:', error.message);
        // إضافة زر التحكم في الإشعارات حتى لو لم يكن Service Worker مدعوماً
        this.addNotificationControls();
      }
    } else {
      console.warn('Service Worker غير مدعوم في هذا المتصفح');
      // إضافة زر التحكم في الإشعارات حتى لو لم يكن Service Worker مدعوماً
      this.addNotificationControls();
    }
  }

  addNotificationControls() {
    const actionButtons = document.querySelector('.action-buttons');
    
    // إضافة زر تفعيل/إلغاء الإشعارات
    const notificationBtn = document.createElement('button');
    notificationBtn.id = 'notificationBtn';
    notificationBtn.innerHTML = this.notificationsEnabled ? 'إيقاف الإشعارات 🔕' : 'تفعيل الإشعارات 🔔';
    notificationBtn.addEventListener('click', () => this.toggleNotifications());
    
    actionButtons.appendChild(notificationBtn);
  }

  async toggleNotifications() {
    if (this.notificationsEnabled) {
      await this.disableNotifications();
    } else {
      await this.enableNotifications();
    }
  }

  async enableNotifications() {
    try {
      // طلب إذن الإشعارات
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        this.notificationsEnabled = true;
        localStorage.setItem('notificationsEnabled', 'true');
        
        // إرسال رسالة للـ Service Worker لبدء جدولة الإشعارات
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'SCHEDULE_DAILY_NOTIFICATION'
          });
        }
        
        // تحديث النص
        document.getElementById('notificationBtn').innerHTML = 'إيقاف الإشعارات 🔕';
        
        this.showNotification('تم تفعيل الإشعارات اليومية! ستصلك حكمة جديدة كل يوم في الساعة 9 صباحاً 🌅');
        
        // إرسال إشعار تجريبي
        this.sendTestNotification();
      } else {
        this.showNotification('يرجى السماح بالإشعارات لتفعيل هذه الميزة', 'error');
      }
    } catch (error) {
      console.error('خطأ في تفعيل الإشعارات:', error);
      this.showNotification('خطأ في تفعيل الإشعارات', 'error');
    }
  }

  async disableNotifications() {
    this.notificationsEnabled = false;
    localStorage.setItem('notificationsEnabled', 'false');
    
    // تحديث النص
    document.getElementById('notificationBtn').innerHTML = 'تفعيل الإشعارات 🔔';
    
    this.showNotification('تم إيقاف الإشعارات اليومية');
  }

  async sendTestNotification() {
    if ('serviceWorker' in navigator && 'Notification' in window) {
      const allQuotes = Object.values(this.quotes).flat();
      if (allQuotes.length > 0) {
        const randomQuote = allQuotes[Math.floor(Math.random() * allQuotes.length)];
        
        try {
          const registration = await navigator.serviceWorker.ready;
          registration.showNotification('🌟 مرحباً! هذا إشعار تجريبي', {
            body: randomQuote,
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            tag: 'test-quote',
            requireInteraction: false,
            silent: false,
            vibrate: [200, 100, 200]
          });
        } catch (error) {
          console.warn('لا يمكن إرسال الإشعار التجريبي:', error.message);
          // إرسال إشعار بسيط بدلاً من ذلك
          if (Notification.permission === 'granted') {
            new Notification('🌟 مرحباً! هذا إشعار تجريبي', {
              body: randomQuote,
              icon: '/icon-192.png'
            });
          }
        }
      }
    }
  }

  setupEventListeners() {
    // اختيار الفئة
    document.getElementById('categorySelect').addEventListener('change', (e) => {
      this.currentCategory = e.target.value;
      this.displayQuotes();
    });

    // البحث
    document.getElementById('searchInput').addEventListener('input', (e) => {
      this.searchQuotes(e.target.value);
    });

    document.getElementById('searchBtn').addEventListener('click', () => {
      const searchTerm = document.getElementById('searchInput').value;
      this.searchQuotes(searchTerm);
    });

    // إضافة مقولة
    document.getElementById('addQuoteBtn').addEventListener('click', () => {
      this.showAddQuoteModal();
    });

    // مقولة عشوائية
    document.getElementById('randomQuoteBtn').addEventListener('click', () => {
      this.showRandomQuote();
    });

    // المفضلة
    document.getElementById('favoriteBtn').addEventListener('click', () => {
      this.showFavorites();
    });

    // تصدير المفضلة
    document.getElementById('exportBtn').addEventListener('click', () => {
      this.exportFavorites();
    });

    // Enter للبحث
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.searchQuotes(e.target.value);
      }
    });

    // أحداث النموذج
    this.setupModalEvents();
  }

  setupModalEvents() {
    const modal = document.getElementById('addQuoteModal');
    const closeBtn = document.getElementById('closeModal');
    const cancelBtn = document.getElementById('cancelAdd');
    const form = document.getElementById('addQuoteForm');

    // إغلاق النموذج
    closeBtn.addEventListener('click', () => this.hideAddQuoteModal());
    cancelBtn.addEventListener('click', () => this.hideAddQuoteModal());

    // إغلاق النموذج عند النقر خارجه
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.hideAddQuoteModal();
      }
    });

    // إرسال النموذج
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.addNewQuote();
    });

    // إغلاق النموذج بمفتاح Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
        this.hideAddQuoteModal();
      }
    });
  }

  showAddQuoteModal() {
    const modal = document.getElementById('addQuoteModal');
    modal.classList.remove('hidden');
    document.getElementById('quoteText').focus();
  }

  hideAddQuoteModal() {
    const modal = document.getElementById('addQuoteModal');
    modal.classList.add('hidden');
    document.getElementById('addQuoteForm').reset();
  }

  addNewQuote() {
    const quoteText = document.getElementById('quoteText').value.trim();
    const category = document.getElementById('quoteCategory').value;
    const author = document.getElementById('quoteAuthor').value.trim();

    if (!quoteText || !category) {
      this.showNotification('يرجى ملء جميع الحقول المطلوبة', 'error');
      return;
    }

    // التحقق من عدم تكرار المقولة
    const allQuotes = Object.values(this.quotes).flat();
    const userQuoteTexts = this.userQuotes.map(q => q.text);
    if (allQuotes.includes(quoteText) || userQuoteTexts.includes(quoteText)) {
      this.showNotification('هذه المقولة موجودة بالفعل!', 'error');
      return;
    }

    // إنشاء كائن المقولة
    const newQuote = {
      text: quoteText,
      category: category,
      author: author || null,
      dateAdded: new Date().toISOString(),
      id: Date.now().toString()
    };

    // إضافة المقولة للمجموعة المناسبة
    if (!this.quotes[category]) {
      this.quotes[category] = [];
    }
    this.quotes[category].push(quoteText);

    // إضافة المقولة لمقولات المستخدم
    this.userQuotes.push(newQuote);
    this.quotes['user'] = this.userQuotes;

    // حفظ في التخزين المحلي
    localStorage.setItem('userQuotes', JSON.stringify(this.userQuotes));

    // إخفاء النموذج وإظهار رسالة نجاح
    this.hideAddQuoteModal();
    this.showNotification('تم إضافة المقولة بنجاح! ✅');

    // تحديث العرض إذا كانت الفئة الحالية تتضمن المقولة الجديدة
    if (this.currentCategory === 'all' || this.currentCategory === category || this.currentCategory === 'user') {
      this.displayQuotes();
    }
  }

  displayQuotes() {
    const container = document.getElementById('quotesContainer');
    let quotesToShow = [];

    if (this.currentCategory === 'all') {
      quotesToShow = Object.values(this.quotes).flat();
      // إضافة نصوص المقولات المخصصة
      quotesToShow = quotesToShow.concat(this.userQuotes.map(q => q.text));
    } else if (this.currentCategory === 'user') {
      quotesToShow = this.userQuotes.map(q => q.text);
    } else {
      quotesToShow = this.quotes[this.currentCategory] || [];
    }

    this.currentQuotes = quotesToShow;
    this.renderQuotes(quotesToShow);
    this.updateStats(quotesToShow.length);
  }

  renderQuotes(quotes) {
    const container = document.getElementById('quotesContainer');
    
    if (quotes.length === 0) {
      container.innerHTML = '<p class="welcome-message">لا توجد مقولات في هذه الفئة</p>';
      return;
    }

    container.innerHTML = quotes.map((quote, index) => {
      const userQuote = this.userQuotes.find(q => q.text === quote);
      const isUserQuote = !!userQuote;
      
      return `
        <div class="quote-card ${isUserQuote ? 'user-quote' : ''}">
          <div class="category-badge">${this.getCategoryName(this.findQuoteCategory(quote))}</div>
          ${isUserQuote && userQuote.author ? `<div class="author-badge">✍️ ${userQuote.author}</div>` : ''}
          <div class="quote-text">${quote}</div>
          <div class="quote-actions">
            <button onclick="app.toggleFavorite('${quote.replace(/'/g, "\\'")}', this)" 
                    class="${this.favorites.includes(quote) ? 'favorite' : ''}">
              ${this.favorites.includes(quote) ? '⭐' : '☆'}
            </button>
            <button onclick="app.copyQuote('${quote.replace(/'/g, "\\'")}')">📋</button>
            <button onclick="app.shareQuote('${quote.replace(/'/g, "\\'")}')">📤</button>
            ${isUserQuote ? `<button onclick="app.deleteUserQuote('${userQuote.id}')" class="delete-btn" title="حذف المقولة">🗑️</button>` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  deleteUserQuote(quoteId) {
    if (confirm('هل أنت متأكد من حذف هذه المقولة؟')) {
      // العثور على المقولة وحذفها
      const quoteIndex = this.userQuotes.findIndex(q => q.id === quoteId);
      if (quoteIndex !== -1) {
        const deletedQuote = this.userQuotes[quoteIndex];
        this.userQuotes.splice(quoteIndex, 1);
        
        // تحديث التخزين المحلي
        localStorage.setItem('userQuotes', JSON.stringify(this.userQuotes));
        this.quotes['user'] = this.userQuotes;
        
        // حذف من المفضلة إذا كانت موجودة
        const favIndex = this.favorites.indexOf(deletedQuote.text);
        if (favIndex !== -1) {
          this.favorites.splice(favIndex, 1);
          localStorage.setItem('favorites', JSON.stringify(this.favorites));
        }
        
        // تحديث العرض
        this.displayQuotes();
        this.showNotification('تم حذف المقولة بنجاح');
      }
    }
  }

  findQuoteCategory(quote) {
    // البحث في المقولات المخصصة أولاً
    const userQuote = this.userQuotes.find(q => q.text === quote);
    if (userQuote) {
      return userQuote.category;
    }

    // البحث في الفئات الأخرى
    for (const [category, quotes] of Object.entries(this.quotes)) {
      if (category !== 'user' && quotes.includes(quote)) {
        return category;
      }
    }
    return 'custom';
  }

  getCategoryName(category) {
    const names = {
      wisdom: 'الحكمة',
      success: 'النجاح',
      friendship: 'الصداقة',
      love: 'الحب',
      patience: 'الصبر',
      knowledge: 'العلم',
      motivation: 'التحفيز',
      life: 'الحياة',
      custom: 'غرر الحكم',
      user: 'مقولاتي'
    };
    return names[category] || 'غير محدد';
  }

  searchQuotes(searchTerm) {
    if (!searchTerm.trim()) {
      this.displayQuotes();
      return;
    }

    const allQuotes = Object.values(this.quotes).flat();
    const userQuoteTexts = this.userQuotes.map(q => q.text);
    const allQuoteTexts = [...allQuotes, ...userQuoteTexts];
    
    const filteredQuotes = allQuoteTexts.filter(quote => 
      quote.includes(searchTerm.trim())
    );

    this.renderQuotes(filteredQuotes);
    this.updateStats(filteredQuotes.length);
  }

  showRandomQuote() {
    const allQuotes = Object.values(this.quotes).flat();
    const userQuoteTexts = this.userQuotes.map(q => q.text);
    const allQuoteTexts = [...allQuotes, ...userQuoteTexts];
    
    if (allQuoteTexts.length === 0) return;

    const randomQuote = allQuoteTexts[Math.floor(Math.random() * allQuoteTexts.length)];
    this.renderQuotes([randomQuote]);
    this.updateStats(1);
    this.showNotification('تم عرض مقولة عشوائية! 🎲');
  }

  showFavorites() {
    if (this.favorites.length === 0) {
      this.showNotification('لا توجد مقولات مفضلة بعد', 'error');
      return;
    }

    this.renderQuotes(this.favorites);
    this.updateStats(this.favorites.length);
    this.showNotification(`تم عرض ${this.favorites.length} مقولة مفضلة ⭐`);
  }

  toggleFavorite(quote, button) {
    const index = this.favorites.indexOf(quote);
    
    if (index === -1) {
      this.favorites.push(quote);
      button.innerHTML = '⭐';
      button.classList.add('favorite');
      this.showNotification('تمت إضافة المقولة للمفضلة ⭐');
    } else {
      this.favorites.splice(index, 1);
      button.innerHTML = '☆';
      button.classList.remove('favorite');
      this.showNotification('تم حذف المقولة من المفضلة');
    }

    localStorage.setItem('favorites', JSON.stringify(this.favorites));
  }

  copyQuote(quote) {
    navigator.clipboard.writeText(quote).then(() => {
      this.showNotification('تم نسخ المقولة 📋');
    }).catch(() => {
      this.showNotification('فشل في نسخ المقولة', 'error');
    });
  }

  shareQuote(quote) {
    if (navigator.share) {
      navigator.share({
        title: 'مقولة وحكمة',
        text: quote
      });
    } else {
      this.copyQuote(quote);
    }
  }

  exportFavorites() {
    if (this.favorites.length === 0) {
      this.showNotification('لا توجد مقولات مفضلة للتصدير', 'error');
      return;
    }

    const dataStr = JSON.stringify(this.favorites, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = 'مقولاتي_المفضلة.json';
    link.click();
    
    this.showNotification(`تم تصدير ${this.favorites.length} مقولة مفضلة 📤`);
  }

  updateStats(count) {
    document.getElementById('quotesCount').textContent = `${count} مقولة`;
  }

  showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    
    setTimeout(() => {
      notification.classList.add('hidden');
    }, 3000);
  }
}

// تشغيل التطبيق
const app = new QuotesApp();