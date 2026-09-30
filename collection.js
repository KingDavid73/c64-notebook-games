const disks = [
  {
    title: "INSECT ATTACK", type: "ARCADE", url: "insect-attack/index.html", cover: "insect-attack/assets/insect-attack-box-art.png",
    description: "Defend Kansas farmland from enormous mutated insects in a crop-spraying helicopter.",
    story: "A chemical mishap at the nearest fertilization distributor has turned ordinary pests into bugs the size of your helicopter. Take one of three spray-equipped copters into the sky and protect the farms.",
    controls: "Move with arrows or WASD. Spray with Space or Z. Pause with P. Touch controls appear on smaller screens."
  },
  {
    title: "DOXIMODIUS", type: "ADVENTURE", url: "doximodius-rpg/index.html", cover: "doximodius-rpg/assets/doximodius-box-art.png",
    description: "Sir Bedivere and the bloodthirsty sword Dracobrane descend into a dragon's hoard.",
    story: "After losing to Sir Gareth, Bedivere seeks a sword worthy of a knight. Beyond a troubled town and the barren hills lies Doximodius, a red-gold dragon guarding Sir Tarquine's powerful sword.",
    controls: "Travel with arrows or WASD. Use Enter to act, Tab to change targets, and I to inspect. Combat actions appear in the game."
  },
  {
    title: "FOREST RUN", type: "ACTION", url: "forest-rescue/index.html", cover: "forest-rescue/assets/forest-run-box-art.png",
    description: "Cross a living forest of rocks, logs, birds, trees—and one unpredictable bear.",
    story: "Gather eight treasures among the trees while the bear closes in. Keep moving through the woodland and find your way to safety.",
    controls: "Move with arrows or WASD. Gather all eight treasures and avoid the bear. Touch controls appear on smaller screens."
  },
  {
    title: "UTILITY SUITE", type: "SOFTWARE", url: "c64-utility-suite/index.html", cover: "",
    description: "Explore Mike's planned disk, character, sprite, sound, game, and educational tools.",
    story: "The surviving notebook pages describe an organ, sprite and character editors, disk utilities, games, and lessons. Try the playable organ, labyrinth, and lemonade reconstructions.",
    controls: "Choose a program using the on-screen menu or its function-key shortcut."
  }
];

const $ = id => document.getElementById(id);
const diskButtons = [...document.querySelectorAll(".floppy")].sort((a, b) => Number(a.dataset.disk) - Number(b.dataset.disk));
const gameFrame = $("game-frame");
let selected = 0;
let view = "collection";
let loadTimers = [];

function chooseDisk(index) {
  if (view !== "collection") return;
  const previous = selected;
  selected = (index + disks.length) % disks.length;
  if (previous !== selected) {
    diskButtons[previous].classList.remove("is-passing");
    void diskButtons[previous].offsetWidth;
    diskButtons[previous].classList.add("is-passing");
    setTimeout(() => diskButtons[previous].classList.remove("is-passing"), 280);
  }
  const disk = disks[selected];
  diskButtons.forEach((button, index) => {
    button.classList.toggle("is-selected", index === selected);
    button.setAttribute("aria-pressed", String(index === selected));
  });
  const number = String(selected + 1).padStart(2, "0");
  $("disk-counter").textContent = `${number} / 04`;
  $("selected-number").textContent = `DISK ${number}`;
  $("selected-type").textContent = disk.type;
  $("selected-title").textContent = disk.title;
  $("selected-description").textContent = disk.description;
  $("detail-category").textContent = `${number} / ${disk.type}`;
  $("detail-title").textContent = disk.title;
  $("detail-description").textContent = disk.description;
  $("detail-story").textContent = disk.story;
  $("detail-controls").textContent = disk.controls;
  $("direct-link").href = disk.url;
  $("disk-details").classList.toggle("no-cover", !disk.cover);
  $("detail-cover").hidden = !disk.cover;
  if (disk.cover) {
    $("detail-cover").src = disk.cover;
    $("detail-cover").alt = `${disk.title} cover art`;
  }
  $("crt-command").textContent = `LOAD "${disk.title}",8,1`;
  $("crt-status").innerHTML = 'PRESS PLAY TO LOAD <span class="cursor">■</span>';
}

diskButtons.forEach(button => {
  const index = Number(button.dataset.disk);
  button.addEventListener("click", () => chooseDisk(index));
});
$("previous-disk").addEventListener("click", () => chooseDisk(selected - 1));
$("next-disk").addEventListener("click", () => chooseDisk(selected + 1));

function clearLoading() {
  loadTimers.forEach(clearTimeout);
  loadTimers = [];
  $("desk-scene").classList.remove("is-loading");
}

function openPlayer() {
  clearLoading();
  const disk = disks[selected];
  view = "playing";
  $("play-title").textContent = disk.title;
  $("play-graphics-mode").hidden = selected !== 1;
  $("play-text-mode").hidden = selected === 3;
  $("play-direct-link").href = disk.url;
  gameFrame.title = `${disk.title} game and controls`;
  gameFrame.src = `${disk.url}?embed=1`;
  $("play-view").hidden = false;
  $("collection").setAttribute("inert", "");
  document.body.style.overflow = "hidden";
  $("loading-announcement").textContent = `${disk.title} ready to play`;
  $("close-play").focus();
}

function playDisk() {
  if (view !== "collection") return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) { openPlayer(); return; }
  view = "loading";
  $("desk-scene").classList.add("is-loading");
  document.body.style.overflow = "hidden";
  $("loading-announcement").textContent = `Loading ${disks[selected].title}`;
  $("crt-status").textContent = `SEARCHING FOR ${disks[selected].title}`;
  loadTimers.push(setTimeout(() => { $("crt-status").textContent = `FOUND ${disks[selected].title} — LOADING`; }, 500));
  loadTimers.push(setTimeout(() => { $("crt-status").textContent = "READY. RUN"; }, 1050));
  loadTimers.push(setTimeout(openPlayer, 1700));
}

function closePlayer() {
  clearLoading();
  $("play-view").hidden = true;
  gameFrame.src = "about:blank";
  $("collection").removeAttribute("inert");
  document.body.style.overflow = "";
  view = "collection";
  chooseDisk(selected);
  $("play-disk").focus();
}

$("play-disk").addEventListener("click", playDisk);
$("close-play").addEventListener("click", closePlayer);
$("play-text-mode").addEventListener("click", () => gameFrame.contentWindow?.postMessage({type:"c64-toggle",mode:"text"},"*"));
$("play-graphics-mode").addEventListener("click", () => gameFrame.contentWindow?.postMessage({type:"c64-toggle",mode:"graphics"},"*"));
gameFrame.addEventListener("load", () => {
  if (view !== "playing" || gameFrame.getAttribute("src") === "about:blank") return;
  try {
    gameFrame.contentDocument.querySelectorAll('a[href="../index.html"]').forEach(link => {
      link.addEventListener("click", event => { event.preventDefault(); closePlayer(); });
    });
  } catch { /* The direct link above remains available if iframe access is restricted. */ }
  gameFrame.focus();
  gameFrame.contentWindow?.focus();
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    if (view === "playing" || view === "loading") closePlayer();
    return;
  }
  if (view !== "collection" || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
  event.preventDefault();
  chooseDisk(selected + (event.key === "ArrowRight" ? 1 : -1));
});

chooseDisk(0);
