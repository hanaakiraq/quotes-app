class QuotesApp {
  constructor() {
    this.allQuotes = {};
    this.favorites = JSON.parse(localStorage.getItem('favorites')) || [];
    this.customQuotes = JSON.parse(localStorage.getItem('customQuotes')) || {};
    this.currentCategory = 'all';
    this.currentQuotes = [];
    
    this.initializeElements();
    this.bindEvents();
    this.loadAllQuotes();
  }

  initializeElements() {
    this.categorySelect = document.getElementById("categorySelect");
    this.quotesContainer = document.getElementById("quotesContainer");
    this.searchInput = document.getElementById("searchInput");
    this.searchBtn = document.getElementById("searchBtn");
    this.quotesCount = document.getElementById("quotesCount");
    this.randomQuoteBtn = document.getElementById("randomQuoteBtn");
    this.favoriteBtn = document.getElementById("favoriteBtn");
    this.exportBtn = document.getElementById("exportBtn");
    this.newQuoteCategory = document.getElementById("newQuoteCategory");
    this.newQuoteText = document.getElementById("newQuoteText");
    this.addQuoteBtn = document.getElementById("addQuoteBtn");
    this.notification = document.getElementById("notification");
  }

  bindEvents() {
    this.categorySelect.addEventListener("change", () => {
      this.currentCategory = this.categorySelect.value;
      this.loadQuotes(this.currentCategory);
    });

    this.searchBtn.addEventListener("click", () => this.searchQuotes());
    this.searchInput.addEventListener("keypress", (e) => {
      if (e.key === 'Enter') this.searchQuotes();
    });

    this.randomQuoteBtn.addEventListener("click", () => this.showRandomQuote());
    this.favoriteBtn.addEventListener("click", () => this.showFavorites());
    this.exportBtn.addEventListener("click", () => this.exportFavorites());
    this.addQuoteBtn.addEventListener("click", () => this.addCustomQuote());

    // Real-time search
    this.searchInput.addEventListener("input", () => {
      if (this.searchInput.value.length > 2) {
        this.searchQuotes();
      } else if (this.searchInput.value.length === 0) {
        this.loadQuotes(this.currentCategory);
      }
    });
  }

  async loadAllQuotes() {
    const categories = ['wisdom', 'success', 'friendship', 'love', 'patience', 'knowledge', 'motivation', 'life'];
    
    try {
      for (const category of categories) {
        const response = await fetch(`data/${category}.json`);
        const quotes = await response.json();
        this.allQuotes[category] = quotes;
        
        // Merge custom quotes
        if (this.customQuotes[category]) {
          this.allQuotes[category] = [...quotes, ...this.customQuotes[category]];
        }
      }
      
      this.showNotification("تم تحميل جميع المقولات بنجاح! 🎉");
      this.updateTotalCount();
    } catch (error) {
      console.error('Error loading quotes:', error);
      this.showNotification("حدث خطأ في تحميل المقولات", "error");
    }
  }

  loadQuotes(category) {
    this.quotesContainer.innerHTML = '<div class="loading">جارٍ التحميل...</div>';

    setTimeout(() => {
      if (category === "all") {
        this.currentQuotes = Object.values(this.allQuotes).flat();
      } else {
        this.currentQuotes = this.allQuotes[category] || [];
      }

      this.displayQuotes(this.currentQuotes, category);
      this.updateQuotesCount();
    }, 300);
  }

  displayQuotes(quotes, category = null) {
    this.quotesContainer.innerHTML = "";

    if (quotes.length === 0) {
      this.quotesContainer.innerHTML = '<p class="welcome-message">لا توجد مقولات في هذا الباب</p>';
      return;
    }

    quotes.forEach((quote, index) => {
      const card = document.createElement("div");
      card.className = "quote-card";
      
      // Determine category for badge
      let quoteCat = category;
      if (category === 'all' || !category) {
        quoteCat = this.findQuoteCategory(quote);
      }
      
      const categoryBadge = quoteCat && quoteCat !== 'all' ? 
        `<div class="category-badge">${this.getCategoryName(quoteCat)}</div>` : '';
      
      const isFavorite = this.favorites.includes(quote);
      
      card.innerHTML = `
        ${categoryBadge}
        <div class="quote-text">${quote}</div>
        <div class="quote-actions">
          <button onclick="app.toggleFavorite('${quote.replace(/'/g, "\\'")}', this)" 
                  title="${isFavorite ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}">
            ${isFavorite ? '⭐' : '☆'}
          </button>
          <button onclick="app.copyQuote('${quote.replace(/'/g, "\\'")}', this)" title="نسخ">
            📋
          </button>
          <button onclick="app.shareQuote('${quote.replace(/'/g, "\\'")}', this)" title="مشاركة">
            📤
          </button>
        </div>
      `;
      
      this.quotesContainer.appendChild(card);
    });
  }

  findQuoteCategory(quote) {
    for (const [category, quotes] of Object.entries(this.allQuotes)) {
      if (quotes.includes(quote)) {
        return category;
      }
    }
    return null;
  }

  searchQuotes() {
    const searchTerm = this.searchInput.value.trim();
    
    if (!searchTerm) {
      this.loadQuotes(this.currentCategory);
      return;
    }

    const allQuotes = Object.values(this.allQuotes).flat();
    const filteredQuotes = allQuotes.filter(quote => 
      quote.includes(searchTerm)
    );

    this.currentQuotes = filteredQuotes;
    this.displayQuotes(filteredQuotes);
    this.updateQuotesCount();
    
    if (filteredQuotes.length > 0) {
      this.showNotification(`تم العثور على ${filteredQuotes.length} مقولة`);
    } else {
      this.showNotification("لم يتم العثور على نتائج", "error");
    }
  }

  showRandomQuote() {
    const allQuotes = Object.values(this.allQuotes).flat();
    if (allQuotes.length === 0) return;

    const randomQuote = allQuotes[Math.floor(Math.random() * allQuotes.length)];
    this.displayQuotes([randomQuote]);
    this.updateQuotesCount();
    this.showNotification("مقولة عشوائية! 🎲");
  }

  showFavorites() {
    if (this.favorites.length === 0) {
      this.quotesContainer.innerHTML = '<p class="welcome-message">لا توجد مقولات مفضلة بعد</p>';
      this.updateQuotesCount();
      return;
    }

    this.currentQuotes = this.favorites;
    this.displayQuotes(this.favorites);
    this.updateQuotesCount();
    this.showNotification(`عرض ${this.favorites.length} مقولة مفضلة ⭐`);
  }

  exportFavorites() {
    if (this.favorites.length === 0) {
      this.showNotification("لا توجد مقولات مفضلة للتصدير", "error");
      return;
    }

    const favoritesText = this.favorites.map((quote, index) => `${index + 1}. ${quote}`).join('\n\n');
    const blob = new Blob([favoritesText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'مقولاتي_المفضلة.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    this.showNotification("تم تصدير المقولات المفضلة بنجاح! 📁");
  }

  toggleFavorite(quote, button) {
    const index = this.favorites.indexOf(quote);
    
    if (index > -1) {
      this.favorites.splice(index, 1);
      button.innerHTML = '☆';
      button.title = 'إضافة للمفضلة';
      this.showNotification("تم إزالة المقولة من المفضلة");
    } else {
      this.favorites.push(quote);
      button.innerHTML = '⭐';
      button.title = 'إزالة من المفضلة';
      this.showNotification("تم إضافة المقولة للمفضلة");
    }
    
    localStorage.setItem('favorites', JSON.stringify(this.favorites));
  }

  copyQuote(quote, button) {
    navigator.clipboard.writeText(quote).then(() => {
      const originalText = button.innerHTML;
      button.innerHTML = '✅';
      setTimeout(() => {
        button.innerHTML = originalText;
      }, 1000);
      this.showNotification("تم نسخ المقولة");
    }).catch(() => {
      this.showNotification("فشل في نسخ المقولة", "error");
    });
  }

  shareQuote(quote, button) {
    if (navigator.share) {
      navigator.share({
        title: 'مقولة وحكمة',
        text: quote,
        url: window.location.href
      });
    } else {
      this.copyQuote(quote, button);
      this.showNotification("تم نسخ المقولة للمشاركة");
    }
  }

  addCustomQuote() {
    const category = this.newQuoteCategory.value;
    const text = this.newQuoteText.value.trim();

    if (!text) {
      this.showNotification("يرجى كتابة المقولة", "error");
      return;
    }

    if (!this.customQuotes[category]) {
      this.customQuotes[category] = [];
    }

    this.customQuotes[category].push(text);
    this.allQuotes[category].push(text);
    
    localStorage.setItem('customQuotes', JSON.stringify(this.customQuotes));
    
    this.newQuoteText.value = '';
    this.showNotification("تم إضافة المقولة بنجاح! ✨");
    
    // Refresh current view if showing the same category
    if (this.currentCategory === category || this.currentCategory === 'all') {
      this.loadQuotes(this.currentCategory);
    }
    
    this.updateTotalCount();
  }

  updateQuotesCount() {
    const count = this.currentQuotes.length;
    this.quotesCount.textContent = `${count} مقولة`;
  }

  updateTotalCount() {
    const totalQuotes = Object.values(this.allQuotes).flat().length;
    console.log(`إجمالي المقولات: ${totalQuotes}`);
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
      life: 'الحياة'
    };
    return names[category] || category;
  }

  showNotification(message, type = 'success') {
    this.notification.textContent = message;
    this.notification.className = `notification ${type}`;
    
    setTimeout(() => {
      this.notification.classList.add('hidden');
    }, 3000);
  }
}

// Initialize the app
const app = new QuotesApp();

// Daily notification feature
if ('Notification' in window && 'serviceWorker' in navigator) {
  Notification.requestPermission().then(permission => {
    if (permission === 'granted') {
      // Set up daily notification
      setInterval(() => {
        const allQuotes = Object.values(app.allQuotes).flat();
        if (allQuotes.length > 0) {
          const randomQuote = allQuotes[Math.floor(Math.random() * allQuotes.length)];
          new Notification('حكمة اليوم', {
            body: randomQuote,
            icon: 'icon-192.png'
          });
        }
      }, 24 * 60 * 60 * 1000); // 24 hours
    }
  });
}