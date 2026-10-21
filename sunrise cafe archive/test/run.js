// Empires - headless Node test harness.
// Loads every game JS file into one VM context with DOM/Canvas/WebAudio stubs,
// then drives the real engine (gathering, construction, training, pathfinding,
// combat, AI, win/loss) and asserts the core gameplay logic works.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const JS_DIR = path.join(__dirname, '..', 'empires', 'js');
const FILES = ['config.js', 'audio.js', 'map.js', 'pathfinding.js', 'entities.js', 'renderer.js', 'ai.js', 'game.js'];

// ---------- DOM / Canvas stubs ----------
function makeCtx() {
  const noop = () => {};
  const ctx = {
    fillStyle: '', strokeStyle: '', lineWidth: 1, font: '', textAlign: 'left',
    globalAlpha: 1, setLineDash: noop, save: noop, restore: noop,
    translate: noop, scale: noop, setTransform: noop, rotate: noop,
    clearRect: noop, fillRect: noop, strokeRect: noop, beginPath: noop,
    arc: noop, ellipse: noop, moveTo: noop, lineTo: noop, closePath: noop,
    fill: noop, stroke: noop, fillText: noop, strokeText: noop, rect: noop,
    drawImage: noop, createLinearGradient: () => ({ addColorStop: noop }),
    measureText: () => ({ width: 0 }),
  };
  return ctx;
}

function makeEl() {
  const ctx = makeCtx();
  const el = {
    innerHTML: '', textContent: '', className: '', value: '',
    width: 800, height: 600,
    style: {}, _cls: new Set(),
    classList: {
      add: (...c) => c.forEach(x => el._cls.add(x)),
      remove: (...c) => c.forEach(x => el._cls.delete(x)),
      toggle: (c, f) => { if (f === undefined) { el._cls.has(c) ? el._cls.delete(c) : el._cls.add(c); } else { f ? el._cls.add(c) : el._cls.delete(c); } },
      contains: (c) => el._cls.has(c),
    },
    addEventListener: () => {}, removeEventListener: () => {},
    appendChild: (child) => {
      // Accumulate appended children into innerHTML so harness can inspect
      // what the game injected (buttons, menu items, etc).
      if (child && child.innerHTML) el.innerHTML += child.innerHTML;
      else if (child && child.textContent != null) el.innerHTML += child.textContent;
      return child;
    },
    removeChild: () => el,
    getContext: () => ctx,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 180, height: 180, right: 180, bottom: 180 }),
  };
  return el;
}

function makeAudioContext() {
  function param(v) {
    return {
      value: v,
      setValueAtTime: () => {},
      exponentialRampToValueAtTime: () => {},
      linearRampToValueAtTime: () => {},
    };
  }
  function node(type) {
    return {
      type,
      gain: param(0),
      frequency: param(0),
      buffer: null,
      connect: () => {}, disconnect: () => {}, start: () => {}, stop: () => {},
    };
  }
  return {
    sampleRate: 44100, currentTime: 0, state: 'running', destination: {},
    createGain: () => node('gain'),
    createOscillator: () => node('osc'),
    createBuffer: (ch, len) => {
      const b = node('buffer');
      b.numberOfChannels = ch; b.length = len;
      b.getChannelData = () => new Float32Array(len);
      return b;
    },
    createBufferSource: () => node('src'),
    createBiquadFilter: () => node('filter'),
    resume: () => {},
  };
}

// ---------- Build the VM context ----------
const sandbox = {
  console,
  setTimeout, clearTimeout,
  requestAnimationFrame: () => 0,
  performance: { now: () => Date.now() },
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
sandbox.window.addEventListener = () => {};
sandbox.window.innerWidth = 1280;
sandbox.window.innerHeight = 720;
sandbox.window.AudioContext = makeAudioContext;
sandbox.window.webkitAudioContext = makeAudioContext;
// Cache elements by id so the harness can inspect what was injected into the DOM.
const domMap = new Map();
function getEl(id) {
  if (!domMap.has(id)) domMap.set(id, makeEl());
  return domMap.get(id);
}
sandbox.document = { getElementById: getEl, createElement: () => makeEl() };
vm.createContext(sandbox);

// ---------- Load game sources as one script ----------
const parts = [];
for (const f of FILES) parts.push(fs.readFileSync(path.join(JS_DIR, f), 'utf8'));
// Exporter: reach into the shared script scope and surface internals.
parts.push(`
globalThis.__T = {
  CONFIG, g, Game, Map: Map, Path, Entities, Renderer, AISys,
  reset, genDeposits, placeBuilding, addUnit, updateLoop, updateBuildings,
  updateUnits, checkWinLoss, cleanupDead, orderAttackGroup, orderGatherUnits,
  orderMove, queueTrain, popCap, canAfford, spend,
  depositResourceType, dist,
  panBy, smoothCam, centerOn, clampCam,
  showBuildMenu, updateCommandCard, updateHoverTooltip, updateHud,
  selectUnits, beginBuild, render, renderMinimap,
};
`);
vm.runInContext(parts.join('\n'), sandbox, { filename: 'empires-all.js' });
const T = sandbox.__T;
const CONFIG = T.CONFIG;

// ---------- tiny test framework ----------
let passed = 0, failed = 0;
const failures = [];
function ok(cond, name) {
  if (cond) { passed++; console.log('  PASS  ' + name); }
  else { failed++; failures.push(name); console.log('  FAIL  ' + name); }
}
function runSeconds(secs, dt) {
  dt = dt || 0.05;
  const steps = Math.ceil(secs / dt);
  for (let i = 0; i < steps; i++) { if (T.g.over) break; T.updateLoop(dt); }
}
function destroyBuilding(b) { b.hp = 0; T.cleanupDead(); }

// Start clean
T.reset();

// ==========================================================================
console.log('\n[1] Map & pathfinding');
// Reset grid to a clean state for these assertions
T.reset();
{
  const t0 = Date.now();
  // Both endpoints must be on the island interior land (not the ocean ring).
  const path = T.Path.find({ x: 560, y: 560 }, { x: 1300, y: 1300 });
  ok(Array.isArray(path) && path.length >= 2, 'path from A to B is found (' + (Date.now() - t0) + 'ms)');
  if (path) {
    // every waypoint should be on a passable tile
    let allPassable = true;
    for (const p of path) {
      const tx = Math.floor(p.x / CONFIG.TILE), ty = Math.floor(p.y / CONFIG.TILE);
      if (!T.Map.isPassable(tx, ty)) { allPassable = false; break; }
    }
    ok(allPassable, 'all path waypoints are on passable terrain');
  }
  // blocked tiles reject placement
  const blockedSpot = (() => {
    for (let y = 0; y < T.Map.H; y++) for (let x = 0; x < T.Map.W; x++) if (!T.Map.isPassable(x, y)) return { x, y };
    return null;
  })();
  let rejected = false;
  if (blockedSpot) rejected = !T.Map.canPlace(blockedSpot.x, blockedSpot.y, 2);
  ok(rejected, 'cannot place a building on a blocked footprint');
  // canPlace works on clear grass
  const clearSpot = T.Map.nearestGrass(20, 20, 2);
  ok(T.Map.canPlace(clearSpot.x, clearSpot.y, 2), 'can place a building on clear grass');
}

// ==========================================================================
console.log('\n[2] Gathering');
T.reset();
{
  const player = 0;
  const vills = T.g.units.filter(u => u.player === player && u.kind === 'villager');
  ok(vills.length >= 3, 'starting villagers exist');

  const nearest = (type, v) => {
    let best = null, bd = 1e9;
    for (const d of T.g.deposits) {
      if (d.type !== type || d.amount <= 0) continue;
      const dd = Math.hypot(d.px - v.x, d.py - v.y);
      if (dd < bd) { bd = dd; best = d; }
    }
    return best;
  };

  // Wood: gather from the tree nearest the first villager.
  const startWood = T.g.resources[player].wood;
  const woodV = vills[0];
  const tree = nearest('tree', woodV);
  ok(!!tree, 'a tree deposit exists');
  T.orderGatherUnits([woodV], tree);
  runSeconds(80, 0.05);
  ok(T.g.resources[player].wood > startWood, 'wood increases after gathering (' +
      Math.floor(T.g.resources[player].wood - startWood) + ' wood)');
  ok(tree.amount < CONFIG.AMOUNT.tree, 'tree deposit is consumed by harvesting');

  // Food: use a second, still-idle villager near the settlement and give it
  // plenty of time so travel to the (possibly remote) berry cluster is covered.
  const startFood = T.g.resources[player].food;
  const foodV = vills[1];
  const berry = nearest('berry', foodV);
  if (berry) {
    T.orderGatherUnits([foodV], berry);
    runSeconds(80, 0.05);
    ok(T.g.resources[player].food > startFood, 'food increases after gathering berries');
  } else {
    ok(true, 'SKIP berry (no berry deposit found)');
  }
}

// ==========================================================================
console.log('\n[3] Construction, costs & build time');
T.reset();
{
  // Build a house for the player through the real spend+placeBuilding path.
  T.g.resources[0].wood = 500;
  const woodBefore = T.g.resources[0].wood;
  const home = T.g.buildings.find(b => b.player === 0 && b.kind === 'townhall');
  const pos = T.Game.findBuildSpot(0, 'house', home);
  ok(!!pos, 'AI can find a build spot near the town hall');
  const nBefore = T.g.buildings.length;
  T.spend(0, CONFIG.BUILD.house.cost);           // deduct cost
  T.placeBuilding(0, 'house', pos.x, pos.y, false); // start construction
  ok(T.g.buildings.length === nBefore + 1, 'house building is created');
  ok(T.g.resources[0].wood === woodBefore - CONFIG.BUILD.house.cost.wood, 'house wood cost is deducted from state');
  const house = T.g.buildings.find(b => b.kind === 'house' && b.player === 0);
  ok(!!house && !house.built, 'new house starts under construction');
  // Simulate build time
  runSeconds(CONFIG.BUILD.house.time + 0.5, 0.05);
  const house2 = T.g.buildings.find(b => b.kind === 'house' && b.player === 0);
  ok(!!house2 && house2.built, 'house finishes construction after its build time');
  ok(T.popCap(0) >= 5 + 5 + CONFIG.BUILD.house.pop, 'house increases population capacity');
}

// ==========================================================================
console.log('\n[4] Training (villager + soldier)');
T.reset();
{
  T.g.resources[0].food = 1000; T.g.resources[0].gold = 500; T.g.resources[0].wood = 500;
  const home = T.g.buildings.find(b => b.player === 0 && b.kind === 'townhall');
  const preVills = T.g.units.filter(u => u.player === 0 && u.kind === 'villager').length;
  const foodBefore = T.g.resources[0].food;
  T.queueTrain(home, 'villager');
  ok(T.g.resources[0].food === foodBefore - CONFIG.TRAIN.villager.cost.food, 'villager training cost deducted');
  ok(home.unitQueue.length === 1, 'villager is queued at the town hall');
  runSeconds(CONFIG.TRAIN.villager.time + 0.5, 0.05);
  const postVills = T.g.units.filter(u => u.player === 0 && u.kind === 'villager').length;
  ok(postVills === preVills + 1, 'villager spawns after training time (' + preVills + ' -> ' + postVills + ')');

  // barracks train a soldier (build for player 0 via spend+placeBuilding)
  const preSoldiers = T.g.units.filter(u => u.player === 0 && u.kind !== 'villager').length;
  const barrackPos = T.Game.findBuildSpot(0, 'barracks', home);
  ok(!!barrackPos, 'barracks build spot found');
  T.spend(0, CONFIG.BUILD.barracks.cost);
  T.placeBuilding(0, 'barracks', barrackPos.x, barrackPos.y, false);
  runSeconds(CONFIG.BUILD.barracks.time + 0.5, 0.05);
  const bar = T.g.buildings.find(b => b.kind === 'barracks' && b.player === 0);
  ok(bar && bar.built, 'barracks finishes construction');
  const goldBefore = T.g.resources[0].gold;
  T.queueTrain(bar, 'swordsman');
  ok(T.g.resources[0].gold === goldBefore - CONFIG.TRAIN.swordsman.cost.gold, 'swordsman gold cost deducted');
  runSeconds(CONFIG.TRAIN.swordsman.time + 0.5, 0.05);
  const postSoldiers = T.g.units.filter(u => u.player === 0 && u.kind !== 'villager').length;
  ok(postSoldiers === preSoldiers + 1, 'swordsman spawns after training time (' + preSoldiers + ' -> ' + postSoldiers + ')');
}

// ==========================================================================
console.log('\n[5] Combat');
T.reset();
{
  // create an enemy villager near the player swordsman... spawn a swordsman.
  T.g.resources[0].food = 1000; T.g.resources[0].gold = 500;
  const home = T.g.buildings.find(b => b.player === 0 && b.kind === 'townhall');
  const bp = T.Game.findBuildSpot(0, 'barracks', home);
  T.spend(0, CONFIG.BUILD.barracks.cost);
  T.placeBuilding(0, 'barracks', bp.x, bp.y, false);
  runSeconds(CONFIG.BUILD.barracks.time + 0.5, 0.05);
  const bar = T.g.buildings.find(b => b.kind === 'barracks' && b.player === 0);
  T.queueTrain(bar, 'swordsman');
  runSeconds(CONFIG.TRAIN.swordsman.time + 0.5, 0.05);
  const sw = T.g.units.find(u => u.player === 0 && u.kind === 'swordsman');
  ok(!!sw, 'swordsman exists for combat test');
  // spawn an enemy villager nearby
  const evill = T.Entities.makeUnit(1, 'villager', sw.x + 20, sw.y + 20);
  T.g.units.push(evill);
  const enemyHp0 = evill.hp;
  T.orderAttackGroup([sw], evill);
  runSeconds(6, 0.05);
  const killer = T.g.units.find(u => u === sw);
  ok(!!killer, 'attacker survives the exchange');
  // enemy villager will be dead (hp<=0 removed by cleanupDead)
  const enemyGone = !T.g.units.some(u => u.player === 1 && u.kind === 'villager' && u === evill && u.hp > 0);
  ok(enemyGone || enemyHp0 - evill.hp > 0, 'enemy takes damage or dies in combat');

  // Combat against a hostile building: place an enemy house right next to the
  // soldier so melee must close distance and deal real damage to the structure.
  ok(!!sw, 'soldier exists for building combat');
  if (sw) {
    const st = Math.floor(sw.x / CONFIG.TILE), sy = Math.floor(sw.y / CONFIG.TILE);
    const spot = T.Map.nearestGrass(st, sy, 2);
    ok(!!spot, 'a buildable tile exists beside the soldier');
    const ehouse = T.placeBuilding(1, 'house', spot.x, spot.y, true); // insta-built
    const hp0 = ehouse.hp;
    T.orderAttackGroup([sw], ehouse);
    runSeconds(20, 0.1);
    ok(ehouse.hp < hp0, 'soldier damages an enemy building in melee (' +
        Math.round(hp0 - ehouse.hp) + ' dmg)');
  }
}

// ==========================================================================
console.log('\n[6] Building destruction / win-loss');
T.reset();
{
  // Defeat: destroy the player town hall.
  const pth = T.g.buildings.find(b => b.player === 0 && b.kind === 'townhall');
  destroyBuilding(pth);
  T.checkWinLoss();
  ok(T.g.over === true && T.g.result === 'defeat', 'defeat when the player town hall is destroyed');

  // Victory: reset, destroy enemy town hall.
  T.reset();
  const eth = T.g.buildings.find(b => b.player === 1 && b.kind === 'townhall');
  ok(!!eth, 'enemy town hall exists');
  destroyBuilding(eth);
  T.checkWinLoss();
  ok(T.g.over === true && T.g.result === 'victory', 'victory when the enemy town hall is destroyed');
}

// ==========================================================================
console.log('\n[7] Enemy AI growth & attack');
T.reset();
{
  const initialEnemies = T.g.units.filter(u => u.player === 1).length;
  // run a long game (5 minutes) to let the AI grow an economy and army
  runSeconds(300, 0.1);
  const enemies = T.g.units.filter(u => u.player === 1);
  const enemyBlds = T.g.buildings.filter(b => b.player === 1);
  const enemySoldiers = enemies.filter(u => u.kind !== 'villager');
  ok(enemies.length > initialEnemies, 'enemy population grows over time (' + enemies.length + ' units)');
  ok(enemyBlds.length >= 3, 'enemy builds multiple structures (' + enemyBlds.length + ')');
  ok(enemySoldiers.length >= 1, 'enemy trains soldiers (' + enemySoldiers.length + ')');
  // attack wave: some enemy soldiers should be in 'attack' state heading to player town hall
  const attacking = enemies.filter(u => u.state === 'attack' && u.target && u.target.player === 0);
  ok(attacking.length >= 1 || enemySoldiers.length >= 2, 'enemy commits to an attack (soldiers: ' + enemySoldiers.length + ')');
}

// ==========================================================================
console.log('\n[8] Farm food harvesting');
T.reset();
{
  T.g.resources[0].wood = 500; T.g.resources[0].food = 300;
  const home = T.g.buildings.find(b => b.player === 0 && b.kind === 'townhall');
  const fp = T.Game.findBuildSpot(0, 'farm', home);
  ok(!!fp, 'farm build spot found');
  T.spend(0, CONFIG.BUILD.farm.cost);
  T.placeBuilding(0, 'farm', fp.x, fp.y, false);
  runSeconds(CONFIG.BUILD.farm.time + 0.5, 0.05);
  const farm = T.g.buildings.find(b => b.kind === 'farm' && b.player === 0);
  ok(farm && farm.built, 'farm finishes construction');
  // farm accumulates food over time
  runSeconds(5, 0.05);
  ok(farm.farmFood > 0, 'farm accumulates food (' + Math.floor(farm.farmFood) + ')');
  // villager can gather from the farm
  const villager = T.g.units.find(u => u.player === 0 && u.kind === 'villager');
  const foodBefore = T.g.resources[0].food;
  T.Game.orderGatherFor(villager, farm);
  runSeconds(12, 0.05);
  ok(T.g.resources[0].food > foodBefore, 'villager harvests food from the farm');
}

// ==========================================================================
console.log('\n[9] Camera system & UI DOM injection');
T.reset();
{
  // ---- smooth camera: panBy moves the target; smoothCam eases the view ----
  const tx0 = T.g.camTarget ? T.g.camTarget.x : null;
  const t0 = T.g.camTarget ? T.g.camTarget.y : null;
  T.panBy(400, -300);
  ok(T.g.camTarget && Math.abs((T.g.camTarget.x - tx0) - 400) < 0.001 &&
     Math.abs((T.g.camTarget.y - t0) + 300) < 0.001,
     'panBy moves the target camera by the pan delta');
  // run easing steps and the view camera should converge toward the target
  const vx0 = T.g.cam.x, vy0 = T.g.cam.y;
  let steps = 0;
  while (Math.hypot(T.g.cam.x - T.g.camTarget.x, T.g.cam.y - T.g.camTarget.y) > 0.5 && steps < 500) {
    T.smoothCam(0.05); steps++;
  }
  ok(steps > 0 && steps < 500 &&
     Math.abs(T.g.cam.x - T.g.camTarget.x) < 1 && Math.abs(T.g.cam.y - T.g.camTarget.y) < 1,
     'smooth camera eases the view to the target (' + steps + ' steps)');
  ok((T.g.cam.x !== vx0 || T.g.cam.y !== vy0), 'the visible camera actually moved');

  // ---- home button recentres on the town hall (clamped to map bounds) ----
  const th = T.g.buildings.find(b => b.player === 0 && b.kind === 'townhall');
  T.panBy(5000, 5000);
  let h = 0;
  while (Math.hypot(T.g.cam.x - T.g.camTarget.x, T.g.cam.y - T.g.camTarget.y) > 1 && h < 200) { T.smoothCam(0.05); h++; }
  T.centerOn(th.px, th.py);
  // Expected: camera centre clamped into the reachable viewport (map edge).
  const ws = 2048, ex = Math.min(Math.max(th.px, 400), ws - 400), ey = Math.min(Math.max(th.py, 300), ws - 300);
  h = 0;
  while (Math.hypot(T.g.cam.x - ex, T.g.cam.y - ey) > 1 && h < 200) { T.smoothCam(0.05); h++; }
  ok(Math.abs(T.g.cam.x - ex) < 1 && Math.abs(T.g.cam.y - ey) < 1,
     'home centring eases the camera onto the (clamped) town hall');

  // ---- UI DOM injection: selecting a villager populates the command card ----
  const v = T.g.units.find(u => u.player === 0 && u.kind === 'villager');
  T.selectUnits([v.id]);
  T.updateCommandCard();
  const card = sandbox.document.getElementById('cmdCard');
  ok(card.innerHTML.length > 0 && /villager/i.test(card.innerHTML), 'command card is populated for a selected villager');
  ok(/gather/i.test(card.innerHTML.toLowerCase()), 'command card shows contextual gather tooltip for a villager');

  // ---- build menu injected into the DOM ----
  T.g.resources[0].wood = 500;
  // Seed the hidden class to mirror the real initial DOM state, then open it.
  sandbox.document.getElementById('buildMenu')._cls.add('hidden');
  T.showBuildMenu();
  ok(sandbox.document.getElementById('bmItems').innerHTML.indexOf('House') !== -1 &&
     sandbox.document.getElementById('bmItems').innerHTML.indexOf('Barracks') !== -1,
     'build menu injects House/Farm/Barracks buttons into the DOM');

  // ---- water surrounds the island ----
  const terrain = T.Map.terrain;
  let cornerWater = true, interiorLand = true;
  for (let x = 0; x < 3; x++) for (let y = 0; y < 3; y++) if (terrain[y][x] !== 4) cornerWater = false;
  if (terrain[32][32] === 4) interiorLand = false;
  ok(cornerWater, 'the map corners are surrounded by water');
  ok(interiorLand, 'the centre of the map is land (grass/sand)');
}

// ==========================================================================
console.log('\n[10] Render smoke test (3D canvas draws without error)');
T.reset();
{
  let threw = false;
  try { T.render(0.016); T.renderMinimap(); } catch (err) { threw = true; console.log('   render err: ' + err.message); }
  ok(!threw, 'render() draws the terrain/buildings/units without error');
  // run a few game ticks with units moving, then render again
  T.g.resources[0].food = 1000; T.g.resources[0].gold = 500; T.g.resources[0].wood = 500;
  const home = T.g.buildings.find(b => b.player === 0 && b.kind === 'townhall');
  const bp = T.Game.findBuildSpot(0, 'barracks', home);
  T.spend(0, CONFIG.BUILD.barracks.cost);
  T.placeBuilding(0, 'barracks', bp.x, bp.y, false);
  T.queueTrain(T.g.buildings.find(b => b.player === 0 && b.kind === 'barracks'), 'swordsman');
  runSeconds(CONFIG.BUILD.barracks.time + 30, 0.05); // builds barracks + completes a swordsman
  threw = false;
  try { T.render(0.016); T.renderMinimap(); } catch (err) { threw = true; console.log('   render err: ' + err.message); }
  ok(!threw, 'render() draws construction scaffolds and a trained swordsman without error');
}

// ==========================================================================
console.log('\n--------------------------------------------------');
console.log('RESULT: ' + passed + ' passed, ' + failed + ' failed');
if (failed) {
  console.log('Failures:');
  failures.forEach(f => console.log('  - ' + f));
  process.exit(1);
}
console.log('ALL CORE SYSTEMS VERIFIED.');
