# College Student Tool Patterns

## Technical Architecture

### Data Storage: localStorage

**All tools store data in localStorage.**

localStorage works locally during development AND on any static host (GitHub Pages, Netlify, Vercel) with zero configuration. Students can build, deploy, and share a working URL — data persists across refreshes on the same device and browser.

**Standard storage helpers — include in every tool:**

```javascript
// Save any data structure
const save = (key, data) =>
  localStorage.setItem(key, JSON.stringify(data));

// Load data, return fallback if nothing saved yet
const load = (key, fallback) =>
  JSON.parse(localStorage.getItem(key)) ?? fallback;

// Delete a specific key
const remove = (key) =>
  localStorage.removeItem(key);
```

**Key naming convention:**

```javascript
// Prefix with app name to avoid collisions
save('college-hub:expenses', expenseData);
save('college-hub:assignments', assignmentData);
save('college-hub:internships', internshipData);
save('college-hub:settings', settingsData);
```

**Default data structures:**

```javascript
// expenses
const defaultExpenses = {
  budget: {
    monthly: 5000,
    categories: {
      food: 2000,
      transport: 800,
      academic: 500,
      personal: 700,
      social: 500,
      subscriptions: 500
    }
  },
  transactions: []
};

// assignments
const defaultAssignments = {
  assignments: []
};

// internships
const defaultInternships = {
  applications: [],
  toApply: []
};
```

**Full usage pattern:**

```javascript
// On app load — pull data or use defaults
let expenseData = load('college-hub:expenses', defaultExpenses);

// After any change — save immediately
function addTransaction(transaction) {
  expenseData.transactions.push(transaction);
  save('college-hub:expenses', expenseData);
  renderExpenses(); // UI updates instantly
}

// Deletion
function deleteTransaction(id) {
  expenseData.transactions = expenseData.transactions.filter(t => t.id !== id);
  save('college-hub:expenses', expenseData);
  renderExpenses();
}
```

**Auto-save on every change — never show a Save button:**

```javascript
// Pattern: save immediately after every mutation
// Students should never have to think about saving

function updateAssignmentStatus(id, status) {
  const assignment = assignmentData.assignments.find(a => a.id === id);
  if (assignment) {
    assignment.status = status;
    assignment.updatedAt = new Date().toISOString();
    save('college-hub:assignments', assignmentData);
    renderAssignments();
  }
}
```

**Export backup (optional, not required):**

```javascript
// Let students download a backup if they want one
// This is a bonus feature, not the primary save mechanism
function exportBackup() {
  const backup = {
    expenses: load('college-hub:expenses', defaultExpenses),
    assignments: load('college-hub:assignments', defaultAssignments),
    internships: load('college-hub:internships', defaultInternships),
    exportedAt: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'college-hub-backup.json';
  a.click();
  URL.revokeObjectURL(url);
}
```

**Storage limitations to be aware of:**
- Data lives in the browser on that device. Opening the hosted app on a different laptop shows a fresh state.
- 5MB localStorage limit per domain — more than enough for a college hub.
- If a student clears browser data, localStorage clears too. The optional export backup above covers this.

**When students outgrow localStorage:**
- Multi-device sync needed → Firebase Firestore (free tier is generous)
- Team/shared data needed → Supabase (free tier, simple API)
- Both are natural next steps after the workshop, not workshop requirements.

**Folder structure:**

```
[name]-college-hub/
├── index.html              ← Main hub entry point
├── css/
│   └── shared-styles.css
├── academics/
│   ├── index.html
│   └── app.js
├── expenses/
│   ├── index.html
│   └── app.js
├── hostel/
│   ├── index.html
│   └── app.js
├── career/
│   ├── index.html
│   └── app.js
└── README.md
```

No `/data` folder needed. localStorage handles everything.

---

## Core Design Principles

College students are:
- **Busy** — tools must be quick to use
- **Mobile-first** — they use phones more than laptops
- **Inconsistent** — tools must survive irregular use
- **Overwhelmed** — tools must reduce mental load, not add

**Design for:** 5-second interactions, thumb-friendly UI, forgiving data entry

**Code constraints (Kiro must follow these):**
- Every form has ≤ 4 fields
- Every primary action is reachable in ≤ 2 taps
- Data saves automatically — no Save button required
- Page never reloads to show updated data
- All inputs have sensible defaults or placeholder values

---

## Pattern: Daily Dashboard

**The one tool to rule them all**

```
┌─────────────────────────────────────────────────────────────┐
│  🎓 My Day                              Today: Mon, Feb 19 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ☀️ MORNING CHECK-IN                                        │
│  How are you feeling? [😴] [😐] [😊] [🔥]                   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📚 TODAY'S CLASSES                                         │
│  09:00  Data Structures (Lab)           📍 Block A, 301   │
│  11:00  Computer Networks               📍 Block B, 201   │
│  14:00  Free                                               │
│  15:00  DBMS                            📍 Block A, 105   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ⚠️ DUE SOON                                                │
│  🔴 CN Assignment — Tomorrow                               │
│  🟡 DBMS Lab Report — In 3 days                            │
│  🟢 DSA Project — In 7 days                                │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  💰 BUDGET STATUS                                           │
│  This month: ₹2,340 / ₹5,000 spent                        │
│  ████████░░░░░░░░░░░░ 47% used, 12 days left              │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ✅ TODAY'S TASKS                                           │
│  [ ] Complete CN assignment                                │
│  [ ] Call home                                             │
│  [ ] Submit laundry                                        │
│  [+ Add task]                                              │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ⚡ QUICK ACTIONS                                           │
│  [💸 Log Expense] [📝 Quick Note] [✅ Add Task]            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Pattern: Expense Tracker (Mobile-First)

**Designed for one-thumb logging**

```
┌─────────────────────────────────────────────────────────────┐
│  💰 Log Expense                                    [Done]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Amount                                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ₹ 120                                              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Category (tap one)                                        │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐             │
│  │ 🍕     │ │ 🚌     │ │ 📚     │ │ 🎮     │             │
│  │ Food   │ │Transport│ │Academic│ │Personal│             │
│  └────────┘ └────────┘ └────────┘ └────────┘             │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐             │
│  │ 👥     │ │ 🏥     │ │ 📱     │ │ ❓     │             │
│  │ Social │ │ Health │ │Subscrip│ │ Other  │             │
│  └────────┘ └────────┘ └────────┘ └────────┘             │
│                                                             │
│  Payment                                                    │
│  [ UPI ]  [ Cash ]  [ Card ]                               │
│                                                             │
│  Note (optional)                                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Canteen lunch                                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [Add Expense]  ← saves to localStorage instantly         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Summary View:**
```
┌─────────────────────────────────────────────────────────────┐
│  💰 February Expenses                                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Total: ₹2,340 / ₹5,000 budget                             │
│                                                             │
│  🍕 Food          ₹980   ████████████░░░░ 42%              │
│  🚌 Transport     ₹450   █████░░░░░░░░░░░ 19%              │
│  📚 Academic      ₹320   ████░░░░░░░░░░░░ 14%              │
│  👥 Social        ₹280   ███░░░░░░░░░░░░░ 12%              │
│  🎮 Personal      ₹210   ██░░░░░░░░░░░░░░  9%              │
│  📱 Subscriptions ₹100   █░░░░░░░░░░░░░░░  4%              │
│                                                             │
│  Recent:                                                    │
│  Today      ₹120   Canteen lunch 🍕                        │
│  Today      ₹30    Auto to college 🚌                      │
│  Yesterday  ₹200   Pizza with friends 👥                   │
│                                                             │
│  [View All] [Set Budget] [Export Backup]                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Pattern: Assignment Tracker

```
┌─────────────────────────────────────────────────────────────┐
│  📋 Assignments                                 [+ Add]    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Filter: [All ▼]  [This Week]  [Overdue]                   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🔴 OVERDUE                                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ⚠️ OS Assignment 2               Due: Feb 15        │   │
│  │    Process scheduling problems                       │   │
│  │    [Mark Complete] [Extend]                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  🟡 THIS WEEK                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ CN Lab Report                    Due: Tomorrow      │   │
│  │ TCP/IP implementation                               │   │
│  │ Status: [░░░░░░░░░░] Not started                   │   │
│  │ [Start Working] [Mark Complete]                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ DBMS Project Phase 1             Due: Feb 22        │   │
│  │ ER diagram and schema design                        │   │
│  │ Status: [████████░░] 80% done                      │   │
│  │ [Continue] [Mark Complete]                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  🟢 LATER                                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ DSA Mini Project                 Due: Mar 5         │   │
│  │ Implement AVL tree operations                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Pattern: Notes Organizer

```
┌─────────────────────────────────────────────────────────────┐
│  📝 My Notes                              [📷 Quick Snap]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Search: [_____________________] [🔍]                      │
│                                                             │
│  SUBJECTS                                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ DSA      │ │ CN       │ │ DBMS     │ │ OS       │      │
│  │ 23 notes │ │ 18 notes │ │ 15 notes │ │ 12 notes │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  DSA NOTES                                         [+ Add] │
│                                                             │
│  📂 Trees                                                  │
│     📄 Binary Tree Basics              ⭐ Important        │
│     📄 AVL Rotations                                       │
│     🔗 Red-Black Trees (link)                             │
│                                                             │
│  📂 Graphs                                                 │
│     📄 BFS and DFS                     ⭐ Important        │
│     📄 Dijkstra's Algorithm                               │
│                                                             │
│  RECENT                                                     │
│  📄 CN Class Feb 19 — just added                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Pattern: Study Planner

```
┌─────────────────────────────────────────────────────────────┐
│  📚 Exam Prep: End Semester                                │
│  Exams start: March 15 (24 days away)                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  SUBJECT PROGRESS                                           │
│                                                             │
│  DSA          ████████████████░░░░ 80%    [Study Now]     │
│    ✅ Arrays, Linked Lists, Trees                          │
│    🔄 Graphs (in progress)                                 │
│    ⬜ DP, Greedy                                           │
│                                                             │
│  CN           ████████░░░░░░░░░░░░ 40%    [Study Now]     │
│    ✅ Physical, Data Link                                  │
│    🔄 Network Layer                                        │
│    ⬜ Transport, Application                               │
│                                                             │
│  OS           ████░░░░░░░░░░░░░░░░ 20%    [Study Now]     │
│    ✅ Process basics                                       │
│    ⬜ Scheduling, Deadlocks, Memory, Files                 │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ⚠️ ATTENTION NEEDED                                        │
│  OS is only 20% complete with 24 days left.                │
│  Suggested: Allocate 2 hours daily to OS.                  │
│                                                             │
│  [Generate Study Schedule] [Mark Topic Complete]           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Pattern: Hostel Room Board

```
┌─────────────────────────────────────────────────────────────┐
│  🏠 Room 304                                               │
│  Roommates: Rahul, Amit, Vijay                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📋 THIS WEEK'S DUTIES                                      │
│                                                             │
│  Cleaning     → Rahul (Mon-Wed), Amit (Thu-Sun)           │
│  Garbage      → Vijay                                      │
│  Electricity  → Everyone (split ₹340 each)                │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  💰 SHARED EXPENSES                                         │
│                                                             │
│  Water cans (Feb)     ₹200    [Paid by Rahul]             │
│  Electricity (Feb)    ₹1020   [Split pending]             │
│  Wifi recharge        ₹300    [Paid by Amit]              │
│                                                             │
│  Settlement:                                                │
│  • Vijay owes Rahul ₹120                                   │
│  • Vijay owes Amit ₹100                                    │
│                                                             │
│  [Add Expense] [Settle Up]                                 │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📢 ROOM ANNOUNCEMENTS                                      │
│                                                             │
│  • Hostel inspection on Friday — clean up!                 │
│  • Amit's parents visiting Saturday                        │
│  • Need to buy new broom                                   │
│                                                             │
│  [+ Add Note]                                              │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🧺 LAUNDRY STATUS                                          │
│                                                             │
│  Rahul: Sent Feb 17, Collect today                        │
│  Amit: Not pending                                         │
│  Vijay: Sent Feb 19, Collect Feb 21                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Pattern: Internship Tracker

```
┌─────────────────────────────────────────────────────────────┐
│  💼 Internship Hunt                                        │
│  Status: 8 Applied, 2 Interviews, 0 Offers (yet!)          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  PIPELINE                                                   │
│                                                             │
│  📥 TO APPLY (3)                                           │
│  • Google STEP — Deadline: Feb 28                          │
│  • Amazon SDE Intern — Rolling                             │
│  • Flipkart Intern — Mar 5                                 │
│                                                             │
│  📤 APPLIED (5)                                            │
│  • Microsoft — Applied Feb 10 — Waiting                    │
│  • Intuit — Applied Feb 5 — Waiting                        │
│  • Atlassian — Applied Feb 12 — Waiting                    │
│                                                             │
│  📞 INTERVIEW STAGE (2)                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Goldman Sachs                                       │   │
│  │ Applied: Jan 28                                     │   │
│  │ Status: OA Cleared ✅ → Interview scheduled Feb 22 │   │
│  │ [Add Interview Notes] [Prep Resources]             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [+ Add Application] [Export Backup]                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Theme Selection — Automatic, Not Asked

**Never ask the student what theme they want before building.**

Derive the visual personality from the context already collected — course, year, and living situation. The student should feel like the tool was made for them specifically, not generated from a template.

Three layers apply in sequence:

---

### Layer 1 — Course sets the base personality

Read the student's course and apply the matching theme as the CSS foundation.

**Engineering / Tech / Science**
Sharp, technical, data-dense. Numbers are the hero.
```css
:root {
  --primary: #4F46E5;        /* indigo */
  --primary-light: #EEF2FF;
  --accent: #06B6D4;         /* cyan */
  --success: #10B981;
  --warning: #F59E0B;
  --danger: #EF4444;
  --bg: #F8FAFC;
  --card: #FFFFFF;
  --text: #0F172A;
  --text-muted: #64748B;
  --radius: 8px;
  --shadow: 0 1px 4px rgba(0,0,0,0.08);
  --font-head: 'Inter', sans-serif;
  --font-body: 'Inter', sans-serif;
}
```
UI feel: tight grid layouts, monospace for IDs and timestamps, progress bars are thin and precise, buttons are angular with small border radius.

---

**Arts / Humanities / Social Sciences**
Warm, editorial, expressive. Reading-friendly layouts.
```css
:root {
  --primary: #92400E;        /* warm amber-brown */
  --primary-light: #FFFBEB;
  --accent: #F59E0B;         /* gold */
  --success: #059669;
  --warning: #D97706;
  --danger: #DC2626;
  --bg: #FFFDF7;             /* warm off-white */
  --card: #FFFFFF;
  --text: #1C1917;
  --text-muted: #78716C;
  --radius: 12px;
  --shadow: 0 2px 8px rgba(0,0,0,0.06);
  --font-head: 'Playfair Display', Georgia, serif;
  --font-body: 'Lato', sans-serif;
}
```
UI feel: generous whitespace, serif headings, warm cream tones, cards with soft borders, reading-list style layouts.

---

**Commerce / Business / Management / Law**
Structured, professional, trustworthy. Clarity over decoration.
```css
:root {
  --primary: #1E3A5F;        /* navy */
  --primary-light: #EFF6FF;
  --accent: #2563EB;         /* blue */
  --success: #16A34A;
  --warning: #CA8A04;
  --danger: #DC2626;
  --bg: #F9FAFB;
  --card: #FFFFFF;
  --text: #111827;
  --text-muted: #6B7280;
  --radius: 6px;
  --shadow: 0 1px 3px rgba(0,0,0,0.1);
  --font-head: 'Merriweather', Georgia, serif;
  --font-body: 'Inter', sans-serif;
}
```
UI feel: table-heavy layouts, structured columns, formal typography, minimal decoration, data always left-aligned.

---

**Medicine / Healthcare**
Clinical, calm, precise. White-dominant with teal accents.
```css
:root {
  --primary: #0F766E;        /* deep teal */
  --primary-light: #F0FDFA;
  --accent: #14B8A6;
  --success: #059669;
  --warning: #F59E0B;
  --danger: #EF4444;
  --bg: #F8FFFE;
  --card: #FFFFFF;
  --text: #134E4A;
  --text-muted: #6B7280;
  --radius: 8px;
  --shadow: 0 1px 4px rgba(0,0,0,0.06);
  --font-head: 'Inter', sans-serif;
  --font-body: 'Inter', sans-serif;
}
```
UI feel: clean white cards, teal highlights, lots of breathing room, clinical checklists, no visual noise.

---

**Design / Fine Arts / Architecture**
Creative, visual, bold. The UI itself is a portfolio piece.
```css
:root {
  --primary: #7C3AED;        /* vivid violet */
  --primary-light: #F5F3FF;
  --accent: #EC4899;         /* pink */
  --success: #10B981;
  --warning: #F59E0B;
  --danger: #EF4444;
  --bg: #FDFCFF;
  --card: #FFFFFF;
  --text: #1E1B4B;
  --text-muted: #6D6A8A;
  --radius: 16px;
  --shadow: 0 4px 16px rgba(124,58,237,0.1);
  --font-head: 'DM Sans', sans-serif;
  --font-body: 'DM Sans', sans-serif;
}
```
UI feel: bold cards with coloured accents, asymmetric layouts where appropriate, large visual thumbnails, personality-forward copy.

---

**1st year — any course (or ambiguous context)**
Friendly, welcoming, encouraging. Optimised for someone who's adjusting.
```css
:root {
  --primary: #6C63FF;        /* friendly purple */
  --primary-light: #F0EFFE;
  --accent: #00D9A5;         /* mint */
  --success: #00D9A5;
  --warning: #FFB800;
  --danger: #FF6B6B;
  --bg: #FAFAFA;
  --card: #FFFFFF;
  --text: #2D2D2D;
  --text-muted: #6B7280;
  --radius: 14px;
  --shadow: 0 2px 10px rgba(108,99,255,0.08);
  --font-head: 'Poppins', sans-serif;
  --font-body: 'Poppins', sans-serif;
}
```
UI feel: rounded everything, encouraging copy, large tap targets, emoji-forward, progress celebrations.

---

**Final year / PG**
Focused, minimal, no-nonsense. Information density over decoration.
```css
:root {
  --primary: #374151;        /* dark grey */
  --primary-light: #F9FAFB;
  --accent: #4F46E5;
  --success: #059669;
  --warning: #D97706;
  --danger: #DC2626;
  --bg: #FFFFFF;
  --card: #F9FAFB;
  --text: #111827;
  --text-muted: #6B7280;
  --radius: 6px;
  --shadow: 0 1px 2px rgba(0,0,0,0.06);
  --font-head: 'Inter', sans-serif;
  --font-body: 'Inter', sans-serif;
}
```
UI feel: stripped back, dense tables, no decoration, every element earns its place.

---

### Layer 2 — Year adjusts density and tone

Apply these modifications on top of the course base theme:

| Year | Adjustment |
|------|-----------|
| 1st year | Increase border-radius by 4px. Add encouraging microcopy ("You've got this!", "Great job logging that!"). Use larger tap targets (52px min). |
| 2nd year | Standard density. Balanced tone. |
| 3rd year | Tighten spacing by 15%. Add urgency indicators prominently (internship deadlines, placement timelines). |
| 4th year | Maximum density. Deadline countdowns front and centre. Professional tone throughout. |
| PG | Academic tone. Citation-ready formats. Research-oriented layouts. Remove playful elements entirely. |

---

### Layer 3 — Tool type adjusts emotional register

Same student, same base theme — but each tool tunes its emotional tone to match what the student is feeling when they use it.

| Tool | Emotional state | Visual tuning |
|------|----------------|---------------|
| Expense tracker | Money anxiety | Calm, reassuring. Green when on track, amber approaching limit, red over budget. Never alarming unless genuinely needed. |
| Assignment tracker | Deadline stress | Clear traffic-light urgency (red/amber/green). Due dates prominent. Progress bars on every item. |
| Study planner | Needs motivation | Completion percentages, progress bars, celebrate milestones ("80% done — you're almost there"). |
| Hostel room board | Social, casual | Looser layout, warmer card colours, informal tone. Shared-space energy. |
| Internship tracker | Ambition and nerves | Professional, pipeline-style, clean columns. Status badges like a CRM. |
| Mood / wellbeing | Vulnerability | Soft colours only. Low stimulation. No urgency indicators. Gentle, non-judgmental copy. |
| Daily dashboard | Mixed — morning routine | Warm morning greeting. Today's priorities clear within 3 seconds of opening. |
| Notes organiser | Focus | Minimal chrome. Content is the hero. Clean reading typography. |

---

### Dark mode

Off by default for all themes. Apply only if the student explicitly asks.

When asked, use this dark overlay on top of the current theme — preserve the personality, just invert the surfaces:

```css
/* Dark mode override — apply on top of any theme */
[data-theme="dark"] {
  --bg: #0F172A;
  --card: #1E293B;
  --text: #F1F5F9;
  --text-muted: #94A3B8;
  --shadow: 0 2px 8px rgba(0,0,0,0.4);
}
```

---

### Theme change requests

If a student says "I don't like the colours", "make it more colourful", or "can it look different", offer three named options:

> "Sure — pick a vibe:
> - **Mint Fresh** — white and teal, calm and clean
> - **Sunset Warm** — cream and coral, warm and energetic
> - **Midnight Focus** — dark navy, easy on the eyes at night
>
> Or tell me your favourite colour and I'll build around it."

Apply the chosen theme across the entire tool, not just one section.

---

## UI Quality Standards

Every tool must feel like a real app, not a prototype. Apply these regardless of theme:

- White or light cards on a light background — never dark background by default
- Subtle card shadow (`box-shadow: var(--shadow)`) for depth — no harsh borders
- Empty states with a friendly message when no data exists
  (e.g. "No expenses yet — tap + to add your first one")
- Progress bars or visual indicators wherever there is a number or percentage
- Mobile tap targets minimum 44px tall — 52px for primary actions
- Coloured left border accent to distinguish urgency on cards:
  - `border-left: 4px solid var(--danger)` for overdue
  - `border-left: 4px solid var(--warning)` for due soon
  - `border-left: 4px solid var(--success)` for done
- Section headers use emoji as a visual anchor (📚 Academics, 💰 Finance, etc.)
- Fonts loaded from Google Fonts — match the course theme font pairing
- Button hierarchy: one primary action per screen, secondary actions clearly subordinate

---

## Mobile-First Principles

1. **One-thumb operation** — critical actions reachable with thumb
2. **Minimal typing** — use taps, toggles, quick-select
3. **Forgiving entry** — "save now, organize later"
4. **Offline-capable** — localStorage works without internet
5. **Quick capture everywhere** — don't lose the thought

---

## Key Interactions

- **Swipe** to complete or delete
- **Long press** for options
- **Pull down** to refresh
- **Tap** to expand details
- **Double tap** to favorite/star

---

## Hosting Guide (for students who want to share their app)

**Deploy to Netlify (2 minutes, free):**
1. Push code to a GitHub repo
2. Go to netlify.com → New site from Git
3. Select the repo → Deploy
4. Share the URL (e.g. `yourname-college-hub.netlify.app`)

localStorage works identically on a Netlify URL. Data persists on refresh. Each visitor gets their own independent data in their own browser — no setup needed.

**Ready for the next level (after the workshop):**

| Need | Solution |
|------|----------|
| Data across multiple devices | Firebase Firestore (free tier) |
| Shared data between roommates | Supabase (free tier) |
| Full backend | Node.js + MongoDB |

These are natural progressions after mastering the workshop build — not workshop requirements.

---

## Adding AI to Your Tool — Groq LLM Integration

Three triggers that tell Kiro to add Groq AI to a student's tool:

- **"I want to invoke an LLM for [operation]"** → add a Groq API call for that specific operation
- **"I want to add a chatbot / copilot to my app"** → add a full chat panel powered by Groq
- **"I want AI to suggest improvements to my data"** → add an analysis button that reads the student's data and returns plain-English advice

When any of these triggers appear, Kiro uses the patterns below. The student will have their Groq API key ready — they obtained it before the workshop at console.groq.com.

---

### The Groq API Key

Always place the key at the top of the file as a clearly labelled constant. Never buried in a function. The student pastes their key here once.

```javascript
// ── GROQ SETUP ──────────────────────────────────────────────────
// Get your free API key at: console.groq.com
const GROQ_API_KEY = "paste-your-groq-api-key-here";
const GROQ_MODEL   = "llama-3.1-8b-instant";   // fast, free, capable
const GROQ_URL     = "https://api.groq.com/openai/v1/chat/completions";
```

---

### Core Groq Call Function

Include this helper in every tool that uses Groq. Call it for any single AI operation.

```javascript
async function askGroq(systemPrompt, userMessage) {
  // Show loading state to user
  showAILoading(true);

  try {
    const response = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: userMessage  }
        ],
        temperature: 0.7,
        max_tokens: 1024
      })
    });

    // User-friendly error handling — never show raw API errors to beginners
    if (!response.ok) {
      if (response.status === 401) {
        showAIError("Your API key looks incorrect. Check it at the top of the file.");
        return null;
      }
      if (response.status === 429) {
        showAIError("Too many requests — wait a moment and try again.");
        return null;
      }
      showAIError("Something went wrong. Check your internet connection and try again.");
      return null;
    }

    const data = await response.json();
    return data.choices[0].message.content;

  } catch (error) {
    showAIError("Could not reach the AI. Check your internet connection.");
    return null;
  } finally {
    showAILoading(false);
  }
}

// Loading and error state helpers — always include these
function showAILoading(isLoading) {
  const btn = document.getElementById('ai-btn');
  if (btn) btn.textContent = isLoading ? "Thinking..." : "Ask AI";
  if (btn) btn.disabled = isLoading;
}

function showAIError(message) {
  const el = document.getElementById('ai-result');
  if (el) {
    el.innerHTML = `<div style="color:#DC2626;padding:10px;background:#FEF2F2;
      border-radius:8px;font-size:14px;">⚠️ ${message}</div>`;
  }
}
```

---

### Trigger 1: Single AI Operation

When the student says "I want AI to [do something] with my data" — add a button that calls Groq with that data as context.

**Example: Expense tracker — "I want AI to analyse my spending"**

```javascript
async function analyseExpenses() {
  const data = load('college-hub:expenses', defaultExpenses);

  // Build a readable summary of the data to send to the AI
  const summary = data.transactions
    .slice(-30)   // last 30 transactions
    .map(t => `${t.date}: ₹${t.amount} on ${t.category} (${t.note || 'no note'})`)
    .join('\n');

  const systemPrompt = `You are a helpful financial advisor for a college student in India.
Be warm, specific, and practical. Keep your response under 150 words.
Use ₹ for currency. Give 2-3 concrete suggestions, not generic advice.`;

  const userMessage = `Here are my recent expenses:\n${summary}
\nTotal budget: ₹${data.budget.monthly}/month.
What am I overspending on and what should I change?`;

  const result = await askGroq(systemPrompt, userMessage);

  if (result) {
    document.getElementById('ai-result').innerHTML =
      `<div style="padding:12px;background:#F0EFFE;border-radius:8px;
        font-size:14px;line-height:1.6;color:#26215C;">${result}</div>`;
  }
}
```

Add a button in the UI:
```html
<button id="ai-btn" onclick="analyseExpenses()">
  ✨ Ask AI to analyse my spending
</button>
<div id="ai-result"></div>
```

---

### Trigger 2: Chatbot or Copilot Panel

When the student says "I want to add a chatbot or copilot to my app" — add a floating chat panel. Always as a **panel, never inline** — this protects the existing layout from being broken.

The chat panel slides in from the right side. The student's existing tool is untouched.

```javascript
// ── CHAT PANEL ─────────────────────────────────────────────────
// Maintains conversation history for multi-turn chat
const chatHistory = [];

// FIX 1: Use position:absolute instead of position:fixed.
// position:fixed breaks inside Kiro's iframe preview — the panel
// anchors to the iframe viewport edge, not the screen, causing it
// to appear clipped or invisible. position:absolute anchors to the
// page content, which works correctly in both Kiro preview and
// any hosted URL.
//
// The wrapper div below gives the anchor point.

function buildChatPanel() {
  // Only create once
  if (document.getElementById('chat-wrapper')) return;

  // Wrapper anchors the panel to page bottom-right
  document.body.insertAdjacentHTML('beforeend', `
    <div id="chat-wrapper"
      style="position:absolute;bottom:24px;right:24px;z-index:1000;">

      <div id="chat-toggle" onclick="toggleChat()"
        style="width:52px;height:52px;border-radius:50%;
          background:#6C63FF;color:#fff;font-size:22px;
          display:flex;align-items:center;justify-content:center;
          cursor:pointer;box-shadow:0 4px 16px rgba(108,99,255,0.4);
          margin-left:auto;">💬</div>

      <div id="chat-panel"
        style="width:320px;height:440px;background:#fff;
          border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,0.12);
          display:none;flex-direction:column;
          border:1px solid #E5E7EB;overflow:hidden;
          margin-bottom:8px;">

        <div style="padding:14px 16px;background:#6C63FF;color:#fff;
          font-weight:600;font-size:15px;display:flex;
          justify-content:space-between;align-items:center;">
          <span>✨ AI Assistant</span>
          <div style="display:flex;gap:10px;align-items:center;">
            <span onclick="clearChat()"
              style="cursor:pointer;font-size:12px;opacity:.75;
                border:1px solid rgba(255,255,255,0.4);
                border-radius:4px;padding:2px 7px;">Clear</span>
            <span onclick="toggleChat()"
              style="cursor:pointer;font-size:18px;opacity:.8;">✕</span>
          </div>
        </div>

        <div id="chat-messages"
          style="flex:1;overflow-y:auto;padding:12px;
            display:flex;flex-direction:column;gap:8px;">
          <div style="background:#F0EFFE;padding:10px 12px;
            border-radius:10px;font-size:13px;color:#26215C;max-width:85%;">
            Hi! I can help you understand your data, answer questions,
            or give suggestions. What would you like to know?
          </div>
        </div>

        <div style="padding:10px;border-top:1px solid #F3F4F6;
          display:flex;gap:8px;">
          <input id="chat-input" type="text"
            placeholder="Ask anything..."
            onkeydown="if(event.key==='Enter') sendChat()"
            style="flex:1;padding:8px 12px;border:1px solid #E5E7EB;
              border-radius:20px;font-size:13px;outline:none;" />
          <button onclick="sendChat()"
            style="padding:8px 14px;background:#6C63FF;color:#fff;
              border:none;border-radius:20px;cursor:pointer;
              font-size:13px;font-weight:600;">Send</button>
        </div>
      </div>
    </div>
  `);
}

function toggleChat() {
  const panel = document.getElementById('chat-panel');
  const toggle = document.getElementById('chat-toggle');
  const isOpen = panel.style.display === 'flex';
  panel.style.display = isOpen ? 'none' : 'flex';
  // Stack: show panel above toggle button
  const wrapper = document.getElementById('chat-wrapper');
  wrapper.style.display = 'flex';
  wrapper.style.flexDirection = 'column-reverse';
}

// FIX 3: Clear chat — resets history and UI for a fresh conversation
function clearChat() {
  chatHistory.length = 0;
  const messages = document.getElementById('chat-messages');
  messages.innerHTML = `
    <div style="background:#F0EFFE;padding:10px 12px;border-radius:10px;
      font-size:13px;color:#26215C;max-width:85%;">
      Chat cleared. Ask me anything about your data!
    </div>`;
}

async function sendChat() {
  const input = document.getElementById('chat-input');
  const message = input.value.trim();
  if (!message) return;

  addChatMessage(message, 'user');
  input.value = '';

  const context = buildDataContext();   // defined per tool — see below

  chatHistory.push({ role: "user", content: message });

  // FIX 3: Cap history at 10 exchanges (20 messages) to avoid
  // token limit errors on long conversations.
  // Removes the oldest user+assistant pair when limit is exceeded.
  if (chatHistory.length > 20) chatHistory.splice(0, 2);

  const typingId = addTypingIndicator();

  try {
    const response = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: context },
          ...chatHistory
        ],
        temperature: 0.7,
        max_tokens: 512
      })
    });

    removeTypingIndicator(typingId);

    if (!response.ok) {
      if (response.status === 401) {
        addChatMessage("⚠️ API key looks incorrect — check it at the top of the file.", 'ai');
      } else if (response.status === 429) {
        addChatMessage("⚠️ Too many requests — wait a moment and try again.", 'ai');
      } else {
        addChatMessage("⚠️ Something went wrong. Check your connection.", 'ai');
      }
      return;
    }

    const data = await response.json();
    const reply = data.choices[0].message.content;
    chatHistory.push({ role: "assistant", content: reply });
    addChatMessage(reply, 'ai');

  } catch {
    removeTypingIndicator(typingId);
    addChatMessage("⚠️ Could not reach the AI. Check your internet connection.", 'ai');
  }
}

function addChatMessage(text, sender) {
  const messages = document.getElementById('chat-messages');
  const isUser = sender === 'user';
  messages.insertAdjacentHTML('beforeend', `
    <div style="
      background:${isUser ? '#6C63FF' : '#F0EFFE'};
      color:${isUser ? '#fff' : '#26215C'};
      padding:10px 12px;border-radius:10px;font-size:13px;
      max-width:85%;line-height:1.5;
      align-self:${isUser ? 'flex-end' : 'flex-start'};">
      ${text}
    </div>`);
  messages.scrollTop = messages.scrollHeight;
}

function addTypingIndicator() {
  const id = 'typing-' + Date.now();
  const messages = document.getElementById('chat-messages');
  messages.insertAdjacentHTML('beforeend',
    `<div id="${id}" style="background:#F0EFFE;padding:10px 12px;
      border-radius:10px;font-size:13px;color:#26215C;max-width:85%;">
      Thinking...</div>`);
  messages.scrollTop = messages.scrollHeight;
  return id;
}

function removeTypingIndicator(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

// Call buildChatPanel() at the end of your page load
buildChatPanel();
```

**`buildDataContext()` — customise per tool:**

FIX 2: The two examples below were previously both named `buildDataContext()`,
which causes a JavaScript error when both appear in the same file.
They are now named differently. Kiro should include ONLY the one
that matches the tool being built — not both.

```javascript
// For expense tracker — use this version in expense tracker tools
function buildDataContext() {
  const data = load('college-hub:expenses', defaultExpenses);
  const recent = data.transactions.slice(-20)
    .map(t => `${t.date}: ₹${t.amount} on ${t.category}`)
    .join(', ');
  return `You are a helpful AI assistant for a college student's expense tracker.
The student's monthly budget is ₹${data.budget.monthly}.
Recent transactions: ${recent}.
Be conversational, specific, and practical. Keep replies under 100 words.
Use ₹ for currency. This is a personal finance tool for a student in India.`;
}
```

```javascript
// For assignment tracker — use this version in assignment tracker tools
function buildDataContext() {
  const data = load('college-hub:assignments', defaultAssignments);
  const pending = data.assignments
    .filter(a => a.status !== 'completed')
    .map(a => `${a.title} (due: ${a.dueDate}, priority: ${a.priority})`)
    .join(', ');
  return `You are a helpful study assistant for a college student.
Pending assignments: ${pending}.
Help the student prioritise, plan their study time, or break down tasks.
Be encouraging and practical. Keep replies under 100 words.`;
}
```

---

### Trigger 3: AI Suggestions on Existing Data

When the student says "I want AI to suggest improvements / give me advice on my data" — add a dedicated "Ask AI" button that analyses what they've logged and returns specific, actionable suggestions.

This is distinct from the chatbot — it's a one-shot analysis, not a conversation. Simpler to build, often more immediately impressive.

```javascript
async function getAISuggestions() {
  const btn = document.getElementById('suggest-btn');
  btn.textContent = "Analysing...";
  btn.disabled = true;

  // Collect relevant data for the analysis
  const data = load('college-hub:assignments', defaultAssignments);
  const pending = data.assignments.filter(a => a.status !== 'completed');

  const dataText = pending.map(a =>
    `${a.title}: due ${a.dueDate}, priority ${a.priority}, progress ${a.progress}%`
  ).join('\n');

  const systemPrompt = `You are a helpful study coach for a college student.
Give 3 specific, actionable suggestions based on their assignment list.
Be direct and encouraging. Under 120 words total. Number each suggestion.`;

  const result = await askGroq(systemPrompt,
    `Here are my pending assignments:\n${dataText}\n
What should I focus on and how should I plan my next 3 days?`);

  btn.textContent = "✨ Get AI Suggestions";
  btn.disabled = false;

  if (result) {
    document.getElementById('suggestions-output').innerHTML = `
      <div style="background:#F0EFFE;padding:14px;border-radius:10px;
        font-size:14px;line-height:1.7;color:#26215C;margin-top:12px;">
        <strong style="color:#534AB7;">AI Suggestions</strong><br><br>
        ${result.replace(/\n/g, '<br>')}
      </div>`;
  }
}
```

---

### Important Rules for All Three Triggers

- **Always use `GROQ_API_KEY` from the top of the file** — never hardcode the key inside a function
- **Always show a loading state** — "Thinking..." on the button while waiting
- **Always handle the three common errors** — wrong key (401), rate limit (429), network failure
- **Never send sensitive personal data to the API** — no full names, no contact details, no financial account numbers — only aggregated summaries
- **Chatbot always goes in a panel** — never breaks the existing layout
- **Keep system prompts short and specific** — long system prompts slow responses and confuse the model
- **Limit context sent to the API** — last 20-30 data items is enough, not the entire history
