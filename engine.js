/*********************************************************
 * CONFIG & STATE
 *********************************************************/

const HALL_IDS = ["nate", "erik", "patty"]; // IDs of available JSON halls
const STORAGE_KEY = "puzzleHouseProgress";

let hallsData = {};      // cache loaded halls
let currentHallId = null;

// Progress structure
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
  console.log("Loading hall:", hallId);

  if (hallsData[hallId]) {
    currentHallId = hallId;
    console.log("Hall cached, rendering.");
    render();
    return;
  }

  fetch(`halls/${hallId}.json`)
    .then(res => {
      console.log("Fetch response:", res);
      if (!res.ok) throw new Error("HTTP error " + res.status);
      return res.json();
    })
    .then(hall => {
      console.log("Hall loaded:", hall);
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

  // Load first hall by default
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

  const hallHeader = document.createElement("h2");
  hallHeader.textContent = hall.displayName;
  app.appendChild(hallHeader);

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

    const title = document.createElement("h3");
    title.textContent = room.title;

    const desc = document.createElement("p");
	desc.textContent = room.description; 
	desc.innerHTML = room.description // Allows links 
	roomDiv.appendChild(desc)

    roomDiv.appendChild(title);
    roomDiv.appendChild(desc);

    // Show unlocked status or input
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

      // Show any already revealed hints
      const revealed = getRevealedHintCount(room);
      for (let i = 0; i < revealed; i++) {
        const hintP = document.createElement("p");
        hintP.textContent = "💡 " + room.hints[i];
        roomDiv.appendChild(hintP);
      }

      // Show hint reveal button if more hints exist
      if (revealed < room.hints.length) {
        const hintBtn = document.createElement("button");
        hintBtn.textContent = "Reveal a hint";
        hintBtn.onclick = () => {
          revealNextHint(room);
          render();
        };
        roomDiv.appendChild(hintBtn);
      }

    } else {
      // Input for locked room
      const input = document.createElement("input");
      input.placeholder = "Enter key…";

      const btn = document.createElement("button");
      btn.textContent = "Unlock";
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

      // Show hints
      const revealed = getRevealedHintCount(room);
      for (let i = 0; i < revealed; i++) {
        const hintP = document.createElement("p");
        hintP.textContent = "💡 " + room.hints[i];
        roomDiv.appendChild(hintP);
      }

      // Reveal button if more hints
      if (revealed < room.hints.length) {
        const hintBtn = document.createElement("button");
        hintBtn.textContent = "Reveal a hint";
        hintBtn.onclick = () => {
          revealNextHint(room);
          render();
        };
        roomDiv.appendChild(hintBtn);
      }
    }

    app.appendChild(roomDiv);
  });
}

/*********************************************************
 * INITIALIZE
 *********************************************************/
populateHallDropdown();
