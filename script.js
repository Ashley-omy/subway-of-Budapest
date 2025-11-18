// ===============================
//  DOM 参照
// ===============================
const menuDiv = document.querySelector("#menuDiv");
const gameDiv = document.querySelector("#gameDiv");

const playerNameInput = document.querySelector("#playerName");
const startButton = document.querySelector("#startGame");
const desctiptionButton = document.querySelector("#showDescription");
const confirmBtn = document.querySelector("#confirmStation");
const playerNameDisplay = document.querySelector("#playerNameDisplay");
const currentRound = document.querySelector("#currentRound");
const currentCard = document.querySelector("#currentCard");
const turn = document.querySelector("#turn");
const skipTurnBtn = document.querySelector("#skipTurn");
const skipRoundBtn = document.querySelector("#skipRound");
const railWayScore = document.querySelector("#railWayScore");
const platformType = document.querySelector("#platformType");
const drawCardBtn = document.querySelector("#drawCardBtn");
const errorBox = document.querySelector("#error");
const messageBox = document.querySelector("#message");
const finalScoreBox = document.querySelector("#finalScore");
const roundScoresBox = document.querySelector("#roundScores");
const sideCnt = document.querySelector("#sideCnt");
const centerCnt = document.querySelector("#centerCnt");

// ===============================
//  Constant
// ===============================
const GRID_SIZE = 10;
const CELL_SIZE = 60;

const TYPE_COLORS = {
    M1: "#FFD800",
    M2: "#E41F18",
    M3: "#005CA5",
    M4: "#4CA22F"
};

// ===============================
//  GameState
// ===============================
const gameState = {
    playerName: null,
    lines: [],
    stations: [],
    lineOrder: [],
    currentLineIdx: 0,

    deck: [],
    currentCard: null,
    isSwitch: false,

    visitedByLine: {}, // lineId -> Set(stationId)
    endpoints: {},     // Set(startStationId)
    // gameState.endpoints = {
    //     0: Set([19]),        // M1 の端点 → 最初は startStation の ID だけ
    //     1: Set([28]),        // M2 の端点
    //     2: Set([3]),         // M3 の端点
    //     3: Set([39])         // M4 の端点
    // }
    segments: [],      // {lineId, fromId, toId}
    selectedFrom: null,
    selectedTo: null,

    turn: 1,
    centerPlatformCount: 0,
    sidePlatformCount: 0,
    roundShouldEnd: false,
    awaitingPlacement: false,

    railwayScoreCounter: 0,
    railwayScale: [0, 1, 2, 4, 6, 8, 11, 14, 17, 21, 25],
    perRoundFP: [],

    dataLoaded: false
};

let startTime = null;
let timerInterval = null;

const segmentsSvg = document.querySelector("#segmentsLayer");

// ===============================
//  Utility
// ===============================
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// ===============================
//  Timer
// ===============================
function startTimer() {
    startTime = Date.now();
    timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        document.querySelector("#timer").textContent = `Elapsed Time: ${elapsed}s`;
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
}

// ===============================
//  update UI 
// ===============================
function updateCurrentCard(cardType) {
    if (gameState.isSwitch) {
        currentCard.textContent = `currentCard:<SWITCH> ${cardType}`;
    } else {
        currentCard.textContent = `currentCard: ${cardType}`;
    }
}

function updateRoundScores(roundIndex, score) {
    const div = document.createElement("div");
    div.innerHTML = `<span style="display:inline-block;width:20px;"></span>round ${roundIndex}: ${score}`;
    roundScoresBox.appendChild(div);
}

function enableConfirmStation(enable) {
    confirmBtn.disabled = !enable;
}

// ===============================
//  Draw grid
// ===============================
function drawGrid(size, stations, lines) {
    const table = document.querySelector("#grid");

    for (let y = 0; y < size; y++) {
        const tr = document.createElement("tr");

        for (let x = 0; x < size; x++) {
            const td = document.createElement("td");
            td.dataset.x = x;
            td.dataset.y = y;

            const station = stations.find((s) => s.x === x && s.y === y);

            if (station) {
                const div = document.createElement("div");
                div.classList.add("station");
                div.textContent = station.type;

                div.dataset.id = station.id;
                div.dataset.type = station.type;
                div.dataset.train = station.train;
                div.dataset.side = station.side;
                div.dataset.district = station.district;

                if (station.train) {
                    div.classList.add("railwayStation");
                }

                const startLine = lines.find((line) => line.start === station.id);
                if (startLine) {
                    div.classList.add("startStation");
                    div.style.borderColor = TYPE_COLORS[startLine.name];
                    div.dataset.line = startLine.name;
                }

                td.appendChild(div);
                td.style.cursor = "pointer";
            }

            tr.appendChild(td);
        }

        table.appendChild(tr);
    }

    // SVG size adjustment（cell size × grid）
    segmentsSvg.setAttribute("width", CELL_SIZE * GRID_SIZE);
    segmentsSvg.setAttribute("height", CELL_SIZE * GRID_SIZE);
}

// ===============================
//  Read JSON
// ===============================
Promise.all([
    fetch("stations.json").then((res) => res.json()),
    fetch("lines.json").then((res) => res.json())
]).then(([stations, lines]) => {
    gameState.stations = stations;
    gameState.lines = lines;
    gameState.dataLoaded = true;

    // overwrite metro colors
    lines.forEach((line) => {
        TYPE_COLORS[line.id] = line.color;
    });

    drawGrid(GRID_SIZE, stations, lines);
});

// ===============================
//  Event Handlers
// ===============================
window.addEventListener("load", () => {
    let history = JSON.parse(localStorage.getItem("scoreHistory") || "[]");
    if (history.length === 0) return;

    const menuHighScore = document.querySelector("#menuHighScore");

    history.forEach((log) => {
        const div = document.createElement("div");
        div.textContent = `name: ${log.name}, Score: ${log.score} pts (${log.time}s)`;
        menuHighScore.appendChild(div);
    });
});

skipRoundBtn.addEventListener("click", () => {
    endRound();
})

playerNameInput.addEventListener("input", () => {
    startButton.disabled = playerNameInput.value.trim().length === 0;
});

startButton.addEventListener("click", () => {
    if (!gameState.dataLoaded) {
        errorBox.textContent = "Data is still loading...";
        return;
    }

    playerName = playerNameInput.value.trim();
    playerNameDisplay.textContent = `player: ${playerName}`;

    menuDiv.style.display = "none";
    gameDiv.style.display = "flex";


    initRoundOrder();
    startTimer();
    updateCurrentCard("-");
    startGame();
});

document.querySelector("#grid").addEventListener("click", (e) => {
    const cell = e.target.closest(".station");
    if (!cell) return;
    console.log(`cell is selected: ${cell.dataset.id}`);

    const stationId = Number(cell.dataset.id);
    if (Number.isNaN(stationId)) return;

    selectStation(stationId);
});

drawCardBtn.addEventListener("click", () => {
    if (gameState.awaitingPlacement) return;

    const card = drawCard();
    if (!card) return;

    gameState.awaitingPlacement = true;
    drawCardBtn.disabled = true;
    skipTurnBtn.disabled = false;
    confirmBtn.disabled = true;

    if (gameState.centerPlatformCount >= 5 || gameState.sidePlatformCount >= 5) {
        gameState.roundShouldEnd = true;
    }
});

confirmBtn.addEventListener("click", () => {
    confirmSegment();
});

skipTurnBtn.addEventListener("click", () => {
    if (!gameState.awaitingPlacement || !gameState.currentCard) {
        errorBox.textContent = "Draw a card first.";
        return;
    }

    turn.textContent = `turn: ${gameState.turn}`;
    errorBox.textContent = "Turn skipped.";

    endTurn();
});
// ===============================
//  Game Flow
// ===============================
function initRoundOrder() {
    gameState.lineOrder = shuffle([...gameState.lines]);
    gameState.currentLineIdx = 0;
    gameState.perRoundFP = [];
}

function startGame() {
    gameState.currentLineIdx = 0;
    startNextRound();
}

function startNextRound() {
    if (gameState.currentLineIdx >= gameState.lineOrder.length) {
        finishGame();
        return;
    }

    const lineObj = gameState.lineOrder[gameState.currentLineIdx];

    gameState.turn = 1;
    gameState.centerPlatformCount = 0;
    gameState.sidePlatformCount = 0;
    gameState.roundShouldEnd = false;
    gameState.awaitingPlacement = false;
    gameState.currentCard = null;
    gameState.isSwitch = false;

    sideCnt.textContent = `sideCnt: ${gameState.sidePlatformCount}`;
    centerCnt.textContent = `centerCnt: ${gameState.centerPlatformCount}`;

    initDeck();
    startRound(lineObj);

    drawCardBtn.disabled = false;
    skipTurnBtn.disabled = true;
    confirmBtn.disabled = true;

    errorBox.textContent = "";
}

function startRound(lineObj) {
    const lineId = lineObj.id;
    gameState.visitedByLine[lineId] = new Set();
    const startStationId = lineObj.start;
    gameState.visitedByLine[lineId].add(startStationId);
    gameState.endpoints[lineId] = new Set([startStationId]);
    console.log(`initialized endpoints: ${gameState.endpoints}`);
    currentRound.textContent = `Metro: ${lineObj.name}`;
    currentRound.style.backgroundColor = TYPE_COLORS[lineObj.name];
    turn.textContent = `turn: ${gameState.turn}`;
}

function initDeck() {
    const cards = [
        { type: "A", platform: "side" },
        { type: "B", platform: "side" },
        { type: "C", platform: "side" },
        { type: "D", platform: "side" },
        { type: "JOKER", platform: "side" },
        { type: "A", platform: "center" },
        { type: "B", platform: "center" },
        { type: "C", platform: "center" },
        { type: "D", platform: "center" },
        { type: "JOKER", platform: "center" },
        { type: "SWITCH", platform: "center" }
    ];

    gameState.deck = shuffle(cards);
}

// ===============================
//  Draw card
// ===============================
function drawCard() {
    if (gameState.deck.length === 0) {
        updateCurrentCard("No Cards");
        errorBox.textContent = "Deck empty.";
        return null;
    }

    const card = gameState.deck.shift();
    gameState.currentCard = card;
    if (gameState.currentCard) errorBox.textContent = "";

    if (card.platform === "center") gameState.centerPlatformCount++;
    console.log(`round ${gameState.currentLineIdx}: center platform cnt: ${gameState.centerPlatformCount}`);
    if (card.platform === "side") gameState.sidePlatformCount++;
    console.log(`round ${gameState.currentLineIdx}: side platform cnt: ${gameState.sidePlatformCount}`);

    centerCnt.textContent = `centerCnt: ${gameState.centerPlatformCount}`;
    sideCnt.textContent = `sideCnt: ${gameState.sidePlatformCount}`;

    updateCurrentCard(card.type);

    platformType.textContent = `platform: ${card.platform}`;
    if (card.type === "SWITCH") {
        gameState.isSwitch = true;
        console.log("SWITCH drawn. immediately draw next card.")
        return drawCard(); //automatically draw next card
    }

    return card;
}

// ===============================
//  select Station（FROM → TO）
// ===============================
function selectStation(stationId) {
    // --- calncel FROM  ---
    if (gameState.selectedFrom === stationId && gameState.selectedTo === null) {
        gameState.selectedFrom = null;
        messageBox.textContent = "";
        errorBox.textContent = "From selection cleared.";

        const el = document.querySelector(`div[data-id="${stationId}"]`);
        if (el) el.classList.remove("selected-from");
        return;
    }

    // --- calcel TO ---
    if (gameState.selectedTo === stationId) {
        gameState.selectedTo = null;
        messageBox.textContent = "";
        errorBox.textContent = "To selection cleared.";

        const el = document.querySelector(`div[data-id="${stationId}"]`);
        if (el) el.classList.remove("selected-to");
        enableConfirmStation(false);
        return;
    }

    errorBox.textContent = "";
    if (!gameState.currentCard) {
        errorBox.textContent = "Draw a card first.";
        return;
    }

    const lineObj = gameState.lineOrder[gameState.currentLineIdx];
    const lineId = lineObj.id;
    const endpoints = gameState.endpoints[lineId];
    //const fromCandidates = [endpoints.a, endpoints.b].filter((x) => x !== null);

    const visitedSet = gameState.visitedByLine[lineId] || new Set();

    // FROM unselected → FROM selected
    if (gameState.selectedFrom === null) {
        const isEndpoint = endpoints.has(stationId);
        const isOnLine = visitedSet.has(stationId);

        if (!gameState.isSwitch && !isEndpoint) {
            errorBox.textContent = "FROM station must be an endpoint.";
            return;
        }
        if (gameState.isSwitch && !isOnLine) {
            errorBox.textContent = "For switch, FROM must be a station on this line.";
            return;
        }

        gameState.selectedFrom = stationId;
        messageBox.textContent = `From station selected: ${stationId}`;

        document
            .querySelectorAll(".selected-from, .selected-to")
            .forEach((el) => el.classList.remove("selected-from", "selected-to"));

        const elFrom = document.querySelector(`div[data-id="${stationId}"]`);
        if (elFrom) elFrom.classList.add("selected-from");

        return;
    }

    // TO 未選択 → TO 選択
    if (gameState.selectedTo === null) {
        if (stationId === gameState.selectedFrom) {
            errorBox.textContent = "You cannot select the same station as TO.";
            return;
        }

        gameState.selectedTo = stationId;
        messageBox.textContent = `To station selected: ${stationId}`;

        const elTo = document.querySelector(`div[data-id="${stationId}"]`);
        if (elTo) elTo.classList.add("selected-to");

        enableConfirmStation(true);
        return;
    }
}

// ===============================
//  Confirm → Place segment
// ===============================
function confirmSegment() {
    const from = gameState.selectedFrom;
    const to = gameState.selectedTo;

    console.log(`Try to connect from: ${from}-> to: ${to}`);
    console.log();

    /*This code recognize station id:0 as null */
    // if (!from || !to) {
    //     errorBox.textContent = "Select FROM and TO stations first.";
    //     return;
    // }

    if (from === null || to === null) {
        errorBox.textContent = "Select FROM and TO stations first.";
        return;
    }

    const ok = attemptPlaceSegment(from, to);
    if (!ok) return;

    const el = document.querySelector(`div[data-id="${from}"]`);
    if (el) el.classList.remove("selected-from");

    const el1 = document.querySelector(`div[data-id="${to}"]`);
    if (el1) el1.classList.remove("selected-to");

    endTurn();
}

function endTurn() {
    console.log(`${gameState.turn} turn ends.`);
    gameState.turn++;
    turn.textContent = `turn: ${gameState.turn}`;
    platformType.textContent = "platform: ";
    currentCard.textContent = "currentCard: ";

    gameState.awaitingPlacement = false;
    gameState.selectedFrom = null;
    gameState.selectedTo = null;
    gameState.isSwitch = false;
    gameState.currentCard = null;
    enableConfirmStation(false);
    skipTurnBtn.disabled = true;
    drawCardBtn.disabled = false;

    if (gameState.roundShouldEnd || gameState.deck.length === 0) {
        endRound();
    }
    errorBox.textContent = "";
    messageBox.textContent = "";
}

// ===============================
//  Validate segmemt
// ===============================
function wouldCrossSegment(fromId, toId) {
    const s1 = gameState.stations.find((s) => s.id == fromId);
    const s2 = gameState.stations.find((s) => s.id == toId);

    for (const seg of gameState.segments) {
        const a = gameState.stations.find((s) => s.id == seg.fromId);
        const b = gameState.stations.find((s) => s.id == seg.toId);

        // 同じ駅を共有しているなら交差ではない
        if (a.id === fromId || a.id === toId || b.id === fromId || b.id === toId) {
            continue;
        }

        // 本当の交差判定
        if (linesIntersect(s1, s2, a, b)) {
            return true;
        }
    }

    return false;
}

// 2つの線分が交差するかの判定
function linesIntersect(p1, p2, p3, p4) {
    function ccw(a, b, c) {
        return (c.y - a.y) * (b.x - a.x) >
            (b.y - a.y) * (c.x - a.x);
    }

    return (
        ccw(p1, p3, p4) !== ccw(p2, p3, p4) &&
        ccw(p1, p2, p3) !== ccw(p1, p2, p4)
    );
}

function attemptPlaceSegment(fromId, toId) {
    // No parallel segments (same endpoints)
    for (const seg of gameState.segments) {
        if (
            (seg.fromId === fromId && seg.toId === toId) ||
            (seg.fromId === toId && seg.toId === fromId)
        ) {
            document.querySelector("#error").textContent =
                "A segment between these two stations already exists.";
            return;
        }
    }
    const lineObj = gameState.lineOrder[gameState.currentLineIdx];
    const lineId = lineObj.id;
    const cardObj = gameState.currentCard;

    if (!cardObj) {
        errorBox.textContent = "No card is drawn.";
        return false;
    }

    const stationObj = gameState.stations.find((s) => s.id == toId);

    // カードタイプと駅タイプの一致判定（JOKER & station id 30 例外）
    if (cardObj.type !== "JOKER" && toId !== 30) {
        if (!stationObj || stationObj.type !== cardObj.type) {
            errorBox.textContent = `Selected station type (${stationObj ? stationObj.type : "unknown"}) does not match the card type (${cardObj.type}).`;
            return false;
        }
    }

    const endpoints = gameState.endpoints[lineId];

    if (!gameState.isSwitch) {
        if (!endpoints.has(fromId)) {
            errorBox.textContent = "Selected FROM station is not an endpoint.";
            return false;
        }
    }

    if (!canConnect(fromId, toId)) {
        errorBox.textContent = "Illegal direction / passing through another station.";
        return false;
    }

    if (gameState.visitedByLine[lineId].has(toId)) {
        errorBox.textContent = "Already visited by this line.";
        return false;
    }

    if (wouldCrossSegment(fromId, toId)) {
        errorBox.textContent = "Segment would cross another line.";
        return false;
    }

    placeSegment(lineId, fromId, toId);
    errorBox.textContent = "";
    return true;
}

function canConnect(id1, id2) {
    const s1 = gameState.stations.find((s) => s.id == id1);
    const s2 = gameState.stations.find((s) => s.id == id2);
    if (!s1 || !s2) return false;

    const dx = s2.x - s1.x;
    const dy = s2.y - s1.y;

    const isStraight = dx === 0 || dy === 0;
    const isDiagonal = Math.abs(dx) === Math.abs(dy);
    if (!isStraight && !isDiagonal) return false;

    for (const s of gameState.stations) {
        if (s.id === id1 || s.id === id2) continue;
        if (isPointOnSegment(s.x, s.y, s1, s2)) {
            return false;
        }
    }

    return true;
}

function isPointOnSegment(px, py, s1, s2) {
    const cross =
        (px - s1.x) * (s2.y - s1.y) -
        (py - s1.y) * (s2.x - s1.x);
    if (cross !== 0) return false;

    const dot =
        (px - s1.x) * (s2.x - s1.x) +
        (py - s1.y) * (s2.y - s1.y);
    if (dot < 0) return false;

    const squaredLen =
        (s2.x - s1.x) ** 2 + (s2.y - s1.y) ** 2;
    if (dot > squaredLen) return false;

    return true;
}

function linesIntersect(p1, p2, p3, p4) {
    function ccw(a, b, c) {
        return (c.y - a.y) * (b.x - a.x) >
            (b.y - a.y) * (c.x - a.x);
    }

    return (
        ccw(p1, p3, p4) !== ccw(p2, p3, p4) &&
        ccw(p1, p2, p3) !== ccw(p1, p2, p4)
    );
}

function getStationCenter(station) {
    return {
        x: (station.x + 0.5) * CELL_SIZE,
        y: (station.y + 0.5) * CELL_SIZE
    };
}

function drawSegmentSvg(lineId, fromId, toId) {
    const s1 = gameState.stations.find((s) => s.id == fromId);
    const s2 = gameState.stations.find((s) => s.id == toId);
    if (!s1 || !s2) return;

    const p1 = getStationCenter(s1);
    const p2 = getStationCenter(s2);

    const lineObj = gameState.lines.find((l) => l.id === lineId);
    const color = TYPE_COLORS[lineObj.name];

    const lineEl = document.createElementNS("http://www.w3.org/2000/svg", "line");
    lineEl.setAttribute("x1", p1.x);
    lineEl.setAttribute("y1", p1.y);
    lineEl.setAttribute("x2", p2.x);
    lineEl.setAttribute("y2", p2.y);
    lineEl.setAttribute("stroke", color);
    lineEl.setAttribute("stroke-width", 6);
    lineEl.setAttribute("stroke-linecap", "round");

    segmentsSvg.appendChild(lineEl);
}

function placeSegment(lineId, fromId, toId) {
    console.log(`Place segment ${fromId} -> ${toId} on ${lineId}`);

    gameState.segments.push({ lineId, fromId, toId });
    gameState.visitedByLine[lineId].add(toId);

    const ep = gameState.endpoints[lineId];

    if (gameState.visitedByLine[lineId].size > 2) {
        if (ep.has(fromId)) {
            ep.delete(fromId);
            console.log(`removed ${fromId} from endpoints`);
        }
    }
    ep.add(toId);
    console.log(`added ${toId} to endpoints`);

    const station = gameState.stations.find(s => s.id == toId);
    if (station.train) {
        gameState.railwayScoreCounter = Math.min(
            gameState.railwayScoreCounter + 1,
            10
        );
        updateRailwayScoreDisplay();
    }
    //highlightStation(toId, TYPE_COLORS[lineId]);
    drawSegmentSvg(lineId, fromId, toId);
}
function updateRailwayScoreDisplay() {
    const scale = gameState.railwayScale;  // [0,1,2,4,...]
    const idx = gameState.railwayScoreCounter;

    railWayScore.innerHTML = `
        RailwayScore:
        ${scale.map((v, i) =>
        `<span class="${i === idx ? 'active' : ''}">${v}</span>`
    ).join(' ')}
    `;
}


function highlightStation(stationId, color) {
    const el = document.querySelector(`div[data-id="${stationId}"]`);
    if (!el) return;
    el.style.backgroundColor = color;
}

// ===============================
//  Round / Finish
// ===============================
/*
PK = Number of districts this line passes through
PM = Number of stations it touches in the district where it has the most stations
PD = Number of times it crosses the Danube
FP = (PK × PM) + PD → this round’s score */
function endRound() {
    const lineObj = gameState.lineOrder[gameState.currentLineIdx];
    const roundScore = 0;
    gameState.perRoundFP.push(roundScore);

    gameState.currentLineIdx++;
    gameState.roundShouldEnd = false;
    gameState.awaitingPlacement = false;
    gameState.currentCard = null;

    drawCardBtn.disabled = true;
    skipTurnBtn.disabled = true;
    confirmBtn.disabled = true;

    console.log(`${gameState.currentLineIdx} round ends.`);
    const lineId = lineObj.id;
    const visited = gameState.visitedByLine[lineId];

    // --- calculate round score ---
    const districtCount = {};
    visited.forEach(id => {
        const station = gameState.stations.find(s => s.id == id);
        const d = station.district;
        districtCount[d] = (districtCount[d] || 0) + 1;
    });
    // Number of districts covered
    const PK = Object.keys(districtCount).length;
    //Maximum number of stations in a single district 
    const PM = Math.max(...Object.values(districtCount));
    //Number of Danube crossings
    let PD = 0;
    for (let seg of gameState.segments.filter(s => s.lineId == lineId)) {
        const a = gameState.stations.find(st => st.id == seg.fromId);
        const b = gameState.stations.find(st => st.id == seg.toId);

        if (a.side !== b.side) PD++;
    }

    const FP = PK * PM + PD;
    console.log(`round score: FP = PK * PD = ${PK}*${PM}+${PD} = FP`)
    gameState.perRoundFP.push(FP);

    updateRoundScores(gameState.currentLineIdx, FP);

    console.log(`Round score FP =`, FP);

    startNextRound();
}
/*
Rounds: sum of all FP values → Sum(FP) = (FP1 + FP2 + FP3 + FP4)
Railway stations: add the final PP (railway points from the track)
Junctions: We count how many stations are served by two different metro lines (CSP2), how many by three different lines (CSP3), and how many by all four metro lines (CSP4). Junctions with two metro lines are worth 2 points, those with three lines are worth 5 points, and those with four lines are worth 9 points (these are busy hubs, so they earn a bunch of junction points).
Final score = Sum(FP) + PP + (2 × CSP2) + (5 × CSP3) + (9 × CSP4)
*/
function countJunctions() {
    const stationMap = {}; // stationId → Set(lineId)

    for (const seg of gameState.segments) {
        if (!stationMap[seg.fromId]) stationMap[seg.fromId] = new Set();
        if (!stationMap[seg.toId]) stationMap[seg.toId] = new Set();

        stationMap[seg.fromId].add(seg.lineId);
        stationMap[seg.toId].add(seg.lineId);
    }

    let CSP2 = 0, CSP3 = 0, CSP4 = 0;

    for (const id in stationMap) {
        const count = stationMap[id].size;
        if (count === 2) CSP2++;
        else if (count === 3) CSP3++;
        else if (count === 4) CSP4++;
    }

    return { CSP2, CSP3, CSP4 };
}

function calResult() {
    const FPsum = gameState.perRoundFP.reduce((a, b) => a + b, 0);

    // Railway scale
    const PP = gameState.railwayScale[gameState.railwayScoreCounter];

    // Junctions
    const { CSP2, CSP3, CSP4 } = countJunctions();

    const junctionScore =
        (2 * CSP2) +
        (5 * CSP3) +
        (9 * CSP4);

    const finalScore = FPsum + PP + junctionScore;
    updateFinalBreakdown({ FPsum, PP, CSP2, CSP3, CSP4, junctionScore, finalScore });
    const elapsed = Math.floor((Date.now() - startTime) / 1000);

    // 最終スコアを UI に表示（ゲーム画面側）
    document.querySelector("#finalScore").textContent =
        `Final Score: ${finalScore}`;

    return {
        score: finalScore,
        time: elapsed
    };
}

function finishGame() {
    stopTimer();
    const finalScore = calResult();

    // --- Save to localStorage--
    let history = JSON.parse(localStorage.getItem("scoreHistory") || "[]");
    history.push({
        name: playerName,
        score: finalScore.score,
        time: finalScore.time,
        date: new Date().toLocaleString()
    });

    // sort scores in descending order. If scores are same, order based on times.
    history.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.time - b.time;
    });
    skipRoundBtn.disabled = true;
    localStorage.setItem("scoreHistory", JSON.stringify(history));

    //showFinalResult(result, history);
}
function updateFinalBreakdown(result) {
    const {
        FPsum, PP,
        CSP2, CSP3, CSP4,
        junctionScore, finalScore
    } = result;

    document.querySelector("#break_FP").innerHTML =
        `• FP (round total): <strong>${FPsum}</strong>`;

    document.querySelector("#break_PP").innerHTML =
        `• Railway score (PP): <strong>${PP}</strong>`;

    document.querySelector("#break_Junctions").innerHTML =
        `• Junctions: 
        <br>&nbsp;&nbsp;- 2-line stations (CSP2): ${CSP2} × 2 = <strong>${CSP2 * 2}</strong>
        <br>&nbsp;&nbsp;- 3-line stations (CSP3): ${CSP3} × 5 = <strong>${CSP3 * 5}</strong>
        <br>&nbsp;&nbsp;- 4-line stations (CSP4): ${CSP4} × 9 = <strong>${CSP4 * 9}</strong>
        <br>Total junction score: <strong>${junctionScore}</strong>`;

    document.querySelector("#break_total").innerHTML =
        `TOTAL SCORE = <strong>${finalScore}</strong>`;
}
