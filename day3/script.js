let notes = [
  { id: 1, text: "Buy milk and bread", category: "personal" },
  { id: 2, text: "Finish the Day 3 assignment", category: "study" },
  { id: 3, text: "Email the project report to Grace", category: "work" },
  { id: 4, text: "Revise JavaScript arrays", category: "study" },
  { id: 5, text: "Call mum", category: "personal" },
];

function searchNotes(word) {
  if (!word) return [];
  const lowerWord = word.toLowerCase();
  return notes.filter(note => note.text.toLowerCase().includes(lowerWord));
}

function longestNote() {
  if (notes.length === 0) return null;
  let maxNote = notes[0];
  for (let i = 1; i < notes.length; i++) {
    if (notes[i].text.length > maxNote.text.length) {
      maxNote = notes[i];
    }
  }
  return maxNote;
}

function countByCategory() {
  const counts = {};
  for (const note of notes) {
    counts[note.category] = (counts[note.category] || 0) + 1;
  }
  return counts;
}

function getSummary() {
  const total = notes.length;
  const word = total === 1 ? "note" : "notes";
  const counts = countByCategory();
  const parts = Object.entries(counts)
    .map(([cat, count]) => `${count} ${cat}`)
    .join(", ");
  return `${total} ${word}${parts ? `: ${parts}` : ""}.`;
}

function isDuplicate(text) {
  if (typeof text !== "string") return false;
  const cleanText = text.trim().toLowerCase();
  return notes.some(note => note.text.trim().toLowerCase() === cleanText);
}

function addNote(text, category) {
  const allowedCategories = ["personal", "work", "study"];

  if (typeof text !== "string" || text.trim().length < 1 || text.trim().length > 200) {
    console.log("Failed to add note: Note text must be between 1 and 200 characters.");
    return false;
  }

  if (!allowedCategories.includes(category)) {
    console.log("Failed to add note: Category must be one of 'personal', 'work', or 'study'.");
    return false;
  }

  if (isDuplicate(text)) {
    console.log("Failed to add note: Duplicate note text already exists.");
    return false;
  }

  const nextId = notes.length > 0 ? Math.max(...notes.map(n => n.id)) + 1 : 1;
  notes.push({ id: nextId, text: text.trim(), category });
  return true;
}

// --- TESTING THE FUNCTIONS ---

console.log("--- 1. searchNotes ---");
// Normal case: search for existing word ignoring case
console.log(searchNotes("report"));
// Expected output: [ { id: 3, text: "Email the project report to Grace", category: "work" } ]

// Edge case: search with no matching results
console.log(searchNotes("python"));
// Expected output: []

console.log("\n--- 2. longestNote ---");
// Normal case: returns the note with maximum characters
console.log(longestNote());
// Expected output: { id: 3, text: "Email the project report to Grace", category: "work" }

// Edge case: returns null when notes array is empty
const savedNotes1 = notes;
notes = [];
console.log(longestNote());
// Expected output: null
notes = savedNotes1;

console.log("\n--- 3. countByCategory ---");
// Normal case: counts per category
console.log(countByCategory());
// Expected output: { personal: 2, study: 2, work: 1 }

// Edge case: empty notes array returns empty object
const savedNotes2 = notes;
notes = [];
console.log(countByCategory());
// Expected output: {}
notes = savedNotes2;

console.log("\n--- 4. getSummary ---");
// Normal case: returns summary sentence with plural "notes"
console.log(getSummary());
// Expected output: "5 notes: 2 personal, 2 study, 1 work."

// Edge case: returns summary sentence with singular "note" when exactly 1 note exists
const savedNotes3 = notes;
notes = [{ id: 1, text: "Buy milk and bread", category: "personal" }];
console.log(getSummary());
// Expected output: "1 note: 1 personal."
notes = savedNotes3;

console.log("\n--- 5. isDuplicate ---");
// Normal case: detects existing duplicate note text (ignoring case and extra whitespace)
console.log(isDuplicate("   CALL MUM   "));
// Expected output: true

// Edge case: returns false for new unique note text
console.log(isDuplicate("Go to the gym"));
// Expected output: false

console.log("\n--- 6. addNote ---");
// Normal case: successfully adds a valid new note
console.log(addNote("Go for a morning run", "personal"));
// Expected output: true

// Edge case 1: fails when adding a duplicate note
console.log(addNote("Call mum", "personal"));
// Expected output: false (and logs reason: "Failed to add note: Duplicate note text already exists.")

// Edge case 2: fails when category is invalid
console.log(addNote("Learn TypeScript", "hobbies"));
// Expected output: false (and logs reason: "Failed to add note: Category must be one of 'personal', 'work', or 'study'.")

// Edge case 3: fails when text length is out of 1-200 range
console.log(addNote("", "work"));
// Expected output: false (and logs reason: "Failed to add note: Note text must be between 1 and 200 characters.")