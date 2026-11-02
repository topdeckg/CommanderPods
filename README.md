# Commander Pod Generator

A small, offline-friendly tool for seating casual, unofficial Commander events. It uses plain HTML, CSS, and vanilla JavaScript; there is no backend, account, build step, external font, or CDN.

## Run it

Open `index.html` directly in a modern browser. If your browser restricts local scripts opened with `file://`, serve the folder locally instead:

```sh
npx serve .
```

Then open the local URL printed by `serve`. Once loaded, the app does not make network requests. Player lists, sit-out flags, the round count, and round history are saved in that browser's `localStorage`.

## Use it

- Add players by entering a name and pressing **Add** or Enter.
- Mark players to sit out before generating a round. Those players are excluded from that round, and all sit-out flags clear after a successful generation.
- **Reshuffle** deals the same participants again without advancing the round number.
- **Reset event** clears the round history and counter but keeps the roster.
- Set the round timer length in minutes, then use **Start/Pause** and **Reset** as needed. A running timer continues across page refreshes.

Pods are normally four players. The generator prefers 3-player pods to 2-player pods; 2-player pods are used only for 2 or 5 active players.

## Tests

Requires Node.js. From this folder, run:

```sh
node --test pods.test.js
```
