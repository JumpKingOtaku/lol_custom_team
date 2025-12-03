// =====================
// 定数・マスタ類
// =====================

const ROLES = ["TOP", "JNG", "MID", "ADC", "SUPPORT"];

const ROLE_LABELS = {
    TOP: "TOP",
    JNG: "JG",
    MID: "MID",
    ADC: "ADC",
    SUPPORT: "SUP"
};

// ランク一覧（Iron IV ～ Diamond I）＋ Emerald
const RANKS = [
    { key: "IRON_IV",      label: "Iron IV"     },
    { key: "IRON_III",     label: "Iron III"    },
    { key: "IRON_II",      label: "Iron II"     },
    { key: "IRON_I",       label: "Iron I"      },

    { key: "BRONZE_IV",    label: "Bronze IV"   },
    { key: "BRONZE_III",   label: "Bronze III"  },
    { key: "BRONZE_II",    label: "Bronze II"   },
    { key: "BRONZE_I",     label: "Bronze I"    },

    { key: "SILVER_IV",    label: "Silver IV"   },
    { key: "SILVER_III",   label: "Silver III"  },
    { key: "SILVER_II",    label: "Silver II"   },
    { key: "SILVER_I",     label: "Silver I"    },

    { key: "GOLD_IV",      label: "Gold IV"     },
    { key: "GOLD_III",     label: "Gold III"    },
    { key: "GOLD_II",      label: "Gold II"     },
    { key: "GOLD_I",       label: "Gold I"      },

    { key: "PLATINUM_IV",  label: "Platinum IV" },
    { key: "PLATINUM_III", label: "Platinum III"},
    { key: "PLATINUM_II",  label: "Platinum II" },
    { key: "PLATINUM_I",   label: "Platinum I"  },

    { key: "EMERALD_IV",   label: "Emerald IV"  },
    { key: "EMERALD_III",  label: "Emerald III" },
    { key: "EMERALD_II",   label: "Emerald II"  },
    { key: "EMERALD_I",    label: "Emerald I"   },

    { key: "DIAMOND_IV",   label: "Diamond IV"  },
    { key: "DIAMOND_III",  label: "Diamond III" },
    { key: "DIAMOND_II",   label: "Diamond II"  },
    { key: "DIAMOND_I",    label: "Diamond I"   }
];

// 希望レーンがリストにない時の擬似順位
const UNLISTED_PREF = 5;

// モードごとの重み
const MODES = {
    normal: {
        id: "normal",
        label: "通常生成",
        prefWeight: 10,
        laneWeight: 2,
        avgWeight: 3,
        pairPrefWeight: 10,
        tryCount: 350
    },
    pref: {
        id: "pref",
        label: "希望レーン重視",
        prefWeight: 25,
        laneWeight: 1,
        avgWeight: 1,
        pairPrefWeight: 30,
        tryCount: 450
    },
    lane: {
        id: "lane",
        label: "対面ランク重視",
        prefWeight: 5,
        laneWeight: 10,
        avgWeight: 2,
        pairPrefWeight: 5,
        tryCount: 450
    },
    avg: {
        id: "avg",
        label: "チーム平均重視",
        prefWeight: 5,
        laneWeight: 2,
        avgWeight: 10,
        pairPrefWeight: 5,
        tryCount: 450
    }
};

// 前回結果のハッシュ（同じ組み合わせを避ける用）
const lastAssignmentHashByMode = {
    normal: null,
    pref: null,
    lane: null,
    avg: null,
    random: null
};

// 希望レーン select 用クラス一覧
const PREF_SELECT_CLASSES = [
    "pref-select-TOP",
    "pref-select-JNG",
    "pref-select-MID",
    "pref-select-ADC",
    "pref-select-SUPPORT",
];


// =====================
// 初期化
// =====================

document.addEventListener("DOMContentLoaded", () => {
    buildPlayerTable();

    // 生成ボタン
    document.getElementById("btnNormal")
        .addEventListener("click", () => generateTeams(MODES.normal));
    document.getElementById("btnPref")
        .addEventListener("click", () => generateTeams(MODES.pref));
    document.getElementById("btnLane")
        .addEventListener("click", () => generateTeams(MODES.lane));
    document.getElementById("btnAvg")
        .addEventListener("click", () => generateTeams(MODES.avg));
    document.getElementById("btnRandom")
        .addEventListener("click", () => generateTeamsRandom());

    // レーン人数
    document.getElementById("laneCountButton")
        .addEventListener("click", () => updateLaneCounts());

    // JSON 出力／読み込み
    document.getElementById("jsonExportButton")
        .addEventListener("click", exportToJsonArea);
    document.getElementById("jsonImportButton")
        .addEventListener("click", importFromJsonArea);
});


// =====================
// テーブル生成
// =====================

function buildPlayerTable() {
    const tbody = document.getElementById("playerTableBody");

    for (let i = 1; i <= 10; i++) {
        const tr = document.createElement("tr");

        // #
        const tdIndex = document.createElement("td");
        tdIndex.textContent = i.toString();
        tr.appendChild(tdIndex);

        // 名前 + 一括ランク
        const tdName = document.createElement("td");
        const nameCell = document.createElement("div");
        nameCell.className = "name-cell";

        const inputName = document.createElement("input");
        inputName.type = "text";
        inputName.id = `name-${i}`;
        inputName.placeholder = `Player ${i}`;
        nameCell.appendChild(inputName);

        const bulkRow = document.createElement("div");
        bulkRow.className = "bulk-rank-row";

        const bulkSelect = document.createElement("select");
        bulkSelect.id = `bulkRank-${i}`;
        const optBulkBlank = document.createElement("option");
        optBulkBlank.value = "";
        optBulkBlank.textContent = "一括ランク";
        bulkSelect.appendChild(optBulkBlank);
        RANKS.forEach(rank => {
            const opt = document.createElement("option");
            opt.value = rank.key;
            opt.textContent = rank.label;
            bulkSelect.appendChild(opt);
        });

        const bulkButton = document.createElement("button");
        bulkButton.type = "button";
        bulkButton.textContent = "全レーンに適用";
        bulkButton.className = "bulk-rank-button";

        bulkButton.addEventListener("click", () => {
            const rankKey = bulkSelect.value;
            if (!rankKey) return;
            ROLES.forEach(role => {
                const sel = document.getElementById(`laneRank-${i}-${role}`);
                if (sel) sel.value = rankKey;
            });
        });

        bulkRow.appendChild(bulkSelect);
        bulkRow.appendChild(bulkButton);
        nameCell.appendChild(bulkRow);

        tdName.appendChild(nameCell);
        tr.appendChild(tdName);

        // 各レーンのランク
        ROLES.forEach(role => {
            const tdLaneRank = document.createElement("td");
            const selectLaneRank = document.createElement("select");
            selectLaneRank.id = `laneRank-${i}-${role}`;

            const optBlank = document.createElement("option");
            optBlank.value = "";
            optBlank.textContent = "";
            selectLaneRank.appendChild(optBlank);

            RANKS.forEach(rank => {
                const opt = document.createElement("option");
                opt.value = rank.key;
                opt.textContent = rank.label;
                selectLaneRank.appendChild(opt);
            });

            tdLaneRank.appendChild(selectLaneRank);
            tr.appendChild(tdLaneRank);
        });

        // 第1～第5希望
        for (let prefIndex = 1; prefIndex <= 5; prefIndex++) {
            const tdPref = document.createElement("td");
            const selectPref = document.createElement("select");
            selectPref.id = `pref-${i}-${prefIndex}`;

            // 初期表示は空白（valueは""で「希望なし」と同等）
            const optNone = document.createElement("option");
            optNone.value = "";
            optNone.textContent = "";
            selectPref.appendChild(optNone);

            ROLES.forEach(role => {
                const opt = document.createElement("option");
                opt.value = role;
                opt.textContent = ROLE_LABELS[role];
                // プルダウン展開時の色
                opt.classList.add(`pref-option-${role}`);
                selectPref.appendChild(opt);
            });

            // 選択されたら select 本体の色を更新
            selectPref.addEventListener("change", () => {
                updatePrefSelectColor(selectPref);
            });

            // 初期状態の色（空なので色なし）
            updatePrefSelectColor(selectPref);

            tdPref.appendChild(selectPref);
            tr.appendChild(tdPref);
        }

        // 備考（プレースホルダなし）
        const tdNote = document.createElement("td");
        const inputNote = document.createElement("input");
        inputNote.type = "text";
        inputNote.id = `note-${i}`;
        tdNote.appendChild(inputNote);
        tr.appendChild(tdNote);

        tbody.appendChild(tr);
    }
}


// =====================
// 入力取得（生成用）
// =====================

function collectPlayers() {
    const players = [];
    const message = document.getElementById("message");
    message.textContent = "";
    message.className = "message";

    for (let i = 1; i <= 10; i++) {
        const name = document.getElementById(`name-${i}`).value.trim();
        const note = document.getElementById(`note-${i}`).value.trim();

        if (!name) {
            message.textContent = `${i}行目の名前を入力してください。`;
            message.classList.add("error");
            return null;
        }

        const lanePreferences = {};
        for (let prefIndex = 1; prefIndex <= 5; prefIndex++) {
            const val = document.getElementById(`pref-${i}-${prefIndex}`).value;
            if (ROLES.includes(val)) {
                if (lanePreferences[val] === undefined) {
                    lanePreferences[val] = prefIndex; // 1-based
                }
            }
        }

        if (Object.keys(lanePreferences).length === 0) {
            message.textContent = `${i}行目は少なくとも1つは希望レーンを選んでください。`;
            message.classList.add("error");
            return null;
        }

        const laneRankKeys = {};
        const laneRankMMR = {};

        for (const role of ROLES) {
            const selectId = `laneRank-${i}-${role}`;
            const rankKey = document.getElementById(selectId).value;

            if (lanePreferences[role] !== undefined) {
                if (!rankKey) {
                    message.textContent = `${i}行目の ${ROLE_LABELS[role]} ランクを選択してください（希望レーンに含まれています）。`;
                    message.classList.add("error");
                    return null;
                }
            }

            if (rankKey) {
                laneRankKeys[role] = rankKey;
                laneRankMMR[role] = rankKeyToMMR(rankKey);
            }
        }

        players.push({
            index: i - 1,
            name,
            laneRankKeys,
            laneRankMMR,
            lanePreferences,
            note
        });
    }

    return players;
}


// =====================
// 入力スナップショット（JSON用）
// =====================

function getInputSnapshot() {
    const snapshot = [];

    for (let i = 1; i <= 10; i++) {
        const name = document.getElementById(`name-${i}`).value;
        const note = document.getElementById(`note-${i}`).value;

        const laneRanks = {};
        ROLES.forEach(role => {
            laneRanks[role] = document.getElementById(`laneRank-${i}-${role}`).value || "";
        });

        const prefs = [];
        for (let prefIndex = 1; prefIndex <= 5; prefIndex++) {
            const v = document.getElementById(`pref-${i}-${prefIndex}`).value || "";
            prefs.push(v);
        }

        snapshot.push({
            name,
            note,
            laneRanks,
            prefs
        });
    }

    return snapshot;
}

function applyInputSnapshot(snapshot) {
    if (!Array.isArray(snapshot)) return;

    for (let i = 1; i <= 10; i++) {
        const data = snapshot[i - 1];
        if (!data) continue;

        document.getElementById(`name-${i}`).value = data.name ?? "";
        document.getElementById(`note-${i}`).value = data.note ?? "";

        ROLES.forEach(role => {
            const sel = document.getElementById(`laneRank-${i}-${role}`);
            if (!sel) return;
            const val = (data.laneRanks && data.laneRanks[role]) || "";
            sel.value = val;
        });

        if (Array.isArray(data.prefs)) {
            for (let prefIndex = 1; prefIndex <= 5; prefIndex++) {
                const sel = document.getElementById(`pref-${i}-${prefIndex}`);
                if (!sel) continue;
                const val = data.prefs[prefIndex - 1] || "";
                sel.value = val;

                // 復元時も色更新
                updatePrefSelectColor(sel);
            }
        }
    }
}


// =====================
// JSON 出力 / 読み込み
// =====================

function exportToJsonArea() {
    const message = document.getElementById("message");
    message.textContent = "";
    message.className = "message";

    try {
        const snapshot = getInputSnapshot();
        const jsonArea = document.getElementById("jsonArea");
        jsonArea.value = JSON.stringify(snapshot, null, 2);
        message.textContent = "現在の入力内容をJSONとして出力しました。下のエリアをコピーして保存してください。";
        message.classList.add("success");
    } catch (e) {
        console.error(e);
        message.textContent = "JSON出力に失敗しました。";
        message.classList.add("error");
    }
}

function importFromJsonArea() {
    const message = document.getElementById("message");
    message.textContent = "";
    message.className = "message";

    const jsonArea = document.getElementById("jsonArea");
    const text = jsonArea.value.trim();

    if (!text) {
        message.textContent = "JSONが入力されていません。";
        message.classList.add("error");
        return;
    }

    try {
        const snapshot = JSON.parse(text);
        applyInputSnapshot(snapshot);
        message.textContent = "JSONから入力内容を復元しました。";
        message.classList.add("success");
    } catch (e) {
        console.error(e);
        message.textContent = "JSONの解析に失敗しました。形式が正しいか確認してください。";
        message.classList.add("error");
    }
}


// =====================
// ランク関連
// =====================

function rankKeyToMMR(rankKey) {
    const index = RANKS.findIndex(r => r.key === rankKey);
    if (index === -1) return 0;
    return index + 1;
}

function rankKeyToLabel(rankKey) {
    const r = RANKS.find(r => r.key === rankKey);
    return r ? r.label : "Unknown";
}

function mmrToRankLabel(avgMMR) {
    if (avgMMR <= 0) return "-";
    let idx = Math.round(avgMMR) - 1;
    if (idx < 0) idx = 0;
    if (idx >= RANKS.length) idx = RANKS.length - 1;
    return RANKS[idx].label;
}

function getLaneMMR(player, role) {
    const mmr = player.laneRankMMR[role];
    return mmr != null ? mmr : 0;
}

function getLaneRankLabel(player, role) {
    const key = player.laneRankKeys[role];
    return rankKeyToLabel(key);
}

function canPlayRole(player, role) {
    return player.lanePreferences[role] !== undefined;
}


// =====================
// チーム生成（最適化）
// =====================

function generateTeams(mode) {
    const players = collectPlayers();
    if (!players) return;

    const message = document.getElementById("message");
    message.textContent = `${mode.label}モードで計算中...`;
    message.className = "message";

    const resultSection = document.getElementById("resultSection");
    resultSection.classList.add("hidden");

    const tryCount = mode.tryCount ?? 300;
    const candidates = [];

    // 複数パターンを集めて、その中から「そこそこ良いもの」をランダム採用
    for (let t = 0; t < tryCount; t++) {
        const assignment = generateRandomAssignment(players, mode);
        const score = evaluateAssignment(assignment, players, mode);
        if (!Number.isFinite(score)) continue;
        candidates.push({ assignment, score });
    }

    if (candidates.length === 0) {
        message.textContent = "現在の希望レーン・ランクではチームを組めませんでした（各レーンに2人以上希望者がいて、そのレーンのランクも入力されているか確認してください）。";
        message.classList.add("error");
        return;
    }

    candidates.sort((a, b) => a.score - b.score);

    // 上位N個からバイアスありランダム
    const topN = Math.min(12, candidates.length);
    let chosenIndex = pickBiasedIndex(topN);
    let chosen = candidates[chosenIndex];

    const modeKey = mode.id;
    const lastHash = lastAssignmentHashByMode[modeKey];
    const currentHash = assignmentHash(chosen.assignment);

    if (lastHash && lastHash === currentHash) {
        for (let i = 0; i < topN; i++) {
            if (i === chosenIndex) continue;
            const alt = candidates[i];
            const altHash = assignmentHash(alt.assignment);
            if (altHash !== lastHash) {
                chosen = alt;
                chosenIndex = i;
                break;
            }
        }
    }

    lastAssignmentHashByMode[modeKey] = assignmentHash(chosen.assignment);

    showResult(chosen.assignment, players, chosen.score);

    message.textContent = `${mode.label}モードでチームを生成しました。（再度押すと別パターンを再生成しやすくなっています）`;
    message.classList.add("success");
}


// ランダム割り当て生成（モード用）
// 「最良のペア」1つに固定せず、上位候補からランダムに選ぶ
function generateRandomAssignment(players, mode) {
    const remaining = players.map((_, idx) => idx);
    const assignment = [];

    const laneOrder = [...ROLES];
    shuffleArray(laneOrder);

    const pairPrefWeight = mode.pairPrefWeight ?? mode.prefWeight ?? 10;

    for (const role of laneOrder) {
        if (remaining.length < 2) break;

        const allowed = remaining.filter(pIdx => canPlayRole(players[pIdx], role));
        const candidateIndices = allowed.length >= 2 ? allowed : remaining;

        const pairs = [];

        for (let i = 0; i < candidateIndices.length; i++) {
            for (let j = i + 1; j < candidateIndices.length; j++) {
                const pIdx1 = candidateIndices[i];
                const pIdx2 = candidateIndices[j];

                const pref1 = getLanePreferenceRank(players[pIdx1], role);
                const pref2 = getLanePreferenceRank(players[pIdx2], role);

                // コスト（小さいほど良い）
                let cost = (pref1 + pref2) * pairPrefWeight;
                cost += Math.random() * 0.6; // ノイズ

                pairs.push({ pIdx1, pIdx2, cost });
            }
        }

        if (pairs.length === 0) break;

        pairs.sort((a, b) => a.cost - b.cost);
        const topK = Math.min(6, pairs.length);
        const pair = pairs[randomInt(0, topK - 1)];

        const idx1 = remaining.indexOf(pair.pIdx1);
        if (idx1 !== -1) remaining.splice(idx1, 1);
        const idx2 = remaining.indexOf(pair.pIdx2);
        if (idx2 !== -1) remaining.splice(idx2, 1);

        if (Math.random() < 0.5) {
            assignment.push({ team: "BLUE", role, playerIndex: pair.pIdx1 });
            assignment.push({ team: "RED",  role, playerIndex: pair.pIdx2 });
        } else {
            assignment.push({ team: "BLUE", role, playerIndex: pair.pIdx2 });
            assignment.push({ team: "RED",  role, playerIndex: pair.pIdx1 });
        }
    }

    return assignment;
}

function getLanePreferenceRank(player, role) {
    if (player.lanePreferences[role] !== undefined) {
        return player.lanePreferences[role] - 1; // 1〜5 → 0〜4
    }
    return UNLISTED_PREF;
}


// =====================
// 割り当て評価
// =====================

function evaluateAssignment(assignment, players, mode) {
    if (!assignment || assignment.length !== 10) return Infinity;

    const prefWeight = mode.prefWeight ?? 10;
    const laneWeight = mode.laneWeight ?? 2;
    const avgWeight = mode.avgWeight ?? 3;

    let prefPenalty = 0;
    const teamMMR = { BLUE: [], RED: [] };
    const laneMap = { BLUE: {}, RED: {} };

    for (const pos of assignment) {
        const player = players[pos.playerIndex];

        if (!canPlayRole(player, pos.role)) {
            return Infinity;
        }

        const prefRank = getLanePreferenceRank(player, pos.role);
        prefPenalty += prefRank * prefWeight;

        const mmr = getLaneMMR(player, pos.role);
        if (mmr <= 0) return Infinity;

        teamMMR[pos.team].push(mmr);
        laneMap[pos.team][pos.role] = mmr;
    }

    let laneDiff = 0;
    for (const role of ROLES) {
        const blueMmr = laneMap.BLUE[role];
        const redMmr = laneMap.RED[role];
        if (blueMmr == null || redMmr == null) {
            return Infinity;
        }
        laneDiff += Math.abs(blueMmr - redMmr) * laneWeight;
    }

    const blueAvg = average(teamMMR.BLUE);
    const redAvg = average(teamMMR.RED);
    const avgDiff = Math.abs(blueAvg - redAvg) * avgWeight;

    return prefPenalty + laneDiff + avgDiff;
}


// =====================
// 結果表示
// =====================

function showResult(assignment, players, score) {
    const blueList = document.getElementById("blueList");
    const redList = document.getElementById("redList");
    const blueAverage = document.getElementById("blueAverage");
    const redAverage = document.getElementById("redAverage");
    const scoreValue = document.getElementById("scoreValue");
    const resultSection = document.getElementById("resultSection");

    blueList.innerHTML = "";
    redList.innerHTML = "";

    const blueMMR = [];
    const redMMR = [];

    const blueAssignments = [];
    const redAssignments = [];

    for (const pos of assignment) {
        if (pos.team === "BLUE") {
            blueAssignments.push(pos);
        } else {
            redAssignments.push(pos);
        }
    }

    blueAssignments.sort((a, b) => ROLES.indexOf(a.role) - ROLES.indexOf(b.role));
    redAssignments.sort((a, b) => ROLES.indexOf(a.role) - ROLES.indexOf(b.role));

    for (const pos of blueAssignments) {
        const player = players[pos.playerIndex];
        const mmr = getLaneMMR(player, pos.role);
        blueMMR.push(mmr);

        const roleRankLabel = getLaneRankLabel(player, pos.role);

        const prefRank = player.lanePreferences[pos.role];
        const prefText = prefRank != null ? ` / 第${prefRank}希望` : "";

        const li = document.createElement("li");
        li.innerHTML = `
            <span class="team-role">${ROLE_LABELS[pos.role]}</span>
            <span class="team-name">${player.name}</span>
            <span class="team-rank">（${roleRankLabel}<span class="team-pref-rank">${prefText}</span>）</span>
            ${player.note ? `<div class="team-note">備考: ${escapeHtml(player.note)}</div>` : ""}
        `;
        blueList.appendChild(li);
    }

    for (const pos of redAssignments) {
        const player = players[pos.playerIndex];
        const mmr = getLaneMMR(player, pos.role);
        redMMR.push(mmr);

        const roleRankLabel = getLaneRankLabel(player, pos.role);

        const prefRank = player.lanePreferences[pos.role];
        const prefText = prefRank != null ? ` / 第${prefRank}希望` : "";

        const li = document.createElement("li");
        li.innerHTML = `
            <span class="team-role">${ROLE_LABELS[pos.role]}</span>
            <span class="team-name">${player.name}</span>
            <span class="team-rank">（${roleRankLabel}<span class="team-pref-rank">${prefText}</span>）</span>
            ${player.note ? `<div class="team-note">備考: ${escapeHtml(player.note)}</div>` : ""}
        `;
        redList.appendChild(li);
    }

    const blueAvg = average(blueMMR);
    const redAvg = average(redMMR);

    blueAverage.textContent = `平均ランク: ${mmrToRankLabel(blueAvg)}（MMR: ${blueAvg.toFixed(1)}）`;
    redAverage.textContent = `平均ランク: ${mmrToRankLabel(redAvg)}（MMR: ${redAvg.toFixed(1)}）`;

    scoreValue.textContent = score.toFixed(1);

    resultSection.classList.remove("hidden");
}


// =====================
// 完全ランダム（希望レーン内のみ）
// =====================

function generateTeamsRandom() {
    const players = collectPlayers();
    if (!players) return;

    const message = document.getElementById("message");
    message.textContent = "希望レーン内で完全ランダムにチームを生成中...";
    message.className = "message";

    const resultSection = document.getElementById("resultSection");
    resultSection.classList.add("hidden");

    const candidates = [];

    for (let t = 0; t < 350; t++) {
        const assignment = generatePureRandomAssignment(players);
        if (!assignment) continue;
        const score = evaluateAssignment(assignment, players, MODES.normal);
        if (!Number.isFinite(score)) continue;
        candidates.push({ assignment, score });
    }

    if (candidates.length === 0) {
        message.textContent = "この条件では希望レーン内だけでランダムにチームを組めませんでした。各レーンに2人以上希望者がいるか確認してください。";
        message.classList.add("error");
        return;
    }

    candidates.sort((a, b) => a.score - b.score);

    const topN = Math.min(20, candidates.length);
    let chosenIndex = randomInt(0, topN - 1);
    let chosen = candidates[chosenIndex];

    const lastHash = lastAssignmentHashByMode["random"];
    const currentHash = assignmentHash(chosen.assignment);

    if (lastHash && lastHash === currentHash) {
        for (let i = 0; i < topN; i++) {
            if (i === chosenIndex) continue;
            const alt = candidates[i];
            const altHash = assignmentHash(alt.assignment);
            if (altHash !== lastHash) {
                chosen = alt;
                chosenIndex = i;
                break;
            }
        }
    }

    lastAssignmentHashByMode["random"] = assignmentHash(chosen.assignment);

    showResult(chosen.assignment, players, chosen.score);

    message.textContent = "希望レーン内で完全ランダムにチームを生成しました。";
    message.classList.add("success");
}

function generatePureRandomAssignment(players) {
    const remaining = players.map((_, idx) => idx);
    const assignment = [];

    const laneOrder = [...ROLES];
    shuffleArray(laneOrder);

    for (const role of laneOrder) {
        const allowed = remaining.filter(pIdx => canPlayRole(players[pIdx], role));
        if (allowed.length < 2) {
            return null;
        }

        shuffleArray(allowed);
        const p1 = allowed[0];
        const p2 = allowed[1];

        const idx1 = remaining.indexOf(p1);
        if (idx1 !== -1) remaining.splice(idx1, 1);
        const idx2 = remaining.indexOf(p2);
        if (idx2 !== -1) remaining.splice(idx2, 1);

        if (Math.random() < 0.5) {
            assignment.push({ team: "BLUE", role, playerIndex: p1 });
            assignment.push({ team: "RED",  role, playerIndex: p2 });
        } else {
            assignment.push({ team: "BLUE", role, playerIndex: p2 });
            assignment.push({ team: "RED",  role, playerIndex: p1 });
        }
    }

    if (assignment.length !== 10) {
        return null;
    }
    return assignment;
}


// =====================
// レーン人数確認
// =====================

function updateLaneCounts() {
    const laneCounts = {
        TOP: 0,
        JNG: 0,
        MID: 0,
        ADC: 0,
        SUPPORT: 0
    };

    for (let i = 1; i <= 10; i++) {
        const laneSet = new Set();

        for (let prefIndex = 1; prefIndex <= 5; prefIndex++) {
            const val = document.getElementById(`pref-${i}-${prefIndex}`).value;
            if (ROLES.includes(val)) {
                laneSet.add(val);
            }
        }

        laneSet.forEach(role => {
            laneCounts[role]++;
        });
    }

    const section = document.getElementById("laneCountSection");
    const list = document.getElementById("laneCountList");
    list.innerHTML = "";

    ROLES.forEach(role => {
        const li = document.createElement("li");
        li.textContent = `${ROLE_LABELS[role]}: ${laneCounts[role]}人`;
        list.appendChild(li);
    });

    section.classList.remove("hidden");
}


// =====================
// ユーティリティ
// =====================

function average(nums) {
    if (!nums || nums.length === 0) return 0;
    const sum = nums.reduce((acc, v) => acc + v, 0);
    return sum / nums.length;
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function escapeHtml(str) {
    return str.replace(/[&<>"']/g, s => {
        switch (s) {
            case "&": return "&amp;";
            case "<": return "&lt;";
            case ">": return "&gt;";
            case '"': return "&quot;";
            case "'": return "&#39;";
            default: return s;
        }
    });
}

// 希望レーン select の文字色を、選択されたレーンに応じて切り替える
function updatePrefSelectColor(selectEl) {
    PREF_SELECT_CLASSES.forEach(cls => selectEl.classList.remove(cls));

    const val = selectEl.value; // "", "TOP", "JNG", ...
    if (!val) return; // なし → 色なし

    selectEl.classList.add(`pref-select-${val}`);
}

// 0〜maxIndex-1 の中から「小さい方に寄りつつ、たまに大きめも出る」ランダムインデックス
function pickBiasedIndex(maxIndex) {
    const r = Math.random();
    const biased = Math.pow(r, 1.4);
    return Math.floor(biased * maxIndex);
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 結果をハッシュ化（誰がどのチームのどのロールか）
function assignmentHash(assignment) {
    if (!assignment || assignment.length === 0) return "";
    const normalized = assignment
        .map(a => `${a.team}-${a.role}-${a.playerIndex}`)
        .sort()
        .join("|");
    return normalized;
}
