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

// プレイヤーリスト（登録用）
let playerRegistry = [];

// 現在「何番目のプレイヤーを編集中か」を示すインデックス（新規追加時は null）
let editingRegistryIndex = null;



// =====================
// 初期化
// =====================

document.addEventListener("DOMContentLoaded", () => {
    buildPlayerTable();
    initAdvancedSettingsControls();
    initPlayerRegistryForm();
    updatePlayerRegistrySelects();
    refreshPlayerRegistryTable();

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

    // レーン人数（表示 / 非表示トグル + ボタンの状態反映）
    const laneCountBtn = document.getElementById("laneCountButton");
    if (laneCountBtn) {
        laneCountBtn.addEventListener("click", () => {
            const section = document.getElementById("laneCountSection");
            if (!section) return;

            const willShow = section.classList.contains("hidden");

            if (willShow) {
                // 表示するタイミングで毎回再計算
                updateLaneCounts();
                section.classList.remove("hidden");
                laneCountBtn.classList.add("toggle-active");
            } else {
                section.classList.add("hidden");
                laneCountBtn.classList.remove("toggle-active");
            }
        });
    }



    // JSON 出力／読み込み（10人入力用）
    // （UIを削除したので、要素があれば…のガードだけ残しておく）
    const jsonExportBtn = document.getElementById("jsonExportButton");
    if (jsonExportBtn) {
        jsonExportBtn.addEventListener("click", exportToJsonArea);
    }
    const jsonImportBtn = document.getElementById("jsonImportButton");
    if (jsonImportBtn) {
        jsonImportBtn.addEventListener("click", importFromJsonArea);
    }

    // 詳細設定の表示切替 + ボタンの状態反映
    const advBtn = document.getElementById("advancedSettingsButton");
    if (advBtn) {
        advBtn.addEventListener("click", () => {
            const sec = document.getElementById("advancedSettingsSection");
            if (!sec) return;

            const willShow = sec.classList.contains("hidden");

            if (willShow) {
                sec.classList.remove("hidden");
                advBtn.classList.add("toggle-active");
            } else {
                sec.classList.add("hidden");
                advBtn.classList.remove("toggle-active");
            }
        });
    }


    // プレイヤーリストの表示切替 + ボタンの状態反映
    const regBtn = document.getElementById("playerRegistryButton");
    if (regBtn) {
        regBtn.addEventListener("click", () => {
            const sec = document.getElementById("playerRegistrySection");
            if (!sec) return;

            const willShow = sec.classList.contains("hidden");

            if (willShow) {
                sec.classList.remove("hidden");
                regBtn.classList.add("toggle-active");
            } else {
                sec.classList.add("hidden");
                regBtn.classList.remove("toggle-active");
            }
        });
    }


    // プレイヤーリスト JSON 出力／読み込み
    const playerExportBtn = document.getElementById("playerJsonExportButton");
    if (playerExportBtn) {
        playerExportBtn.addEventListener("click", exportPlayerRegistryToJsonArea);
    }
    const playerImportBtn = document.getElementById("playerJsonImportButton");
    if (playerImportBtn) {
        playerImportBtn.addEventListener("click", importPlayerRegistryFromJsonArea);
    }
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

        // 名前 / 一括ランク列
        // → 登録プレイヤー選択のみ表示し、名前は hidden で保持
        const tdName = document.createElement("td");
        const nameCell = document.createElement("div");
        nameCell.className = "name-cell";

        // 登録プレイヤー選択
        const registryRow = document.createElement("div");
        registryRow.className = "registry-row";
        const registrySelect = document.createElement("select");
        registrySelect.id = `playerRegistrySelect-${i}`;
        registrySelect.className = "player-registry-select";

        const optRegBlank = document.createElement("option");
        optRegBlank.value = "";
        optRegBlank.textContent = "";   // 初期表示は空にする
        registrySelect.appendChild(optRegBlank);


        registrySelect.addEventListener("change", () => {
            const val = registrySelect.value;
            if (!val) return;
            const regIndex = parseInt(val, 10);
            if (!Number.isNaN(regIndex)) {
                applyRegistryPlayerToRow(regIndex, i);
            }
        });

        registryRow.appendChild(registrySelect);
        nameCell.appendChild(registryRow);

        // 入力用ではなく、内部保持用の hidden 名前フィールド
        const inputName = document.createElement("input");
        inputName.type = "hidden";
        inputName.id = `name-${i}`;
        nameCell.appendChild(inputName);

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
// JSON 出力 / 読み込み（10人入力）
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

    const constraints = collectConstraints();
    if (constraints === null) return;

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
        const score = evaluateAssignment(assignment, players, mode, constraints);
        if (!Number.isFinite(score)) continue;
        candidates.push({ assignment, score });
    }

    if (candidates.length === 0) {
        message.textContent = "現在の希望レーン・ランクまたは詳細設定ではチームを組めませんでした（各レーンの希望人数・ランク・詳細設定を確認してください）。";
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

function evaluateAssignment(assignment, players, mode, constraints) {
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

    const baseScore = prefPenalty + laneDiff + avgDiff;

    // 詳細設定（同じチーム / 別チーム）のチェック
    if (constraints) {
        const { sameGroups, diffPairs } = constraints;

        if ((sameGroups && sameGroups.length > 0) || (diffPairs && diffPairs.length > 0)) {
            const teamByPlayer = {};
            for (const pos of assignment) {
                teamByPlayer[pos.playerIndex] = pos.team;
            }

            // 同じチームグループ
            if (sameGroups && sameGroups.length > 0) {
                for (const group of sameGroups) {
                    let firstTeam = null;
                    for (const pIdx of group) {
                        const t = teamByPlayer[pIdx];
                        if (!t) return Infinity;
                        if (firstTeam === null) {
                            firstTeam = t;
                        } else if (firstTeam !== t) {
                            // 同じグループ内でチームが分かれている → NG
                            return Infinity;
                        }
                    }
                }
            }

            // 別チームペア
            if (diffPairs && diffPairs.length > 0) {
                for (const [a, b] of diffPairs) {
                    const ta = teamByPlayer[a];
                    const tb = teamByPlayer[b];
                    if (!ta || !tb) return Infinity;
                    if (ta === tb) {
                        // 別チーム指定なのに同じチーム → NG
                        return Infinity;
                    }
                }
            }
        }
    }

    return baseScore;
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

    const constraints = collectConstraints();
    if (constraints === null) return;

    const message = document.getElementById("message");
    message.textContent = "希望レーン内で完全ランダムにチームを生成中...";
    message.className = "message";

    const resultSection = document.getElementById("resultSection");
    resultSection.classList.add("hidden");

    const candidates = [];

    for (let t = 0; t < 350; t++) {
        const assignment = generatePureRandomAssignment(players);
        if (!assignment) continue;
        const score = evaluateAssignment(assignment, players, MODES.normal, constraints);
        if (!Number.isFinite(score)) continue;
        candidates.push({ assignment, score });
    }

    if (candidates.length === 0) {
        message.textContent = "この条件では希望レーン内だけでランダムにチームを組めませんでした。各レーンに2人以上希望者がいるか、詳細設定が厳しすぎないか確認してください。";
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

    const list = document.getElementById("laneCountList");
    if (!list) return;

    list.innerHTML = "";

    ROLES.forEach(role => {
        const li = document.createElement("li");
        li.textContent = `${ROLE_LABELS[role]}: ${laneCounts[role]}人`;
        list.appendChild(li);
    });
    // 表示 / 非表示はボタン側で制御する
}


// =====================
// 詳細設定（同じチーム / 別チーム）関連
// =====================

// 詳細設定で使う「プレイヤー一覧」（上のプレイヤー情報から名前が入っている行だけ）を取得
function getAdvancedSettingsPlayers() {
    const result = [];
    for (let i = 1; i <= 10; i++) {
        const nameInput = document.getElementById(`name-${i}`);
        if (!nameInput) continue;
        const name = nameInput.value.trim();
        if (!name) continue;              // 名前が入っている行だけ使う
        result.push({ index: i, name });  // index は 1〜10（既存ロジック用）
    }
    return result;
}

// 詳細設定セレクトの表示を、現在のプレイヤー名で更新
function refreshAdvancedSettingsSelects() {
    const section = document.getElementById("advancedSettingsSection");
    if (!section) return;

    const playersForAdvanced = getAdvancedSettingsPlayers();

    const fillSelect = (id) => {
        const sel = document.getElementById(id);
        if (!sel) return;

        const prev = sel.value; // 以前の選択を覚えておく

        sel.innerHTML = "";
        const optBlank = document.createElement("option");
        optBlank.value = "";
        optBlank.textContent = "";
        sel.appendChild(optBlank);

        // value は 1〜10 のまま、表示テキストだけ「名前」にする
        playersForAdvanced.forEach(p => {
            const opt = document.createElement("option");
            opt.value = String(p.index);
            opt.textContent = p.name;
            sel.appendChild(opt);
        });

        if (prev) {
            sel.value = prev; // 可能なら元の選択を復元
        }
    };

    // 「同じチームにしたいグループ」
    for (let g = 1; g <= 3; g++) {
        for (let s = 1; s <= 5; s++) {
            fillSelect(`sameGroup-${g}-${s}`);
        }
    }
    // 「必ず別チームにしたい組み合わせ」
    for (let r = 1; r <= 5; r++) {
        fillSelect(`diffPair-${r}-A`);
        fillSelect(`diffPair-${r}-B`);
    }
}

// 初期化時は上の関数を呼ぶだけ
function initAdvancedSettingsControls() {
    refreshAdvancedSettingsSelects();
}




function collectConstraints() {
    const section = document.getElementById("advancedSettingsSection");
    if (!section) {
        return { sameGroups: [], diffPairs: [] };
    }

    const message = document.getElementById("message");
    message.textContent = "";
    message.className = "message";

    const sameGroupsRaw = [];
    for (let g = 1; g <= 3; g++) {
        const members = [];
        for (let s = 1; s <= 5; s++) {
            const sel = document.getElementById(`sameGroup-${g}-${s}`);
            if (!sel) continue;
            const val = sel.value;
            if (val) {
                const idx = parseInt(val, 10) - 1;
                if (!Number.isNaN(idx) && idx >= 0 && idx < 10 && !members.includes(idx)) {
                    members.push(idx);
                }
            }
        }
        if (members.length >= 2) {
            sameGroupsRaw.push(members);
        }
    }

    const diffPairsRaw = [];
    for (let r = 1; r <= 5; r++) {
        const selA = document.getElementById(`diffPair-${r}-A`);
        const selB = document.getElementById(`diffPair-${r}-B`);
        if (!selA || !selB) continue;
        const vA = selA.value;
        const vB = selB.value;

        if (!vA && !vB) continue;
        if (!vA || !vB) {
            message.textContent = `詳細設定: 別チーム条件${r}行目が片方だけ選択されています。`;
            message.classList.add("error");
            return null;
        }
        if (vA === vB) {
            message.textContent = `詳細設定: 別チーム条件${r}行目で同じプレイヤーが選択されています。`;
            message.classList.add("error");
            return null;
        }
        const aIdx = parseInt(vA, 10) - 1;
        const bIdx = parseInt(vB, 10) - 1;
        if ([aIdx, bIdx].some(i => Number.isNaN(i) || i < 0 || i >= 10)) continue;

        const pair = aIdx < bIdx ? [aIdx, bIdx] : [bIdx, aIdx];
        if (!diffPairsRaw.some(p => p[0] === pair[0] && p[1] === pair[1])) {
            diffPairsRaw.push(pair);
        }
    }

    // 同じチームグループのマージ（重なりがあれば統合）
    const sameGroups = [];
    for (const members of sameGroupsRaw) {
        let merged = [...members];
        let changed;
        do {
            changed = false;
            for (let i = sameGroups.length - 1; i >= 0; i--) {
                const g = sameGroups[i];
                if (g.some(x => merged.includes(x))) {
                    merged = Array.from(new Set([...merged, ...g]));
                    sameGroups.splice(i, 1);
                    changed = true;
                }
            }
        } while (changed);
        sameGroups.push(merged);
    }

    // 1グループに6人以上いるのは物理的に不可能
    for (const g of sameGroups) {
        if (g.length > 5) {
            message.textContent = "詳細設定: 同じチームにしたいグループに6人以上指定されています。（1チームは5人までです）";
            message.classList.add("error");
            return null;
        }
    }

    // 「同じチーム」と「別チーム」が矛盾していないかチェック
    for (const g of sameGroups) {
        for (const pair of diffPairsRaw) {
            if (g.includes(pair[0]) && g.includes(pair[1])) {
                message.textContent = "詳細設定: 「同じチーム」と「別チーム」の条件が矛盾しています。設定を見直してください。";
                message.classList.add("error");
                return null;
            }
        }
    }

    return {
        sameGroups,
        diffPairs: diffPairsRaw
    };
}


// =====================
// プレイヤーリスト関連
// =====================

function initPlayerRegistryForm() {
    const container = document.getElementById("playerRegistryForm");
    if (!container) return;

    container.innerHTML = "";

    // 名前
    const rowName = document.createElement("div");
    rowName.className = "player-registry-row";
    const labelName = document.createElement("label");
    labelName.textContent = "名前";
    const inputName = document.createElement("input");
    inputName.type = "text";
    inputName.id = "reg-name";
    rowName.appendChild(labelName);
    rowName.appendChild(inputName);
    container.appendChild(rowName);

    // レーンごとのランク
    const rowRanks = document.createElement("div");
    rowRanks.className = "player-registry-row player-registry-row-ranks";
    const labelRanks = document.createElement("label");
    labelRanks.textContent = "ランク";
    rowRanks.appendChild(labelRanks);

    ROLES.forEach(role => {
        const sub = document.createElement("div");
        sub.className = "player-registry-lane";
        const laneLabel = document.createElement("span");
        laneLabel.textContent = ROLE_LABELS[role];
        const sel = document.createElement("select");
        sel.id = `reg-laneRank-${role}`;
        const optBlank = document.createElement("option");
        optBlank.value = "";
        optBlank.textContent = "";
        sel.appendChild(optBlank);
        RANKS.forEach(rank => {
            const opt = document.createElement("option");
            opt.value = rank.key;
            opt.textContent = rank.label;
            sel.appendChild(opt);
        });
        sub.appendChild(laneLabel);
        sub.appendChild(sel);
        rowRanks.appendChild(sub);
    });
    container.appendChild(rowRanks);

    // 備考
    const rowNote = document.createElement("div");
    rowNote.className = "player-registry-row";
    const labelNote = document.createElement("label");
    labelNote.textContent = "備考";
    const inputNote = document.createElement("input");
    inputNote.type = "text";
    inputNote.id = "reg-note";
    rowNote.appendChild(labelNote);
    rowNote.appendChild(inputNote);
    container.appendChild(rowNote);

    // 追加ボタン
    const rowButton = document.createElement("div");
    rowButton.className = "player-registry-row";
    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.id = "playerAddButton";
    addBtn.className = "secondary";
    addBtn.textContent = "プレイヤー追加";
    addBtn.addEventListener("click", addPlayerToRegistry);
    rowButton.appendChild(addBtn);
    container.appendChild(rowButton);
}



// プレイヤーリストに追加 or 更新
function addPlayerToRegistry() {
    const message = document.getElementById("message");
    message.textContent = "";
    message.className = "message";

    const nameInput = document.getElementById("reg-name");
    const noteInput = document.getElementById("reg-note");
    if (!nameInput) return;

    const name = nameInput.value.trim();
    const note = noteInput ? noteInput.value.trim() : "";

    if (!name) {
        message.textContent = "名前を入力してください。";
        message.classList.add("error");
        return;
    }

    const laneRanks = {};
    ROLES.forEach(role => {
        const sel = document.getElementById(`reg-laneRank-${role}`);
        laneRanks[role] = sel ? sel.value : "";
    });

    let successMessage = "";

    // 編集中なら「更新」、そうでなければ「追加」
    if (
        editingRegistryIndex !== null &&
        editingRegistryIndex >= 0 &&
        editingRegistryIndex < playerRegistry.length
    ) {
        playerRegistry[editingRegistryIndex] = {
            name,
            note,
            laneRanks
        };
        successMessage = "プレイヤー情報を更新しました。";
    } else {
        playerRegistry.push({
            name,
            note,
            laneRanks
        });
        successMessage = "プレイヤーをリストに追加しました。";
    }

    // フォーム初期化
    nameInput.value = "";
    if (noteInput) noteInput.value = "";
    ROLES.forEach(role => {
        const sel = document.getElementById(`reg-laneRank-${role}`);
        if (sel) sel.value = "";
    });

    // 編集モード解除 & ボタンラベル戻す
    editingRegistryIndex = null;
    const addBtn = document.getElementById("playerAddButton");
    if (addBtn) {
        addBtn.textContent = "プレイヤー追加";
    }

    refreshPlayerRegistryTable();
    updatePlayerRegistrySelects();

    message.textContent = successMessage;
    message.classList.add("success");
}





// 登録済みプレイヤー一覧のテーブル再描画
function refreshPlayerRegistryTable() {
    const tbody = document.querySelector("#playerRegistryTable tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    playerRegistry.forEach((p, index) => {
        const tr = document.createElement("tr");

        const tdIndex = document.createElement("td");
        tdIndex.textContent = String(index + 1);
        tr.appendChild(tdIndex);

        const tdName = document.createElement("td");
        tdName.textContent = p.name;
        tr.appendChild(tdName);

        const tdTop = document.createElement("td");
        tdTop.textContent = p.laneRanks?.TOP
            ? rankKeyToLabel(p.laneRanks.TOP)
            : "";
        tr.appendChild(tdTop);

        const tdJng = document.createElement("td");
        tdJng.textContent = p.laneRanks?.JNG
            ? rankKeyToLabel(p.laneRanks.JNG)
            : "";
        tr.appendChild(tdJng);

        const tdMid = document.createElement("td");
        tdMid.textContent = p.laneRanks?.MID
            ? rankKeyToLabel(p.laneRanks.MID)
            : "";
        tr.appendChild(tdMid);

        const tdAdc = document.createElement("td");
        tdAdc.textContent = p.laneRanks?.ADC
            ? rankKeyToLabel(p.laneRanks.ADC)
            : "";
        tr.appendChild(tdAdc);

        const tdSup = document.createElement("td");
        tdSup.textContent = p.laneRanks?.SUPPORT
            ? rankKeyToLabel(p.laneRanks.SUPPORT)
            : "";
        tr.appendChild(tdSup);

        const tdNote = document.createElement("td");
        tdNote.textContent = p.note || "";
        tr.appendChild(tdNote);




        // 操作（編集／削除）
        const tdActions = document.createElement("td");

        const btnEdit = document.createElement("button");
        btnEdit.type = "button";
        btnEdit.textContent = "編集";
        btnEdit.className = "small secondary";
        btnEdit.addEventListener("click", () => {
            startEditPlayerRegistry(index);
        });
        tdActions.appendChild(btnEdit);

        const btnDelete = document.createElement("button");
        btnDelete.type = "button";
        btnDelete.textContent = "削除";
        btnDelete.className = "small secondary";
        btnDelete.style.marginLeft = "4px";
        btnDelete.addEventListener("click", () => {
            playerRegistry.splice(index, 1);
            refreshPlayerRegistryTable();
            updatePlayerRegistrySelects();
        });
        tdActions.appendChild(btnDelete);

        tr.appendChild(tdActions);

        tbody.appendChild(tr);
    });
}


// プレイヤーリストの既存データをフォームに読み込んで編集モードにする
function startEditPlayerRegistry(index) {
    const p = playerRegistry[index];
    if (!p) return;

    const nameInput = document.getElementById("reg-name");
    const noteInput = document.getElementById("reg-note");
    if (!nameInput) return;

    // フォームに値をセット
    nameInput.value = p.name || "";
    if (noteInput) {
        noteInput.value = p.note || "";
    }

    ROLES.forEach(role => {
        const sel = document.getElementById(`reg-laneRank-${role}`);
        if (sel) {
            sel.value = p.laneRanks?.[role] ?? "";
        }
    });

    // 編集中インデックス更新
    editingRegistryIndex = index;

    // ボタンラベルを「更新」に変更
    const addBtn = document.getElementById("playerAddButton");
    if (addBtn) {
        addBtn.textContent = "更新";
    }

    // メッセージ表示（任意）
    const message = document.getElementById("message");
    if (message) {
        message.textContent = `#${index + 1}「${p.name}」を編集中です。`;
        message.className = "message success";
    }
}


function updatePlayerRegistrySelects() {
    for (let row = 1; row <= 10; row++) {
        const sel = document.getElementById(`playerRegistrySelect-${row}`);
        if (!sel) continue;

        const currentValue = sel.value;
        sel.innerHTML = "";
        const optDefault = document.createElement("option");
        optDefault.value = "";
        optDefault.textContent = ""; // 初期表示は空にする
        sel.appendChild(optDefault);

playerRegistry.forEach((p, idx) => {
    const opt = document.createElement("option");
    opt.value = String(idx);
    opt.textContent = p.name;  // 番号なしで名前だけ表示
    sel.appendChild(opt);
});


        if (currentValue && !Number.isNaN(parseInt(currentValue, 10))) {
            const num = parseInt(currentValue, 10);
            if (num >= 0 && num < playerRegistry.length) {
                sel.value = currentValue;
            }
        }
    }
}

function applyRegistryPlayerToFirstEmptyRow(regIndex) {
    const p = playerRegistry[regIndex];
    if (!p) return;

    let targetRow = null;
    for (let i = 1; i <= 10; i++) {
        const nameInput = document.getElementById(`name-${i}`);
        if (nameInput && !nameInput.value.trim()) {
            targetRow = i;
            break;
        }
    }
    if (!targetRow) {
        targetRow = 1; // 全部埋まってる場合は1行目に上書き
    }

    applyRegistryPlayerToRow(regIndex, targetRow);
}

function applyRegistryPlayerToRow(regIndex, rowNo) {
    const p = playerRegistry[regIndex];
    if (!p) return;

    const nameInput = document.getElementById(`name-${rowNo}`);
    if (nameInput) nameInput.value = p.name;

    const noteInput = document.getElementById(`note-${rowNo}`);
    if (noteInput) noteInput.value = p.note || "";

    ROLES.forEach(role => {
        const sel = document.getElementById(`laneRank-${rowNo}-${role}`);
        if (!sel) return;
        const val = p.laneRanks && p.laneRanks[role];
        sel.value = val || "";
    });

    // プレイヤー情報が変わったら、詳細設定の候補（プルダウン）も更新
    if (typeof refreshAdvancedSettingsSelects === "function") {
        refreshAdvancedSettingsSelects();
    }
}


// プレイヤーリスト JSON 出力
function exportPlayerRegistryToJsonArea() {
    const message = document.getElementById("message");
    message.textContent = "";
    message.className = "message";

    try {
        const area = document.getElementById("playerJsonArea");
        if (!area) return;
        area.value = JSON.stringify(playerRegistry, null, 2);
        message.textContent = "プレイヤーリストをJSONとして出力しました。";
        message.classList.add("success");
    } catch (e) {
        console.error(e);
        message.textContent = "プレイヤーリストのJSON出力に失敗しました。";
        message.classList.add("error");
    }
}

// プレイヤーリスト JSON 読み込み
function importPlayerRegistryFromJsonArea() {
    const message = document.getElementById("message");
    message.textContent = "";
    message.className = "message";

    const area = document.getElementById("playerJsonArea");
    if (!area) return;
    const text = area.value.trim();
    if (!text) {
        message.textContent = "プレイヤーリストのJSONが入力されていません。";
        message.classList.add("error");
        return;
    }

    try {
        const data = JSON.parse(text);
        if (!Array.isArray(data)) {
            throw new Error("プレイヤーリストは配列形式である必要があります。");
        }
        playerRegistry = data.map(raw => ({
            name: raw.name ?? "",
            note: raw.note ?? "",
            laneRanks: {
                TOP: raw.laneRanks?.TOP ?? "",
                JNG: raw.laneRanks?.JNG ?? "",
                MID: raw.laneRanks?.MID ?? "",
                ADC: raw.laneRanks?.ADC ?? "",
                SUPPORT: raw.laneRanks?.SUPPORT ?? raw.laneRanks?.SUP ?? ""
            }
        }));
        refreshPlayerRegistryTable();
        updatePlayerRegistrySelects();
        message.textContent = "プレイヤーリストをJSONから読み込みました。";
        message.classList.add("success");
    } catch (e) {
        console.error(e);
        message.textContent = "プレイヤーリストJSONの解析に失敗しました。形式が正しいか確認してください。";
        message.classList.add("error");
    }
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
