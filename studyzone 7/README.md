# StudyZone — Setup Guide

Your school hub with Google login, AI tutor, and Ko-fi payments.

---

## File structure

```
studyzone/
├── index.html          ← login page
├── app.html            ← main app
├── css/
│   └── style.css
└── js/
    ├── firebase-config.js  ← you fill this in
    ├── auth.js
    └── app.js              ← you fill in your Anthropic key
```

---

## Step 1 — Set up Firebase (free, 5 min)

1. Go to **https://console.firebase.google.com**
2. Click **"Add project"** → name it (e.g. `studyzone`) → continue
3. Disable Google Analytics if you want (optional) → **Create project**
4. Click the **web icon** `</>` → register app → copy the config object
5. Open `js/firebase-config.js` and paste your config values

### Enable Google login:
1. In Firebase Console → **Authentication** → **Get started**
2. Click **Google** under Sign-in providers → enable it → save

### Enable Firestore:
1. Firebase Console → **Firestore Database** → **Create database**
2. Choose **Start in test mode** (fine for now) → pick a region → done

### Set Firestore security rules:
Go to Firestore → Rules tab → paste this:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## Step 2 — Add your Anthropic API key

1. Go to **https://console.anthropic.com** → API Keys → create one
2. Open `js/app.js` → find line: `const ANTHROPIC_API_KEY = 'YOUR_ANTHROPIC_API_KEY'`
3. Replace with your actual key

> ⚠️ Note: The API key is visible in the browser on GitHub Pages.
> This is fine for a school project / small scale. For production,
> you'd want a backend (e.g. Firebase Cloud Functions) to hide it.

---

## Step 3 — Set up Ko-fi

1. Go to **https://ko-fi.com** → sign up for free
2. Set up a **Shop item** for the one-time Pro payment (e.g. €4.99)
3. Set up a **Membership tier** for the monthly Student+ plan (e.g. €1.99/mo)
4. In `app.html`, replace `YOUR_KOFI_USERNAME` with your actual Ko-fi username
5. Replace `YOUR_EMAIL@here.com` with your email so students can send proof of payment

### Manually upgrading users after payment:
When a student pays and emails you their confirmation:
1. Firebase Console → Firestore → users → find their document
2. Change `tier` from `"free"` to `"pro"` or `"student_plus"`
3. Done — they'll see it next time they load the app

---

## Step 4 — Deploy to GitHub Pages

1. Create a new GitHub repo (e.g. `studyzone`)
2. Upload all files keeping the folder structure
3. Go to repo **Settings** → **Pages** → Source: `main` branch, `/ (root)`
4. Your site will be live at: `https://YOUR_USERNAME.github.io/studyzone`

---

## Tier summary

| Feature | Free | Pro (one-time €4.99) | Student+ (€1.99/mo) |
|---|---|---|---|
| AI messages | 50 total | 100 total | Unlimited |
| Grade calculator | ✓ | ✓ | ✓ |
| Word counter | ✓ | ✓ | ✓ |
| Essay AI feedback | ✗ | ✓ | ✓ |
| Flashcard maker | ✗ | ✓ | ✓ |

---

## Questions?
The code is all vanilla HTML/CSS/JS + Firebase + Anthropic API. No build tools needed. Just upload and it works.
