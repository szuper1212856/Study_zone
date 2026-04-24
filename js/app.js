// app.js — main app logic

// ============================================================
//  PASTE YOUR GEMINI API KEY BELOW (between the quotes)
//  Get one free at: https://aistudio.google.com
// ============================================================
const GEMINI_API_KEY = 'AIzaSyCybeIdsWP4QVYB6WA_5QHSZwUoCSODznc';

const LIMITS = { free: 50, pro: 100, student_plus: Infinity };

let currentUser = null;
let userData = null;

auth.onAuthStateChanged(async user => {
  if (!user) { window.location.href = 'index.html'; return; }
  currentUser = user;
  await loadUserData();
  renderUserUI();
  updateUsageBar();
});

async function loadUserData() {
  const snap = await db.collection('users').doc(currentUser.uid).get();
  userData = snap.data();
}

function renderUserUI() {
  if (currentUser.photoURL) {
    const av = document.getElementById('user-avatar');
    av.src = currentUser.photoURL;
    av.style.display = 'block';
  }
  document.getElementById('user-name').textContent = userData.name || currentUser.displayName || '';
  const badge = document.getElementById('tier-badge');
  if (userData.tier === 'student_plus') {
    badge.textContent = 'Student+'; badge.className = 'tier-badge student-plus';
    document.getElementById('upgrade-btn').style.display = 'none';
  } else if (userData.tier === 'pro') {
    badge.textContent = 'Pro'; badge.className = 'tier-badge pro';
  } else {
    badge.textContent = 'Free'; badge.className = 'tier-badge';
  }
}

function updateUsageBar() {
  const limit = LIMITS[userData.tier];
  const used = userData.aiUsed || 0;
  const text = document.getElementById('usage-text');
  const fill = document.getElementById('usage-fill');
  if (limit === Infinity) {
    text.textContent = `${used} AI messages used — unlimited on Student+`;
    fill.style.width = '100%'; fill.className = 'usage-fill'; return;
  }
  const pct = Math.min((used / limit) * 100, 100);
  text.textContent = `${used} / ${limit} AI messages used`;
  fill.style.width = pct + '%';
  fill.className = 'usage-fill' + (pct >= 90 ? ' danger' : pct >= 70 ? ' warning' : '');
}

// ============================================================
//  GEMINI API — direct call
// ============================================================
async function callAI(prompt, system) {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: system || 'You are a helpful school tutor. Be clear and friendly. Use plain text only, no markdown.' }] },
          contents: [{ role: 'user', parts: [{ text: prompt }] }]
        })
      }
    );
    const data = await res.json();
    if (data.error) return 'Error: ' + data.error.message;
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response received. Try again.';
  } catch (e) {
    return 'Network error. Check your connection and try again.';
  }
}

async function checkAndIncrementUsage() {
  const limit = LIMITS[userData.tier];
  const used = userData.aiUsed || 0;
  if (used >= limit) return false;
  await db.collection('users').doc(currentUser.uid).update({
    aiUsed: firebase.firestore.FieldValue.increment(1)
  });
  userData.aiUsed = used + 1;
  updateUsageBar();
  return true;
}

function showBlocked(el) {
  el.innerHTML = `<div class="blocked-overlay">
    <p>You've used all your AI messages on the <strong>${userData.tier}</strong> plan.</p>
    <button class="btn-upgrade" onclick="showUpgradeModal()">Upgrade to get more ✦</button>
  </div>`;
  el.style.display = 'block';
}

function showLoading(el) {
  el.style.display = 'block';
  el.innerHTML = '<span class="loading-dots"><span class="dot"></span><span class="dot"></span><span class="dot"></span></span>';
}

// ============================================================
//  AI TUTOR
// ============================================================
function setPrompt(t) { document.getElementById('ai-input').value = t; }

async function askAI() {
  const q = document.getElementById('ai-input').value.trim();
  if (!q) return;
  const r = document.getElementById('ai-response');
  const allowed = await checkAndIncrementUsage();
  if (!allowed) { showBlocked(r); return; }
  showLoading(r);
  const ans = await callAI(q, 'You are a friendly school tutor. Answer clearly and helpfully. Use plain text only, no markdown, no asterisks.');
  r.textContent = ans;
  r.style.display = 'block';
  unlockBadge('badge-ai');
}

function clearAI() {
  document.getElementById('ai-input').value = '';
  const r = document.getElementById('ai-response');
  r.style.display = 'none'; r.textContent = '';
}

// ============================================================
//  TOOLS
// ============================================================
function calcGrade() {
  const s = parseFloat(document.getElementById('g-score').value);
  const m = parseFloat(document.getElementById('g-max').value);
  const res = document.getElementById('grade-result');
  const barWrap = document.getElementById('grade-bar-wrap');
  const bar = document.getElementById('grade-bar');
  if (isNaN(s) || isNaN(m) || m === 0) { res.textContent = 'Please enter valid numbers.'; return; }
  const pct = Math.round((s / m) * 100);
  const letter = pct >= 90 ? 'A' : pct >= 80 ? 'B' : pct >= 70 ? 'C' : pct >= 60 ? 'D' : 'F';
  res.textContent = `${pct}% — Grade ${letter}`;
  res.style.color = pct >= 70 ? '#1D9E75' : pct >= 60 ? '#f59e0b' : '#ef4444';
  if (barWrap) { barWrap.style.display = 'block'; bar.style.width = pct + '%'; bar.className = 'usage-fill' + (pct >= 70 ? '' : pct >= 60 ? ' warning' : ' danger'); }
}

function countWords() {
  const txt = document.getElementById('wc-input').value;
  const words = txt.trim() === '' ? 0 : txt.trim().split(/\s+/).length;
  const readMins = Math.max(1, Math.round(words / 200));
  document.getElementById('wc-result').textContent = `${words} words · ${txt.length} characters · ~${readMins} min read`;
}

function handleProClick(feature) {
  if (userData && userData.tier !== 'free') return;
  const titles = { essay: 'AI Essay Feedback', flash: 'Flashcard Maker' };
  const descs = {
    essay: 'Get instant AI-powered feedback on your writing. Upgrade to Pro or Student+ to unlock.',
    flash: 'Turn your notes into flashcards instantly with AI. Upgrade to Pro or Student+ to unlock.'
  };
  document.getElementById('pro-modal-title').textContent = titles[feature] + ' is a Pro feature';
  document.getElementById('pro-modal-desc').textContent = descs[feature];
  document.getElementById('pro-modal').style.display = 'flex';
}

async function getEssayFeedback() {
  if (userData.tier === 'free') { handleProClick('essay'); return; }
  const t = document.getElementById('essay-input').value.trim();
  if (!t) return;
  const o = document.getElementById('essay-out');
  const allowed = await checkAndIncrementUsage();
  if (!allowed) { showBlocked(o); return; }
  showLoading(o);
  const ans = await callAI('Give constructive feedback on this text. Point out 2-3 strengths and 2-3 things to improve:\n\n' + t, 'You are a writing coach for students. Give friendly, honest, practical feedback. Plain text only.');
  o.textContent = ans; o.style.display = 'block';
  unlockBadge('badge-essay');
}

async function makeFlashcards() {
  if (userData.tier === 'free') { handleProClick('flash'); return; }
  const t = document.getElementById('flash-input').value.trim();
  if (!t) return;
  const o = document.getElementById('flash-out');
  const allowed = await checkAndIncrementUsage();
  if (!allowed) { showBlocked(o); return; }
  showLoading(o);
  const ans = await callAI('Create 5 flashcard Q&A pairs from this topic or notes. Format each as:\nQ: [question]\nA: [answer]\n\n' + t, 'You make flashcards for students. Clear Q&A pairs. Plain text only.');
  o.textContent = ans; o.style.display = 'block';
  unlockBadge('badge-flash');
}

// ============================================================
//  TIMER
// ============================================================
let timerSecs = 25 * 60, timerRunning = false, timerInterval = null;
function fmtTime(s) { return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }
function setTimer(s, label) { clearInterval(timerInterval); timerRunning = false; timerSecs = s; document.getElementById('start-btn').textContent = 'Start'; document.getElementById('timer-display').textContent = fmtTime(s); document.getElementById('timer-label').textContent = label; }
function setCustomTimer() {
  const mins = parseInt(document.getElementById('custom-mins').value) || 0;
  const secs = parseInt(document.getElementById('custom-secs').value) || 0;
  const total = mins * 60 + secs;
  if (total <= 0) return;
  setTimer(total, `custom — ${mins > 0 ? mins + ' min' : ''}${secs > 0 ? ' ' + secs + ' sec' : ''}`);
}
function toggleTimer() {
  if (timerRunning) {
    clearInterval(timerInterval); timerRunning = false; document.getElementById('start-btn').textContent = 'Resume';
  } else {
    timerRunning = true; document.getElementById('start-btn').textContent = 'Pause';
    timerInterval = setInterval(() => {
      if (timerSecs > 0) { timerSecs--; document.getElementById('timer-display').textContent = fmtTime(timerSecs); }
      else { clearInterval(timerInterval); timerRunning = false; document.getElementById('start-btn').textContent = 'Start'; document.getElementById('timer-label').textContent = "time's up! great work 🎉"; unlockBadge('badge-timer'); }
    }, 1000);
  }
}
function resetTimer() { clearInterval(timerInterval); timerRunning = false; timerSecs = 25 * 60; document.getElementById('timer-display').textContent = '25:00'; document.getElementById('start-btn').textContent = 'Start'; document.getElementById('timer-label').textContent = 'pomodoro — 25 min focus'; }

// ============================================================
//  FUN
// ============================================================
async function getJoke() {
  const o = document.getElementById('joke-box');
  showLoading(o);
  const allowed = await checkAndIncrementUsage();
  if (!allowed) { showBlocked(o); return; }
  const ans = await callAI('Tell me one funny school-related joke. Just the joke, no intro.', 'You tell short funny school jokes. One joke only. Plain text.');
  o.textContent = ans;
  unlockBadge('badge-joke');
}

async function getMotivation() {
  const o = document.getElementById('motivation-box');
  showLoading(o);
  const allowed = await checkAndIncrementUsage();
  if (!allowed) { showBlocked(o); return; }
  const ans = await callAI('Give me one short motivational message for a student who is studying. Genuine, not cliché. Max 2 sentences.', 'You give short real motivational messages to students. Plain text only.');
  o.textContent = ans;
}

async function getStudyFact() {
  const o = document.getElementById('fact-box');
  showLoading(o);
  const allowed = await checkAndIncrementUsage();
  if (!allowed) { showBlocked(o); return; }
  const ans = await callAI('Give me one surprising fact about learning, memory, the brain, or a school subject. 2-3 sentences.', 'You share interesting educational facts. Be specific and genuinely interesting. Plain text only.');
  o.textContent = ans;
}

// ============================================================
//  ACHIEVEMENTS
// ============================================================
function unlockBadge(id) {
  const badge = document.getElementById(id);
  if (badge) badge.classList.add('unlocked');
}

// ============================================================
//  NAV & MODALS
// ============================================================
function showSection(id, btn) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('visible'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('sec-' + id).classList.add('visible');
  btn.classList.add('active');
}

function showUpgradeModal() { document.getElementById('upgrade-modal').style.display = 'flex'; }
function closeUpgradeModal() { document.getElementById('upgrade-modal').style.display = 'none'; }
function closeModalOutside(e) { if (e.target.id === 'upgrade-modal') closeUpgradeModal(); }
function closeProModal() { document.getElementById('pro-modal').style.display = 'none'; }
function closeProModalOutside(e) { if (e.target.id === 'pro-modal') closeProModal(); }

async function signOut() {
  await auth.signOut();
  window.location.href = 'index.html';
}
