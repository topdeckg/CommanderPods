const test = require("node:test");
const assert = require("node:assert/strict");
const { buildPods, getPodSizes } = require("./pods.js");

test("pod sizes cover player counts from 0 through 30", () => {
  for (let n = 0; n <= 30; n += 1) {
    const sizes = getPodSizes(n);
    if (n <= 1) {
      assert.deepEqual(sizes, [], `no pods for n=${n}`);
      continue;
    }

    assert.equal(sizes.reduce((sum, size) => sum + size, 0), n, `sum for n=${n}`);

    if (n === 2 || n === 5) {
      assert.equal(sizes.filter((size) => size === 2).length, 1, `2-pod count for n=${n}`);
      assert.ok(sizes.every((size) => size === 2 || size === 3 || size === 4));
    } else {
      assert.ok(sizes.every((size) => size === 3 || size === 4), `pod sizes for n=${n}`);
    }
    if (n >= 6) assert.ok(!sizes.includes(2), `no 2-pod for n=${n}`);
  }
});

test("pod sizing follows the specified preferred splits", () => {
  const expected = new Map([
    [6, [3, 3]],
    [7, [4, 3]],
    [8, [4, 4]],
    [9, [3, 3, 3]],
    [10, [4, 3, 3]],
    [11, [4, 4, 3]],
    [13, [4, 3, 3, 3]],
  ]);
  for (const [count, sizes] of expected) {
    assert.deepEqual(getPodSizes(count), sizes, `n=${count}`);
  }
});

test("pod builder deals each active player once and excludes sit-outs", () => {
  const allPlayers = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
  const sitOut = ["B", "J"];
  const pods = buildPods(allPlayers, sitOut, () => 0.5);
  const dealt = pods.flat();
  const active = allPlayers.filter((player) => !sitOut.includes(player));

  assert.equal(dealt.length, active.length);
  assert.equal(new Set(dealt).size, active.length);
  assert.deepEqual([...dealt].sort(), [...active].sort());
  assert.ok(dealt.every((player) => !sitOut.includes(player)));
  assert.deepEqual(pods.map((pod) => pod.length), [4, 3, 3]);
});

test("pod sizing rejects invalid counts", () => {
  assert.throws(() => getPodSizes(-1), RangeError);
  assert.throws(() => getPodSizes(2.5), RangeError);
});
