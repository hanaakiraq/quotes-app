// Arabic Quotes App - Main JavaScript File

// تطبيق الأقوال والحكم العربية
class QuotesApp {
    constructor() {
        this.quotes = {};
        this.favorites = JSON.parse(localStorage.getItem('favorites')) || [];
        this.userQuotes = JSON.parse(localStorage.getItem('userQuotes')) || [];
        this.currentCategory = 'all';
        this.searchTerm = '';
        this.notificationPermission = false;
        
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
        document.getElementById('addQuoteBtn')?.addEventListener('click', () => {
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
        document.getElementById('closeModal')?.addEventListener('click', () => {
            this.hideAddQuoteModal();
        });

        document.getElementById('cancelAdd')?.addEventListener('click', () => {
            this.hideAddQuoteModal();
        });

        document.getElementById('addQuoteForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.addUserQuote();
        });

        // Close modal when clicking outside
        document.getElementById('addQuoteModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'addQuoteModal') {
                this.hideAddQuoteModal();
            }
        });
    }

    setupNotifications() {
        if ('Notification' in window && 'serviceWorker' in navigator) {
            const notificationBtn = document.createElement('button');
            notificationBtn.id = 'notificationBtn';
            notificationBtn.innerHTML = 'تفعيل الإشعارات 🔔';
            notificationBtn.addEventListener('click', () => this.requestNotificationPermission());
            
            document.querySelector('.action-buttons').appendChild(notificationBtn);
            
            this.updateNotificationButton();
        }
    }

    async requestNotificationPermission() {
        if (Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            this.notificationPermission = permission === 'granted';
        } else if (Notification.permission === 'granted') {
            this.notificationPermission = !this.notificationPermission;
        }
        
        this.updateNotificationButton();
        this.scheduleNotifications();
    }

    updateNotificationButton() {
        const btn = document.getElementById('notificationBtn');
        if (btn) {
            if (Notification.permission === 'granted' && this.notificationPermission) {
                btn.innerHTML = 'إيقاف الإشعارات 🔕';
                btn.classList.add('active');
            } else {
                btn.innerHTML = 'تفعيل الإشعارات 🔔';
                btn.classList.remove('active');
            }
        }
    }

    scheduleNotifications() {
        if (this.notificationPermission && Notification.permission === 'granted') {
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
                setInterval(() => this.sendDailyNotification(), 24 * 60 * 60 * 1000);
            }, timeUntilNotification);
        }
    }

    sendDailyNotification() {
        const randomQuote = this.getRandomQuote();
        if (randomQuote) {
            new Notification('حكمة اليوم 📚', {
                body: randomQuote.text,
                icon: 'icon-192.png',
                badge: 'icon-192.png'
            });
        }
    }

    displayQuotes() {
        const container = document.getElementById('quotesContainer');
        const quotesCount = document.getElementById('quotesCount');
        
        let quotesToShow = [];

        if (this.currentCategory === 'all') {
            // Show all quotes from all categories
            Object.values(this.quotes).forEach(categoryQuotes => {
                quotesToShow = quotesToShow.concat(categoryQuotes);
            });
            quotesToShow = quotesToShow.concat(this.userQuotes);
        } else if (this.currentCategory === 'user') {
            quotesToShow = this.userQuotes;
        } else if (this.quotes[this.currentCategory]) {
            quotesToShow = this.quotes[this.currentCategory];
        }

        // Apply search filter
        if (this.searchTerm) {
            quotesToShow = quotesToShow.filter(quote => 
                quote.text.includes(this.searchTerm) || 
                (quote.author && quote.author.includes(this.searchTerm))
            );
        }

        // Update count
        quotesCount.textContent = `${quotesToShow.length} مقولة`;

        // Display quotes
        if (quotesToShow.length === 0) {
            container.innerHTML = '<p class="welcome-message">لا توجد مقولات تطابق البحث</p>';
            return;
        }

        container.innerHTML = quotesToShow.map(quote => this.createQuoteHTML(quote)).join('');
        
        // Add event listeners for favorite buttons
        container.querySelectorAll('.favorite-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const quoteText = e.target.dataset.quote;
                this.toggleFavorite(quoteText);
                e.target.classList.toggle('favorited');
                e.target.textContent = e.target.classList.contains('favorited') ? '⭐' : '☆';
            });
        });

        // Add event listeners for delete buttons (user quotes only)
        container.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const quoteText = e.target.dataset.quote;
                this.deleteUserQuote(quoteText);
            });
        });
    }

    createQuoteHTML(quote) {
        const isFavorited = this.favorites.some(fav => fav.text === quote.text);
        const isUserQuote = this.userQuotes.some(userQuote => userQuote.text === quote.text);
        
        return `
            <div class="quote-card">
                <p class="quote-text">"${quote.text}"</p>
                ${quote.author ? `<p class="quote-author">- ${quote.author}</p>` : ''}
                <div class="quote-actions">
                    <button class="favorite-btn ${isFavorited ? 'favorited' : ''}" 
                            data-quote="${quote.text}">
                        ${isFavorited ? '⭐' : '☆'}
                    </button>
                    ${isUserQuote ? `<button class="delete-btn" data-quote="${quote.text}">🗑️</button>` : ''}
                </div>
            </div>
        `;
    }

    toggleFavorite(quoteText) {
        const existingIndex = this.favorites.findIndex(fav => fav.text === quoteText);
        
        if (existingIndex > -1) {
            this.favorites.splice(existingIndex, 1);
        } else {
            // Find the full quote object
            let fullQuote = null;
            
            // Search in all categories
            Object.values(this.quotes).forEach(categoryQuotes => {
                const found = categoryQuotes.find(q => q.text === quoteText);
                if (found) fullQuote = found;
            });
            
            // Search in user quotes
            if (!fullQuote) {
                fullQuote = this.userQuotes.find(q => q.text === quoteText);
            }
            
            if (fullQuote) {
                this.favorites.push(fullQuote);
            }
        }
        
        localStorage.setItem('favorites', JSON.stringify(this.favorites));
        this.showNotification(existingIndex > -1 ? 'تم إزالة المقولة من المفضلة' : 'تم إضافة المقولة للمفضلة');
    }

    showFavorites() {
        this.currentCategory = 'favorites';
        document.getElementById('categorySelect').value = 'all';
        
        const container = document.getElementById('quotesContainer');
        const quotesCount = document.getElementById('quotesCount');
        
        quotesCount.textContent = `${this.favorites.length} مقولة مفضلة`;
        
        if (this.favorites.length === 0) {
            container.innerHTML = '<p class="welcome-message">لا توجد مقولات مفضلة بعد</p>';
            return;
        }
        
        container.innerHTML = this.favorites.map(quote => this.createQuoteHTML(quote)).join('');
        
        // Add event listeners
        container.querySelectorAll('.favorite-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const quoteText = e.target.dataset.quote;
                this.toggleFavorite(quoteText);
                this.showFavorites(); // Refresh the favorites view
            });
        });
    }

    showRandomQuote() {
        let allQuotes = [];
        Object.values(this.quotes).forEach(categoryQuotes => {
            allQuotes = allQuotes.concat(categoryQuotes);
        });
        allQuotes = allQuotes.concat(this.userQuotes);
        
        if (allQuotes.length === 0) return;
        
        const randomQuote = allQuotes[Math.floor(Math.random() * allQuotes.length)];
        
        const container = document.getElementById('quotesContainer');
        container.innerHTML = `
            <div class="random-quote-container">
                <h2>🎲 مقولة عشوائية</h2>
                ${this.createQuoteHTML(randomQuote)}
                <button id="anotherRandomBtn" class="action-btn">مقولة أخرى 🔄</button>
            </div>
        `;
        
        document.getElementById('anotherRandomBtn').addEventListener('click', () => {
            this.showRandomQuote();
        });
        
        // Add favorite functionality
        container.querySelector('.favorite-btn').addEventListener('click', (e) => {
            const quoteText = e.target.dataset.quote;
            this.toggleFavorite(quoteText);
            e.target.classList.toggle('favorited');
            e.target.textContent = e.target.classList.contains('favorited') ? '⭐' : '☆';
        });
    }

    getRandomQuote() {
        let allQuotes = [];
        Object.values(this.quotes).forEach(categoryQuotes => {
            allQuotes = allQuotes.concat(categoryQuotes);
        });
        allQuotes = allQuotes.concat(this.userQuotes);
        
        if (allQuotes.length === 0) return null;
        return allQuotes[Math.floor(Math.random() * allQuotes.length)];
    }

    exportFavorites() {
        if (this.favorites.length === 0) {
            this.showNotification('لا توجد مقولات مفضلة للتصدير');
            return;
        }
        
        const exportData = {
            favorites: this.favorites,
            exportDate: new Date().toISOString(),
            totalCount: this.favorites.length
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `مقولاتي_المفضلة_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        this.showNotification('تم تصدير المقولات المفضلة بنجاح');
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
            this.showNotification('يرجى ملء جميع الحقول المطلوبة');
            return;
        }
        
        const newQuote = {
            text: text,
            category: category,
            author: author || null,
            userAdded: true,
            dateAdded: new Date().toISOString()
        };
        
        this.userQuotes.push(newQuote);
        localStorage.setItem('userQuotes', JSON.stringify(this.userQuotes));
        
        this.hideAddQuoteModal();
        this.showNotification('تم إضافة المقولة بنجاح');
        
        // If currently viewing user quotes, refresh the display
        if (this.currentCategory === 'user') {
            this.displayQuotes();
        }
    }

    deleteUserQuote(quoteText) {
        if (confirm('هل أنت متأكد من حذف هذه المقولة؟')) {
            this.userQuotes = this.userQuotes.filter(quote => quote.text !== quoteText);
            localStorage.setItem('userQuotes', JSON.stringify(this.userQuotes));
            
            // Also remove from favorites if it exists there
            this.favorites = this.favorites.filter(quote => quote.text !== quoteText);
            localStorage.setItem('favorites', JSON.stringify(this.favorites));
            
            this.displayQuotes();
            this.showNotification('تم حذف المقولة');
        }
    }

    showNotification(message) {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.classList.remove('hidden');
        
        setTimeout(() => {
            notification.classList.add('hidden');
        }, 3000);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new QuotesApp();
});