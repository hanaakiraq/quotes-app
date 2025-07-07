// بيانات التطبيق
let allQuotes = [];
let currentQuotes = [];
let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
let userQuotes = JSON.parse(localStorage.getItem('userQuotes')) || [];

// عناصر DOM
const categorySelect = document.getElementById("categorySelect");
const quotesContainer = document.getElementById("quotesContainer");
const quotesCount = document.getElementById("quotesCount");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const addQuoteBtn = document.getElementById("addQuoteBtn");
const randomQuoteBtn = document.getElementById("randomQuoteBtn");
const favoriteBtn = document.getElementById("favoriteBtn");
const exportBtn = document.getElementById("exportBtn");
const addQuoteModal = document.getElementById("addQuoteModal");
const addQuoteForm = document.getElementById("addQuoteForm");
const closeModal = document.getElementById("closeModal");
const cancelAdd = document.getElementById("cancelAdd");
const notification = document.getElementById("notification");

// تحميل البيانات من الملفات
async function loadAllData() {
  try {
    const files = [
      'wisdom.json', 'success.json', 'friendship.json', 'love.json',
      'patience.json', 'knowledge.json', 'motivation.json', 'life.json',
      'ethics.json', 'family.json', 'hope.json', 'time.json',
      'health.json', 'work.json', 'peace.json', 'custom.json'
    ];

    const promises = files.map(async (file) => {
      try {
        const response = await fetch(`data/${file}`);
        if (!response.ok) throw new Error(`Failed to load ${file}`);
        const data = await response.json();
        const category = file.replace('.json', '');
        return { category, quotes: data };
      } catch (error) {
        console.warn(`Could not load ${file}:`, error);
        return { category: file.replace('.json', ''), quotes: [] };
      }
    });

    const results = await Promise.all(promises);
    
    // تنظيم البيانات
    allQuotes = {};
    results.forEach(({ category, quotes }) => {
      allQuotes[category] = quotes.map((quote, index) => ({
        id: `${category}_${index}`,
        text: typeof quote === 'string' ? quote : quote.text || quote,
        author: typeof quote === 'object' ? quote.author : null,
        category: category
      }));
    });

    // إضافة مقولات المستخدم
    allQuotes.user = userQuotes;

    console.log('تم تحميل البيانات بنجاح:', allQuotes);
    
  } catch (error) {
    console.error('خطأ في تحميل البيانات:', error);
    showNotification('حدث خطأ في تحميل البيانات', 'error');
  }
}

// عرض المقولات
function displayQuotes(quotes) {
  quotesContainer.innerHTML = "";
  
  if (!quotes || quotes.length === 0) {
    quotesContainer.innerHTML = '<p class="welcome-message">لا توجد مقولات في هذا الباب</p>';
    updateQuotesCount(0);
    return;
  }

  quotes.forEach(quote => {
    const card = createQuoteCard(quote);
    quotesContainer.appendChild(card);
  });

  updateQuotesCount(quotes.length);
}

// إنشاء بطاقة مقولة
function createQuoteCard(quote) {
  const card = document.createElement("div");
  card.className = "quote-card";
  
  if (quote.category === 'user') {
    card.classList.add('user-quote');
  }

  const isFavorite = favorites.some(fav => fav.id === quote.id);
  
  card.innerHTML = `
    ${quote.category === 'user' ? '<div class="author-badge">مقولة شخصية</div>' : ''}
    ${getCategoryBadge(quote.category)}
    <div class="quote-text">${quote.text}</div>
    ${quote.author ? `<div class="quote-author">- ${quote.author}</div>` : ''}
    <div class="quote-actions">
      <button onclick="toggleFavorite('${quote.id}')" class="favorite-btn ${isFavorite ? 'favorite' : ''}" title="إضافة للمفضلة">
        ${isFavorite ? '⭐' : '☆'}
      </button>
      <button onclick="shareQuote('${quote.id}')" title="مشاركة">📤</button>
      ${quote.category === 'user' ? `<button onclick="deleteUserQuote('${quote.id}')" class="delete-btn" title="حذف">🗑️</button>` : ''}
    </div>
  `;

  return card;
}

// الحصول على شارة الفئة
function getCategoryBadge(category) {
  const categoryNames = {
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

  const name = categoryNames[category] || category;
  return `<div class="category-badge">${name}</div>`;
}

// تحديث عدد المقولات
function updateQuotesCount(count) {
  quotesCount.textContent = `${count} مقولة`;
}

// تحميل مقولات حسب الفئة
function loadQuotes(category) {
  if (category === 'all') {
    // عرض جميع المقولات
    currentQuotes = [];
    Object.values(allQuotes).forEach(categoryQuotes => {
      currentQuotes = currentQuotes.concat(categoryQuotes);
    });
  } else if (category === 'favorites') {
    currentQuotes = favorites;
  } else {
    currentQuotes = allQuotes[category] || [];
  }

  displayQuotes(currentQuotes);
}

// البحث في المقولات
function searchQuotes(searchTerm) {
  if (!searchTerm.trim()) {
    loadQuotes(categorySelect.value);
    return;
  }

  const filtered = currentQuotes.filter(quote => 
    quote.text.includes(searchTerm) || 
    (quote.author && quote.author.includes(searchTerm))
  );

  displayQuotes(filtered);
}

// إضافة/إزالة من المفضلة
function toggleFavorite(quoteId) {
  const quote = findQuoteById(quoteId);
  if (!quote) return;

  const existingIndex = favorites.findIndex(fav => fav.id === quoteId);
  
  if (existingIndex > -1) {
    favorites.splice(existingIndex, 1);
    showNotification('تم إزالة المقولة من المفضلة');
  } else {
    favorites.push(quote);
    showNotification('تم إضافة المقولة للمفضلة');
  }

  localStorage.setItem('favorites', JSON.stringify(favorites));
  
  // إعادة عرض المقولات إذا كنا في صفحة المفضلة
  if (categorySelect.value === 'favorites') {
    loadQuotes('favorites');
  } else {
    // تحديث أيقونة المفضلة فقط
    const card = document.querySelector(`[onclick="toggleFavorite('${quoteId}')"]`);
    if (card) {
      const isFavorite = favorites.some(fav => fav.id === quoteId);
      card.textContent = isFavorite ? '⭐' : '☆';
      card.classList.toggle('favorite', isFavorite);
    }
  }
}

// البحث عن مقولة بالمعرف
function findQuoteById(quoteId) {
  for (const categoryQuotes of Object.values(allQuotes)) {
    const quote = categoryQuotes.find(q => q.id === quoteId);
    if (quote) return quote;
  }
  return null;
}

// مشاركة مقولة
function shareQuote(quoteId) {
  const quote = findQuoteById(quoteId);
  if (!quote) return;

  const text = `"${quote.text}"${quote.author ? `\n- ${quote.author}` : ''}`;
  
  if (navigator.share) {
    navigator.share({
      title: 'مقولة وحكمة',
      text: text
    });
  } else {
    navigator.clipboard.writeText(text).then(() => {
      showNotification('تم نسخ المقولة');
    });
  }
}

// حذف مقولة المستخدم
function deleteUserQuote(quoteId) {
  if (confirm('هل أنت متأكد من حذف هذه المقولة؟')) {
    userQuotes = userQuotes.filter(quote => quote.id !== quoteId);
    allQuotes.user = userQuotes;
    localStorage.setItem('userQuotes', JSON.stringify(userQuotes));
    
    // إزالة من المفضلة أيضاً
    favorites = favorites.filter(fav => fav.id !== quoteId);
    localStorage.setItem('favorites', JSON.stringify(favorites));
    
    loadQuotes(categorySelect.value);
    showNotification('تم حذف المقولة');
  }
}

// مقولة عشوائية
function showRandomQuote() {
  const allQuotesArray = [];
  Object.values(allQuotes).forEach(categoryQuotes => {
    allQuotesArray.push(...categoryQuotes);
  });

  if (allQuotesArray.length === 0) return;

  const randomQuote = allQuotesArray[Math.floor(Math.random() * allQuotesArray.length)];
  displayQuotes([randomQuote]);
}

// إضافة مقولة جديدة
function addNewQuote(text, category, author) {
  const newQuote = {
    id: `user_${Date.now()}`,
    text: text,
    author: author || null,
    category: 'user'
  };

  userQuotes.push(newQuote);
  allQuotes.user = userQuotes;
  localStorage.setItem('userQuotes', JSON.stringify(userQuotes));
  
  showNotification('تم إضافة المقولة بنجاح');
  
  // الانتقال لصفحة مقولاتي
  categorySelect.value = 'user';
  loadQuotes('user');
}

// تصدير المفضلة
function exportFavorites() {
  if (favorites.length === 0) {
    showNotification('لا توجد مقولات مفضلة للتصدير', 'error');
    return;
  }

  const text = favorites.map(quote => 
    `"${quote.text}"${quote.author ? `\n- ${quote.author}` : ''}`
  ).join('\n\n---\n\n');

  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'مقولاتي_المفضلة.txt';
  a.click();
  URL.revokeObjectURL(url);
  
  showNotification('تم تصدير المفضلة بنجاح');
}

// عرض الإشعار
function showNotification(message, type = 'success') {
  notification.textContent = message;
  notification.className = `notification ${type}`;
  notification.classList.remove('hidden');
  
  setTimeout(() => {
    notification.classList.add('hidden');
  }, 3000);
}

// إعداد الإشعارات اليومية
function setupNotifications() {
  if ('Notification' in window && 'serviceWorker' in navigator) {
    const notificationBtn = document.createElement('button');
    notificationBtn.id = 'notificationBtn';
    notificationBtn.innerHTML = 'تفعيل الإشعارات 🔔';
    notificationBtn.onclick = requestNotificationPermission;
    
    document.querySelector('.action-buttons').appendChild(notificationBtn);
  }
}

// طلب إذن الإشعارات
async function requestNotificationPermission() {
  const permission = await Notification.requestPermission();
  
  if (permission === 'granted') {
    showNotification('تم تفعيل الإشعارات اليومية');
    scheduleNotifications();
    
    const btn = document.getElementById('notificationBtn');
    btn.innerHTML = 'الإشعارات مفعلة ✅';
    btn.disabled = true;
  } else {
    showNotification('لم يتم منح إذن الإشعارات', 'error');
  }
}

// جدولة الإشعارات
function scheduleNotifications() {
  // إشعار يومي في الساعة 9 صباحاً
  setInterval(() => {
    const now = new Date();
    if (now.getHours() === 9 && now.getMinutes() === 0) {
      sendDailyNotification();
    }
  }, 60000); // فحص كل دقيقة
}

// إرسال إشعار يومي
function sendDailyNotification() {
  const allQuotesArray = [];
  Object.values(allQuotes).forEach(categoryQuotes => {
    allQuotesArray.push(...categoryQuotes);
  });

  if (allQuotesArray.length === 0) return;

  const randomQuote = allQuotesArray[Math.floor(Math.random() * allQuotesArray.length)];
  
  new Notification('حكمة اليوم 📚', {
    body: randomQuote.text,
    icon: 'icon-192.png'
  });
}

// معالجات الأحداث
categorySelect.addEventListener('change', (e) => {
  loadQuotes(e.target.value);
});

searchBtn.addEventListener('click', () => {
  searchQuotes(searchInput.value);
});

searchInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    searchQuotes(searchInput.value);
  }
});

addQuoteBtn.addEventListener('click', () => {
  addQuoteModal.classList.remove('hidden');
});

randomQuoteBtn.addEventListener('click', showRandomQuote);

favoriteBtn.addEventListener('click', () => {
  categorySelect.value = 'favorites';
  loadQuotes('favorites');
});

exportBtn.addEventListener('click', exportFavorites);

closeModal.addEventListener('click', () => {
  addQuoteModal.classList.add('hidden');
});

cancelAdd.addEventListener('click', () => {
  addQuoteModal.classList.add('hidden');
});

addQuoteForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const text = document.getElementById('quoteText').value.trim();
  const category = document.getElementById('quoteCategory').value;
  const author = document.getElementById('quoteAuthor').value.trim();
  
  if (text) {
    addNewQuote(text, category, author);
    addQuoteForm.reset();
    addQuoteModal.classList.add('hidden');
  }
});

// إغلاق النموذج عند النقر خارجه
addQuoteModal.addEventListener('click', (e) => {
  if (e.target === addQuoteModal) {
    addQuoteModal.classList.add('hidden');
  }
});

// تهيئة التطبيق
async function initApp() {
  quotesContainer.innerHTML = '<div class="loading">جارٍ تحميل المقولات...</div>';
  
  await loadAllData();
  setupNotifications();
  
  // عرض رسالة ترحيب
  quotesContainer.innerHTML = '<p class="welcome-message">اختر باباً من القائمة أو ابحث في جميع المقولات</p>';
  updateQuotesCount(0);
}

// بدء التطبيق
initApp();

// جعل الدوال متاحة عالمياً
window.toggleFavorite = toggleFavorite;
window.shareQuote = shareQuote;
window.deleteUserQuote = deleteUserQuote;