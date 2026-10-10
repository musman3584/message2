
(() => {
  const SC = 21;
  const OY = 20;
  const DURATION = 10000;
  const ANIM = 42;
  const LIFT = 34;
  const GAP = 7;

  const SIZES = [9, 10, 11, 12];
  const FONT = "Arial";
  const BG = "#060208";
  const FLASH = [1, 0.78, 0.78];
  const BGC = [6 / 255, 2 / 255, 8 / 255];

  const PHRASES = [
    "I love you",
    "Seni seviyorum",
    "Te amo",
    "Je t'aime",
    "Ich liebe dich",
    "Ti amo",
    "Eu te amo",
    "Я тебя люблю",
    "사랑해",
    "愛してる",
    "我爱你",
    "मैं तुमसे प्यार करता हूँ",
    "Σ' αγαπώ",
    "Ik hou van jou",
    "Jag älskar dig",
    "Kocham cię",
    "ฉันรักเธอ",
    "Anh yêu em",
    "Aku cinta kamu",
    "Я тебе кохаю"
  ];

  const intro = document.getElementById("intro");
  const heartScreen = document.getElementById("heartScreen");
  const canvas = document.getElementById("heartCanvas");
  const ctx = canvas.getContext("2d");
  const audio = document.getElementById("bgMusic");
  const startBtn = document.getElementById("startBtn");
  const soundBtn = document.getElementById("soundBtn");

  let started = false;
  let lastTime = 0;
  let spawnElapsed = 0;
  let spawnIndex = 0;
  let spawning = true;

  let active = [];
  let mainItems = [];
  let ordered = [];

  let lastShimmer = 0;
  let flashUntil = new Map();

  // Repeatable random layout
  let seed = 11;

  function rand() {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 4294967296;
  }

  function choice(arr) {
    return arr[Math.floor(rand() * arr.length)];
  }

  function clamp(value) {
    return Math.max(0, Math.min(1, value));
  }

  function mix(a, b, amount) {
    return a.map((value, i) =>
      value + (b[i] - value) * amount
    );
  }

  function dim(color, amount) {
    return color.map(value => value * amount);
  }

  function hex(color) {
    return "#" + color.map(value =>
      Math.round(Math.max(0, Math.min(1, value)) * 255)
        .toString(16)
        .padStart(2, "0")
    ).join("");
  }

  function heart(angle) {
    return [
      16 * Math.pow(Math.sin(angle), 3) * SC,
      (
        13 * Math.cos(angle)
        - 5 * Math.cos(2 * angle)
        - 2 * Math.cos(3 * angle)
        - Math.cos(4 * angle)
      ) * SC + OY
    ];
  }

  const POLY = Array.from({ length: 720 }, (_, i) =>
    heart(2 * Math.PI * i / 720)
  );

  const EDGES = POLY.map((point, i) => [
    point,
    POLY[(i + 1) % POLY.length]
  ]);

  const YMAX = Math.max(...POLY.map(point => point[1]));
  const YMIN = Math.min(...POLY.map(point => point[1]));
  const CY = (YMAX + YMIN) / 2;

  function spans(y) {
    const xs = [];

    for (const [[x1, y1], [x2, y2]] of EDGES) {
      if (
        (y1 <= y && y < y2) ||
        (y2 <= y && y < y1)
      ) {
        xs.push(
          x1 + (y - y1) * (x2 - x1) / (y2 - y1)
        );
      }
    }

    xs.sort((a, b) => a - b);

    const result = [];

    for (let i = 0; i + 1 < xs.length; i += 2) {
      result.push([xs[i], xs[i + 1]]);
    }

    return result;
  }

  function intersect(a, b) {
    const result = [];

    for (const first of a) {
      for (const second of b) {
        const lo = Math.max(first[0], second[0]);
        const hi = Math.min(first[1], second[1]);

        if (hi - lo > 14) {
          result.push([lo, hi]);
        }
      }
    }

    return result;
  }

  function build() {
    seed = 11;

    const placed = [];
    let phraseOrder = [];
    let phraseIndex = 0;

    function nextPhrase() {
      if (phraseIndex >= phraseOrder.length) {
        phraseOrder = PHRASES.slice();

        for (let i = phraseOrder.length - 1; i > 0; i--) {
          const j = Math.floor(rand() * (i + 1));

          [
            phraseOrder[i],
            phraseOrder[j]
          ] = [
            phraseOrder[j],
            phraseOrder[i]
          ];
        }

        phraseIndex = 0;
      }

      return phraseOrder[phraseIndex++];
    }

    let rowH = 16;

    for (const size of SIZES) {
      ctx.font = `bold ${size}px ${FONT}`;
      rowH = Math.max(rowH, size * 1.15);
    }

    rowH += 4;
    const half = rowH / 2;

    for (
      let y = YMAX - half;
      y > YMIN + half;
      y -= rowH
    ) {
      const row = intersect(
        spans(y + half),
        spans(y - half)
      );

      for (const [lo0, hi0] of row) {
        const lo = lo0 + 4;
        const hi = hi0 - 4;
        let cur = lo + rand() * 8;
        const line = [];

        while (true) {
          let fit = null;

          for (let tries = 0; tries < 10; tries++) {
            const text = nextPhrase();
            const size = choice(SIZES);

            ctx.font = `bold ${size}px ${FONT}`;

            const width = ctx.measureText(text).width;

            if (cur + width <= hi) {
              fit = { text, size, width };
              break;
            }
          }

          if (!fit) break;

          line.push({
            x: cur + fit.width / 2,
            text: fit.text,
            size: fit.size,
            width: fit.width
          });

          cur += fit.width + GAP;
        }

        if (!line.length) continue;

        if (line.length > 1) {
          const last = line[line.length - 1];

          const left =
            hi - (last.x + last.width / 2);

          line.forEach((item, i) => {
            item.x += left * i / (line.length - 1);
          });
        } else {
          line[0].x = (lo + hi) / 2;
        }

        line.forEach((item, i) => {
          placed.push({
            x: item.x,
            y,
            text: item.text,
            size: item.size,
            edge: i === 0 || i === line.length - 1
          });
        });
      }
    }

    const wine = [0.58, 0, 0.09];
    const crimson = [0.90, 0.05, 0.14];
    const blood = [0.98, 0.10, 0.16];

    for (const item of placed) {
      const radius = Math.min(
        1,
        Math.hypot(
          item.x / (16 * SC),
          (item.y - CY) / (14.5 * SC)
        )
      );

      let color = mix(
        wine,
        crimson,
        0.25 + 0.75 * radius
      );

      color = mix(
        color,
        blood,
        rand() * 0.35 + (item.edge ? 0.3 : 0)
      );

      item.color = color.map(value => Math.min(1, value));
      item.rad = radius;
    }

    const edges = placed.filter(item => item.edge);
    const inner = placed.filter(item => !item.edge);

    edges.sort((a, b) =>
      Math.atan2(a.x, a.y - CY) -
      Math.atan2(b.x, b.y - CY)
    );

    inner.sort((a, b) =>
      (-a.rad + rand() * 0.08) -
      (-b.rad + rand() * 0.08)
    );

    return edges.concat(inner);
  }

  function drawText(text, x, y, size, color) {
    ctx.font = `bold ${size}px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }

  function spawn(item) {
    item.f = 0;
    item.dx = rand() * 20 - 10;

    item.drawShadow = {
      x: item.x + 2,
      y: -(item.y - CY) + 3,
      color: hex(dim(item.color, 0.30))
    };

    item.drawHalo = {
      x: item.x,
      y: -(item.y - CY),
      color: hex(dim(item.color, 0.20))
    };

    item.drawMain = {
      x: item.x,
      y: -(item.y - CY) - LIFT,
      color: BG
    };

    mainItems.push(item);
    active.push(item);
  }

  function animate(item) {
    item.f++;

    const progress = clamp(item.f / ANIM);
    const ease = 1 - Math.pow(1 - progress, 3);
    const color = item.color;

    const x = item.x;
    const y = -(item.y - CY);
    const hover = (1 - ease) * LIFT;

    const px = x + item.dx * (1 - ease);
    const py = y - hover;

    item.drawShadow = {
      x: px + 2,
      y: py + 3,
      color: hex(mix(BGC, dim(color, 0.30), ease))
    };

    item.drawHalo = {
      x: px,
      y: py,
      color: hex(mix(BGC, dim(color, 0.20), ease * ease))
    };

    const flash =
      0.75 * Math.sin(
        Math.PI * clamp((progress - 0.55) / 0.45)
      );

    item.drawMain = {
      x: px,
      y: py,
      color: hex(
        mix(
          mix(BGC, color, Math.pow(ease, 1.5)),
          FLASH,
          flash
        )
      )
    };

    if (progress >= 1) {
      item.drawHalo = {
        x,
        y,
        color: hex(dim(color, 0.2))
      };

      item.drawMain = {
        x,
        y,
        color: hex(color)
      };

      return false;
    }

    return true;
  }

  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, 800, 800);

    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, 800, 800);

    // Move origin to the center of the canvas.
    ctx.translate(400, 400);

    for (const item of active) {
      drawText(
        item.text,
        item.drawShadow.x,
        item.drawShadow.y,
        item.size,
        item.drawShadow.color
      );

      drawText(
        item.text,
        item.drawHalo.x,
        item.drawHalo.y,
        item.size + 1,
        item.drawHalo.color
      );

      drawText(
        item.text,
        item.drawMain.x,
        item.drawMain.y,
        item.size,
        item.drawMain.color
      );
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  function frame(now) {
    if (!started) return;

    if (!lastTime) lastTime = now;

    const delta = Math.min(40, now - lastTime);
    lastTime = now;

    if (spawning) {
      spawnElapsed += delta;

      const rate = ordered.length / DURATION;

      const shouldHaveSpawned = Math.min(
        ordered.length,
        Math.floor(spawnElapsed * rate)
      );

      while (spawnIndex < shouldHaveSpawned) {
        spawn(ordered[spawnIndex++]);
      }

      if (spawnIndex >= ordered.length) {
        spawning = false;
      }
    }

    active = active.filter(animate);

    draw();

    if (!spawning && active.length === 0) {
      shimmer(now);
      return;
    }

    requestAnimationFrame(frame);
  }

  function shimmer(now) {
    if (!started) return;

    if (now - lastShimmer > 140 && mainItems.length) {
      const item = choice(mainItems);

      flashUntil.set(item, now + 260);
      lastShimmer = now;
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, 800, 800);

    ctx.translate(400, 400);

    for (const item of mainItems) {
      const x = item.x;
      const y = -(item.y - CY);
      const flashing = (flashUntil.get(item) || 0) > now;

      drawText(
        item.text,
        x + 2,
        y + 3,
        item.size,
        hex(dim(item.color, 0.30))
      );

      drawText(
        item.text,
        x,
        y,
        item.size + 1,
        hex(dim(item.color, 0.20))
      );

      drawText(
        item.text,
        x,
        y,
        item.size,
        hex(
          flashing
            ? mix(item.color, FLASH, 0.6)
            : item.color
        )
      );
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);

    requestAnimationFrame(shimmer);
  }

  // Report a missing or invalid music file.
  audio.addEventListener("error", () => {
    console.error(
      "Music load nahi hui. Check karo music.mp3 same folder mein hai."
    );

    soundBtn.textContent = "Music file not found";
  });

  // Start the heart animation and music together.
  startBtn.addEventListener("click", async () => {
    if (started) return;

    started = true;

    intro.hidden = true;
    heartScreen.hidden = false;

    audio.currentTime = 0;

    try {
      await audio.play();
      soundBtn.textContent = "♫ Music on";
    } catch (error) {
      console.error("Audio playback failed:", error);
      soundBtn.textContent = "♫ Tap to retry";
    }

    ordered = build();

    active = [];
    mainItems = [];
    spawnIndex = 0;
    spawnElapsed = 0;
    spawning = true;
    lastTime = 0;
    lastShimmer = 0;
    flashUntil.clear();

    requestAnimationFrame(frame);
  });

  // Music on/off control.
  soundBtn.addEventListener("click", async () => {
    if (audio.paused) {
      try {
        await audio.play();
        soundBtn.textContent = "♫ Music on";
      } catch (error) {
        console.error("Audio playback failed:", error);
        soundBtn.textContent = "♫ Tap to retry";
      }
    } else {
      audio.pause();
      soundBtn.textContent = "♫ Music off";
    }
  });
})();
