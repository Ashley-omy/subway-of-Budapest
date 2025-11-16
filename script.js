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


const platformCat = ['center', 'side']
const ROUND = ['M1', 'M2', 'M3', 'M4']
const CARDTYPES = ['A', 'B', 'C', 'D']
//manage game state centrally
const gameState = {
    lines: [],
    stations: [],
    lineOrder: [], //rounds
    currentLineIdx: 0,
    deck: [], //turn
    currentCard: null,
    segments: [], //[{lineId, fromId, toId}]
    visitedByLine: {}, //lineId -> Set(stationId)
    endpoints: {}, //lineId -> {a:stationId, b:stationId}
    railwayScoreCounter: 0, //index of [0, 1, 2, 4, 6, 8, 11, 14, 17, 21, 25]
    perRoundFP: [],
    centerPlatformCount: 0,
    sidePlatformCount: 0,
};

playerNameInput.addEventListener("input", () => {
    startButton.disabled = playerNameInput.value.trim().length === 0;
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
    fetch("stations.json").then(res => res.json()),
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
    startRound(gameState.lines[0]);
    startTimer();
    updateCurrentCard("-");
    updateRoundScores(0);
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

function updateRoundScores(score) {
    document.querySelector("#roundScores").textContent = `Round Scores: ${score}`;
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

function initRound() {
    gameState.lineOrder = shuffuleArray([...gameState.lines]);
    gameState.currentLineIdx = 0;

    console.log("gameState.lineOrder:", gameState.lineOrder);
}


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

/*flow controls (round and turn)*/
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
    currentRound.textContent = `Metro: ${lineId}`;
    currentRound.style.backgroundColor = TYPE_COLORS[lineObj.name];
}

function drawCard() { } // returns card or null if deck empty
function selectStation(stationId) {
    gameState.selected = stationId;
    enableConfirmStation(true)
}
function attemptPlaceSegment(stationId) {
    // 1. find fromStation candidates (endpoints of current line)
    // 2. validate rules
    // 3. if ok -> placeSegment(from,to)
}


function endRound() {
    calRoundResult();
}
//calculate result
function calRoundResult() {

}

function calResult() {

}

/*
//scorings
//PK = Number of districts this line passes through
let PK = 0;
//PM = Number of stations it touches in the district where it has the most stations
let PM = 0;
//PD = Number of times it crosses the Danube
let PD = 0;
// railway  0, 1, 2, 4, 6, 8, 11, 14, 17, 21, 25. 
const railwayScale = [0, 1, 2, 4, 6, 8, 11, 14, 17, 21, 25]
let currentScaleIdx = 0;
//FP = (PK × PM) + PD → this round’s score
/*
Rounds: sum of all FP values → Sum(FP) = (FP1 + FP2 + FP3 + FP4)
Railway stations: add the final PP (railway points from the track)
Junctions: We count how many stations are served by two different metro lines (CSP2), how many by three different lines (CSP3), and how many by all four metro lines (CSP4). Junctions with two metro lines are worth 2 points, those with three lines are worth 5 points, and those with four lines are worth 9 points (these are busy hubs, so they earn a bunch of junction points).
Final score = Sum(FP) + PP + (2 × CSP2) + (5 × CSP3) + (9 × CSP4)
*/
/*
function drawSegment() { }
function markEndPoint() { }
function markMiddlePoint() { }
function markVisited() { }

const platformCat = ['center', 'side']
let conterCnt, sideCnt = 0;
const ROUND = ['M1', 'M2', 'M3', 'M4']
const CARDTYPES = ['A', 'B', 'C', 'D']
let roundCnt, turnCnt = 0;

let round = [];

//shuffule deck and reset
function resetDeck() {
    round = [...ROUND];

    for (let i = round.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [round[i], round[j]] = [round[j], round[i]];
    }

    console.log("Deck reset:", deck);
}

function moveOntoNextRound() {
    if (round.length === 0) {
        //theoretically this condition is not used.
        console.log("Deck empty — resetting...");
        resetDeck();
    }

    const card = round.shift(); //pick the first card and remove it
    console.log("Drawn:", card);
    console.log("Remaining deck:", round);

    return round;
}
function drawCard() {
    card = CARDTYPES[Math.floor(Math.random() * CARDTYPES.length)];
}
function undefine() { }

function playRound(metro) {
    let cat;
    while (centerCnt < 5 && sideCnt < 5) {
        cat = platformCat[Math.floor(Math.random() * platformCat.length)];
        if (cat === 'center') {
            centerCnt++;
        } else {
            sideCnt++;
        }
        // choose card
        card = drawCard();
        // display platformtype
        currentCard.textContent = `Extend line to: ${card}`
        // choose endpoint to extend
        // choose new station
        undefine();
        // draw segment, if user clike "confirm station button". 
        // check whether the chosen station is valid. If it is invalid, 
        // skip those step if the user click "skip this round" and continue to the next round.
        drawSegment();
        // change the color of the new station. add attribute of the metro
        markEndPoint();
        markMiddlePoint();
        markVisited();
        // if it is the railway increase the railway score.
        // move on to next round.
    }
}

function playGame() {
    for (i = 0; i < CARDTYPES.length; i++) {
        round = moveOntoNextRound();
        playRound(round);
        endRound();
    }
}
function endRound() {
    calRoundResult();
}
/*calculate result
function calRoundResult() {

}

function calResult() {

}*/




