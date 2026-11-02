(function (root, factory) {
  const pods = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = pods;
  } else {
    root.Pods = pods;
  }
})(typeof globalThis === "object" ? globalThis : this, function () {
  "use strict";

  function getPodSizes(n) {
    if (!Number.isInteger(n) || n < 0) {
      throw new RangeError("Player count must be a non-negative integer.");
    }

    if (n < 2) return [];
    if (n === 2) return [2];
    if (n === 3) return [3];
    if (n === 5) return [3, 2];

    const remainder = n % 4;
    const threeCount = remainder === 0 ? 0 : remainder === 3 ? 1 : remainder === 2 ? 2 : 3;
    const fourCount = (n - threeCount * 3) / 4;

    return [...Array(fourCount).fill(4), ...Array(threeCount).fill(3)];
  }

  function shuffle(items, random) {
    const shuffled = items.slice();
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  function buildPods(players, sitOut = [], random = Math.random) {
    if (!Array.isArray(players) || !Array.isArray(sitOut)) {
      throw new TypeError("Players and sit-out lists must be arrays.");
    }

    const sittingOut = new Set(sitOut);
    const activePlayers = players.filter((player) => !sittingOut.has(player));
    const shuffled = shuffle(activePlayers, random);
    const sizes = getPodSizes(shuffled.length);
    const pods = [];
    let offset = 0;

    for (const size of sizes) {
      pods.push(shuffled.slice(offset, offset + size));
      offset += size;
    }

    return pods;
  }

  return { getPodSizes, buildPods };
});
