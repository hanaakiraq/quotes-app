// تطبيق أقوال وحكم
class QuotesApp {
  constructor() {
    this.quotes = {};
    this.favorites = JSON.parse(localStorage.getItem('favorites')) || [];
    this.currentCategory = 'all';
    this.currentQuotes = [];
    this.init();
  }

  async init() {
    await this.loadQuotes();
    this.setupEventListeners();
    this.displayQuotes();
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

    // استيراد ملف
    document.getElementById('importBtn').addEventListener('click', () => {
      this.toggleImportSection();
    });

    // إضافة مقولة جديدة
    document.getElementById('addQuoteBtn').addEventListener('click', () => {
      this.addNewQuote();
    });

    // استيراد الملفات
    document.getElementById('selectFileBtn').addEventListener('click', () => {
      document.getElementById('fileInput').click();
    });

    document.getElementById('fileInput').addEventListener('change', (e) => {
      this.handleFileSelect(e.target.files[0]);
    });

    document.getElementById('importFileBtn').addEventListener('click', () => {
      this.importFile();
    });

    // Enter للبحث
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.searchQuotes(e.target.value);
      }
    });
  }

  displayQuotes() {
    const container = document.getElementById('quotesContainer');
    let quotesToShow = [];

    if (this.currentCategory === 'all') {
      quotesToShow = Object.values(this.quotes).flat();
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

    container.innerHTML = quotes.map((quote, index) => `
      <div class="quote-card">
        <div class="category-badge">${this.getCategoryName(this.findQuoteCategory(quote))}</div>
        <div class="quote-text">${quote}</div>
        <div class="quote-actions">
          <button onclick="app.toggleFavorite('${quote.replace(/'/g, "\\'")}', this)" 
                  class="${this.favorites.includes(quote) ? 'favorite' : ''}">
            ${this.favorites.includes(quote) ? '⭐' : '☆'}
          </button>
          <button onclick="app.copyQuote('${quote.replace(/'/g, "\\'")}')">📋</button>
          <button onclick="app.shareQuote('${quote.replace(/'/g, "\\'")}')">📤</button>
        </div>
      </div>
    `).join('');
  }

  findQuoteCategory(quote) {
    for (const [category, quotes] of Object.entries(this.quotes)) {
      if (quotes.includes(quote)) {
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
      custom: 'غرر الحكم'
    };
    return names[category] || 'غير محدد';
  }

  searchQuotes(searchTerm) {
    if (!searchTerm.trim()) {
      this.displayQuotes();
      return;
    }

    const allQuotes = Object.values(this.quotes).flat();
    const filteredQuotes = allQuotes.filter(quote => 
      quote.includes(searchTerm.trim())
    );

    this.renderQuotes(filteredQuotes);
    this.updateStats(filteredQuotes.length);
  }

  showRandomQuote() {
    const allQuotes = Object.values(this.quotes).flat();
    if (allQuotes.length === 0) return;

    const randomQuote = allQuotes[Math.floor(Math.random() * allQuotes.length)];
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

  toggleImportSection() {
    const section = document.getElementById('importSection');
    section.style.display = section.style.display === 'none' ? 'block' : 'none';
  }

  addNewQuote() {
    const category = document.getElementById('newQuoteCategory').value;
    const text = document.getElementById('newQuoteText').value.trim();

    if (!text) {
      this.showNotification('يرجى كتابة نص المقولة', 'error');
      return;
    }

    if (!this.quotes[category]) {
      this.quotes[category] = [];
    }

    if (this.quotes[category].includes(text)) {
      this.showNotification('هذه المقولة موجودة بالفعل', 'error');
      return;
    }

    this.quotes[category].push(text);
    this.saveQuotesToStorage(category);
    
    document.getElementById('newQuoteText').value = '';
    this.showNotification('تمت إضافة المقولة بنجاح ✅');
    
    if (this.currentCategory === category || this.currentCategory === 'all') {
      this.displayQuotes();
    }
  }

  handleFileSelect(file) {
    if (!file) return;

    const importBtn = document.getElementById('importFileBtn');
    const selectBtn = document.getElementById('selectFileBtn');
    
    selectBtn.textContent = `تم اختيار: ${file.name}`;
    importBtn.disabled = false;
    
    this.selectedFile = file;
  }

  async importFile() {
    if (!this.selectedFile) return;

    const category = document.getElementById('importCategory').value;
    const fileType = this.selectedFile.name.split('.').pop().toLowerCase();

    try {
      const text = await this.selectedFile.text();
      let newQuotes = [];

      if (fileType === 'json') {
        const parsed = JSON.parse(text);
        newQuotes = Array.isArray(parsed) ? parsed : [];
      } else if (fileType === 'txt') {
        newQuotes = text.split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0);
      } else {
        throw new Error('نوع ملف غير مدعوم');
      }

      if (!this.quotes[category]) {
        this.quotes[category] = [];
      }

      const existingQuotes = this.quotes[category];
      const uniqueQuotes = newQuotes.filter(quote => !existingQuotes.includes(quote));

      if (uniqueQuotes.length === 0) {
        this.showNotification('جميع المقولات موجودة بالفعل', 'error');
        return;
      }

      this.quotes[category].push(...uniqueQuotes);
      this.saveQuotesToStorage(category);

      this.showNotification(`تم استيراد ${uniqueQuotes.length} مقولة جديدة ✅`);
      
      // إعادة تعيين النموذج
      document.getElementById('selectFileBtn').textContent = 'اختر ملف 📄';
      document.getElementById('importFileBtn').disabled = true;
      this.selectedFile = null;
      
      if (this.currentCategory === category || this.currentCategory === 'all') {
        this.displayQuotes();
      }

    } catch (error) {
      this.showNotification('خطأ في قراءة الملف: ' + error.message, 'error');
    }
  }

  saveQuotesToStorage(category) {
    localStorage.setItem(`quotes_${category}`, JSON.stringify(this.quotes[category]));
  }

  loadQuotesFromStorage() {
    const categories = ['wisdom', 'success', 'friendship', 'love', 'patience', 'knowledge', 'motivation', 'life', 'custom'];
    
    categories.forEach(category => {
      const stored = localStorage.getItem(`quotes_${category}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            this.quotes[category] = [...(this.quotes[category] || []), ...parsed];
          }
        } catch (error) {
          console.error(`خطأ في تحميل ${category} من التخزين المحلي:`, error);
        }
      }
    });
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

// تحميل البيانات من التخزين المحلي بعد تحميل البيانات الأساسية
window.addEventListener('load', () => {
  setTimeout(() => {
    app.loadQuotesFromStorage();
    app.displayQuotes();
  }, 1000);
});