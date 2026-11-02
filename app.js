(function () {
  "use strict";

  const STORAGE_KEY = "commander-pod-generator-state";
  const DEFAULT_TIMER_SECONDS = 60 * 60;
  const MAX_TIMER_SECONDS = 24 * 60 * 60;
  const elements = {
    appMessage: document.querySelector("#app-message"),
    playerCount: document.querySelector("#player-count"),
    playerForm: document.querySelector("#add-player-form"),
    playerName: document.querySelector("#player-name"),
    playerMessage: document.querySelector("#player-message"),
    playerList: document.querySelector("#player-list"),
    emptyRoster: document.querySelector("#empty-roster"),
    clearPlayers: document.querySelector("#clear-players"),
    generatePods: document.querySelector("#generate-pods"),
    reshufflePods: document.querySelector("#reshuffle-pods"),
    timerClock: document.querySelector("#timer-clock"),
    timerStatus: document.querySelector("#timer-status"),
    timerMinutes: document.querySelector("#timer-minutes"),
    timerStartPause: document.querySelector("#timer-start-pause"),
    timerReset: document.querySelector("#timer-reset"),
    roundLabel: document.querySelector("#round-label"),
    roundContent: document.querySelector("#round-content"),
    historyDetails: document.querySelector("#history-details"),
    historyCount: document.querySelector("#history-count"),
    roundHistory: document.querySelector("#round-history"),
    resetEvent: document.querySelector("#reset-event"),
  };

  function freshState() {
    return {
      players: [],
      rounds: [],
      roundCount: 0,
      timer: {
        durationSeconds: DEFAULT_TIMER_SECONDS,
        remainingSeconds: DEFAULT_TIMER_SECONDS,
        endsAt: null,
      },
    };
  }

  function loadTimer(savedTimer) {
    if (
      !savedTimer ||
      !Number.isInteger(savedTimer.durationSeconds) ||
      savedTimer.durationSeconds < 1 ||
      savedTimer.durationSeconds > MAX_TIMER_SECONDS ||
      !Number.isInteger(savedTimer.remainingSeconds) ||
      savedTimer.remainingSeconds < 0 ||
      savedTimer.remainingSeconds > MAX_TIMER_SECONDS ||
      (savedTimer.endsAt !== null && (!Number.isFinite(savedTimer.endsAt) || savedTimer.endsAt <= 0))
    ) {
      return freshState().timer;
    }

    const timer = { ...savedTimer };
    if (timer.endsAt !== null) {
      timer.remainingSeconds = Math.max(0, Math.ceil((timer.endsAt - Date.now()) / 1000));
      if (timer.remainingSeconds === 0) timer.endsAt = null;
    }
    return timer;
  }

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return freshState();

      const parsed = JSON.parse(saved);
      if (
        !parsed ||
        !Array.isArray(parsed.players) ||
        !Array.isArray(parsed.rounds) ||
        !Number.isInteger(parsed.roundCount) ||
        parsed.roundCount < 0
      ) {
        throw new Error("Saved event data has an unexpected format.");
      }

      return {
        players: parsed.players.filter(
          (player) =>
            player &&
            typeof player.id === "string" &&
            typeof player.name === "string" &&
            typeof player.sitOut === "boolean"
        ),
        rounds: parsed.rounds.filter(
          (round) =>
            round &&
            Number.isInteger(round.number) &&
            Array.isArray(round.pods) &&
            Array.isArray(round.satOut) &&
            Array.isArray(round.participants)
        ),
        roundCount: parsed.roundCount,
        timer: loadTimer(parsed.timer),
      };
    } catch (error) {
      elements.appMessage.textContent = `Could not load saved event data: ${error.message}`;
      return freshState();
    }
  }

  let state = loadState();

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (error) {
      elements.appMessage.textContent = `Could not save event data: ${error.message}`;
      return false;
    }
  }

  function makeElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function formatTimer(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainder = seconds % 60;
    return [hours, minutes, remainder].map((part) => String(part).padStart(2, "0")).join(":");
  }

  function renderTimer() {
    const timer = state.timer;
    const isRunning = timer.endsAt !== null;
    elements.timerClock.textContent = formatTimer(timer.remainingSeconds);
    elements.timerMinutes.value = String(Math.ceil(timer.durationSeconds / 60));
    elements.timerMinutes.disabled = isRunning;
    elements.timerStartPause.textContent = isRunning ? "Pause" : "Start";
    elements.timerStatus.textContent = isRunning
      ? "In progress"
      : timer.remainingSeconds === 0
        ? "Time's up!"
        : timer.remainingSeconds === timer.durationSeconds
          ? "Ready"
          : "Paused";
  }

  function tickTimer() {
    if (state.timer.endsAt === null) return;

    state.timer.remainingSeconds = Math.max(
      0,
      Math.ceil((state.timer.endsAt - Date.now()) / 1000)
    );
    if (state.timer.remainingSeconds === 0) {
      state.timer.endsAt = null;
      saveState();
    }
    renderTimer();
  }

  function readTimerDuration() {
    const minutes = Number(elements.timerMinutes.value);
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > MAX_TIMER_SECONDS / 60) {
      elements.appMessage.textContent = "Set the timer to a whole number of minutes from 1 to 1440.";
      return null;
    }
    elements.appMessage.textContent = "";
    return minutes * 60;
  }

  function renderPlayers() {
    elements.playerList.replaceChildren();
    const activeCount = state.players.filter((player) => !player.sitOut).length;
    elements.playerCount.textContent = `(${activeCount} active / ${state.players.length})`;
    elements.emptyRoster.hidden = state.players.length > 0;

    for (const player of state.players) {
      const row = makeElement("li", `player-row${player.sitOut ? " is-sitting-out" : ""}`);
      const name = makeElement("span", "player-name", player.name);
      const sitOutLabel = makeElement("label", "sit-out-label");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = player.sitOut;
      checkbox.dataset.action = "sit-out";
      checkbox.dataset.playerId = player.id;
      const toggleText = makeElement("span", "", "Sit out next round");
      sitOutLabel.append(checkbox, toggleText);

      const remove = makeElement("button", "remove-player", "×");
      remove.type = "button";
      remove.dataset.action = "remove";
      remove.dataset.playerId = player.id;
      remove.setAttribute("aria-label", `Remove ${player.name}`);

      row.append(name, sitOutLabel, remove);
      elements.playerList.append(row);
    }
  }

  function renderPodList(container, pods) {
    const grid = makeElement("div", "pod-grid");
    pods.forEach((players, index) => {
      const card = makeElement("article", "pod-card");
      card.setAttribute("aria-label", `Pod ${index + 1}`);
      card.append(makeElement("h3", "", `Pod ${index + 1}`));
      const list = document.createElement("ul");
      for (const player of players) list.append(makeElement("li", "", player));
      card.append(list);
      grid.append(card);
    });
    container.append(grid);

    if (pods.some((pod) => pod.length === 2)) {
      container.append(
        makeElement("p", "pod-warning", "There is a 2-player pod this round; this is unavoidable with this player count.")
      );
    }
  }

  function renderRound() {
    const round = state.rounds[0];
    elements.roundContent.replaceChildren();
    elements.reshufflePods.disabled = !round;

    if (!round) {
      elements.roundLabel.textContent = "No round yet";
      elements.roundContent.append(makeElement("p", "empty-state", "Your generated pods will appear here."));
      return;
    }

    elements.roundLabel.textContent = `Round ${round.number}`;
    if (round.satOut.length > 0) {
      elements.roundContent.append(
        makeElement("p", "sit-out-note", `Sat out this round: ${round.satOut.join(", ")}`)
      );
    }
    renderPodList(elements.roundContent, round.pods);
  }

  function renderHistory() {
    const isOpen = elements.historyDetails.open;
    elements.roundHistory.replaceChildren();
    elements.historyCount.textContent = `(${state.rounds.length})`;
    if (state.rounds.length === 0) {
      elements.roundHistory.append(makeElement("p", "empty-state", "No rounds yet."));
    }

    for (const round of state.rounds) {
      const entry = makeElement("article", "history-round");
      entry.append(makeElement("h3", "", `Round ${round.number}`));
      if (round.satOut.length > 0) {
        entry.append(makeElement("p", "", `Sat out: ${round.satOut.join(", ")}`));
      }
      round.pods.forEach((pod, index) => {
        entry.append(makeElement("p", "", `Pod ${index + 1}: ${pod.join(", ")}`));
      });
      elements.roundHistory.append(entry);
    }
    elements.historyDetails.open = isOpen;
  }

  function render() {
    renderPlayers();
    renderTimer();
    renderRound();
    renderHistory();
  }

  function updatePlayer(playerId, updater) {
    state.players = state.players.map((player) =>
      player.id === playerId ? updater(player) : player
    );
    saveState();
    render();
  }

  elements.playerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = elements.playerName.value.trim();
    if (!name) {
      elements.playerMessage.textContent = "Enter a player name.";
      elements.playerName.focus();
      return;
    }
    if (state.players.some((player) => player.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      elements.playerMessage.textContent = "That player is already on the list.";
      elements.playerName.focus();
      return;
    }

    state.players.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name,
      sitOut: false,
    });
    elements.playerName.value = "";
    elements.playerMessage.textContent = "";
    saveState();
    render();
    elements.playerName.focus();
  });

  elements.playerList.addEventListener("change", (event) => {
    const checkbox = event.target.closest('input[data-action="sit-out"]');
    if (!checkbox) return;
    updatePlayer(checkbox.dataset.playerId, (player) => ({
      ...player,
      sitOut: checkbox.checked,
    }));
  });

  elements.playerList.addEventListener("click", (event) => {
    const button = event.target.closest('button[data-action="remove"]');
    if (!button) return;
    state.players = state.players.filter((player) => player.id !== button.dataset.playerId);
    saveState();
    render();
  });

  elements.clearPlayers.addEventListener("click", () => {
    if (!state.players.length || !window.confirm("Remove all players from the roster?")) return;
    state.players = [];
    saveState();
    render();
    elements.playerMessage.textContent = "";
  });

  elements.generatePods.addEventListener("click", () => {
    const active = state.players.filter((player) => !player.sitOut).map((player) => player.name);
    if (active.length < 2) {
      elements.appMessage.textContent = "Need at least 2 active players.";
      return;
    }

    const satOut = state.players.filter((player) => player.sitOut).map((player) => player.name);
    const round = {
      number: state.roundCount + 1,
      pods: Pods.buildPods(active),
      satOut,
      participants: active,
    };
    state.roundCount = round.number;
    state.rounds.unshift(round);
    state.players = state.players.map((player) => ({ ...player, sitOut: false }));
    elements.appMessage.textContent = "";
    saveState();
    render();
  });

  elements.reshufflePods.addEventListener("click", () => {
    const currentRound = state.rounds[0];
    if (!currentRound) return;
    currentRound.pods = Pods.buildPods(currentRound.participants);
    elements.appMessage.textContent = "";
    saveState();
    render();
  });

  elements.resetEvent.addEventListener("click", () => {
    if (!window.confirm("Reset the event history and round count? Your players will be kept.")) return;
    state.rounds = [];
    state.roundCount = 0;
    elements.appMessage.textContent = "";
    saveState();
    render();
  });

  elements.timerMinutes.addEventListener("change", () => {
    if (state.timer.endsAt !== null) return;
    const durationSeconds = readTimerDuration();
    if (durationSeconds === null) return;
    state.timer.durationSeconds = durationSeconds;
    state.timer.remainingSeconds = durationSeconds;
    saveState();
    renderTimer();
  });

  elements.timerStartPause.addEventListener("click", () => {
    if (state.timer.endsAt !== null) {
      tickTimer();
      if (state.timer.endsAt !== null) {
        state.timer.endsAt = null;
        saveState();
      }
      renderTimer();
      return;
    }

    const durationSeconds = readTimerDuration();
    if (durationSeconds === null) return;
    state.timer.durationSeconds = durationSeconds;
    if (state.timer.remainingSeconds === 0) {
      state.timer.remainingSeconds = durationSeconds;
    }
    state.timer.endsAt = Date.now() + state.timer.remainingSeconds * 1000;
    saveState();
    renderTimer();
  });

  elements.timerReset.addEventListener("click", () => {
    const durationSeconds = readTimerDuration();
    if (durationSeconds === null) return;
    state.timer.durationSeconds = durationSeconds;
    state.timer.remainingSeconds = durationSeconds;
    state.timer.endsAt = null;
    saveState();
    renderTimer();
  });

  render();
  window.setInterval(tickTimer, 250);
})();
