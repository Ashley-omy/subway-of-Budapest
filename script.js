//single-player game
// collect as many points as possible
// consists of four rounds, each of which conststs several turns
// in each round, a player build one metro line (M1/yellow,M2/red,M3/blue,M4/green)
// in each turn, draw station cards (A,B,C,D or Joker, and switch symbol(extra pt))
//10 x 10 grid.
// ignore 'stations-min.json' unless I give up on the extra task (scoring.)
// Deak ter is a joker station (ID: 30). in other workds it counts as any types of stations.

// <rule applied for the extra task>
// there are two types of station: central platform and side platform (can be expressed in a different ways)
// if five cards of the same type have been revealed, the turn is the last turn of the round.
// station cards appear in a random order.

// One game (pseudocode)
/*
Randomize the order of metro lines
For each metro line in order:
    // One round
    While the end-of-round condition is not met:
        // One turn
        Flip a station card
        Draw a section (optional)
    Calculate round score
Calculate total score
*/

// no parallel segments
// dont cross other segments in open areas. only at stations.
//　ほかの線が使用した駅は通ってもいい。
// 現在のラウンドの線がすでに使用した駅はダメ（switchカード引いた場合を除く）

/* Appearance
    work from 1024×768 or above. 10 x 10 grid
*/
/*steps
1. menu (with the game desctiption)
2. run all rounds
3. calculate score and save it (localStorage)*/

/*
!!!!!BAD PRACTICES!!!!!!
Using var for variable declarations
Inline JavaScript in HTML (e.g., onclick attributes)
Using DOMContentLoaded
Using getElementsByTagName, getElementById, etc. (use querySelector or querySelectorAll instead)
Using alert or prompt
Using document.write()
*/

const playerNameInput = document.querySelector("#playerName");
const startButton = document.querySelector("#startGame");
const desctiptionButton = document.querySelector("#showDescription");
//const desctiptionDiv = document.querySelector("#description");
const confirmBtn = document.querySelector("#confirmStation");
const playerNameDisplay = document.querySelector("#playerNameDisplay");
const currentRound = document.querySelector("#currentRound");
const currentCard = document.querySelector("#currentCard");
const turn = document.querySelector("#turn");
const skipRound = document.querySelector("#skipRound");
const railWayScore = document.querySelector("#railWayScore");
const platformType = document.querySelector("#platformType");

const platformCat = ['center', 'side']
const ROUND = ['M1', 'M2', 'M3', 'M4']
const CARDTYPES = ['A', 'B', 'C', 'D']
//manage game state centrally
const gameState = {
    lines: [],
    stations: [],
    lineOrder: [], //rounds
    currentLineIdx: 0,
    selectedFrom: null, // either of endpoints (when no switch card)
    selectedTo: null, // new station to extend
    deck: [], //turn
    currentCard: null,
    segments: [], //[{lineId, fromId, toId}]
    visitedByLine: {}, //lineId -> Set(stationId)
    endpoints: {}, //lineId -> {a:stationId, b:stationId}
    railwayScoreCounter: 0, //index of [0, 1, 2, 4, 6, 8, 11, 14, 17, 21, 25]
    perRoundFP: [],
    centerPlatformCount: 0,
    sidePlatformCount: 0,
    turn: 0,
    isSwitch: false
};
/*eventTriggers*/
playerNameInput.addEventListener("input", () => {
    startButton.disabled = playerNameInput.value.trim().length === 0;
});

document.querySelector("#grid").addEventListener("click", (e) => {
    const cell = e.target.closest(".station");
    if (!cell) return;

    const stationId = cell.dataset.id;
    if (!stationId) return;

    selectStation(stationId);
});

confirmBtn.addEventListener("click", () => {
    confirmSegment();
});

let startTime, timerInterval;

const TYPE_COLORS = {
    "M1": "#FFD800",
    "M2": "#E41F18",
    "M3": "#005CA5",
    "M4": "#4CA22F"
};

const GRID_SIZE = 10;

/*read json data*/
Promise.all([
    fetch("stations.json").then(res => res.json()), //fetchでhttpリクエストを送る。responseオブジェクトが返る（メタデータが入っている。）response.json()でjsonファイルを抽出する。
    fetch("lines.json").then(res => res.json())
]).then(([stations, lines]) => {
    // stations: stations.json の配列
    // lines: lines.json の配列
    gameState.stations = stations;
    gameState.lines = lines;
    console.log("Fetch done:", gameState.stations, gameState.lines);

    lines.forEach(line => {
        TYPE_COLORS[line.id] = line.color;
    });
    drawGrid(GRID_SIZE, stations, lines);
});

startButton.addEventListener("click", () => {
    console.log("On Start Click: gameState.lines =", gameState.lines);
    const playerName = playerNameInput.value.trim();
    playerNameDisplay.textContent = `player: ${playerName}`;
    menuDiv.style.display = "none";
    gameDiv.style.display = "flex";
    initRound();
    initDeck();
    startTimer();
    updateCurrentCard("-");
    startGame();
});

function startTimer() {
    startTime = Date.now(); //millisec
    // setInterval(...,1000) repeat calculation every one second.
    timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        document.querySelector("#timer").textContent = `Elapsed Time: ${elapsed}s`
    }, 1000);
}
function stopTimer() {
    clearInterval(timerInterval);
}
function updateCurrentCard(cardType) {
    document.querySelector("#currentCard").textContent = `Current Card: ${cardType}`;
}

function updateRoundScores(round, score) {
    const newScore = document.createElement("div");
    newScore.innerHTML = `round ${round}: ${score}`;
    document.querySelector("#roundScores").appendChild(newScore);
}

function enableConfirmStation(enable) {
    confirmBtn.disabled = !enable;
}

function drawGrid(size, stations, lines) {
    const table = document.querySelector("#grid");
    /* create table */
    for (let y = 0; y < size; y++) {
        const tr = document.createElement("tr");

        for (let x = 0; x < size; x++) {
            const td = document.createElement("td");
            td.dataset.x = x;
            td.dataset.y = y;

            const station = stations.find(s => s.x === x && s.y === y);

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
                const startLine = lines.find(line => line.start === station.id);
                if (startLine) {
                    div.classList.add("startStation");
                    div.style.borderColor = TYPE_COLORS[startLine.name];
                    div.dataset.line = startLine.name;
                }
                td.appendChild(div);
                td.style.cursor = "pointer";
                td.addEventListener("click", () => {
                    console.log("Clicked station: ", station);
                });
            }
            tr.appendChild(td);
        }
        table.appendChild(tr);
    }
}


function shuffuleArray(arr) {
    /*Fisher-Yates*/
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/*prepare for the first round*/
function initRound() {
    gameState.lineOrder = shuffuleArray([...gameState.lines]);
    gameState.currentLineIdx = 0;

    console.log("gameState.lineOrder:", gameState.lineOrder);
}

/*Initially, there are 11 cards in the deck*/
function initDeck() {
    const cards = [
        { type: 'A', platform: 'side' },
        { type: 'B', platform: 'side' },
        { type: 'C', platform: 'side' },
        { type: 'D', platform: 'side' },
        { type: 'JOKER', platform: 'side' },
        { type: 'A', platform: 'center' },
        { type: 'B', platform: 'center' },
        { type: 'C', platform: 'center' },
        { type: 'D', platform: 'center' },
        { type: 'JOKER', platform: 'center' },
        { type: 'SWITCH', platform: 'center' }
    ];
    gameState.deck = shuffuleArray(cards);
    console.log("gameState.deck:", gameState.deck);
}

/*perpare for the new round. initialize visited lines and endpoints.*/
function startRound(lineObj) {
    //lineObj = {id, name, start, color ...} from lines.json
    const lineId = lineObj.id;
    console.log(`start round for line ${lineId}`);
    gameState.visitedByLine[lineId] = new Set();
    const startStationId = lineObj.start;
    gameState.visitedByLine[lineId].add(startStationId);
    gameState.endpoints[lineId] = {
        a: startStationId,
        b: null //endpoint is only one at the beggining of a round
    };
    console.log(gameState.endpoints[lineId]);
    currentRound.textContent = `Metro: ${lineId}`;
    currentRound.style.backgroundColor = TYPE_COLORS[lineObj.name];
}

function drawCard() {
    if (gameState.deck.length === 0) {
        updateCurrentCard("No Cards");
        return null;
    }
    const card = gameState.deck.shift();
    gameState.currentCard = card;

    //renew UI
    updateCurrentCard(card.type);
    platformType.textContent = `Platfrom: ${card.platform}`;

    console.log("Drawn card:", card);
    return card;
}

/*this function is triggered when user click a cell. make confirmation button active.*/
function selectStation(stationId) {
    const lineObj = gameState.lineOrder[gameState.currentLineIdx];
    const lineId = lineObj.id;
    const endpoints = gameState.endpoints[lineId];
    const fromCandidates = [endpoints.a, endpoints.b].filter(x => x !== null);

    // --- STEP 1: fromStation の選択 --- //
    if (gameState.selectedFrom === null) {
        if (!fromCandidates.includes(stationId)) {
            document.querySelector("#error").textContent =
                "Select one of the endpoints as the FROM station.";
            return;
        }

        gameState.selectedFrom = stationId;
        document.querySelector("#error").textContent = `From station selected: ${stationId}`;

        if (gameState.selectedFrom) {
            const elFrom = document.querySelector(`div[data-id="${gameState.selectedFrom}"]`);
            if (elFrom) elFrom.classList.add("selected-from");
        }

        return;  // toStation の選択に進む
    }

    // --- STEP 2: toStation の選択 --- //
    if (gameState.selectedTo === null) {
        if (stationId === gameState.selectedFrom) {
            document.querySelector("#error").textContent =
                "You cannot select the same station as TO.";
            return;
        }

        gameState.selectedTo = stationId;
        document.querySelector("#error").textContent = `To station selected: ${stationId}`;

        if (gameState.selectedTo) {
            const elTo = document.querySelector(`div[data-id="${gameState.selectedTo}"]`);
            if (elTo) elTo.classList.add("selected-to");
        }

        enableConfirmStation(true); // Confirm ボタンを押せるようにする
        return;
    }
}

function confirmSegment() {
    const from = gameState.selectedFrom;
    const to = gameState.selectedTo;

    if (!from || !to) {
        document.querySelector("#error").textContent =
            "Select FROM and TO stations first.";
        return;
    }

    attemptPlaceSegment(from, to);

    // リセット
    gameState.selectedFrom = null;
    gameState.selectedTo = null;
    enableConfirmStation(false);
}

/*validation of a segment*/
function attemptPlaceSegment(fromId, toId) {
    const lineObj = gameState.lineOrder[gameState.currentLineIdx];
    const lineId = lineObj.id;
    const cardObj = gameState.currentCard;

    if (!cardObj) {
        document.querySelector("#error").textContent = "No card is drawn.";
        return;
    }

    const endpoints = gameState.endpoints[lineId];
    const fromCandidates = [endpoints.a, endpoints.b].filter(x => x !== null);

    // 0. is station type valid?
    const stationObj = gameState.stations.find(s => s.id == toId);
    if (cardObj.type !== "JOKER") {
        // 中央駅(30) ならカードタイプ無視で OK
        if (toId != 30) {
            // cardObj.type と station.type が一致していないならエラー
            if (!stationObj || stationObj.type !== cardObj.type) {
                document.querySelector("#error").textContent =
                    `Selected station type (${stationObj ? stationObj.type : 'unknown'}) does not match the card type (${cardObj.type}).`;
                return;
            }
        }
    }

    if (!gameState.isSwitch) {
        // 1. fromId が endpoint である必要がある
        if (!fromCandidates.includes(fromId)) {
            document.querySelector("#error").textContent =
                `Selected FROM station is not an endpoint`;
            return;
        }
    }

    // 2. ルールチェック
    if (!canConnect(fromId, toId)) {
        document.querySelector("#error").textContent = `Illegal direction / passing through`;
        return;
    }

    if (gameState.visitedByLine[lineId].has(toId)) {
        document.querySelector("#error").textContent = `Already visited by this line`;
        return;
    }

    if (wouldCrossSegment(fromId, toId)) {
        document.querySelector("#error").textContent = `Segment would cross another line`;
        return;
    }

    // 3. OK → 線を引く
    placeSegment(lineId, fromId, toId);

    // increment turn
    gameState.turn++;
    turn.textContent = `turn: ${gameState.turn}`;

    // increment current platform type counters in gameState
    if (cardObj.platform === 'center') gameState.centerPlatformCount++;
    if (cardObj.platform === 'side') gameState.sidePlatformCount++;
}


function canConnect(id1, id2) {
    const s1 = gameState.stations.find(s => s.id == id1);
    const s2 = gameState.stations.find(s => s.id == id2);
    if (!s1 || !s2) return false;

    const dx = s2.x - s1.x;
    const dy = s2.y - s1.y;

    // 1. 方向が90°または45°であること
    const isStraight = (dx === 0 || dy === 0);
    const isDiagonal = Math.abs(dx) === Math.abs(dy);
    if (!isStraight && !isDiagonal) return false;

    // 2. 他の駅を通過しないかチェック
    for (const s of gameState.stations) {
        if (s.id === id1 || s.id === id2) continue;

        if (isPointOnSegment(s.x, s.y, s1, s2)) {
            return false;
        }
    }

    return true;
}

function isPointOnSegment(px, py, s1, s2) {
    // 直線上にあるか（クロス積 = 0）
    const cross = (px - s1.x) * (s2.y - s1.y) - (py - s1.y) * (s2.x - s1.x);
    if (cross !== 0) return false;

    // s1 と s2 の間にあるか（内積で判定）
    const dot = (px - s1.x) * (s2.x - s1.x) + (py - s1.y) * (s2.y - s1.y);
    if (dot < 0) return false;

    const squaredLen = (s2.x - s1.x) ** 2 + (s2.y - s1.y) ** 2;
    if (dot > squaredLen) return false;

    return true;
}

function highlightStation(stationId, color) {
    const el = document.querySelector(`div[data-id="${stationId}"]`);
    if (!el) return;
    el.style.backgroundColor = color;
}

function wouldCrossSegment(fromId, toId) {
    const s1 = gameState.stations.find(s => s.id == fromId);
    const s2 = gameState.stations.find(s => s.id == toId);

    for (const seg of gameState.segments) {
        const a = gameState.stations.find(s => s.id == seg.fromId);
        const b = gameState.stations.find(s => s.id == seg.toId);

        // 同じ端点は交差ではない
        if (a.id === fromId || a.id === toId || b.id === fromId || b.id === toId) {
            continue;
        }

        // 交差していたら禁止
        if (linesIntersect(s1, s2, a, b)) {
            return true;
        }
    }

    return false;
}

function linesIntersect(p1, p2, p3, p4) {

    // CCW で向きを求める
    function ccw(a, b, c) {
        return (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
    }

    const a = p1, b = p2, c = p3, d = p4;

    // 線分が交差する条件
    return (ccw(a, c, d) !== ccw(b, c, d)) &&
        (ccw(a, b, c) !== ccw(a, b, d));
}


function placeSegment(lineId, fromId, toId) {
    console.log(`Place segment ${fromId} -> ${toId} on ${lineId}`);
    gameState.segments.push({
        lineId,
        fromId,
        toId
        //Property Shorthand.　キー名と変数名が同じであればこのように短縮記法が使える。
    });
    gameState.visitedByLine[lineId].add(toId);

    // update endpoints
    const ep = gameState.endpoints[lineId];
    if (ep.a === fromId && ep.b == null) ep.b = toId;
    else if (ep.b === fromId && ep.a === null) ep.a = toId;
    else if (ep.a === fromId) ep.a = toId;
    else if (ep.b === fromId) ep.b = toId;

    // update UI
    highlightStation(toId, TYPE_COLORS[lineId]);
}

function startGame() {
    for (i = 0; i < gameState.lines.length; i++) {
        while (gameState.sidePlatformCount < 5 && gameState.centerPlatformCount < 5) {
            startRound(gameState.lineOrder[0]);
            card = drawCard();
            currentCard.textContent = `Current Card: ${card.type}`;
            currentCard.textContent = `platform: ${card.platform}`;
        }
        endRound();
    }
    calResult();
}

function endRound() {
    calRoundResult();
}
//calculate result
function calRoundResult() {

}

function calResult() {

}
