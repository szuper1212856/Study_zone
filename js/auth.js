// auth.js — handles login page logic

// If already logged in, go straight to app
auth.onAuthStateChanged(user => {
  if (user) window.location.href = 'app.html';
});

// Google Sign In
document.getElementById('google-login-btn').addEventListener('click', async () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    const result = await auth.signInWithPopup(provider);
    await ensureUserDoc(result.user);
    window.location.href = 'app.html';
  } catch (e) {
    showError(e.message);
  }
});

// Email Login
async function emailLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  if (!email || !password) return showError('Please fill in all fields.');
  try {
    const result = await auth.signInWithEmailAndPassword(email, password);
    await ensureUserDoc(result.user);
    window.location.href = 'app.html';
  } catch (e) {
    showError(friendlyError(e.code));
  }
}

// Email Signup
async function emailSignup() {
  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  if (!name || !email || !password) return showError('Please fill in all fields.');
  if (password.length < 6) return showError('Password must be at least 6 characters.');
  try {
    const result = await auth.createUserWithEmailAndPassword(email, password);
    await result.user.updateProfile({ displayName: name });
    await ensureUserDoc(result.user, name);
    window.location.href = 'app.html';
  } catch (e) {
    showError(friendlyError(e.code));
  }
}

// Create user doc in Firestore if it doesn't exist
async function ensureUserDoc(user, name) {
  const ref = db.collection('users').doc(user.uid);
  const snap = await ref.get();
  if (!snap.exists) {
    await ref.set({
      name: name || user.displayName || 'Student',
      email: user.email,
      tier: 'free',          // 'free' | 'pro' | 'student_plus'
      aiUsed: 0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }
}

function switchTab(tab) {
  document.getElementById('tab-login').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('tab-signup').style.display = tab === 'signup' ? 'block' : 'none';
  document.querySelectorAll('.tab-btn').forEach((b, i) => {
    b.classList.toggle('active', (i === 0 && tab === 'login') || (i === 1 && tab === 'signup'));
  });
}

function showError(msg) {
  const el = document.getElementById('auth-error');
  el.textContent = msg;
  el.style.display = 'block';
}

function friendlyError(code) {
  const map = {
    'auth/user-not-found': 'No account found with that email.',
    'auth/wrong-password': 'Wrong password. Try again.',
    'auth/email-already-in-use': 'That email is already registered. Try logging in.',
    'auth/invalid-email': 'Invalid email address.',
    'auth/too-many-requests': 'Too many attempts. Try again later.',
  };
  return map[code] || 'Something went wrong. Try again.';
}
