// تطبيق أقوال وحكم
class QuotesApp {
  constructor() {
    this.quotes = {};
    this.userQuotes = JSON.parse(localStorage.getItem('userQuotes')) || [];
    this.favorites = JSON.parse(localStorage.getItem('favorites')) || [];
    this.currentCategory = 'all';
    this.currentQuotes = [];
    this.notificationsEnabled = localStorage.getItem('notificationsEnabled') === 'true';
    this.lastNotificationTime = localStorage.getItem('lastNotificationTime') || 0;
    this.notificationInterval = null;
    this.init();
  }

  async init() {
    await this.loadQuotes();
    this.setupEventListeners();
    this.displayQuotes();
    await this.initializeNotifications();
  }

  async loadQuotes() {
    const categories = [
      'wisdom', 'success', 'friendship', 'love', 'patience', 
      'knowledge', 'motivation', 'life', 'custom', 'ethics', 
      'family', 'hope', 'time', 'health', 'work', 'peace'
    ];
    
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
          await this.startNotificationScheduler();
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
        
        // بدء جدولة الإشعارات
        await this.startNotificationScheduler();
        
        // تحديث النص
        document.getElementById('notificationBtn').innerHTML = 'إيقاف الإشعارات 🔕';
        
        this.showNotification('تم تفعيل الإشعارات اليومية! ستصلك حكمة جديدة كل 24 ساعة 🌅');
        
        // إرسال إشعار فوري للتأكيد
        setTimeout(() => {
          this.sendDailyQuoteNotification();
        }, 2000);
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
    
    // إيقاف المؤقت
    if (this.notificationInterval) {
      clearInterval(this.notificationInterval);
      this.notificationInterval = null;
    }
    
    // تحديث النص
    document.getElementById('notificationBtn').innerHTML = 'تفعيل الإشعارات 🔔';
    
    this.showNotification('تم إيقاف الإشعارات اليومية');
  }

  async startNotificationScheduler() {
    // إيقاف المؤقت السابق إن وجد
    if (this.notificationInterval) {
      clearInterval(this.notificationInterval);
    }

    // التحقق من الوقت المناسب لإرسال الإشعار
    const checkAndSendNotification = () => {
      const now = Date.now();
      const lastNotification = parseInt(this.lastNotificationTime);
      const timeDifference = now - lastNotification;
      const twentyFourHours = 24 * 60 * 60 * 1000; // 24 ساعة بالميلي ثانية

      // إرسال إشعار إذا مر أكثر من 24 ساعة أو إذا كانت هذه المرة الأولى
      if (timeDifference >= twentyFourHours || lastNotification === 0) {
        this.sendDailyQuoteNotification();
        localStorage.setItem('lastNotificationTime', now.toString());
      }
    };

    // فحص فوري
    checkAndSendNotification();

    // فحص كل ساعة للتأكد من عدم تفويت الموعد
    this.notificationInterval = setInterval(checkAndSendNotification, 60 * 60 * 1000); // كل ساعة
  }

  async sendDailyQuoteNotification() {
    // جمع جميع المقولات
    const allQuotes = [];
    
    // إضافة المقولات من جميع الفئات
    Object.values(this.quotes).forEach(categoryQuotes => {
      if (Array.isArray(categoryQuotes)) {
        allQuotes.push(...categoryQuotes);
      }
    });

    // إضافة المقولات المخصصة
    this.userQuotes.forEach(userQuote => {
      allQuotes.push(userQuote.text);
    });

    if (allQuotes.length === 0) {
      console.warn('لا توجد مقولات لإرسالها');
      return;
    }

    // اختيار مقولة عشوائية
    const randomQuote = allQuotes[Math.floor(Math.random() * allQuotes.length)];
    
    try {
      // محاولة استخدام Service Worker أولاً
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification('🌟 حكمة اليوم', {
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
      } else {
        // استخدام الإشعار العادي كبديل
        const notification = new Notification('🌟 حكمة اليوم', {
          body: randomQuote,
          icon: '/icon-192.png',
          tag: 'daily-quote',
          requireInteraction: false,
          silent: false
        });

        // إغلاق الإشعار تلقائياً بعد 10 ثوانٍ
        setTimeout(() => {
          notification.close();
        }, 10000);

        // التعامل مع النقر على الإشعار
        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      }

      console.log('تم إرسال إشعار يومي:', randomQuote);
    } catch (error) {
      console.error('خطأ في إرسال الإشعار:', error);
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
                    class="${this.favorites.includes(quote) ? 'favorite' : ''}"
                    title="إضافة للمفضلة">
              ${this.favorites.includes(quote) ? '⭐' : '☆'}
            </button>
            <button onclick="app.copyQuote('${quote.replace(/'/g, "\\'")}')">📋</button>
            <button onclick="app.showShareModal('${quote.replace(/'/g, "\\'")}')">📤</button>
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
      ethics: 'الأخلاق',
      family: 'الأسرة',
      hope: 'الأمل',
      time: 'الوقت',
      health: 'الصحة',
      work: 'العمل',
      peace: 'السلام',
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

  showShareModal(quote) {
    // إنشاء نافذة المشاركة
    const modal = document.createElement('div');
    modal.className = 'modal share-modal';
    modal.innerHTML = `
      <div class="modal-content share-modal-content">
        <div class="modal-header">
          <h2>📤 مشاركة الحكمة</h2>
          <button class="close-btn" onclick="this.closest('.modal').remove()">✕</button>
        </div>
        <div class="modal-body">
          <div class="quote-preview">
            <p>"${quote}"</p>
          </div>
          <div class="share-options">
            <h3>اختر طريقة المشاركة:</h3>
            <div class="share-buttons">
              <button class="share-btn whatsapp" onclick="app.shareToWhatsApp('${quote.replace(/'/g, "\\'")}')">
                <span class="share-icon">📱</span>
                واتساب
              </button>
              <button class="share-btn telegram" onclick="app.shareToTelegram('${quote.replace(/'/g, "\\'")}')">
                <span class="share-icon">✈️</span>
                تيليجرام
              </button>
              <button class="share-btn twitter" onclick="app.shareToTwitter('${quote.replace(/'/g, "\\'")}')">
                <span class="share-icon">🐦</span>
                تويتر
              </button>
              <button class="share-btn facebook" onclick="app.shareToFacebook('${quote.replace(/'/g, "\\'")}')">
                <span class="share-icon">📘</span>
                فيسبوك
              </button>
              <button class="share-btn copy" onclick="app.copyQuote('${quote.replace(/'/g, "\\'")}'); this.closest('.modal').remove();">
                <span class="share-icon">📋</span>
                نسخ النص
              </button>
              <button class="share-btn native" onclick="app.shareNative('${quote.replace(/'/g, "\\'")}')">
                <span class="share-icon">📤</span>
                مشاركة أخرى
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // إضافة النافذة للصفحة
    document.body.appendChild(modal);

    // إغلاق النافذة عند النقر خارجها
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });

    // إغلاق النافذة بمفتاح Escape
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        modal.remove();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
  }

  shareToWhatsApp(quote) {
    const text = encodeURIComponent(`"${quote}"\n\n📚 من تطبيق مقولات وحكم`);
    const url = `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
    this.closeShareModal();
  }

  shareToTelegram(quote) {
    const text = encodeURIComponent(`"${quote}"\n\n📚 من تطبيق مقولات وحكم`);
    const url = `https://t.me/share/url?text=${text}`;
    window.open(url, '_blank');
    this.closeShareModal();
  }

  shareToTwitter(quote) {
    const text = encodeURIComponent(`"${quote}"\n\n📚 #مقولات_وحكم #حكمة`);
    const url = `https://twitter.com/intent/tweet?text=${text}`;
    window.open(url, '_blank');
    this.closeShareModal();
  }

  shareToFacebook(quote) {
    const text = encodeURIComponent(`"${quote}"\n\n📚 من تطبيق مقولات وحكم`);
    const url = `https://www.facebook.com/sharer/sharer.php?quote=${text}`;
    window.open(url, '_blank');
    this.closeShareModal();
  }

  shareNative(quote) {
    if (navigator.share) {
      navigator.share({
        title: '📚 حكمة من تطبيق مقولات وحكم',
        text: `"${quote}"\n\n📚 من تطبيق مقولات وحكم`
      }).then(() => {
        this.closeShareModal();
        this.showNotification('تم مشاركة المقولة بنجاح! 📤');
      }).catch((error) => {
        console.log('خطأ في المشاركة:', error);
      });
    } else {
      // نسخ النص كبديل
      this.copyQuote(`"${quote}"\n\n📚 من تطبيق مقولات وحكم`);
      this.closeShareModal();
    }
  }

  closeShareModal() {
    const modal = document.querySelector('.share-modal');
    if (modal) {
      modal.remove();
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