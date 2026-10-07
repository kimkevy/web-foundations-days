// Select DOM elements
const noteText = document.getElementById('note-text');
const charCount = document.getElementById('char-count');
const wordCount = document.getElementById('word-count');
const clearBtn = document.getElementById('clear-btn');
const themeToggle = document.getElementById('theme-toggle');

// Update character and word counters and highlight classes
function updateCounts() {
  const text = noteText.value;
  const numChars = text.length;

  // Word count: split by whitespace if not empty
  const trimmed = text.trim();
  const numWords = trimmed === '' ? 0 : trimmed.split(/\s+/).length;

  // Update counter text content
  charCount.textContent = `${numChars} / 200 characters`;
  wordCount.textContent = `${numWords} words`;

  // Warning and over classes for character limit
  if (numChars > 200) {
    charCount.classList.add('over');
    charCount.classList.remove('warning');
  } else if (numChars > 180) {
    charCount.classList.add('warning');
    charCount.classList.remove('over');
  } else {
    charCount.classList.remove('warning', 'over');
  }
}

// Function to save current draft to localStorage
function saveDraft() {
  localStorage.setItem('note-draft', noteText.value);
}

// Function to clear textarea, draft, and update counters
function clearEverything() {
  noteText.value = '';
  localStorage.removeItem('note-draft');
  updateCounts();
}

// Event listener for input on textarea
noteText.addEventListener('input', () => {
  updateCounts();
  saveDraft();
});

// Event listener for Escape key inside textarea
noteText.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    clearEverything();
  }
});

// Event listener for Clear button
clearBtn.addEventListener('click', clearEverything);

// Event listener for Theme Toggle button
themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  const isDark = document.body.classList.contains('dark');
  themeToggle.textContent = isDark ? 'Light mode' : 'Dark mode';
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
});

// Initialize state when page loads
function init() {
  // Restore saved theme
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark');
    themeToggle.textContent = 'Light mode';
  } else {
    document.body.classList.remove('dark');
    themeToggle.textContent = 'Dark mode';
  }

  // Restore saved draft
  const savedDraft = localStorage.getItem('note-draft');
  if (savedDraft !== null) {
    noteText.value = savedDraft;
  }

  // Update counts on load
  updateCounts();
}

// Execute initialization
init();