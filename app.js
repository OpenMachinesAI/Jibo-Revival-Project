const progressFill = document.getElementById("progress-fill");
const progressLabel = document.getElementById("progress-label");
const commitList = document.getElementById("commit-list");
const helpersGrid = document.getElementById("helpers-grid");
const themeToggle = document.getElementById("theme-toggle");
const themeMenu = document.getElementById("theme-menu");
const musicToggle = document.getElementById("music-toggle");
const archiveTheme = document.getElementById("archive-theme");
const usableUrl = (value) => (value && !value.includes("example.com") ? value : "");
const themeKey = "jibo-revival-theme";

const applyTheme = (theme) => {
  if (theme === "default") {
    document.body.removeAttribute("data-theme");
  } else {
    document.body.dataset.theme = theme;
  }
  localStorage.setItem(themeKey, theme);
};

applyTheme(localStorage.getItem(themeKey) || "default");

const progressValue = Math.max(0, Math.min(projectProgress.percentage || 0, 100));
progressFill.style.width = `${progressValue}%`;
progressLabel.textContent = `${progressValue}% complete`;

commits.forEach((entry) => {
  const card = document.createElement("article");
  card.className = "timeline-card";

  const authorsText = (entry.authors || [])
    .map((id) => authors[id]?.name)
    .filter(Boolean)
    .join(", ");

  const chipMarkup = (entry.categories || [])
    .map((category) => `<span class="chip">${category}</span>`)
    .join("");

  const formattedDate = new Date(`${entry.date}T12:00:00`).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  card.innerHTML = `
    <p class="timeline-card__meta">${formattedDate}</p>
    <div class="timeline-card__chips">${chipMarkup}</div>
    <h3>${entry.summary}</h3>
    ${authorsText ? `<p class="timeline-card__authors">By ${authorsText}</p>` : ""}
  `;

  commitList.appendChild(card);
});

Object.values(authors).forEach((author) => {
  const authorUrl = usableUrl(author.url);
  const card = document.createElement(authorUrl ? "a" : "article");
  card.className = "helper-card";

  if (authorUrl) {
    card.href = authorUrl;
    card.target = "_blank";
    card.rel = "noreferrer";
  }

  const avatar = usableUrl(author.pfp)
    ? `<img src="${author.pfp}" alt="${author.initials}" />`
    : `<span>${author.initials}</span>`;

  card.innerHTML = `
    <div class="helper-card__avatar">${avatar}</div>
    <h3>${author.name}</h3>
    <p>${author.role || "Community Supporter"}</p>
  `;

  helpersGrid.appendChild(card);
});

const setMenuOpen = (open) => {
  themeMenu.hidden = !open;
  themeToggle.setAttribute("aria-expanded", String(open));
};

document.body.dataset.theme = document.body.dataset.theme || "default";

themeToggle.addEventListener("click", () => {
  setMenuOpen(themeMenu.hidden);
});

themeMenu.addEventListener("click", (event) => {
  const button = event.target.closest("[data-theme]");
  if (!button) return;
  applyTheme(button.dataset.theme);
  setMenuOpen(false);
});

document.addEventListener("click", (event) => {
  if (themeMenu.hidden) return;
  if (themeMenu.contains(event.target) || themeToggle.contains(event.target)) return;
  setMenuOpen(false);
});

if (musicToggle && archiveTheme) {
  musicToggle.addEventListener("click", async () => {
    if (archiveTheme.paused) {
      try {
        await archiveTheme.play();
        musicToggle.setAttribute("aria-pressed", "true");
      } catch {
        musicToggle.setAttribute("aria-pressed", "false");
      }
    } else {
      archiveTheme.pause();
      archiveTheme.currentTime = 0;
      musicToggle.setAttribute("aria-pressed", "false");
    }
  });

  archiveTheme.addEventListener("ended", () => {
    musicToggle.setAttribute("aria-pressed", "false");
  });
}
