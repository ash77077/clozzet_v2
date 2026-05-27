# Claude Code Prompt — AI CRM Feature Implementation
# Project: Clozzet CRM (Angular 20 + PrimeNG 20 + Tailwind CSS)
# Paste this entire file into Claude Code to begin

---

## Project stack (confirmed from package.json)

- **Framework:** Angular 20 (standalone components architecture)
- **UI Library:** PrimeNG 20 with PrimeIcons 7
- **Styling:** Tailwind CSS 3
- **i18n:** @ngx-translate/core 17 (Armenian + English already wired)
- **HTTP:** Angular HttpClient (built-in)
- **Charts:** Chart.js 4
- **Real-time:** socket.io-client 4 (already installed — use for streaming AI responses)
- **Icons:** PrimeIcons (use `pi pi-*` classes throughout)

Before writing any code, scan the project structure:
- Find where existing components live (likely `src/app/`)
- Find the main navbar/header component
- Find the customer/lead detail component and list component
- Find the existing routing file
- Find the existing HTTP service pattern (how API calls are made today)
- Find the translation files (likely `src/assets/i18n/en.json` and `hy.json` or `am.json`)
- Find any existing shared service pattern
- Identify the base API URL (likely in `environment.ts`)

Do not assume file locations — read the project first.

---

## What to build (implement in this exact order)

### STEP 1 — AI Service + environment setup

1. Add to `src/environments/environment.ts` and `environment.development.ts`:
```ts
aiEnabled: false,           // default off
anthropicApiKey: '',        // leave empty — call goes through backend
aiApiBase: '/api/ai'        // backend proxy base URL
```

2. Create `src/app/core/services/ai.service.ts` as an Angular injectable (root):

```ts
// This service is the single source of truth for all AI features.
// It must expose:

// State
aiEnabled$: BehaviorSubject<boolean>  // persisted to localStorage key 'crm_ai_enabled'
isAnalyzing$: BehaviorSubject<boolean>

// Methods
toggleAI(enabled: boolean): void
analyzeCustomer(customer: CustomerAiPayload): Observable<CustomerAiResult>
sendChatMessage(messages: ChatMessage[], customerContext?: any): Observable<string>
getCachedAnalysis(customerId: string): CustomerAiResult | null
setCachedAnalysis(customerId: string, result: CustomerAiResult): void
clearCache(): void
```

Define these interfaces in `src/app/core/models/ai.models.ts`:
```ts
export interface CustomerAiPayload {
  id: string;
  name: string;
  notes: string;           // all notes concatenated with dates
  last_contact_date: string | null;
  order_history: { date: string; amount: number }[];
  tags: string[];
  reply_language: 'Armenian' | 'English';
}

export interface CustomerAiResult {
  status: 'hot lead' | 'warm lead' | 'cold lead' | 'loyal customer' | 'new contact' | 'at risk';
  urgency: number;          // 1–10
  sentiment: 'positive' | 'neutral' | 'hesitant' | 'negative';
  detected_language: string;
  summary: string;
  tags: string[];
  next_action: string;
  action_type: 'call' | 'nurture' | 'close' | 'alert';
  analyzed_at: string;      // ISO timestamp
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
```

3. Add to translation files (`en.json` and the Armenian translation file):
```json
"AI": {
  "TOGGLE_LABEL": "AI Assistant",
  "TOGGLE_ON": "Active",
  "TOGGLE_OFF": "Inactive",
  "ANALYZE_BTN": "AI Suggestion",
  "REFRESH_BTN": "Refresh Analysis",
  "ANALYZING": "Analyzing...",
  "LAST_ANALYZED": "Last analyzed",
  "NEVER_ANALYZED": "Not yet analyzed",
  "STALE_WARNING": "Analysis may be outdated",
  "STATUS_LABEL": "Customer Status",
  "URGENCY_LABEL": "Urgency",
  "SENTIMENT_LABEL": "Sentiment",
  "SUMMARY_LABEL": "Summary",
  "TAGS_LABEL": "Tags",
  "NEXT_ACTION_LABEL": "Recommended Action",
  "CHAT_TITLE": "CRM Assistant",
  "CHAT_PLACEHOLDER": "Ask anything about your customers...",
  "CHIP_SUMMARIZE": "Summarize this customer",
  "CHIP_CALL_TIME": "Best time to call?",
  "CHIP_DRAFT_FOLLOWUP": "Draft a follow-up message",
  "CHIP_WHO_TO_CALL": "Who should I call today?",
  "CHIP_AT_RISK": "Any customers at risk?",
  "CHIP_SEASONAL": "Show seasonal opportunities",
  "ANALYZE_ALL": "Analyze All",
  "ANALYZE_ALL_PROGRESS": "Analyzing {{current}} of {{total}}...",
  "AI_BADGE": "AI",
  "ERROR_GENERIC": "Analysis failed. Please try again.",
  "ERROR_RETRY": "Retry"
}
```

Armenian (`hy.json`) translations — add the same keys with Armenian values:
```json
"AI": {
  "TOGGLE_LABEL": "ԱԲ Օգնական",
  "TOGGLE_ON": "Ակտիվ",
  "TOGGLE_OFF": "Անջատված",
  "ANALYZE_BTN": "ԱԲ Առաջարկ",
  "REFRESH_BTN": "Թարմացնել",
  "ANALYZING": "Վերլուծում...",
  "LAST_ANALYZED": "Վերջին վերլուծություն",
  "NEVER_ANALYZED": "Դեռ չի վերլուծվել",
  "STALE_WARNING": "Տվյալները կարող են հնացած լինել",
  "STATUS_LABEL": "Կարգավիճակ",
  "URGENCY_LABEL": "Հրատապություն",
  "SENTIMENT_LABEL": "Տրամադրություն",
  "SUMMARY_LABEL": "Ամփոփում",
  "TAGS_LABEL": "Պիտակներ",
  "NEXT_ACTION_LABEL": "Հաջորդ գործողություն",
  "CHAT_TITLE": "CRM Օգնական",
  "CHAT_PLACEHOLDER": "Հարցրեք ցանկացած բան հաճախորդների մասին...",
  "CHIP_SUMMARIZE": "Ամփոփել հաճախորդին",
  "CHIP_CALL_TIME": "Լավագույն ժամ զանգի համար?",
  "CHIP_DRAFT_FOLLOWUP": "Գրել հետևողական հաղորդագրություն",
  "CHIP_WHO_TO_CALL": "Ո՞ւմ զանգել այսօր?",
  "CHIP_AT_RISK": "Կան ռիսկային հաճախորդներ?",
  "CHIP_SEASONAL": "Սեզոնային հնարավորություններ",
  "ANALYZE_ALL": "Վերլուծել բոլորին",
  "ANALYZE_ALL_PROGRESS": "Վերլուծվում է {{current}}-ը {{total}}-ից...",
  "AI_BADGE": "ԱԲ",
  "ERROR_GENERIC": "Վերլուծությունը ձախողվեց։ Կրկին փորձեք։",
  "ERROR_RETRY": "Կրկնել"
}
```

---

### STEP 2 — Backend proxy endpoints

**Important:** The Anthropic API key must NEVER be in the frontend. All AI calls go through the backend. Check the existing backend project (ask me for its location if needed).

Create two endpoints in the backend:

#### `POST /api/ai/analyze-customer`

Request:
```json
{
  "customer": { ...CustomerAiPayload },
  "reply_language": "Armenian" | "English"
}
```

System prompt to use:
```
You are an expert CRM sales assistant for a fashion/clothing business in Armenia. 
Analyze customer notes written in Armenian, English, or mixed Armenian-English.
You understand Armenian business culture and seasonal buying patterns.
Return ONLY valid JSON, no other text, no markdown code blocks.
JSON structure:
{
  "status": "hot lead"|"warm lead"|"cold lead"|"loyal customer"|"new contact"|"at risk",
  "urgency": <number 1-10>,
  "sentiment": "positive"|"neutral"|"hesitant"|"negative",
  "detected_language": "Armenian"|"English"|"Mixed",
  "summary": "<2-3 sentences in [reply_language]>",
  "tags": ["<tag1>","<tag2>","<tag3>"],
  "next_action": "<specific recommended action in [reply_language]>",
  "action_type": "call"|"nurture"|"close"|"alert"
}
```

User message: `Customer: [name]\nNotes: [notes]\nLast contact: [date]\nOrder history: [JSON]\nTags: [tags]`

Model: `claude-sonnet-4-20250514`, max_tokens: 1000

Return the parsed JSON directly to the frontend.

#### `POST /api/ai/chat`

Request:
```json
{
  "messages": [{ "role": "user"|"assistant", "content": "string" }],
  "customer_context": { ...customer object } | null
}
```

System prompt:
```
You are an expert CRM sales assistant for a fashion/clothing business in Armenia called Clozzet.
You help sales teams manage customers, plan follow-ups, identify opportunities, and increase orders.
You understand Armenian and English perfectly. Reply in the same language the user writes in.
You know about Armenian holidays and seasons that affect fashion buying:
- New Year / Christmas (Dec 25 - Jan 14): highest buying season
- Spring collection season (March-April)
- Vardavar, Navasard, other Armenian cultural dates
When you have customer context, use it to give specific advice.
Keep answers concise, practical, and actionable.
When drafting messages for Armenian customers, write naturally in Armenian.
```

Stream the response using Server-Sent Events if your backend supports it, otherwise return full response. Return `{ reply: string }`.

---

### STEP 3 — AI toggle in navbar

Find the existing navbar/header component. Inside the user avatar dropdown menu (p-menu or p-tieredmenu), add an AI toggle item.

Requirements:
- Use PrimeNG `p-inputSwitch` for the toggle
- Label: `{{ 'AI.TOGGLE_LABEL' | translate }}`
- Bind to `aiService.aiEnabled$`
- On change: call `aiService.toggleAI(event)`
- Add a green dot indicator on the user avatar when AI is active:
  ```html
  <span *ngIf="aiEnabled$ | async" 
        class="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 
               rounded-full border-2 border-white animate-pulse">
  </span>
  ```
- Wrap the avatar in `relative` positioned container
- The dropdown item should NOT close the dropdown when the toggle is clicked (use `(click)="$event.stopPropagation()"`)

---

### STEP 4 — AI Suggestion panel on customer detail page

Find the existing customer detail component. Add the following:

**The trigger button** (place next to Edit/Call buttons in the header actions area):
```html
<p-button 
  *ngIf="aiEnabled$ | async"
  [label]="'AI.ANALYZE_BTN' | translate"
  icon="pi pi-sparkles"
  severity="secondary"
  [loading]="isAnalyzing"
  (click)="triggerAiAnalysis()">
</p-button>
```

**The result panel** — add below the customer header section:
```html
<div *ngIf="(aiEnabled$ | async) && aiResult" 
     class="ai-suggestion-panel"
     [@slideDown]>
  <!-- implement the full panel as described below -->
</div>
```

The panel must show (use PrimeNG components throughout):

1. **Header row:** Small `pi pi-sparkles` icon + "AI Suggestion" text + small `p-tag` with "AI" label (so user knows it's AI-generated) + timestamp ("Last analyzed: 5 min ago" using Angular's date pipe) + Refresh button

2. **Status + urgency row** (2-column grid):
   - Status: `p-tag` with severity mapped from status:
     - hot lead → danger
     - warm lead → warning  
     - cold lead → info
     - loyal customer → success
     - new contact → secondary
     - at risk → danger
   - Urgency: custom bar using Tailwind (colored div width = `urgency * 10%`, red if ≥8, yellow if ≥5, blue if <5)

3. **Sentiment:** `p-chip` with icon (pi-heart=positive, pi-minus=neutral, pi-question=hesitant, pi-times=negative)

4. **Summary:** `p-panel` or simple card with the AI summary text, bordered-left with a subtle color

5. **Tags:** row of `p-chip` components, generated from `aiResult.tags`

6. **Next action box:** styled div with left border color based on action_type:
   - call → orange border + pi-phone icon
   - nurture → blue border + pi-send icon  
   - close → green border + pi-check-circle icon
   - alert → red border + pi-exclamation-triangle icon

Add Angular animation `slideDown` for the panel appearance:
```ts
trigger('slideDown', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY(-12px)' }),
    animate('220ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
  ])
])
```

**Error state:** If analysis fails, show a `p-message` with severity="error", the translated error message, and a Retry button.

**Skeleton state:** While `isAnalyzing` is true, show `p-skeleton` blocks matching the panel layout (don't show a spinner — show the layout skeleton so there's no layout jump when data arrives).

**Logic in the component:**
```ts
triggerAiAnalysis() {
  this.isAnalyzing = true;
  const payload = this.buildAiPayload(); // map customer fields to CustomerAiPayload
  this.aiService.analyzeCustomer(payload).subscribe({
    next: (result) => {
      this.aiResult = result;
      this.aiService.setCachedAnalysis(this.customer.id, result);
      this.isAnalyzing = false;
    },
    error: () => {
      this.aiError = true;
      this.isAnalyzing = false;
    }
  });
}

ngOnInit() {
  // Load cached result if available (don't auto-analyze on page load)
  const cached = this.aiService.getCachedAnalysis(this.customer.id);
  if (cached) this.aiResult = cached;
  
  // Subscribe to AI enabled state
  this.aiEnabled$ = this.aiService.aiEnabled$;
}
```

---

### STEP 5 — Floating AI chat widget

Create a new standalone component: `src/app/shared/components/ai-chat-widget/ai-chat-widget.component.ts`

Add it to the root `app.component.html` (renders on every page):
```html
<app-ai-chat-widget *ngIf="aiEnabled$ | async"></app-ai-chat-widget>
```

**The floating button:**
- Fixed position, bottom-right: `class="fixed bottom-6 right-6 z-50"`
- PrimeNG `p-button` with `styleClass="rounded-full w-14 h-14 shadow-lg"`
- Icon: `pi pi-comments` (or `pi pi-sparkles`)
- Badge showing unread count if > 0 (use `p-badge`)
- Subtle CSS pulse animation when panel is closed and there are unread messages

**The chat panel:**
- Appears when button is clicked (toggle)
- Position: fixed, above the button: `class="fixed bottom-24 right-6 z-50 w-96"`
- Height: 520px, flex column layout
- Use `p-card` as the container

Panel structure:
```
┌─────────────────────────────────┐
│ 🧠 CRM Assistant        [X]    │  ← header
├─────────────────────────────────┤
│ Customer: [p-dropdown ▼]       │  ← context selector
├─────────────────────────────────┤
│                                 │
│   [message bubbles scroll]      │  ← messages area (flex-1, overflow-y-auto)
│                                 │
├─────────────────────────────────┤
│ [chip] [chip] [chip]            │  ← quick action chips (p-chip, clickable)
├─────────────────────────────────┤
│ [input field...      ] [Send]  │  ← input row
└─────────────────────────────────┘
```

**Message bubbles:**
- User messages: right-aligned, Tailwind `bg-primary-100 rounded-2xl rounded-br-sm px-4 py-2 max-w-xs ml-auto`
- Assistant messages: left-aligned, `bg-surface-100 rounded-2xl rounded-bl-sm px-4 py-2 max-w-xs`
- AI messages should have a tiny `pi pi-sparkles` icon before them
- Animate new messages in with `@fadeIn` (opacity 0→1, translateY 8px→0)
- Auto-scroll to bottom when new message arrives (use `@ViewChild` + `scrollIntoView`)

**While AI is typing:** Show a typing indicator (3 animated dots) as an assistant "message":
```html
<div class="typing-indicator">
  <span></span><span></span><span></span>
</div>
```
CSS: each span animates `opacity 0.4→1→0.4` with staggered delays.

**Quick action chips:**
- When on a customer detail page (detect via Router): show customer-specific chips
- When on list/dashboard: show general chips
- On chip click: pre-fill and send the message automatically
- After sending once, hide the chips (they served their purpose)

**Customer context selector:**
- `p-dropdown` showing all customers (load from existing customer service)
- Defaults to current customer if on a detail page
- When changed: clear chat history, show a system message "Now discussing: [Customer Name]"
- The customer's data is injected into every AI message as context

**Sending messages:**
```ts
sendMessage(content: string) {
  // Add user message to messages array
  // Clear input
  // Set typing = true
  // Call aiService.sendChatMessage(this.messages, this.selectedCustomer)
  // On response: add assistant message, typing = false
  // On error: show p-message inline in chat
}
```

**Panel open/close animation:**
```ts
trigger('slideUp', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY(20px) scale(0.97)' }),
    animate('200ms ease-out', style({ opacity: 1, transform: 'translateY(0) scale(1)' }))
  ]),
  transition(':leave', [
    animate('150ms ease-in', style({ opacity: 0, transform: 'translateY(12px) scale(0.97)' }))
  ])
])
```

---

### STEP 6 — AI status column in customers list

Find the existing customers list component (likely a `p-table` with columns).

**Add AI status column** (only when AI is enabled):
```html
<ng-container *ngIf="aiEnabled$ | async">
  <p-column field="ai_status" [header]="'AI.STATUS_LABEL' | translate" [sortable]="false">
    <ng-template pTemplate="body" let-customer>
      <app-ai-status-cell [customer]="customer" (analyzeClicked)="analyzeOne(customer)">
      </app-ai-status-cell>
    </ng-template>
  </p-column>
</ng-container>
```

Create `AiStatusCellComponent` (standalone, inline-small):
- If customer has `ai_status` cached: show `p-tag` with correct severity
- If `ai_analyzed_at` is older than 7 days: add a small `pi pi-clock` warning icon with tooltip "Analysis may be outdated"
- If never analyzed: show a small ghost button "Analyze" (text button, no border)
- Entire cell is compact — max height matches table row

**"Analyze All" button** — add to the table header toolbar:
```html
<p-button 
  *ngIf="aiEnabled$ | async"
  [label]="analyzeAllProgress || ('AI.ANALYZE_ALL' | translate)"
  icon="pi pi-sparkles"
  severity="secondary"
  size="small"
  [loading]="isAnalyzingAll"
  [disabled]="isAnalyzingAll"
  (click)="analyzeAll()">
</p-button>
```

Analyze All logic:
```ts
async analyzeAll() {
  this.isAnalyzingAll = true;
  const customers = this.customers; // current page or all?
  for (let i = 0; i < customers.length; i++) {
    this.analyzeAllProgress = `${i+1} / ${customers.length}`;
    await firstValueFrom(this.aiService.analyzeCustomer(
      this.buildPayload(customers[i])
    )).then(result => {
      customers[i].ai_status = result.status;
      customers[i].ai_analyzed_at = result.analyzed_at;
      this.aiService.setCachedAnalysis(customers[i].id, result);
    }).catch(() => {}); // skip failed ones silently
    await new Promise(r => setTimeout(r, 300)); // rate limit buffer
  }
  this.isAnalyzingAll = false;
  this.analyzeAllProgress = null;
}
```

---

## Visual design rules (apply everywhere)

1. **AI-generated content identifier:** Every AI-generated text block must have a small badge:
   ```html
   <span class="text-xs font-medium text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded mr-2">
     {{ 'AI.AI_BADGE' | translate }}
   </span>
   ```

2. **AI panel left border accent:** All AI panels/cards get:
   ```css
   border-left: 3px solid var(--p-primary-color);
   ```

3. **Urgency color logic:**
   - urgency 8–10: `text-red-600`, bar `bg-red-500`
   - urgency 5–7: `text-yellow-600`, bar `bg-yellow-500`
   - urgency 1–4: `text-blue-600`, bar `bg-blue-500`

4. **Status tag severity mapping:**
   ```ts
   const statusSeverity = {
     'hot lead': 'danger',
     'warm lead': 'warning',
     'cold lead': 'info',
     'loyal customer': 'success',
     'new contact': 'secondary',
     'at risk': 'danger'
   }
   ```

5. **Consistent PrimeNG usage:**
   - Buttons: `p-button` only, no native `<button>`
   - Tags/badges: `p-tag` and `p-chip`
   - Panels: `p-card` or `p-panel`
   - Inputs: `p-inputtext`, `p-dropdown`
   - Skeleton: `p-skeleton`
   - Tooltips: `pTooltip` directive
   - Notifications: `p-toast` (inject `MessageService`)

---

## Important rules for Claude Code

- **Do not hardcode the Anthropic API key anywhere in Angular** — all AI calls go through `/api/ai/*` on the backend
- **Do not break existing features** — read each file fully before editing it
- **Respect existing patterns** — if the project uses a specific service pattern, repository pattern, or base component, match it
- **ngx-translate is already set up** — use `translate` pipe and `TranslateService` everywhere, never hardcode display strings
- **AI toggle state is the guard** — check `aiService.aiEnabled$` before every AI UI element with `*ngIf`
- **No auto-analysis on page load** — AI analysis only runs when the user explicitly clicks a button
- **Cache results in memory** — `AiService` holds a `Map<customerId, CustomerAiResult>` for the session; do not spam the API
- **Handle errors always** — every `.subscribe()` must have an `error` handler that shows a `p-toast` or inline `p-message`
- **Use `async` pipe** — prefer `observable | async` over manual subscriptions where possible
- **Standalone components** — Angular 20 uses standalone by default; do not add `NgModule` declarations

---

## Start here

**First action:** Run a directory scan and show me:
1. The folder structure of `src/app/`
2. The content of the main navbar/header component
3. The content of the customer detail component
4. The content of `environment.ts`
5. Whether there is already a `core/services/` folder and what services exist

Then confirm the backend language/framework so we can write the two API endpoints correctly.

After that, begin with **STEP 1** (AiService + models + translations) and show me the files before writing them.
