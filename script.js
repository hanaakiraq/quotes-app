// تطبيق المقولات والحكم
class QuotesApp {
  constructor() {
    this.quotes = {};
    this.favorites = JSON.parse(localStorage.getItem('favorites')) || [];
    this.userQuotes = JSON.parse(localStorage.getItem('userQuotes')) || [];
    this.currentCategory = 'all';
    this.searchTerm = '';
    
    this.init();
  }

  async init() {
    await this.loadQuotes();
    this.setupEventListeners();
    this.setupNotifications();
    this.displayQuotes();
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
        console.warn(`Could not load ${category} quotes:`, error);
        this.quotes[category] = [];
      }
    }
  }

  setupEventListeners() {
    // Category selection
    document.getElementById('categorySelect').addEventListener('change', (e) => {
      this.currentCategory = e.target.value;
      this.displayQuotes();
    });

    // Search functionality
    document.getElementById('searchInput').addEventListener('input', (e) => {
      this.searchTerm = e.target.value.trim();
      this.displayQuotes();
    });

    document.getElementById('searchBtn').addEventListener('click', () => {
      this.displayQuotes();
    });

    // Action buttons
    document.getElementById('addQuoteBtn').addEventListener('click', () => {
      this.showAddQuoteModal();
    });

    document.getElementById('randomQuoteBtn').addEventListener('click', () => {
      this.showRandomQuote();
    });

    document.getElementById('favoriteBtn').addEventListener('click', () => {
      this.showFavorites();
    });

    document.getElementById('exportBtn').addEventListener('click', () => {
      this.exportFavorites();
    });

    // Modal functionality
    document.getElementById('closeModal').addEventListener('click', () => {
      this.hideAddQuoteModal();
    });

    document.getElementById('cancelAdd').addEventListener('click', () => {
      this.hideAddQuoteModal();
    });

    document.getElementById('addQuoteForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.addUserQuote();
    });

    // Close modal when clicking outside
    document.getElementById('addQuoteModal').addEventListener('click', (e) => {
      if (e.target.id === 'addQuoteModal') {
        this.hideAddQuoteModal();
      }
    });
  }

  displayQuotes() {
    const container = document.getElementById('quotesContainer');
    const countElement = document.getElementById('quotesCount');
    
    let quotesToShow = [];

    if (this.currentCategory === 'all') {
      // Show all quotes from all categories
      Object.values(this.quotes).forEach(categoryQuotes => {
        quotesToShow = quotesToShow.concat(categoryQuotes);
      });
      quotesToShow = quotesToShow.concat(this.userQuotes);
    } else if (this.currentCategory === 'user') {
      quotesToShow = this.userQuotes;
    } else if (this.currentCategory === 'favorites') {
      quotesToShow = this.favorites;
    } else {
      quotesToShow = this.quotes[this.currentCategory] || [];
    }

    // Apply search filter
    if (this.searchTerm) {
      quotesToShow = quotesToShow.filter(quote => 
        quote.text.includes(this.searchTerm) || 
        (quote.author && quote.author.includes(this.searchTerm))
      );
    }

    // Update count
    countElement.textContent = `${quotesToShow.length} مقولة`;

    // Display quotes
    if (quotesToShow.length === 0) {
      container.innerHTML = '<p class="welcome-message">لا توجد مقولات تطابق البحث</p>';
      return;
    }

    container.innerHTML = quotesToShow.map((quote, index) => `
      <div class="quote-card" data-index="${index}">
        <div class="quote-text">${quote.text}</div>
        ${quote.author ? `<div class="quote-author">- ${quote.author}</div>` : ''}
        <div class="quote-actions">
          <button class="action-btn favorite-btn ${this.isFavorite(quote) ? 'favorited' : ''}" 
                  onclick="app.toggleFavorite(${index}, '${this.currentCategory}')">
            ${this.isFavorite(quote) ? '⭐' : '☆'}
          </button>
          <button class="action-btn share-btn" onclick="app.shareQuote(${index}, '${this.currentCategory}')">
            📤
          </button>
          <button class="action-btn copy-btn" onclick="app.copyQuote(${index}, '${this.currentCategory}')">
            📋
          </button>
        </div>
      </div>
    `).join('');
  }

  showAddQuoteModal() {
    document.getElementById('addQuoteModal').classList.remove('hidden');
  }

  hideAddQuoteModal() {
    document.getElementById('addQuoteModal').classList.add('hidden');
    document.getElementById('addQuoteForm').reset();
  }

  addUserQuote() {
    const text = document.getElementById('quoteText').value.trim();
    const category = document.getElementById('quoteCategory').value;
    const author = document.getElementById('quoteAuthor').value.trim();

    if (!text || !category) {
      this.showNotification('يرجى ملء جميع الحقول المطلوبة', 'error');
      return;
    }

    const newQuote = {
      text,
      category,
      author: author || null,
      id: Date.now(),
      userAdded: true
    };

    this.userQuotes.push(newQuote);
    localStorage.setItem('userQuotes', JSON.stringify(this.userQuotes));
    
    this.hideAddQuoteModal();
    this.showNotification('تم إضافة المقولة بنجاح!', 'success');
    
    if (this.currentCategory === 'user' || this.currentCategory === 'all') {
      this.displayQuotes();
    }
  }

  showRandomQuote() {
    let allQuotes = [];
    Object.values(this.quotes).forEach(categoryQuotes => {
      allQuotes = allQuotes.concat(categoryQuotes);
    });
    allQuotes = allQuotes.concat(this.userQuotes);

    if (allQuotes.length === 0) {
      this.showNotification('لا توجد مقولات متاحة', 'error');
      return;
    }

    const randomQuote = allQuotes[Math.floor(Math.random() * allQuotes.length)];
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content random-quote-modal">
        <div class="modal-header">
          <h2>🎲 مقولة عشوائية</h2>
          <button class="close-btn" onclick="this.closest('.modal').remove()">✕</button>
        </div>
        <div class="modal-body">
          <div class="quote-text large">${randomQuote.text}</div>
          ${randomQuote.author ? `<div class="quote-author large">- ${randomQuote.author}</div>` : ''}
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Remove modal when clicking outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  showFavorites() {
    this.currentCategory = 'favorites';
    document.getElementById('categorySelect').value = 'all';
    this.displayQuotes();
  }

  toggleFavorite(index, category) {
    let quote;
    
    if (category === 'user') {
      quote = this.userQuotes[index];
    } else if (category === 'favorites') {
      quote = this.favorites[index];
    } else if (category === 'all') {
      // Need to find the quote in the displayed list
      const container = document.getElementById('quotesContainer');
      const quoteCard = container.children[index];
      const quoteText = quoteCard.querySelector('.quote-text').textContent;
      
      // Find the quote in all categories
      let foundQuote = null;
      Object.values(this.quotes).forEach(categoryQuotes => {
        const found = categoryQuotes.find(q => q.text === quoteText);
        if (found) foundQuote = found;
      });
      
      if (!foundQuote) {
        foundQuote = this.userQuotes.find(q => q.text === quoteText);
      }
      
      quote = foundQuote;
    } else {
      quote = this.quotes[category][index];
    }

    if (!quote) return;

    const favoriteIndex = this.favorites.findIndex(fav => fav.text === quote.text);
    
    if (favoriteIndex > -1) {
      this.favorites.splice(favoriteIndex, 1);
      this.showNotification('تم إزالة المقولة من المفضلة', 'info');
    } else {
      this.favorites.push(quote);
      this.showNotification('تم إضافة المقولة للمفضلة', 'success');
    }
    
    localStorage.setItem('favorites', JSON.stringify(this.favorites));
    this.displayQuotes();
  }

  isFavorite(quote) {
    return this.favorites.some(fav => fav.text === quote.text);
  }

  shareQuote(index, category) {
    let quote;
    
    if (category === 'user') {
      quote = this.userQuotes[index];
    } else if (category === 'favorites') {
      quote = this.favorites[index];
    } else {
      quote = this.quotes[category][index];
    }

    if (!quote) return;

    const shareText = `"${quote.text}"${quote.author ? `\n- ${quote.author}` : ''}\n\nمن تطبيق مقولات وحكم`;
    
    if (navigator.share) {
      navigator.share({
        title: 'مقولة وحكمة',
        text: shareText
      });
    } else {
      this.copyToClipboard(shareText);
      this.showNotification('تم نسخ المقولة للحافظة', 'success');
    }
  }

  copyQuote(index, category) {
    let quote;
    
    if (category === 'user') {
      quote = this.userQuotes[index];
    } else if (category === 'favorites') {
      quote = this.favorites[index];
    } else {
      quote = this.quotes[category][index];
    }

    if (!quote) return;

    const copyText = `"${quote.text}"${quote.author ? `\n- ${quote.author}` : ''}`;
    this.copyToClipboard(copyText);
    this.showNotification('تم نسخ المقولة', 'success');
  }

  copyToClipboard(text) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  }

  exportFavorites() {
    if (this.favorites.length === 0) {
      this.showNotification('لا توجد مقولات مفضلة للتصدير', 'error');
      return;
    }

    const exportData = {
      favorites: this.favorites,
      exportDate: new Date().toISOString(),
      appName: 'مقولات وحكم'
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `مقولاتي_المفضلة_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    this.showNotification('تم تصدير المقولات المفضلة', 'success');
  }

  setupNotifications() {
    if ('Notification' in window && 'serviceWorker' in navigator) {
      const notificationBtn = document.createElement('button');
      notificationBtn.id = 'notificationBtn';
      notificationBtn.innerHTML = 'تفعيل الإشعارات 🔔';
      notificationBtn.className = 'notification-toggle-btn';
      
      document.querySelector('.action-buttons').appendChild(notificationBtn);
      
      notificationBtn.addEventListener('click', () => {
        this.requestNotificationPermission();
      });

      // Check current permission status
      if (Notification.permission === 'granted') {
        notificationBtn.innerHTML = 'الإشعارات مفعلة ✅';
        notificationBtn.disabled = true;
      }
    }
  }

  async requestNotificationPermission() {
    const permission = await Notification.requestPermission();
    const btn = document.getElementById('notificationBtn');
    
    if (permission === 'granted') {
      btn.innerHTML = 'الإشعارات مفعلة ✅';
      btn.disabled = true;
      this.showNotification('تم تفعيل الإشعارات اليومية!', 'success');
      this.scheduleDailyNotification();
    } else {
      this.showNotification('لم يتم تفعيل الإشعارات', 'error');
    }
  }

  scheduleDailyNotification() {
    // Schedule daily notification at 9 AM
    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(9, 0, 0, 0);
    
    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }
    
    const timeUntilNotification = scheduledTime.getTime() - now.getTime();
    
    setTimeout(() => {
      this.sendDailyNotification();
      // Schedule for next day
      setInterval(() => {
        this.sendDailyNotification();
      }, 24 * 60 * 60 * 1000);
    }, timeUntilNotification);
  }

  sendDailyNotification() {
    if (Notification.permission === 'granted') {
      let allQuotes = [];
      Object.values(this.quotes).forEach(categoryQuotes => {
        allQuotes = allQuotes.concat(categoryQuotes);
      });
      
      if (allQuotes.length > 0) {
        const randomQuote = allQuotes[Math.floor(Math.random() * allQuotes.length)];
        
        new Notification('🌅 حكمة اليوم', {
          body: randomQuote.text,
          icon: 'icon-192.png',
          badge: 'icon-192.png'
        });
      }
    }
  }

  showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.remove('hidden');
    
    setTimeout(() => {
      notification.classList.add('hidden');
    }, 3000);
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.app = new QuotesApp();
});

// Register service worker for PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('SW registered: ', registration);
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}