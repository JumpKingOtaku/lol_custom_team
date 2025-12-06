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
    // 通常生成：希望4 / 対面3 / 平均2 をイメージしたバランス
    normal: {
        id: "normal",
        label: "通常生成",
        prefWeight: 4,      // 希望レーンの重み（4）
        laneWeight: 3,      // 対面ランク差の重み（3）
        avgWeight: 2,       // チーム平均差の重み（2）
        pairPrefWeight: 4,  // ペア希望も「希望レーン」と同じくらいの重み
        tryCount: 350
    },

    // 希望レーン重視：希望の比重をかなり上げる
    pref: {
        id: "pref",
        label: "希望レーン重視",
        prefWeight: 9,      // 希望レーンを最優先
        laneWeight: 2,      // 対面はそこそこ見る
        avgWeight: 1,       // チーム平均はかなり緩め
        pairPrefWeight: 9,  // ペア希望も強めに考慮
        tryCount: 450
    },

    // 対面ランク重視：レーンごとの差を最優先
    lane: {
        id: "lane",
        label: "対面ランク重視",
        prefWeight: 2,      // 希望は少しだけ見る
        laneWeight: 9,      // 対面差を最重要
        avgWeight: 3,       // チーム平均もそこそこ見る
        pairPrefWeight: 3,  // ペア希望は控えめ
        tryCount: 450
    },

    // チーム平均重視：5人全体の平均差を最優先
    avg: {
        id: "avg",
        label: "チーム平均重視",
        prefWeight: 2,      // 希望は少しだけ
        laneWeight: 3,      // 対面も見る
        avgWeight: 9,       // チーム平均差を最重要
        pairPrefWeight: 3,  // ペア希望は控えめ
        tryCount: 450
    }
};


// =====================
// 結果の履歴（localStorage・最大5件）
// =====================
const STORAGE_KEY_LAST_RESULTS = "lolTeamTool_lastResults_v2";

let resultHistory = {
    list: [],   // [{assignment, players, modeId, score}, ...]
    index: -1   // 現在表示しているインデックス
};

let isRestoringFromHistory = false;

// 新しい結果を履歴に追加
function saveResultHistory(assignment, players, modeId, score) {
    if (isRestoringFromHistory) return;

    const entry = { assignment, players, modeId, score };

    // 途中の結果から新しい生成をした場合は、その先の履歴を捨てる
    if (resultHistory.list.length && resultHistory.index < resultHistory.list.length - 1) {
        resultHistory.list = resultHistory.list.slice(0, resultHistory.index + 1);
    }

    resultHistory.list.push(entry);

    // 最大5件を維持（古いものから削る）
    if (resultHistory.list.length > 5) {
        const overflow = resultHistory.list.length - 5;
        resultHistory.list.splice(0, overflow);
    }

    resultHistory.index = resultHistory.list.length - 1;

    try {
        localStorage.setItem(STORAGE_KEY_LAST_RESULTS, JSON.stringify(resultHistory));
    } catch (e) {
        console.error("failed to save history", e);
    }

    updateHistoryButtons();
}


// =====================
// お気に入り結果（localStorage・最大3件）
// =====================
const STORAGE_KEY_FAVORITE_RESULTS = "lolTeamTool_favorites_v1";

// [null or {assignment, players, modeId, score}, ...] を3件まで
let favoriteResults = [null, null, null];

function saveFavoriteResultsToStorage() {
    try {
        localStorage.setItem(STORAGE_KEY_FAVORITE_RESULTS, JSON.stringify(favoriteResults));
    } catch (e) {
        console.error("failed to save favorites", e);
    }
}

function loadFavoriteResultsOnStartup() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_FAVORITE_RESULTS);
        if (!raw) {
            updateFavoriteButtons();
            return;
        }
        const data = JSON.parse(raw);
        if (Array.isArray(data)) {
            // 3件分だけ使う
            favoriteResults = [data[0] || null, data[1] || null, data[2] || null];
        } else {
            favoriteResults = [null, null, null];
        }
    } catch (e) {
        console.error("failed to load favorites", e);
        favoriteResults = [null, null, null];
    }
    updateFavoriteButtons();
}

function updateFavoriteButtons() {
    for (let i = 0; i < 3; i++) {
        const btn = document.getElementById(`favoriteSlot${i + 1}`);
        if (!btn) continue;
        const fav = favoriteResults[i];
        if (fav) {
            btn.textContent = `★${i + 1}`;
            const scoreText = typeof fav.score === "number" ? fav.score.toFixed(1) : "-";
            btn.title = `お気に入り${i + 1}を表示（スコア: ${scoreText}）`;
            btn.classList.add("filled");
        } else {
            btn.textContent = `☆${i + 1}`;
            btn.title = `お気に入り${i + 1}として現在の結果を保存`;
            btn.classList.remove("filled");
        }
    }
}

function applyFavoriteResult(index) {
    const fav = favoriteResults[index];
    if (!fav) return;

    isRestoringFromHistory = true;

    if (typeof currentMode !== "undefined" && fav.modeId && MODES[fav.modeId]) {
        currentMode = MODES[fav.modeId];
    }

    // 履歴を増やさずに表示だけ行う
    showResult(fav.assignment, fav.players, fav.score);

    isRestoringFromHistory = false;
}


function setupFavoriteButtons() {
    // スロット1〜3のクリック
    for (let i = 0; i < 3; i++) {
        const btn = document.getElementById(`favoriteSlot${i + 1}`);
        if (!btn) continue;

        btn.dataset.slotIndex = String(i);

        btn.addEventListener("click", () => {
            const idx = Number(btn.dataset.slotIndex);
            const fav = favoriteResults[idx];

            // 現在表示している結果（履歴の現在位置）を取得
            const currentEntry =
                resultHistory.index >= 0
                    ? resultHistory.list[resultHistory.index]
                    : null;

            if (!fav) {
                // 空きスロット：現在の結果を保存（ダイアログなし）
                if (!currentEntry) return;
                favoriteResults[idx] = {
                    assignment: currentEntry.assignment,
                    players: currentEntry.players,
                    modeId: currentEntry.modeId,
                    score: currentEntry.score
                };
                saveFavoriteResultsToStorage();
                updateFavoriteButtons();
            } else {
                // 既に入っているスロット：登録済みのお気に入りを表示するだけ
                applyFavoriteResult(idx);
            }
        });
    }

    // 「お気に入りリセット」ボタン（確認なしで即リセット）
    const resetBtn = document.getElementById("favoriteResetButton");
    if (resetBtn) {
        resetBtn.addEventListener("click", () => {
            favoriteResults = [null, null, null];
            saveFavoriteResultsToStorage();
            updateFavoriteButtons();
        });
    }
}


// 起動時に履歴を読み込み＆最後の結果を復元
function loadResultHistoryOnStartup() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_LAST_RESULTS);
        if (!raw) {
            updateHistoryButtons();
            return;
        }
        const data = JSON.parse(raw);
        if (Array.isArray(data.list)) {
            resultHistory.list = data.list;
            if (typeof data.index === "number") {
                resultHistory.index = data.index;
            } else {
                resultHistory.index = data.list.length - 1;
            }
        } else {
            resultHistory.list = [];
            resultHistory.index = -1;
        }

        // index が範囲外になっていないか調整
        if (resultHistory.list.length === 0) {
            resultHistory.index = -1;
        } else if (resultHistory.index < 0 || resultHistory.index >= resultHistory.list.length) {
            resultHistory.index = resultHistory.list.length - 1;
        }

        updateHistoryButtons();

        if (resultHistory.index >= 0) {
            applySavedResultAt(resultHistory.index);
        }
    } catch (e) {
        console.error("failed to load history", e);
        resultHistory.list = [];
        resultHistory.index = -1;
        updateHistoryButtons();
    }
}

// 指定インデックスの結果を画面に反映
function applySavedResultAt(index) {
    const entry = resultHistory.list[index];
    if (!entry) return;

    isRestoringFromHistory = true;

    if (typeof currentMode !== "undefined" && entry.modeId && MODES[entry.modeId]) {
        currentMode = MODES[entry.modeId];
    }

    // showResult の中で saveResultHistory が呼ばれるが、
    // isRestoringFromHistory フラグで履歴は更新されない
    showResult(entry.assignment, entry.players, entry.score);

    isRestoringFromHistory = false;
}

// ボタンの活性/非活性＆インジケータ更新
function updateHistoryButtons() {
    const prevBtn = document.getElementById("historyPrevButton");
    const nextBtn = document.getElementById("historyNextButton");
    const indicator = document.getElementById("historyIndicator");
    if (!prevBtn || !nextBtn || !indicator) return;

    const len = resultHistory.list.length;
    const idx = resultHistory.index;

    const hasPrev = idx > 0;
    const hasNext = idx >= 0 && idx < len - 1;

    prevBtn.disabled = !hasPrev;
    nextBtn.disabled = !hasNext;
    prevBtn.classList.toggle("disabled", !hasPrev);
    nextBtn.classList.toggle("disabled", !hasNext);

    if (len === 0 || idx < 0) {
        indicator.textContent = "-/-";
    } else {
        indicator.textContent = `${idx + 1}/${len}`;
    }
}

// ← → ボタンのイベント登録
function setupHistoryButtons() {
    const prevBtn = document.getElementById("historyPrevButton");
    const nextBtn = document.getElementById("historyNextButton");
    if (!prevBtn || !nextBtn) return;

    prevBtn.addEventListener("click", () => {
        if (resultHistory.index > 0) {
            resultHistory.index--;
            try {
                localStorage.setItem(STORAGE_KEY_LAST_RESULTS, JSON.stringify(resultHistory));
            } catch (e) {
                console.error("failed to save history", e);
            }
            updateHistoryButtons();
            applySavedResultAt(resultHistory.index);
        }
    });

    nextBtn.addEventListener("click", () => {
        if (resultHistory.index >= 0 && resultHistory.index < resultHistory.list.length - 1) {
            resultHistory.index++;
            try {
                localStorage.setItem(STORAGE_KEY_LAST_RESULTS, JSON.stringify(resultHistory));
            } catch (e) {
                console.error("failed to save history", e);
            }
            updateHistoryButtons();
            applySavedResultAt(resultHistory.index);
        }
    });
}

window.addEventListener("DOMContentLoaded", () => {
    setupHistoryButtons();
    loadResultHistoryOnStartup();

    setupFavoriteButtons();
    loadFavoriteResultsOnStartup();
});



// 前回結果のハッシュ（同じ組み合わせを避ける用）
const lastAssignmentHashByMode = {
    normal: null,
    pref: null,
    lane: null,
    avg: null,
    random: null
};

// 直近のチーム結果（ドラッグ＆ドロップ用）
let currentAssignment = null;
let currentPlayers = null;
let currentModeForScore = MODES.normal;
let currentConstraints = null;
let currentScore = null;

// 結果エリアのドラッグ対象
let draggedResultSlot = null;

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

    // 入力内容の自動保存（10人分）＋復元
    if (typeof setupPlayerInputAutoSave === "function") {
        setupPlayerInputAutoSave();
    }

    // プレイヤーリスト（登録済みプレイヤー）の復元
    if (typeof restorePlayerRegistryFromStorage === "function") {
        restorePlayerRegistryFromStorage();
    }

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


    // プレイヤーリスト JSON 出力（ファイル保存）
    const playerExportBtn = document.getElementById("playerJsonExportButton");
    if (playerExportBtn) {
        playerExportBtn.addEventListener("click", exportPlayerRegistryToJsonArea);
    }

    // プレイヤーリスト JSON 読み込み（ファイル選択 + D&D）
    const playerFileInput = document.getElementById("playerJsonFileInput");
    const playerImportBtn = document.getElementById("playerJsonImportButton");

    // ボタン → ファイル選択ダイアログ
    if (playerImportBtn && playerFileInput) {
        playerImportBtn.addEventListener("click", () => {
            playerFileInput.value = "";
            playerFileInput.click();
        });
    }

    // ファイル選択で読み込み
    if (playerFileInput) {
        playerFileInput.addEventListener("change", (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (ev) => {
                const text = String(ev.target.result || "");
                const area = document.getElementById("playerJsonArea");
                if (area) {
                    area.value = text;
                }
                loadPlayerRegistryFromJsonText(text);
            };
            reader.readAsText(file, "utf-8");
        });
    }

    // ドラッグ＆ドロップで読み込み
    const dropZone = document.getElementById("playerJsonDropZone");
    if (dropZone) {
        dropZone.addEventListener("dragover", (e) => {
            e.preventDefault();
            dropZone.classList.add("dragover");
        });
        dropZone.addEventListener("dragleave", () => {
            dropZone.classList.remove("dragover");
        });
        dropZone.addEventListener("drop", (e) => {
            e.preventDefault();
            dropZone.classList.remove("dragover");

            const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (ev) => {
                const text = String(ev.target.result || "");
                const area = document.getElementById("playerJsonArea");
                if (area) {
                    area.value = text;
                }
                loadPlayerRegistryFromJsonText(text);
            };
            reader.readAsText(file, "utf-8");
        });
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

            // ★ 空（初期表示）に戻したら、その行をリセット
            if (!val) {
                clearPlayerRow(i);
                if (typeof refreshAdvancedSettingsSelects === "function") {
                    refreshAdvancedSettingsSelects();
                }
                if (typeof savePlayerInputsToStorage === "function") {
                    savePlayerInputsToStorage();
                }
                return;
            }

            const regIndex = parseInt(val, 10);
            if (!Number.isNaN(regIndex)) {
                applyRegistryPlayerToRow(regIndex, i);
                if (typeof savePlayerInputsToStorage === "function") {
                    savePlayerInputsToStorage();
                }
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
        applyRankOptionStyle(opt, rank.key);   // ★ ランクごとの色クラス
        selectLaneRank.appendChild(opt);
    });

    // ★ 選択されたランクに応じて select の色を更新
    selectLaneRank.addEventListener("change", () => {
        updateRankSelectColor(selectLaneRank);
    });
    // 初期状態（空なので色なし）
    updateRankSelectColor(selectLaneRank);

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
    updateRankSelectColor(sel);   // ★ 復元時も色更新
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
// プレイヤー入力内容の保存 / 復元（localStorage）
// =====================

const STORAGE_KEY_PLAYER_INPUTS = "lolTeamTool_playerInputs_v1";

function savePlayerInputsToStorage() {
    try {
        const snapshot = getInputSnapshot();
        localStorage.setItem(
            STORAGE_KEY_PLAYER_INPUTS,
            JSON.stringify(snapshot)
        );
    } catch (e) {
        console.error("failed to save player inputs", e);
    }
}

function loadPlayerInputsFromStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_PLAYER_INPUTS);
        if (!raw) return;
        const snapshot = JSON.parse(raw);
        applyInputSnapshot(snapshot);
    } catch (e) {
        console.error("failed to load player inputs", e);
    }
}

function setupPlayerInputAutoSave() {
    const tbody = document.getElementById("playerTableBody");
    if (!tbody) return;

    // 先に前回の入力を復元
    loadPlayerInputsFromStorage();

    const handler = () => {
        savePlayerInputsToStorage();
    };

    // 入力値・選択値が変わったら自動保存
    tbody.addEventListener("change", handler);
    tbody.addEventListener("input", handler);
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

    // ★ ドラッグ＆ドロップ用に現在の状態を保持
    currentAssignment = chosen.assignment.map(pos => ({ ...pos }));
    currentPlayers = players;
    currentModeForScore = mode;
    currentConstraints = constraints;
    currentScore = chosen.score;

    showResult(currentAssignment, currentPlayers, currentScore);

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


// 評価スコアの内訳を計算
function computeScoreDetails(assignment, players, mode) {
    if (!assignment || assignment.length !== 10) return null;

    const prefWeight = mode.prefWeight ?? 10;
    const laneWeight = mode.laneWeight ?? 2;
    const avgWeight  = mode.avgWeight ?? 3;

    let prefSum = 0;
    const prefCountByRank = [0, 0, 0, 0, 0];        // 全体
    const prefCountByRankBlue = [0, 0, 0, 0, 0];   // Blue 陣営
    const prefCountByRankRed  = [0, 0, 0, 0, 0];   // Red 陣営

    const teamMMR = {
        BLUE: [],
        RED: []
    };

    const laneMap = {
        BLUE: {},
        RED: {}
    };

    for (const pos of assignment) {
        const player = players[pos.playerIndex];

        // 希望順位（0=第1, 1=第2, ...）
        const prefRankIndex = getLanePreferenceRank(player, pos.role);
        if (Number.isFinite(prefRankIndex)) {
            prefSum += prefRankIndex;
            if (prefRankIndex >= 0 && prefRankIndex < prefCountByRank.length) {
                prefCountByRank[prefRankIndex]++;
                if (pos.team === "BLUE") {
                    prefCountByRankBlue[prefRankIndex]++;
                } else if (pos.team === "RED") {
                    prefCountByRankRed[prefRankIndex]++;
                }
            }
        }

        // MMR
        const mmr = getLaneMMR(player, pos.role);
        teamMMR[pos.team].push(mmr);
        laneMap[pos.team][pos.role] = mmr;
    }

    const perLane = [];
    let laneDiffRawSum = 0;

    for (const role of ROLES) {
        const blueMmr = laneMap.BLUE[role];
        const redMmr  = laneMap.RED[role];

        const diffRaw = (blueMmr != null && redMmr != null)
            ? Math.abs(blueMmr - redMmr)
            : 0;

        laneDiffRawSum += diffRaw;

        perLane.push({
            role,
            blue: blueMmr ?? 0,
            red:  redMmr ?? 0,
            diffRaw
        });
    }

    const blueAvgMMR = average(teamMMR.BLUE);
    const redAvgMMR  = average(teamMMR.RED);
    const avgDiffRaw = Math.abs(blueAvgMMR - redAvgMMR);

    const prefPenalty = prefSum * prefWeight;
    const lanePenalty = laneDiffRawSum * laneWeight;
    const avgPenalty  = avgDiffRaw * avgWeight;
    const total       = prefPenalty + lanePenalty + avgPenalty;

    return {
        total,
        prefSum,
        prefPenalty,
        laneDiffRawSum,
        lanePenalty,
        avgDiffRaw,
        avgPenalty,
        perLane,
        prefCountByRank,
        prefCountByRankBlue,
        prefCountByRankRed,
        prefWeight,
        laneWeight,
        avgWeight,
        blueAvgMMR,
        redAvgMMR
    };
}


// 評価スコア内訳をDOMに描画
function renderScoreDetail(assignment, players, score) {
    const detail = document.getElementById("scoreDetail");
    if (!detail) return;

    // currentMode があればそれを使い、なければ normal
    const mode = (typeof currentMode !== "undefined" && currentMode) ? currentMode : MODES.normal;
    const breakdown = computeScoreDetails(assignment, players, mode);
    if (!breakdown) {
        detail.innerHTML = "";
        return;
    }

    const {
        prefSum,
        prefPenalty,
        laneDiffRawSum,
        lanePenalty,
        avgDiffRaw,
        avgPenalty,
        perLane,
        prefCountByRank,
        prefCountByRankBlue,
        prefCountByRankRed,
        prefWeight,
        laneWeight,
        avgWeight,
        blueAvgMMR,
        redAvgMMR
    } = breakdown;

    // レーンごとの Blue / Red 綱引きバー
    // 差が一番大きいレーンを 75:25 くらいまで広げる
    const maxLaneDiff = perLane.reduce((m, r) => Math.max(m, r.diffRaw), 0) || 1;
    const maxShiftPercent = 25; // 中心 50% から最大 ±25% → 75:25 くらい

    const laneRowsHtml = perLane.map(row => {
        let blueWidth = 50;
        let redWidth  = 50;

        const shift = (row.diffRaw / maxLaneDiff) * maxShiftPercent;

        if (row.blue >= row.red) {
            blueWidth = 50 + shift;
            redWidth  = 50 - shift;
        } else {
            redWidth  = 50 + shift;
            blueWidth = 50 - shift;
        }

        // 10%〜90% の範囲に収める（極端になり過ぎないように）
        blueWidth = Math.min(90, Math.max(10, blueWidth));
        redWidth  = 100 - blueWidth;

        return `
            <tr>
                <td>${ROLE_LABELS[row.role]}</td>
                <td>${mmrToRankLabel(row.blue)}（${row.blue.toFixed(1)}）</td>
                <td>${mmrToRankLabel(row.red)}（${row.red.toFixed(1)}）</td>
                <td>
                    <div class="score-bar-outer">
                        <div class="score-bar-inner-blue" style="width:${blueWidth}%;"></div>
                        <div class="score-bar-inner-red" style="left:${blueWidth}%;width:${redWidth}%;"></div>
                    </div>
                    <span class="score-bar-label">差 ${row.diffRaw.toFixed(1)}</span>
                </td>
            </tr>
        `;
    }).join("");



    // 希望レーン：Blue / Red の人数比を1本バーで
    const prefBarsHtml = prefCountByRank.map((_, idx) => {
        const blueCnt = prefCountByRankBlue[idx] ?? 0;
        const redCnt  = prefCountByRankRed[idx] ?? 0;
        const total   = blueCnt + redCnt;

        const bluePercent = total > 0 ? (blueCnt / total) * 100 : 0;
        const redPercent  = total > 0 ? (redCnt  / total) * 100 : 0;

        return `
            <div class="score-bar-row">
                <span class="score-bar-row-label">第${idx + 1}希望</span>
                <div class="score-bar-outer">
                    <div class="score-bar-inner-blue" style="width:${bluePercent}%;"></div>
                    <div class="score-bar-inner-red" style="left:${bluePercent}%;width:${redPercent}%;"></div>
                </div>
                <span class="score-bar-label">Blue ${blueCnt}人 / Red ${redCnt}人</span>
            </div>
        `;
    }).join("");

    const prefDetailHtml = `
        <ul class="score-detail-list">
            <li>第1希望に入っている人数: ${prefCountByRank[0]}人</li>
            <li>第2希望: ${prefCountByRank[1]}人 / 第3希望: ${prefCountByRank[2]}人</li>
            <li>第4希望: ${prefCountByRank[3]}人 / 第5希望: ${prefCountByRank[4]}人</li>
            <li>希望順位の合計（0=第1希望…）: ${prefSum.toFixed(1)}</li>
        </ul>
    `;


    // チーム平均ランク：Blue / Red 綱引きバー
    // MMR差 8 以上で 75:25 くらいまで動くイメージ
    const maxShiftAvg = 25;
    const diffScale   = Math.min(avgDiffRaw / 8, 1); // 8 を基準に「どれだけ差があるか」
    const shiftAvg    = diffScale * maxShiftAvg;

    let avgBlueWidth = 50;
    let avgRedWidth  = 50;

    if (blueAvgMMR >= redAvgMMR) {
        avgBlueWidth = 50 + shiftAvg;
        avgRedWidth  = 50 - shiftAvg;
    } else {
        avgRedWidth  = 50 + shiftAvg;
        avgBlueWidth = 50 - shiftAvg;
    }

    // 10%〜90% に制限
    avgBlueWidth = Math.min(90, Math.max(10, avgBlueWidth));
    avgRedWidth  = 100 - avgBlueWidth;

    const avgBarsHtml = `
        <div class="score-bar-row">
            <span class="score-bar-row-label">平均</span>
            <div class="score-bar-outer">
                <div class="score-bar-inner-blue" style="width:${avgBlueWidth}%;"></div>
                <div class="score-bar-inner-red" style="left:${avgBlueWidth}%;width:${avgRedWidth}%;"></div>
            </div>
            <span class="score-bar-label">
                Blue ${mmrToRankLabel(blueAvgMMR)}（${blueAvgMMR.toFixed(1)}） /
                Red ${mmrToRankLabel(redAvgMMR)}（${redAvgMMR.toFixed(1)}）
            </span>
        </div>
    `;




    // スコア内でどの要素がどれくらい効いているか（棒グラフ）
    const maxPenalty = Math.max(prefPenalty, lanePenalty, avgPenalty, 1);
    const scoreBarsHtml = `
        <div class="score-bar-row">
            <span class="score-bar-row-label">希望</span>
            <div class="score-bar-outer">
                <div class="score-bar-inner" style="width:${(prefPenalty / maxPenalty) * 100}%;"></div>
            </div>
            <span class="score-bar-label">${prefPenalty.toFixed(1)}</span>
        </div>
        <div class="score-bar-row">
            <span class="score-bar-row-label">対面差</span>
            <div class="score-bar-outer">
                <div class="score-bar-inner" style="width:${(lanePenalty / maxPenalty) * 100}%;"></div>
            </div>
            <span class="score-bar-label">${lanePenalty.toFixed(1)}</span>
        </div>
        <div class="score-bar-row">
            <span class="score-bar-row-label">平均差</span>
            <div class="score-bar-outer">
                <div class="score-bar-inner" style="width:${(avgPenalty / maxPenalty) * 100}%;"></div>
            </div>
            <span class="score-bar-label">${avgPenalty.toFixed(1)}</span>
        </div>
    `;

    // DOM 出力
    detail.innerHTML = `
        <h3>スコア内訳</h3>
        <p class="score-detail-summary">
            合計スコア: ${score.toFixed(1)} =
            希望のズレ ${prefPenalty.toFixed(1)} +
            対面ランクの差 ${lanePenalty.toFixed(1)} +
            チーム平均ランクの差 ${avgPenalty.toFixed(1)}
        </p>

        <div class="score-detail-grid">
            <div class="score-detail-block">
                <h4>希望レーン</h4>
                <p class="score-detail-note">
                    希望順位（第1〜第5）の合計が小さいほど「希望通り」に近い編成です。<br>
                    下の棒グラフは、第◯希望にいるプレイヤーの Blue / Red 比率を表しています。
                </p>
                ${prefDetailHtml}
                <div class="score-pref-bars">
                    ${prefBarsHtml}
                </div>
            </div>

            <div class="score-detail-block">
                <h4>チーム平均ランク</h4>
                <ul class="score-detail-list">
                    <li>Blue 平均: ${mmrToRankLabel(blueAvgMMR)}（MMR: ${blueAvgMMR.toFixed(1)}）</li>
                    <li>Red 平均: ${mmrToRankLabel(redAvgMMR)}（MMR: ${redAvgMMR.toFixed(1)}）</li>
                    <li>MMR差: ${avgDiffRaw.toFixed(1)} / この差によるスコアへの影響: ${avgPenalty.toFixed(1)}</li>
                </ul>
                <div class="score-avg-bars">
                    ${avgBarsHtml}
                </div>
            </div>
        </div>

        <div class="score-detail-block score-detail-block-full">
            <h4>スコア構成</h4>
            <p class="score-detail-note">
                棒グラフが長いほど、その要素が合計スコアに与えている影響が大きいです。
            </p>
            ${scoreBarsHtml}
        </div>

        <div class="score-detail-block score-detail-block-full">
            <h4>レーンごとの対面ランク差</h4>
            <p class="score-detail-note">
                青と赤の長さの差が、そのレーンでどちらのチームが有利かを表しています。<br>
                全レーン差の合計: ${laneDiffRawSum.toFixed(1)} / スコアへの影響: ${lanePenalty.toFixed(1)}
            </p>
            <table class="score-detail-table">
                <thead>
                    <tr>
                        <th>レーン</th>
                        <th>Blue</th>
                        <th>Red</th>
                        <th>MMR差</th>
                    </tr>
                </thead>
                <tbody>
                    ${laneRowsHtml}
                </tbody>
            </table>
        </div>
    `;
}


// 実際の結果描画
function showResult(assignment, players, score) {

	// 新しい結果を履歴に保存（ブラウザを閉じても保持）
    const modeId = (typeof currentMode !== "undefined" && currentMode && currentMode.id)
    ? currentMode.id
    : "normal";
    saveResultHistory(assignment, players, modeId, score);

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

    // 現在の assignment をグローバルにも保持しておく
    currentAssignment = assignment.map(pos => ({ ...pos }));
    currentPlayers = players;

    for (const pos of assignment) {
        if (pos.team === "BLUE") {
            blueAssignments.push(pos);
        } else {
            redAssignments.push(pos);
        }
    }

    blueAssignments.sort((a, b) => ROLES.indexOf(a.role) - ROLES.indexOf(b.role));
    redAssignments.sort((a, b) => ROLES.indexOf(a.role) - ROLES.indexOf(b.role));

    // BLUE
    for (const pos of blueAssignments) {
        const player = players[pos.playerIndex];
        const mmr = getLaneMMR(player, pos.role);
        blueMMR.push(mmr);

        const roleRankLabel = getLaneRankLabel(player, pos.role);
        const prefRank = player.lanePreferences[pos.role];
        const prefText = prefRank != null ? ` / 第${prefRank}希望` : "";

        const li = document.createElement("li");
        li.classList.add("team-player");
        li.dataset.team = pos.team;
        li.dataset.role = pos.role;
        li.dataset.playerIndex = String(pos.playerIndex);
        li.innerHTML = `
            <span class="team-role">${ROLE_LABELS[pos.role]}</span>
            <span class="team-name">${player.name}</span>
            <span class="team-rank">（${roleRankLabel}<span class="team-pref-rank">${prefText}</span>）</span>
            ${player.note ? `<div class="team-note">備考: ${escapeHtml(player.note)}</div>` : ""}
        `;
        blueList.appendChild(li);
    }

    // RED
    for (const pos of redAssignments) {
        const player = players[pos.playerIndex];
        const mmr = getLaneMMR(player, pos.role);
        redMMR.push(mmr);

        const roleRankLabel = getLaneRankLabel(player, pos.role);
        const prefRank = player.lanePreferences[pos.role];
        const prefText = prefRank != null ? ` / 第${prefRank}希望` : "";

        const li = document.createElement("li");
        li.classList.add("team-player");
        li.dataset.team = pos.team;
        li.dataset.role = pos.role;
        li.dataset.playerIndex = String(pos.playerIndex);
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

    // ★ ここで内訳を描画
    renderScoreDetail(assignment, players, score);

    // チーム結果エリア表示
    resultSection.classList.remove("hidden");

    // ★ チーム結果のドラッグ＆ドロップを有効化
    attachTeamPlayerDragEvents();
}


// ==============================
// チーム分け結果のドラッグ＆ドロップ
// ==============================

// 現在の assignment から指定スロットの index を探す
function findAssignmentIndexInCurrent(team, role) {
    if (!currentAssignment) return -1;
    return currentAssignment.findIndex(
        pos => pos.team === team && pos.role === role
    );
}

// DOM イベントの紐付け
function attachTeamPlayerDragEvents() {
    const items = document.querySelectorAll("#blueList .team-player, #redList .team-player");
    items.forEach(li => {
        li.draggable = true;
        li.addEventListener("dragstart", onTeamPlayerDragStart);
        li.addEventListener("dragend", onTeamPlayerDragEnd);
        li.addEventListener("dragover", onTeamPlayerDragOver);
        li.addEventListener("dragleave", onTeamPlayerDragLeave); // ★ 追加
        li.addEventListener("drop", onTeamPlayerDrop);
    });
}


function onTeamPlayerDragStart(event) {
    draggedResultSlot = event.currentTarget;
    if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
        try {
            event.dataTransfer.setData("text/plain", "");
        } catch (e) {
            // Safari 対策など、失敗しても無視
        }
    }
    draggedResultSlot.classList.add("dragging");
}

function onTeamPlayerDragEnd() {
    if (draggedResultSlot) {
        draggedResultSlot.classList.remove("dragging");
        draggedResultSlot = null;
    }
}

function onTeamPlayerDragOver(event) {
    // drop を許可
    event.preventDefault();

    const target = event.currentTarget;
    // 自分自身はハイライトしない
    if (!draggedResultSlot || draggedResultSlot === target) return;

    // 相手にハイライトクラスを付与
    target.classList.add("drop-target");
}

function onTeamPlayerDragLeave(event) {
    const target = event.currentTarget;
    target.classList.remove("drop-target");
}


function onTeamPlayerDrop(event) {
    event.preventDefault();
    const target = event.currentTarget;

    if (!draggedResultSlot || draggedResultSlot === target) return;
    if (!currentAssignment || !currentPlayers) return;

    // すべてのハイライトを一旦クリア
    document
        .querySelectorAll("#blueList .team-player, #redList .team-player")
        .forEach(li => li.classList.remove("drop-target"));

    const teamA = draggedResultSlot.dataset.team;
    const roleA = draggedResultSlot.dataset.role;
    const teamB = target.dataset.team;
    const roleB = target.dataset.role;

    const idxA = findAssignmentIndexInCurrent(teamA, roleA);
    const idxB = findAssignmentIndexInCurrent(teamB, roleB);
    if (idxA === -1 || idxB === -1) return;

    // スロット（team+role）は固定で、担当プレイヤーだけを入れ替える
    const tmpPlayerIndex = currentAssignment[idxA].playerIndex;
    currentAssignment[idxA].playerIndex = currentAssignment[idxB].playerIndex;
    currentAssignment[idxB].playerIndex = tmpPlayerIndex;

    draggedResultSlot.classList.remove("dragging");
    draggedResultSlot = null;

    recalcAndRedrawFromCurrentAssignment();
}

// 並び替え後にスコアなどを再計算して描画し直す
function recalcAndRedrawFromCurrentAssignment() {
    if (!currentAssignment || !currentPlayers) return;

    const mode = currentModeForScore || MODES.normal;
    const constraints = currentConstraints;
    const newScore = evaluateAssignment(currentAssignment, currentPlayers, mode, constraints);

    const message = document.getElementById("message");

    if (!Number.isFinite(newScore)) {
        if (message) {
            message.textContent = "この並び替えでは条件を満たせないためスコアを計算できません（レーン構成や詳細設定を確認してください）。";
            message.className = "message error";
        }
        return;
    }

    if (message && message.classList.contains("error")
        && message.textContent.startsWith("この並び替えでは条件を満たせない")) {
        message.textContent = "";
        message.className = "message";
    }

    currentScore = newScore;
    showResult(currentAssignment, currentPlayers, currentScore);
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

    // ランダムモードでも、以降のドラッグ編集用に保持しておく
    currentAssignment = chosen.assignment.map(pos => ({ ...pos }));
    currentPlayers = players;
    currentModeForScore = MODES.normal;  // ランダムは「通常」と同じ重みで評価
    currentConstraints = constraints;
    currentScore = chosen.score;

    showResult(currentAssignment, currentPlayers, currentScore);

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
        applyRankOptionStyle(opt, rank.key);   // ★ option 色
        sel.appendChild(opt);
    });
    sel.addEventListener("change", () => {
        updateRankSelectColor(sel);           // ★ select 本体の色更新
    });
    updateRankSelectColor(sel);

    sub.appendChild(laneLabel);
    sub.appendChild(sel);
    rowRanks.appendChild(sub);
});
container.appendChild(rowRanks);

// ★ 希望レーン
const rowPrefs = document.createElement("div");
rowPrefs.className = "player-registry-row player-registry-row-prefs";
const labelPrefs = document.createElement("label");
labelPrefs.textContent = "希望レーン";
rowPrefs.appendChild(labelPrefs);

for (let prefIndex = 1; prefIndex <= 5; prefIndex++) {
    const sub = document.createElement("div");
    sub.className = "player-registry-pref";
    const prefLabel = document.createElement("span");
    prefLabel.textContent = `第${prefIndex}希望`;
    const sel = document.createElement("select");
    sel.id = `reg-pref-${prefIndex}`;

    const optNone = document.createElement("option");
    optNone.value = "";
    optNone.textContent = "";
    sel.appendChild(optNone);

    ROLES.forEach(role => {
        const opt = document.createElement("option");
        opt.value = role;
        opt.textContent = ROLE_LABELS[role];
        opt.classList.add(`pref-option-${role}`); // レーン色（既存と同じ）
        sel.appendChild(opt);
    });

    sel.addEventListener("change", () => {
        updatePrefSelectColor(sel);
    });
    updatePrefSelectColor(sel);

    sub.appendChild(prefLabel);
    sub.appendChild(sel);
    rowPrefs.appendChild(sub);
}
container.appendChild(rowPrefs);

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

const lanePrefs = [];
for (let prefIndex = 1; prefIndex <= 5; prefIndex++) {
    const sel = document.getElementById(`reg-pref-${prefIndex}`);
    lanePrefs.push(sel ? sel.value : "");
}


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
            laneRanks,
            lanePrefs
        };
        successMessage = "プレイヤー情報を更新しました。";
    } else {
        playerRegistry.push({
            name,
            note,
            laneRanks,
            lanePrefs
        });
        successMessage = "プレイヤーをリストに追加しました。";
    }

// フォーム初期化
nameInput.value = "";
if (noteInput) noteInput.value = "";

ROLES.forEach(role => {
    const sel = document.getElementById(`reg-laneRank-${role}`);
    if (sel) {
        sel.value = "";
        updateRankSelectColor(sel);   // ★ 色もリセット
    }
});

for (let prefIndex = 1; prefIndex <= 5; prefIndex++) {
    const selPref = document.getElementById(`reg-pref-${prefIndex}`);
    if (selPref) {
        selPref.value = "";
        updatePrefSelectColor(selPref);
    }
}


    // 編集モード解除 & ボタンラベル戻す
    editingRegistryIndex = null;
    const addBtn = document.getElementById("playerAddButton");
    if (addBtn) {
        addBtn.textContent = "プレイヤー追加";
    }

    refreshPlayerRegistryTable();
    updatePlayerRegistrySelects();
    savePlayerRegistryToStorage();

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
const topKey = p.laneRanks?.TOP || "";
tdTop.textContent = topKey ? rankKeyToLabel(topKey) : "";
applyRankLabelStyle(tdTop, topKey);
tr.appendChild(tdTop);

const tdJng = document.createElement("td");
const jngKey = p.laneRanks?.JNG || "";
tdJng.textContent = jngKey ? rankKeyToLabel(jngKey) : "";
applyRankLabelStyle(tdJng, jngKey);
tr.appendChild(tdJng);

const tdMid = document.createElement("td");
const midKey = p.laneRanks?.MID || "";
tdMid.textContent = midKey ? rankKeyToLabel(midKey) : "";
applyRankLabelStyle(tdMid, midKey);
tr.appendChild(tdMid);

const tdAdc = document.createElement("td");
const adcKey = p.laneRanks?.ADC || "";
tdAdc.textContent = adcKey ? rankKeyToLabel(adcKey) : "";
applyRankLabelStyle(tdAdc, adcKey);
tr.appendChild(tdAdc);

const tdSup = document.createElement("td");
const supKey = p.laneRanks?.SUPPORT || "";
tdSup.textContent = supKey ? rankKeyToLabel(supKey) : "";
applyRankLabelStyle(tdSup, supKey);
tr.appendChild(tdSup);

// 第1〜第5希望レーン
for (let prefIndex = 0; prefIndex < 5; prefIndex++) {
    const tdPref = document.createElement("td");
    const key = Array.isArray(p.lanePrefs) ? (p.lanePrefs[prefIndex] || "") : "";

    tdPref.textContent = key ? (ROLE_LABELS[key] || key) : "";

    if (key) {
        // 希望レーン select と同じ色クラスを付与
        tdPref.classList.add(`pref-select-${key}`);
    }

    tr.appendChild(tdPref);
}

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
            savePlayerRegistryToStorage();
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
        updateRankSelectColor(sel);
    }
});

for (let prefIndex = 1; prefIndex <= 5; prefIndex++) {
    const selPref = document.getElementById(`reg-pref-${prefIndex}`);
    if (!selPref) continue;
    const val = Array.isArray(p.lanePrefs)
        ? (p.lanePrefs[prefIndex - 1] || "")
        : "";
    selPref.value = val;
    updatePrefSelectColor(selPref);
}


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

// プレイヤー1行分を初期状態（空）に戻す
function clearPlayerRow(rowNo) {
    // 名前
    const nameInput = document.getElementById(`name-${rowNo}`);
    if (nameInput) nameInput.value = "";

    // 備考
    const noteInput = document.getElementById(`note-${rowNo}`);
    if (noteInput) noteInput.value = "";

    // ランク（TOP/JG/MID/ADC/SUP）
    ROLES.forEach(role => {
        const sel = document.getElementById(`laneRank-${rowNo}-${role}`);
        if (!sel) return;
        sel.value = "";
        if (typeof updateRankSelectColor === "function") {
            updateRankSelectColor(sel);
        }
    });

    // 希望レーン（第1〜第5希望）
    for (let prefIndex = 1; prefIndex <= 5; prefIndex++) {
        const selPref = document.getElementById(`pref-${rowNo}-${prefIndex}`);
        if (!selPref) continue;
        selPref.value = "";
        if (typeof updatePrefSelectColor === "function") {
            updatePrefSelectColor(selPref);
        }
    }
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
        updateRankSelectColor(sel);   // ★ ランク色反映
    });

    // ★ 希望レーンも反映
    if (Array.isArray(p.lanePrefs)) {
        for (let prefIndex = 1; prefIndex <= 5; prefIndex++) {
            const selPref = document.getElementById(`pref-${rowNo}-${prefIndex}`);
            if (!selPref) continue;
            const val = p.lanePrefs[prefIndex - 1] || "";
            selPref.value = val;
            updatePrefSelectColor(selPref);
        }
    }

    // プレイヤー情報が変わったら、詳細設定の候補（プルダウン）も更新
    if (typeof refreshAdvancedSettingsSelects === "function") {
        refreshAdvancedSettingsSelects();
    }
}


function downloadJsonFile(filename, data) {
    const jsonText = JSON.stringify(data, null, 2);

    // Chrome / Edge などで使える場合は「名前を付けて保存」ダイアログを出す
    if (window.showSaveFilePicker) {
        (async () => {
            try {
                const handle = await window.showSaveFilePicker({
                    suggestedName: filename,
                    types: [
                        {
                            description: "JSONファイル",
                            accept: { "application/json": [".json"] }
                        }
                    ]
                });

                const writable = await handle.createWritable();
                await writable.write(jsonText);
                await writable.close();
            } catch (e) {
                // キャンセルなどの場合は何もしない（エラーだけコンソールに出す）
                console.error(e);
            }
        })();

        return;
    }

    // 上のAPIが使えないブラウザは従来通り「自動ダウンロード」
    const blob = new Blob([jsonText], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}


// =====================
// プレイヤーリスト（登録済みプレイヤー）の保存 / 復元（localStorage）
// =====================

const STORAGE_KEY_PLAYER_REGISTRY = "lolTeamTool_playerRegistry_v1";

function savePlayerRegistryToStorage() {
    try {
        localStorage.setItem(
            STORAGE_KEY_PLAYER_REGISTRY,
            JSON.stringify(playerRegistry)
        );
    } catch (e) {
        console.error("failed to save player registry", e);
    }
}

function restorePlayerRegistryFromStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_PLAYER_REGISTRY);
        if (!raw) return;

        const data = JSON.parse(raw);
        if (!Array.isArray(data)) return;

        playerRegistry = data.map(raw => ({
            name: raw.name ?? "",
            note: raw.note ?? "",
            laneRanks: raw.laneRanks ? { ...raw.laneRanks } : {},
            lanePrefs: Array.isArray(raw.lanePrefs) ? [...raw.lanePrefs] : []
        }));
    } catch (e) {
        console.error("failed to load player registry", e);
        return;
    }

    refreshPlayerRegistryTable();
    updatePlayerRegistrySelects();
}



// 共通: JSON文字列からプレイヤーリストを復元
function loadPlayerRegistryFromJsonText(text) {
    const message = document.getElementById("message");
    if (message) {
        message.textContent = "";
        message.className = "message";
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
                TOP:      raw.laneRanks?.TOP      ?? "",
                JNG:      raw.laneRanks?.JNG      ?? "",
                MID:      raw.laneRanks?.MID      ?? "",
                ADC:      raw.laneRanks?.ADC      ?? "",
                SUPPORT:  raw.laneRanks?.SUPPORT  ?? raw.laneRanks?.SUP ?? ""
            },
            lanePrefs: [
                raw.lanePrefs?.[0] ?? "",
                raw.lanePrefs?.[1] ?? "",
                raw.lanePrefs?.[2] ?? "",
                raw.lanePrefs?.[3] ?? "",
                raw.lanePrefs?.[4] ?? ""
            ]
        }));


        refreshPlayerRegistryTable();
        updatePlayerRegistrySelects();
        savePlayerRegistryToStorage();

        if (message) {
            message.textContent = "プレイヤーリストをJSONから読み込みました。";
            message.classList.add("success");
        }

    } catch (e) {
        console.error(e);
        if (message) {
            message.textContent = "プレイヤーリストJSONの解析に失敗しました。形式が正しいか確認してください。";
            message.classList.add("error");
        }
    }
}


// プレイヤーリスト JSON 出力（テキストエリア + ファイル保存）
function exportPlayerRegistryToJsonArea() {
    const message = document.getElementById("message");
    if (message) {
        message.textContent = "";
        message.className = "message";
    }

    try {
        const json = JSON.stringify(playerRegistry, null, 2);

        // 一応テキストエリアにも表示（中身を見たいとき用）
        const area = document.getElementById("playerJsonArea");
        if (area) {
            area.value = json;
        }

        // 日付入りのファイル名で保存
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, "0");
        const d = String(now.getDate()).padStart(2, "0");
        const filename = `player_registry_${y}${m}${d}.json`;

        downloadJsonFile(filename, playerRegistry);

        if (message) {
            message.textContent = `プレイヤーリストをJSONファイル(${filename})として保存しました。`;
            message.classList.add("success");
        }
    } catch (e) {
        console.error(e);
        if (message) {
            message.textContent = "プレイヤーリストのJSON出力に失敗しました。";
            message.classList.add("error");
        }
    }
}

// テキストエリアから読み込む場合（ドラッグ＆ドロップやファイル選択は loadPlayerRegistryFromJsonText を直接使用）
function importPlayerRegistryFromJsonArea() {
    const area = document.getElementById("playerJsonArea");
    if (!area) return;

    const text = area.value.trim();
    if (!text) {
        const message = document.getElementById("message");
        if (message) {
            message.textContent = "プレイヤーリストのJSONが入力されていません。";
            message.classList.add("error");
        }
        return;
    }

    loadPlayerRegistryFromJsonText(text);
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

// ランクキー ("IRON_IV" など) からティア部分 ("IRON") を取り出す
function rankKeyToTier(rankKey) {
    if (!rankKey) return "";
    const idx = rankKey.indexOf("_");
    if (idx === -1) return rankKey;
    return rankKey.substring(0, idx);
}

// ランク select 本体の色を切り替える
function updateRankSelectColor(selectEl) {
    ["IRON","BRONZE","SILVER","GOLD","PLATINUM","EMERALD","DIAMOND"].forEach(tier => {
        selectEl.classList.remove(`rank-select-${tier}`);
    });

    const val = selectEl.value;
    if (!val) return;

    const tier = rankKeyToTier(val);
    if (!tier) return;

    selectEl.classList.add(`rank-select-${tier}`);
}

// ランク option に色用クラスを付ける
function applyRankOptionStyle(optionEl, rankKey) {
    const tier = rankKeyToTier(rankKey);
    if (!tier) return;
    optionEl.classList.add(`rank-option-${tier}`);
}

// ランク表示用の td などに色クラスを付ける
function applyRankLabelStyle(element, rankKey) {
    ["IRON","BRONZE","SILVER","GOLD","PLATINUM","EMERALD","DIAMOND"].forEach(tier => {
        element.classList.remove(`rank-label-${tier}`);
    });
    if (!rankKey) return;
    const tier = rankKeyToTier(rankKey);
    if (!tier) return;
    element.classList.add(`rank-label-${tier}`);
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

