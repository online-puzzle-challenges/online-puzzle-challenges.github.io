/*********************************************************
 * CONFIG & STATE
 *********************************************************/

const HALL_IDS = ["nate", "erik", "patty"];
const STORAGE_KEY = "puzzleHouseProgress";

let hallsData = {};
let currentHallId = null;

let progress = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
  unlockedRooms: {},
  revealedHints: {}
};

/*********************************************************
 * UTILITY FUNCTIONS
 *********************************************************/
function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

function normalizeInput(str) {
  return str.trim().toLowerCase();
}

function getRevealedHintCount(room) {
  return progress.revealedHints?.[room.id] || 0;
}

function revealNextHint(room) {
  if (!progress.revealedHints) progress.revealedHints = {};
  const current = getRevealedHintCount(room);
  if (current < room.hints.length) {
    progress.revealedHints[room.id] = current + 1;
    saveProgress();
  }
}

function isUnlocked(room) {
  return !!progress.unlockedRooms[room.id];
}

function attemptUnlock(room, userInput) {
  if (normalizeInput(userInput) === room.key) {
    progress.unlockedRooms[room.id] = true;
    saveProgress();
    return true;
  }
  return false;
}

function relockFromRoom(hall, roomIndex) {
  for (let i = roomIndex; i < hall.rooms.length; i++) {
    const roomId = hall.rooms[i].id;
    delete progress.unlockedRooms[roomId];
    if (progress.revealedHints) delete progress.revealedHints[roomId];
  }
  saveProgress();
}

/*********************************************************
 * HALL LOADING
 *********************************************************/
function loadHall(hallId) {
  if (hallsData[hallId]) {
    currentHallId = hallId;
    render();
    return;
  }

  fetch(`halls/${hallId}.json`)
    .then(res => {
      if (!res.ok) throw new Error("HTTP error " + res.status);
      return res.json();
    })
    .then(hall => {
      hallsData[hallId] = hall;
      currentHallId = hallId;
      render();
    })
    .catch(err => console.error("Failed to load hall:", err));
}

function populateHallDropdown() {
  const select = document.getElementById("hallSelect");
  select.innerHTML = "";

  HALL_IDS.forEach(id => {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = id.charAt(0).toUpperCase() + id.slice(1) + "’s Puzzle Hall";
    select.appendChild(option);
  });

  select.onchange = () => loadHall(select.value);
  loadHall(HALL_IDS[0]);
}

/*********************************************************
 * RENDERING
 *********************************************************/
function render() {
  const app = document.getElementById("app");
  app.innerHTML = "";

  const hall = hallsData[currentHallId];
  if (!hall) return;

  // Hall header
  const hallHeader = document.createElement("h2");
  hallHeader.textContent = hall.displayName;
  app.appendChild(hallHeader);

  // Progress bar
  const progressContainer = document.createElement("div");
  progressContainer.className = "progress-container";

  const progressBar = document.createElement("div");
  progressBar.className = "progress-bar";

  const unlockedCount = hall.rooms.filter(isUnlocked).length;
  const percentComplete = Math.round((unlockedCount / hall.rooms.length) * 100);
  progressBar.style.width = percentComplete + "%";

  progressContainer.appendChild(progressBar);
  app.appendChild(progressContainer);

  // Reset hall button
  const resetHallBtn = document.createElement("button");
  resetHallBtn.textContent = "Reset Hall Progress";
  resetHallBtn.className = "danger";
  resetHallBtn.onclick = () => {
    if (confirm("Re-lock all rooms in this hall?")) {
      relockFromRoom(hall, 0);
      render();
    }
  };
  app.appendChild(resetHallBtn);

  // Render rooms
  hall.rooms.forEach((room, index) => {
    const roomDiv = document.createElement("div");
    roomDiv.className = "room";

    const accessible = index === 0 || isUnlocked(hall.rooms[index - 1]);
    if (!accessible) {
      roomDiv.classList.add("locked");
      roomDiv.textContent = "🔒 Locked";
      app.appendChild(roomDiv);
      return;
    }

    // Room title and description
    const title = document.createElement("h3");
    title.textContent = room.title;
    roomDiv.appendChild(title);

    const desc = document.createElement("p");
    desc.innerHTML = room.description; // allows links
    roomDiv.appendChild(desc);

    // Room image(s)
    if (room.image) {
      const img = document.createElement("img");
      img.src = room.image;
      img.alt = room.title;
      roomDiv.appendChild(img);
    }
    if (room.images) {
      room.images.forEach(url => {
        const img = document.createElement("img");
        img.src = url;
        img.alt = room.title;
        roomDiv.appendChild(img);
      });
    }

    if (isUnlocked(room)) {
      const status = document.createElement("p");
      status.textContent = "✅ Unlocked";

      const relockBtn = document.createElement("button");
      relockBtn.textContent = "Re-lock from here";
      relockBtn.className = "danger";
      relockBtn.onclick = () => {
        if (confirm("This will re-lock this room and all rooms after it. Continue?")) {
          relockFromRoom(hall, index);
          render();
        }
      };

      roomDiv.appendChild(status);
      roomDiv.appendChild(relockBtn);

    } else {
      const input = document.createElement("input");
      input.placeholder = "Enter key…";

      const btn = document.createElement("button");
      btn.textContent = "Unlock";
      btn.className = "unlock";
      btn.onclick = () => {
        if (attemptUnlock(room, input.value)) {
          alert("Unlocked!");
        } else {
          alert("Incorrect key.");
        }
        render();
      };

      roomDiv.appendChild(input);
      roomDiv.appendChild(btn);
    }

    // Hints
    const revealed = getRevealedHintCount(room);
    room.hints.forEach((hint, i) => {
      if (i < revealed) {
        const hintP = document.createElement("p");
        hintP.textContent = "💡 " + hint;
        hintP.className = "hint visible";
        roomDiv.appendChild(hintP);
      }
    });

    if (revealed < room.hints.length) {
      const hintBtn = document.createElement("button");
      hintBtn.textContent = "Reveal a hint";
      hintBtn.className = "hint";
      hintBtn.onclick = () => {
        revealNextHint(room);
        render();
      };
      roomDiv.appendChild(hintBtn);
    }

    app.appendChild(roomDiv);
  });
}

/*********************************************************
 * INITIALIZE
 *********************************************************/
populateHallDropdown();
