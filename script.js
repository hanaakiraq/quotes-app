const categorySelect = document.getElementById("categorySelect");
const quotesContainer = document.getElementById("quotesContainer");

function loadQuotes(category) {
  quotesContainer.innerHTML = "جارٍ التحميل...";

  const file = category === "all" ? null : `data/${category}.json`;

  if (!file) {
    quotesContainer.innerHTML = "<p>يرجى اختيار باب من القائمة.</p>";
    return;
  }

  fetch(file)
    .then(res => res.json())
    .then(data => displayQuotes(data))
    .catch(err => {
      quotesContainer.innerHTML = "<p>حدث خطأ أثناء تحميل المقولات.</p>";
      console.error(err);
    });
}

function displayQuotes(quotes) {
  quotesContainer.innerHTML = "";

  quotes.forEach(q => {
    const card = document.createElement("div");
    card.className = "quote-card";
    card.textContent = q;
    quotesContainer.appendChild(card);
  });
}

categorySelect.addEventListener("change", () => {
  loadQuotes(categorySelect.value);
});
