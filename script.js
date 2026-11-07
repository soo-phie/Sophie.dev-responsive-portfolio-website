// ---------- Helpers ----------
const $ = (sel) => document.querySelector(sel);

function load(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch { return fallback; }
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

// ---------- Mobile menu ----------
const menuToggle = $("#menuToggle");
const nav = $("#nav");
menuToggle.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", open);
});
nav.querySelectorAll("a").forEach((a) =>
  a.addEventListener("click", () => nav.classList.remove("open"))
);

// ---------- Nebula colour theme (pink <-> violet) ----------
const themeBtn = $("#themeBtn");
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
}
let theme = load("theme", "pink");
applyTheme(theme);
themeBtn.addEventListener("click", () => {
  theme = theme === "pink" ? "violet" : "pink";
  applyTheme(theme);
  save("theme", theme);
});

// ---------- Starfield (twinkling stars + shooting stars) ----------
(function starfield() {
  const canvas = $("#stars");
  const ctx = canvas.getContext("2d");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let w, h, stars = [], shooters = [], mx = 0, my = 0;
  const colors = ["#ffffff", "#ffd1f4", "#d9c2ff", "#ff9be6"];

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    const count = Math.min(260, Math.floor((w * h) / 6500));
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.6 + 0.3,
      t: Math.random() * Math.PI * 2,
      s: Math.random() * 0.03 + 0.01,
      depth: Math.random() * 0.8 + 0.2,
      c: colors[Math.floor(Math.random() * colors.length)],
    }));
  }

  window.addEventListener("resize", resize);
  window.addEventListener("mousemove", (e) => {
    mx = (e.clientX / w - 0.5) * 18;
    my = (e.clientY / h - 0.5) * 18;
  });

  function spawnShooter() {
    shooters.push({
      x: Math.random() * w * 0.8,
      y: Math.random() * h * 0.4,
      vx: 7 + Math.random() * 4,
      vy: 3 + Math.random() * 2,
      life: 1,
    });
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);

    stars.forEach((s) => {
      s.t += s.s;
      const a = reduce ? 0.8 : 0.35 + Math.abs(Math.sin(s.t)) * 0.65;
      ctx.globalAlpha = a;
      ctx.fillStyle = s.c;
      ctx.shadowColor = s.c;
      ctx.shadowBlur = s.r * 4;
      ctx.beginPath();
      ctx.arc(s.x + mx * s.depth, s.y + my * s.depth, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.shadowBlur = 0;

    shooters = shooters.filter((s) => s.life > 0);
    shooters.forEach((s) => {
      const grad = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * 9, s.y - s.vy * 9);
      grad.addColorStop(0, `rgba(255,200,245,${s.life})`);
      grad.addColorStop(1, "rgba(255,200,245,0)");
      ctx.globalAlpha = 1;
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - s.vx * 9, s.y - s.vy * 9);
      ctx.stroke();
      s.x += s.vx; s.y += s.vy; s.life -= 0.013;
    });

    if (!reduce && Math.random() < 0.008) spawnShooter();
    ctx.globalAlpha = 1;
    requestAnimationFrame(draw);
  }

  resize();
  draw();
})();

// ---------- Task manager ----------
let tasks = load("tasks", []);
let currentFilter = "all";
const taskList = $("#taskList");
const counter = $("#counter");

function renderTasks() {
  taskList.innerHTML = "";
  const visible = tasks.filter((t) =>
    currentFilter === "all" ? true : currentFilter === "done" ? t.done : !t.done
  );

  if (visible.length === 0) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "Nothing here yet. 🎉";
    taskList.appendChild(li);
  }

  visible.forEach((task) => {
    const li = document.createElement("li");
    li.className = "task-item" + (task.done ? " done" : "");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.done;
    checkbox.addEventListener("change", () => {
      task.done = checkbox.checked;
      save("tasks", tasks);
      renderTasks();
    });

    const text = document.createElement("span");
    text.textContent = task.text; // textContent avoids HTML injection

    const del = document.createElement("button");
    del.textContent = "✕";
    del.setAttribute("aria-label", "Delete task");
    del.addEventListener("click", () => {
      tasks = tasks.filter((t) => t.id !== task.id);
      save("tasks", tasks);
      renderTasks();
    });

    li.append(checkbox, text, del);
    taskList.appendChild(li);
  });

  const remaining = tasks.filter((t) => !t.done).length;
  counter.textContent = `${remaining} task${remaining === 1 ? "" : "s"} remaining`;
}

$("#taskForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = $("#taskInput");
  const text = input.value.trim();
  if (!text) return;
  tasks.unshift({ id: Date.now(), text, done: false });
  save("tasks", tasks);
  input.value = "";
  renderTasks();
});

$("#filters").addEventListener("click", (e) => {
  const btn = e.target.closest(".filter");
  if (!btn) return;
  currentFilter = btn.dataset.filter;
  document.querySelectorAll(".filter").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  renderTasks();
});

renderTasks();

// ---------- Contact form validation ----------
$("#contactForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = $("#name").value.trim();
  const email = $("#email").value.trim();
  const message = $("#message").value.trim();
  const msg = $("#formMsg");
  msg.className = "form-msg";

  if (name.length < 2) return showError("Please enter your name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showError("Please enter a valid email.");
  if (message.length < 10) return showError("Message must be at least 10 characters.");

  msg.classList.add("success");
  msg.textContent = `Thanks, ${name}! Your message has been sent.`;
  e.target.reset();

  function showError(text) {
    msg.classList.add("error");
    msg.textContent = text;
  }
});

// ---------- Typing effect ----------
(function typing() {
  const el = $("#typed");
  const words = ["websites.", "animations.", "experiences.", "the future."];
  let w = 0, i = 0, del = false;
  function tick() {
    const word = words[w];
    el.textContent = word.slice(0, i);
    if (!del && i === word.length) { del = true; return setTimeout(tick, 1400); }
    if (del && i === 0) { del = false; w = (w + 1) % words.length; return setTimeout(tick, 350); }
    i += del ? -1 : 1;
    setTimeout(tick, del ? 45 : 95);
  }
  tick();
})();

// ---------- Scroll: fixed hero fades back, progress bar, nav, to-top ----------
const hero = $("#home");
const heroGrid = $("#heroGrid");
const toTop = $("#toTop");
const progress = $("#progress");
const pages = document.querySelectorAll(".page");
const navLinks = document.querySelectorAll(".nav a[data-link]");

function onScroll() {
  const vh = window.innerHeight;
  const y = window.scrollY;
  const p = Math.min(y / vh, 1);

  // the hero stays put; it just recedes slightly as pages slide over it
  hero.style.transform = `scale(${1 - p * 0.07})`;
  hero.style.opacity = String(1 - p * 0.75);
  heroGrid.style.transform = `translateY(${p * -30}px)`;

  const max = document.documentElement.scrollHeight - vh;
  progress.style.width = (max > 0 ? (y / max) * 100 : 0) + "%";
  toTop.classList.toggle("show", y > 400);

  let current = "home";
  pages.forEach((s) => {
    if (s.getBoundingClientRect().top <= vh * 0.4) current = s.dataset.page;
  });
  navLinks.forEach((a) => a.classList.toggle("active", a.dataset.link === current));
}
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();
toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

// ---------- Reveal on scroll + counters + skill bars ----------
function countUp(el) {
  const target = +el.dataset.count;
  const start = performance.now();
  const dur = 1600;
  (function step(now) {
    const t = Math.min((now - start) / dur, 1);
    el.textContent = Math.round(target * (1 - Math.pow(1 - t, 3)));
    if (t < 1) requestAnimationFrame(step);
  })(start);
}
const io = new IntersectionObserver((entries) => {
  entries.forEach((en) => {
    if (!en.isIntersecting) return;
    const el = en.target;
    el.classList.add("in");
    el.querySelectorAll("[data-count]").forEach(countUp);
    el.querySelectorAll(".bar").forEach((b) => (b.querySelector("i").style.width = b.dataset.level + "%"));
    io.unobserve(el);
  });
}, { threshold: 0.2 });
document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

// ---------- 3D tilt on cards ----------
document.querySelectorAll(".tilt").forEach((card) => {
  card.addEventListener("mousemove", (e) => {
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    card.style.transform = `perspective(700px) rotateX(${-y * 10}deg) rotateY(${x * 12}deg) translateY(-4px)`;
  });
  card.addEventListener("mouseleave", () => (card.style.transform = ""));
});

// ---------- Magnetic buttons ----------
document.querySelectorAll(".magnetic").forEach((btn) => {
  btn.addEventListener("mousemove", (e) => {
    const r = btn.getBoundingClientRect();
    const x = e.clientX - (r.left + r.width / 2);
    const y = e.clientY - (r.top + r.height / 2);
    btn.style.transform = `translate(${x * 0.25}px, ${y * 0.35}px)`;
  });
  btn.addEventListener("mouseleave", () => (btn.style.transform = ""));
});

// ---------- Cursor glow ----------
const glow = $("#cursorGlow");
window.addEventListener("mousemove", (e) => {
  glow.style.opacity = "1";
  glow.style.setProperty("--cx", e.clientX + "px");
  glow.style.setProperty("--cy", e.clientY + "px");
});

// ---------- Footer year ----------
$("#year").textContent = new Date().getFullYear();
