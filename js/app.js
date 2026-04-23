// app.js — main app logic

const GEMINI_API_KEY = 'AIzaSyBsGM5PIY4xOd1n3jrRnMHIxuPuANbYA-E';

// Message limits per tier
const LIMITS = {
  free: 50,
  pro: 100,
  student_plus: Infinity
};

let currentUser = null;
let userData = null;

// Auth guard — redirect to login if not signed in
auth.onAuthStateChanged(async user => {
  if (!user) {
    window.location.href = 'index.html';
    return;
  }
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
  // Avatar
  if (currentUser.photoURL) {
    const av = document.getElementById('user-avatar');
    av.src = currentUser.photoURL;
    av.style.display = 'block';
  }
  // Name
  document.getElementById('user-name').textContent = userData.name || currentUser.displayName || '';

  // Tier badge
  const badge = document.getElementById('tier-badge');
  if (userData.tier === 'student_plus') {
    badge.textContent = 'Student+';
    badge.className = 'tier-badge student-plus';
    document.getElementById('upgrade-btn').style.display = 'none';
  } else if (userData.tier === 'pro') {
    badge.textContent = 'Pro';
    badge.className = 'tier-badge pro';
  } else {
    badge.textContent = 'Free';
    badge.className = 'tier-badge';
  }
}

function updateUsageBar() {
  const limit = LIMITS[userData.tier];
  const used = userData.aiUsed || 0;
  const isUnlimited = limit === Infinity;

  const text = document.getElementById('usage-text');
  const fill = document.getElementById('usage-fill');

  if (isUnlimited) {
    text.textContent = `${used} AI messages used — unlimited on Student+`;
    fill.style.width = '100%';
    fill.className = 'usage-fill';
    return;
  }

  const pct = Math.min((used / limit) * 100, 100);
  text.textContent = `${used} / ${limit} AI messages used`;
  fill.style.width = pct + '%';
  fill.className = 'usage-fill' + (pct >= 90 ? ' danger' : pct >= 70 ? ' warning' : '');
}

// ============================================================
//  AI CALLS
// ============================================================
async function callClaude(prompt, systemMsg) {
  const system = systemMsg || 'You are a helpful school tutor. Be clear and friendly. Use plain text, no markdown.';
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [{ parts: [{ text: prompt }] }]
      })
    }
  );
  const d = await res.json();
  return d.candidates?.[0]?.content?.parts?.[0]?.text || 'Something went wrong, try again!';
}

async function checkAndIncrementUsage() {
  const limit = LIMITS[userData.tier];
  const used = userData.aiUsed || 0;

  if (used >= limit) return false; // blocked

  // Increment in Firestore
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
  const ans = await callClaude(q, 'You are a friendly school tutor. Answer clearly and helpfully in plain text. Keep it concise but thorough enough to actually help a student.');
  r.textContent = ans;
  r.style.display = 'block';
}

function clearAI() {
  document.getElementById('ai-input').value = '';
  const r = document.getElementById('ai-response');
  r.style.display = 'none';
  r.textContent = '';
}

// ============================================================
//  TOOLS
// ============================================================
function calcGrade() {
  const s = parseFloat(document.getElementById('g-score').value);
  const m = parseFloat(document.getElementById('g-max').value);
  if (isNaN(s) || isNaN(m) || m === 0) { document.getElementById('grade-result').textContent = 'Enter valid numbers'; return; }
  const pct = Math.round((s / m) * 100);
  const letter = pct >= 90 ? 'A' : pct >= 80 ? 'B' : pct >= 70 ? 'C' : pct >= 60 ? 'D' : 'F';
  document.getElementById('grade-result').textContent = pct + '% — ' + letter;
}

function countWords() {
  const txt = document.getElementById('wc-input').value;
  const words = txt.trim() === '' ? 0 : txt.trim().split(/\s+/).length;
  document.getElementById('wc-result').textContent = words + ' words · ' + txt.length + ' characters';
}

// Pro-only tool guard
function requiresPro(featureName) {
  if (userData.tier === 'free') {
    showUpgradeModal();
    return true;
  }
  return false;
}

async function getEssayFeedback() {
  if (requiresPro('Essay feedback')) return;
  const t = document.getElementById('essay-input').value.trim();
  if (!t) return;
  const o = document.getElementById('essay-out');
  const allowed = await checkAndIncrementUsage();
  if (!allowed) { showBlocked(o); return; }
  showLoading(o);
  const ans = await callClaude('Give constructive feedback on this text. Be specific. Point out 2-3 strengths and 2-3 things to improve:\n\n' + t, 'You are a writing coach for students. Give friendly, honest, practical feedback in plain text.');
  o.textContent = ans;
  o.style.display = 'block';
}

async function makeFlashcards() {
  if (requiresPro('Flashcard maker')) return;
  const t = document.getElementById('flash-input').value.trim();
  if (!t) return;
  const o = document.getElementById('flash-out');
  const allowed = await checkAndIncrementUsage();
  if (!allowed) { showBlocked(o); return; }
  showLoading(o);
  const ans = await callClaude('Create 5 flashcard Q&A pairs from this topic or notes. Format: Q: [question]\nA: [answer]\n\n' + t, 'You make flashcards for students. Use clear, memorable Q&A pairs. Plain text only.');
  o.textContent = ans;
  o.style.display = 'block';
}

// ============================================================
//  TIMER
// ============================================================
let timerSecs = 25 * 60, timerRunning = false, timerInterval = null;
function fmtTime(s) { return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }
function setTimer(s, label) { clearInterval(timerInterval); timerRunning = false; timerSecs = s; document.getElementById('start-btn').textContent = 'Start'; document.getElementById('timer-display').textContent = fmtTime(s); document.getElementById('timer-label').textContent = label; }
function toggleTimer() {
  if (timerRunning) { clearInterval(timerInterval); timerRunning = false; document.getElementById('start-btn').textContent = 'Resume'; }
  else {
    timerRunning = true; document.getElementById('start-btn').textContent = 'Pause';
    timerInterval = setInterval(() => {
      if (timerSecs > 0) { timerSecs--; document.getElementById('timer-display').textContent = fmtTime(timerSecs); }
      else { clearInterval(timerInterval); timerRunning = false; document.getElementById('start-btn').textContent = 'Start'; document.getElementById('timer-label').textContent = "time's up! great work 🎉"; }
    }, 1000);
  }
}
function resetTimer() { clearInterval(timerInterval); timerRunning = false; timerSecs = 25 * 60; document.getElementById('timer-display').textContent = '25:00'; document.getElementById('start-btn').textContent = 'Start'; document.getElementById('timer-label').textContent = 'pomodoro — 25 min focus'; }

// ============================================================
//  FUN
// ============================================================
async function getJoke() {
  const o = document.getElementById('joke-box');
  o.textContent = '...';
  const allowed = await checkAndIncrementUsage();
  if (!allowed) { showBlocked(o); return; }
  const ans = await callClaude('Tell me one funny school-related joke. Just the joke, nothing else.', 'You tell short funny school jokes. Plain text, one joke only.');
  o.textContent = ans;
}

async function getMotivation() {
  const o = document.getElementById('motivation-box');
  o.textContent = '...';
  const allowed = await checkAndIncrementUsage();
  if (!allowed) { showBlocked(o); return; }
  const ans = await callClaude('Give me one short motivational message for a student. Genuine, not cheesy.', 'You give short real motivational messages. Under 2 sentences. Plain text.');
  o.textContent = ans;
}

// ============================================================
//  NAV & MODAL
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

async function signOut() {
  await auth.signOut();
  window.location.href = 'index.html';
}
