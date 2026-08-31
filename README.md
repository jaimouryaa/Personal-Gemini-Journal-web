# AuraJournal — AI-Powered Reflection & Private Journaling Platform

AuraJournal is a user-authenticated, cloud-persisted journaling and mental clarity application. It allows users to authenticate via Firebase Authentication (Google Sign-In), conduct multi-turn reflective dialogues with Gemini 3.6 Flash, generate structured takeaways and actionable next steps, and persist all reflections in Google Cloud Firestore with guaranteed user data isolation.

---

## 🛡️ Threat Model & Security Architecture

| Threat Zone | Identified Risk | Countermeasure & Implementation |
| :--- | :--- | :--- |
| **1. Input Surfaces** | Prompt injection, malicious payloads, corrupted objects | Schema validation, null-safe payload destructuring, character caps, and strict separation of user input in prompt construction. |
| **2. Planning & Reasoning** | LLM hallucinations, prompt diversion | Explicit system instructions per reflection mode with clear output boundaries and schema-enforced JSON summarization. |
| **3. Tool & Execution** | API rate limits, model downtime, credential exposure | Server-side Gemini API proxy (`/api/gemini/*`) using `process.env.GEMINI_API_KEY`, backed by an automated 4-tier model fallback ladder (`gemini-3.6-flash` &rarr; `gemini-3.1-flash-lite` &rarr; `gemini-flash-latest` &rarr; `gemini-3.7-flash`). |
| **4. Memory & State** | Cross-user data leakage, Firestore crashes on `undefined` | Path-scoped Firestore security rules (`users/{userId}/entries/*`), owner-bound checks (`request.auth.uid == userId`), and recursive undefined-stripping prior to writes. |
| **5. Inter-System Comm** | API key leakage, unauthorized browser requests | Secret Manager integration for backend runtime, client-side OAuth via Firebase Auth, and zero hardcoded credentials in source code. |

---

## 🚀 Key Features

1. **User Identity & Federated Auth**:
   - Google Sign-In via Firebase Auth.
   - Zero raw password storage or email vulnerability.
2. **5 Specialized AI Reflection Modes**:
   - **Deep Insight**: Emotional unpacking and identifying cognitive blindspots.
   - **Summary & Actions**: Key themes, prioritized takeaways, and actionable next steps.
   - **Brainstorming**: Creative pathways and structured experiments.
   - **Cognitive Reframe**: Compassionate mindset shifts for unhelpful thoughts.
   - **Socratic Inquiry**: Probing questions exploring core assumptions.
3. **Multi-Turn Reflective Dialogue**:
   - Continuous context-aware chat with Gemini.
   - Live Markdown rendering, syntax formatting, and copy tools.
4. **Cloud Firestore Persistence**:
   - Every journal session, title, mood, tag, and AI exchange is saved to isolated user subtrees.
5. **Session History & Analytics**:
   - Searchable, filterable history by tags and moods with instant Markdown export.

---

## 🔒 Cloud Firestore Security Rules

The application uses path-based user isolation in `firestore.rules`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User profile isolation
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      // User reflections and journal entries isolation
      match /entries/{entryId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }

      // User interaction history isolation
      match /interactions/{interactionId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

---

## 🛠️ Secret Manager & Environment Setup

### 1. Enable Required GCP APIs
```bash
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  aiplatform.googleapis.com
```

### 2. Configure Secret Manager for Gemini API Key
```bash
# Create the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"

# Add your API key secret version
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# Grant Secret Manager Accessor role to the default Cloud Run service account
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 🚢 Google Cloud Run Deployment

### 1. Build and Deploy Service
```bash
gcloud run deploy aurajournal \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets=GEMINI_API_KEY=GEMINI_API_KEY:latest \
  --port 3000
```

### 2. Apply Mandatory Campaign Verification Label
```bash
gcloud run services update aurajournal \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=us-central1
```

---

## 🧪 Functional Walkthrough & Verification Guide

### Test Suite 1: Authentication & Navigation
- **Step 1.1**: Open the app landing page without an active session. Verify the landing screen displays features and the "Sign in with Google to Begin" button.
- **Step 1.2**: Click "Sign in with Google". Complete the Google popup authorization.
- **Step 1.3**: Confirm successful login redirects to the authenticated private dashboard, displaying the user's Google avatar and display name in the navbar.
- **Step 1.4**: Click "Sign Out". Confirm the app clears user state and safely returns to the landing page.

### Test Suite 2: Multi-Turn Journaling & Gemini 3.6 Flash Integration
- **Step 2.1**: From the private dashboard, enter a custom session title or type a thought in the prompt box (e.g., "I feel torn between two project directions.").
- **Step 2.2**: Select a reflection mode (e.g., "Deep Insight" or "Cognitive Reframe") and select a mood chip (e.g., "🌱 Grateful" or "🤔 Reflective").
- **Step 2.3**: Click "Reflect" (or press Cmd+Enter).
- **Step 2.4**: Verify the pulsing generation indicator appears, followed by the formatted Markdown response from Gemini.
- **Step 2.5**: Send a follow-up turn in the same session (e.g., "How should I prioritize between these two?"). Verify Gemini maintains previous conversation context.
- **Step 2.6**: Click "Summarize & Extract Action Items". Verify the structured synthesis card renders headline, key themes, and action items.

### Test Suite 3: Cloud Firestore Isolation & History Verification
- **Step 3.1**: Verify the top bar displays "Saved to Cloud Firestore".
- **Step 3.2**: Switch to the "Past Entries" tab in the navbar. Confirm the newly created entry appears in the list with title, tags, date, and turn count.
- **Step 3.3**: Search by keyword in the search bar. Verify results filter dynamically.
- **Step 3.4**: Click the "Download" icon on an entry card. Verify the generated `.md` file contains the complete session transcript and AI summary.
- **Step 3.5**: Click "Continue" on an entry. Verify the editor reloads the full multi-turn conversation and allows continuing the reflection.
- **Step 3.6**: Click the "Delete" icon and confirm deletion. Verify the document is removed from Firestore and disappears from the history list.
