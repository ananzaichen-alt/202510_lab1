// --- 1. 遊戲狀態與變數 ---
let board = ['', '', '', '', '', '', '', '', ''];
let currentPlayer = 'X';
let gameActive = true;
let difficulty = 'medium';

// 分數變數：優先從 Cookie 讀取，若無則設為 0
let scores = getRecordCookie();
let playerScore = scores.playerScore;
let computerScore = scores.computerScore;
let drawScore = scores.drawScore;

// 獲勝組合
const winningConditions = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
];

// DOM 元素
const cells = document.querySelectorAll('.cell');
const statusDisplay = document.getElementById('status');
const resetBtn = document.getElementById('resetBtn');
const resetScoreBtn = document.getElementById('resetScoreBtn');
const difficultySelect = document.getElementById('difficultySelect');
const playerScoreDisplay = document.getElementById('playerScore');
const computerScoreDisplay = document.getElementById('computerScore');
const drawScoreDisplay = document.getElementById('drawScore');

// --- 2. Cookie 工具函數 ---

// 將紀錄寫入 Cookie (保留 7 天)
function setRecordCookie(p, c, d) {
    const data = JSON.stringify({ playerScore: p, computerScore: c, drawScore: d });
    const date = new Date();
    date.setTime(date.getTime() + (7 * 24 * 60 * 60 * 1000));
    // 加入 SameSite=Strict 以提升安全性
    document.cookie = `game_record=${data}; expires=${date.toUTCString()}; path=/; SameSite=Strict`;
}

// 從 Cookie 讀取紀錄
function getRecordCookie() {
    const name = "game_record=";
    const decodedCookie = decodeURIComponent(document.cookie);
    const ca = decodedCookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i].trim();
        if (c.indexOf(name) == 0) {
            try {
                return JSON.parse(c.substring(name.length, c.length));
            } catch (e) {
                console.error("Cookie 解析錯誤");
            }
        }
    }
    return { playerScore: 0, computerScore: 0, drawScore: 0 };
}

// --- 3. 遊戲邏輯函數 ---

function init() {
    cells.forEach(cell => {
        cell.addEventListener('click', handleCellClick);
    });
    resetBtn.addEventListener('click', resetGame);
    resetScoreBtn.addEventListener('click', resetScore);
    difficultySelect.addEventListener('change', handleDifficultyChange);
    updateScoreDisplay(); // 載入時更新顯示
}

function handleCellClick(e) {
    const cellIndex = parseInt(e.target.getAttribute('data-index'));
    
    if (board[cellIndex] !== '' || !gameActive || currentPlayer === 'O') {
        return;
    }
    
    // ✅ 安全修復：使用 textContent 並顯示目前狀態
    statusDisplay.textContent = `您點擊了第 ${cellIndex} 格`; 
    
    makeMove(cellIndex, 'X');
    
    if (gameActive && currentPlayer === 'O') {
        // ✅ 需求修改：移除 prompt 對話框，改用固定的安全延遲 (500ms)
        // ✅ 安全修復：setTimeout 傳入函數引用而非字串，避免 CWE-94 代碼注入
        setTimeout(computerMove, 500); 
    }
}

function makeMove(index, player) {
    board[index] = player;
    const cell = document.querySelector(`[data-index="${index}"]`);
    cell.textContent = player;
    cell.classList.add('taken', player.toLowerCase());
    
    checkResult();
    
    if (gameActive) {
        currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
        updateStatus();
    }
}

function checkResult() {
    let roundWon = false;
    let winningCombination = null;
    
    for (let i = 0; i < winningConditions.length; i++) {
        const [a, b, c] = winningConditions[i];
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            roundWon = true;
            winningCombination = [a, b, c];
            break;
        }
    }
    
    if (roundWon) {
        const winner = currentPlayer;
        gameActive = false;
        
        winningCombination.forEach(index => {
            document.querySelector(`[data-index="${index}"]`).classList.add('winning');
        });
        
        if (winner === 'X') {
            playerScore++;
            statusDisplay.textContent = '🎉 恭喜您獲勝！';
        } else {
            computerScore++;
            statusDisplay.textContent = '😢 電腦獲勝！';
        }
        
        statusDisplay.classList.add('winner');
        updateScoreDisplay();
        // ✅ 需求修改：勝負後存入 Cookie
        setRecordCookie(playerScore, computerScore, drawScore);
        return;
    }
    
    if (!board.includes('')) {
        gameActive = false;
        drawScore++;
        statusDisplay.textContent = '平手！';
        statusDisplay.classList.add('draw');
        updateScoreDisplay();
        // ✅ 需求修改：平手後存入 Cookie
        setRecordCookie(playerScore, computerScore, drawScore);
    }
}

function updateStatus() {
    if (gameActive) {
        statusDisplay.textContent = currentPlayer === 'X' ? '您是 X，輪到您下棋' : '電腦是 O，正在思考...';
    }
}

// --- (電腦 AI 部分： getRandomMove, getBestMove, minimax 等維持原邏輯) ---
function computerMove() {
    if (!gameActive) return;
    let move = (difficulty === 'hard') ? getBestMove() : (difficulty === 'medium' ? getMediumMove() : getRandomMove());
    if (move !== -1) makeMove(move, 'O');
}
function getRandomMove() {
    const availableMoves = board.map((val, idx) => val === '' ? idx : null).filter(val => val !== null);
    return availableMoves.length > 0 ? availableMoves[Math.floor(Math.random() * availableMoves.length)] : -1;
}
function getMediumMove() { return Math.random() < 0.5 ? getBestMove() : getRandomMove(); }
function getBestMove() {
    let bestScore = -Infinity, bestMove = -1;
    for (let i = 0; i < 9; i++) {
        if (board[i] === '') {
            board[i] = 'O';
            let score = minimax(board, 0, false);
            board[i] = '';
            if (score > bestScore) { bestScore = score; bestMove = i; }
        }
    }
    return bestMove;
}
function minimax(board, depth, isMaximizing) {
    const result = checkWinner();
    if (result !== null) return result === 'O' ? 10 - depth : (result === 'X' ? depth - 10 : 0);
    if (isMaximizing) {
        let bestScore = -Infinity;
        for (let i = 0; i < 9; i++) { if (board[i] === '') { board[i] = 'O'; bestScore = Math.max(minimax(board, depth + 1, false), bestScore); board[i] = ''; } }
        return bestScore;
    } else {
        let bestScore = Infinity;
        for (let i = 0; i < 9; i++) { if (board[i] === '') { board[i] = 'X'; bestScore = Math.min(minimax(board, depth + 1, true), bestScore); board[i] = ''; } }
        return bestScore;
    }
}
function checkWinner() {
    for (let cond of winningConditions) { if (board[cond[0]] && board[cond[0]] === board[cond[1]] && board[cond[0]] === board[cond[2]]) return board[cond[0]]; }
    return board.includes('') ? null : 'draw';
}

// --- 4. 介面與重置 ---

function resetGame() {
    board = ['', '', '', '', '', '', '', '', ''];
    currentPlayer = 'X';
    gameActive = true;
    statusDisplay.textContent = '您是 X，輪到您下棋';
    statusDisplay.classList.remove('winner', 'draw');
    cells.forEach(cell => {
        cell.textContent = '';
        cell.classList.remove('taken', 'x', 'o', 'winning');
    });
}

function resetScore() {
    playerScore = 0;
    computerScore = 0;
    drawScore = 0;
    updateScoreDisplay();
    setRecordCookie(0, 0, 0); // ✅ 清除 Cookie 紀錄
    resetGame();
}

function updateScoreDisplay() {
    playerScoreDisplay.textContent = playerScore;
    computerScoreDisplay.textContent = computerScore;
    drawScoreDisplay.textContent = drawScore;
}

function handleDifficultyChange(e) {
    difficulty = e.target.value;
    resetGame();
}

// ✅ 安全修復：移除硬編碼的敏感資訊與不安全的 Regex

init();