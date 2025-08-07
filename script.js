document.addEventListener('DOMContentLoaded', () => {
    // 排行榜管理类
    class LeaderboardManager {
        constructor() {
            this.leaderboards = {
                easy: JSON.parse(localStorage.getItem('leaderboard_easy')) || [],
                medium: JSON.parse(localStorage.getItem('leaderboard_medium')) || [],
                hard: JSON.parse(localStorage.getItem('leaderboard_hard')) || []
            };
            
            this.maxEntries = 10; // 每个难度最多显示10条记录
            
            // 初始化排行榜标签切换
            const tabButtons = document.querySelectorAll('.tab-button');
            tabButtons.forEach(button => {
                button.addEventListener('click', () => {
                    // 移除所有active类
                    tabButtons.forEach(btn => btn.classList.remove('active'));
                    // 添加active类到当前按钮
                    button.classList.add('active');
                    // 显示对应难度的排行榜
                    this.showLeaderboard(button.dataset.difficulty);
                });
            });
            
            // 默认显示中等难度排行榜
            this.showLeaderboard('medium');
        }
        
        // 添加新的分数记录
        addScore(name, score, difficulty) {
            const entry = {
                name: name,
                score: score,
                date: new Date().toLocaleDateString()
            };
            
            this.leaderboards[difficulty].push(entry);
            
            // 按分数降序排序
            this.leaderboards[difficulty].sort((a, b) => b.score - a.score);
            
            // 只保留前N条记录
            if (this.leaderboards[difficulty].length > this.maxEntries) {
                this.leaderboards[difficulty] = this.leaderboards[difficulty].slice(0, this.maxEntries);
            }
            
            // 保存到本地存储
            localStorage.setItem(`leaderboard_${difficulty}`, JSON.stringify(this.leaderboards[difficulty]));
            
            // 更新显示
            this.showLeaderboard(difficulty);
        }
        
        // 显示指定难度的排行榜
        showLeaderboard(difficulty) {
            const leaderboardBody = document.getElementById('leaderboard-body');
            leaderboardBody.innerHTML = '';
            
            const entries = this.leaderboards[difficulty];
            
            if (entries.length === 0) {
                const row = document.createElement('tr');
                const cell = document.createElement('td');
                cell.colSpan = 4;
                cell.textContent = '暂无记录';
                cell.style.textAlign = 'center';
                row.appendChild(cell);
                leaderboardBody.appendChild(row);
                return;
            }
            
            entries.forEach((entry, index) => {
                const row = document.createElement('tr');
                
                const rankCell = document.createElement('td');
                rankCell.textContent = index + 1;
                
                const nameCell = document.createElement('td');
                nameCell.textContent = entry.name;
                
                const scoreCell = document.createElement('td');
                scoreCell.textContent = entry.score;
                
                const dateCell = document.createElement('td');
                dateCell.textContent = entry.date;
                
                row.appendChild(rankCell);
                row.appendChild(nameCell);
                row.appendChild(scoreCell);
                row.appendChild(dateCell);
                
                leaderboardBody.appendChild(row);
            });
        }
    }
    
    // 游戏主类
    class Game2048 {
        constructor() {
            this.size = 4; // 4x4 网格
            this.grid = [];
            this.score = 0;
            this.bestScore = localStorage.getItem('bestScore') || 0;
            this.gameOver = false;
            this.won = false;
            this.moved = false;
            this.waitingForInput = false;
            
            // 难度设置
            this.difficultySettings = {
                easy: {
                    spawnRate4: 0.1,  // 生成4的概率为10%
                    spawnRate8: 0,    // 不生成8
                    winTile: 1024     // 达到1024就算赢
                },
                medium: {
                    spawnRate4: 0.2,   // 生成4的概率为20%
                    spawnRate8: 0.05, // 生成8的概率为5%
                    winTile: 2048     // 达到2048才算赢
                },
                hard: {
                    spawnRate4: 0.3,   // 生成4的概率为30%
                    spawnRate8: 0.1,  // 生成8的概率为10%
                    winTile: 4096     // 达到4096才算赢
                }
            };
            
            // 当前难度
            this.currentDifficulty = document.getElementById('difficulty').value;
            
            // 排行榜管理器
            this.leaderboard = new LeaderboardManager();
            
            // DOM 元素
            this.scoreDisplay = document.getElementById('score');
            this.bestScoreDisplay = document.getElementById('best-score');
            this.tileContainer = document.querySelector('.tile-container');
            this.gameMessage = document.querySelector('.game-message');
            this.gameMessageText = document.querySelector('.game-message p');
            
            // 初始化游戏
            this.init();
            
            // 事件监听
            document.getElementById('new-game-button').addEventListener('click', () => this.restart());
            document.querySelector('.retry-button').addEventListener('click', () => this.restart());
            
            // 难度选择事件
            document.getElementById('difficulty').addEventListener('change', (e) => {
                this.currentDifficulty = e.target.value;
                this.restart();
            });
            
            // 键盘事件
            document.addEventListener('keydown', this.handleKeyDown.bind(this));
            
            // 触摸事件
            let touchStartX, touchStartY;
            let touchEndX, touchEndY;
            
            const gameContainer = document.querySelector('.game-container');
            
            gameContainer.addEventListener('touchstart', (e) => {
                if (this.waitingForInput) return;
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
            });
            
            gameContainer.addEventListener('touchend', (e) => {
                if (this.waitingForInput) return;
                touchEndX = e.changedTouches[0].clientX;
                touchEndY = e.changedTouches[0].clientY;
                
                const dx = touchEndX - touchStartX;
                const dy = touchEndY - touchStartY;
                
                // 确定滑动方向
                if (Math.abs(dx) > Math.abs(dy)) {
                    // 水平滑动
                    if (dx > 20) {
                        this.move('right');
                    } else if (dx < -20) {
                        this.move('left');
                    }
                } else {
                    // 垂直滑动
                    if (dy > 20) {
                        this.move('down');
                    } else if (dy < -20) {
                        this.move('up');
                    }
                }
            });
        }
        
        // 初始化游戏
        init() {
            // 初始化网格
            this.grid = [];
            for (let i = 0; i < this.size; i++) {
                this.grid[i] = [];
                for (let j = 0; j < this.size; j++) {
                    this.grid[i][j] = 0;
                }
            }
            
            // 清空瓦片容器
            this.tileContainer.innerHTML = '';
            
            // 重置分数
            this.score = 0;
            this.updateScore();
            
            // 显示最高分
            this.bestScoreDisplay.textContent = this.bestScore;
            
            // 重置游戏状态
            this.gameOver = false;
            this.won = false;
            this.hideMessage();
            
            // 添加初始瓦片
            this.addRandomTile();
            this.addRandomTile();
        }
        
        // 重新开始游戏
        restart() {
            this.init();
        }
        
        // 添加随机瓦片
        addRandomTile() {
            // 获取所有空格子
            const emptyCells = [];
            for (let i = 0; i < this.size; i++) {
                for (let j = 0; j < this.size; j++) {
                    if (this.grid[i][j] === 0) {
                        emptyCells.push({ row: i, col: j });
                    }
                }
            }
            
            // 如果没有空格子，返回
            if (emptyCells.length === 0) return;
            
            // 随机选择一个空格子
            const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            
            // 根据难度设置生成不同的瓦片
            const settings = this.difficultySettings[this.currentDifficulty];
            let value;
            
            const rand = Math.random();
            if (rand < settings.spawnRate8) {
                value = 8;
            } else if (rand < settings.spawnRate8 + settings.spawnRate4) {
                value = 4;
            } else {
                value = 2;
            }
            
            // 更新网格
            this.grid[randomCell.row][randomCell.col] = value;
            
            // 创建瓦片元素
            this.createTileElement(randomCell.row, randomCell.col, value, true);
        }
        
        // 创建瓦片 DOM 元素
        createTileElement(row, col, value, isNew = false) {
            const tile = document.createElement('div');
            tile.className = `tile tile-${value} ${isNew ? 'tile-new' : ''}`;
            tile.textContent = value;
            
            // 设置位置
            const position = this.calculatePosition(row, col);
            tile.style.transform = `translate(${position.x}px, ${position.y}px)`;
            
            // 添加到容器
            this.tileContainer.appendChild(tile);
            
            return tile;
        }
        
        // 计算瓦片位置
        calculatePosition(row, col) {
            const cellSize = 106.25; // 与 CSS 中的 grid-cell 大小一致
            const gapSize = 15; // 与 CSS 中的 grid-cell margin 一致
            
            const x = col * (cellSize + gapSize);
            const y = row * (cellSize + gapSize);
            
            return { x, y };
        }
        
        // 更新分数
        updateScore() {
            this.scoreDisplay.textContent = this.score;
            
            // 更新最高分
            if (this.score > this.bestScore) {
                this.bestScore = this.score;
                this.bestScoreDisplay.textContent = this.bestScore;
                localStorage.setItem('bestScore', this.bestScore);
            }
        }
        
        // 处理键盘事件
        handleKeyDown(e) {
            if (this.waitingForInput) return;
            
            // 方向键
            switch (e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    this.move('up');
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this.move('down');
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    this.move('left');
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.move('right');
                    break;
            }
        }
        
        // 移动瓦片
        move(direction) {
            if (this.gameOver) return;
            
            this.waitingForInput = true;
            this.moved = false;
            
            // 保存当前网格状态用于比较
            const previousGrid = JSON.parse(JSON.stringify(this.grid));
            
            // 根据方向移动瓦片
            switch (direction) {
                case 'up':
                    this.moveUp();
                    break;
                case 'down':
                    this.moveDown();
                    break;
                case 'left':
                    this.moveLeft();
                    break;
                case 'right':
                    this.moveRight();
                    break;
            }
            
            // 检查是否有移动
            if (this.moved) {
                // 添加新瓦片
                this.addRandomTile();
                
                // 检查游戏状态
                this.checkGameStatus();
            }
            
            // 更新视图
            this.updateView();
            
            this.waitingForInput = false;
        }
        
        // 向上移动
        moveUp() {
            for (let col = 0; col < this.size; col++) {
                let currentRow = 0;
                
                for (let row = 1; row < this.size; row++) {
                    if (this.grid[row][col] !== 0) {
                        const value = this.grid[row][col];
                        let newRow = row;
                        
                        // 向上移动直到碰到另一个瓦片或边界
                        while (newRow > currentRow) {
                            // 如果上方格子为空，继续移动
                            if (this.grid[newRow - 1][col] === 0) {
                                this.grid[newRow - 1][col] = value;
                                this.grid[newRow][col] = 0;
                                newRow--;
                                this.moved = true;
                            }
                            // 如果上方格子与当前格子值相同，合并
                            else if (this.grid[newRow - 1][col] === value) {
                                this.grid[newRow - 1][col] *= 2;
                                this.grid[newRow][col] = 0;
                                this.score += this.grid[newRow - 1][col];
                                newRow--;
                                currentRow = newRow + 1;
                                this.moved = true;
                                break;
                            }
                            // 如果上方格子与当前格子值不同，停止移动
                            else {
                                break;
                            }
                        }
                    }
                }
            }
        }
        
        // 向下移动
        moveDown() {
            for (let col = 0; col < this.size; col++) {
                let currentRow = this.size - 1;
                
                for (let row = this.size - 2; row >= 0; row--) {
                    if (this.grid[row][col] !== 0) {
                        const value = this.grid[row][col];
                        let newRow = row;
                        
                        // 向下移动直到碰到另一个瓦片或边界
                        while (newRow < currentRow) {
                            // 如果下方格子为空，继续移动
                            if (this.grid[newRow + 1][col] === 0) {
                                this.grid[newRow + 1][col] = value;
                                this.grid[newRow][col] = 0;
                                newRow++;
                                this.moved = true;
                            }
                            // 如果下方格子与当前格子值相同，合并
                            else if (this.grid[newRow + 1][col] === value) {
                                this.grid[newRow + 1][col] *= 2;
                                this.grid[newRow][col] = 0;
                                this.score += this.grid[newRow + 1][col];
                                newRow++;
                                currentRow = newRow - 1;
                                this.moved = true;
                                break;
                            }
                            // 如果下方格子与当前格子值不同，停止移动
                            else {
                                break;
                            }
                        }
                    }
                }
            }
        }
        
        // 向左移动
        moveLeft() {
            for (let row = 0; row < this.size; row++) {
                let currentCol = 0;
                
                for (let col = 1; col < this.size; col++) {
                    if (this.grid[row][col] !== 0) {
                        const value = this.grid[row][col];
                        let newCol = col;
                        
                        // 向左移动直到碰到另一个瓦片或边界
                        while (newCol > currentCol) {
                            // 如果左方格子为空，继续移动
                            if (this.grid[row][newCol - 1] === 0) {
                                this.grid[row][newCol - 1] = value;
                                this.grid[row][newCol] = 0;
                                newCol--;
                                this.moved = true;
                            }
                            // 如果左方格子与当前格子值相同，合并
                            else if (this.grid[row][newCol - 1] === value) {
                                this.grid[row][newCol - 1] *= 2;
                                this.grid[row][newCol] = 0;
                                this.score += this.grid[row][newCol - 1];
                                newCol--;
                                currentCol = newCol + 1;
                                this.moved = true;
                                break;
                            }
                            // 如果左方格子与当前格子值不同，停止移动
                            else {
                                break;
                            }
                        }
                    }
                }
            }
        }
        
        // 向右移动
        moveRight() {
            for (let row = 0; row < this.size; row++) {
                let currentCol = this.size - 1;
                
                for (let col = this.size - 2; col >= 0; col--) {
                    if (this.grid[row][col] !== 0) {
                        const value = this.grid[row][col];
                        let newCol = col;
                        
                        // 向右移动直到碰到另一个瓦片或边界
                        while (newCol < currentCol) {
                            // 如果右方格子为空，继续移动
                            if (this.grid[row][newCol + 1] === 0) {
                                this.grid[row][newCol + 1] = value;
                                this.grid[row][newCol] = 0;
                                newCol++;
                                this.moved = true;
                            }
                            // 如果右方格子与当前格子值相同，合并
                            else if (this.grid[row][newCol + 1] === value) {
                                this.grid[row][newCol + 1] *= 2;
                                this.grid[row][newCol] = 0;
                                this.score += this.grid[row][newCol + 1];
                                newCol++;
                                currentCol = newCol - 1;
                                this.moved = true;
                                break;
                            }
                            // 如果右方格子与当前格子值不同，停止移动
                            else {
                                break;
                            }
                        }
                    }
                }
            }
        }
        
        // 更新视图
        updateView() {
            // 清空瓦片容器
            this.tileContainer.innerHTML = '';
            
            // 创建瓦片元素
            for (let row = 0; row < this.size; row++) {
                for (let col = 0; col < this.size; col++) {
                    if (this.grid[row][col] !== 0) {
                        this.createTileElement(row, col, this.grid[row][col]);
                    }
                }
            }
            
            // 更新分数
            this.updateScore();
        }
        
        // 检查游戏状态
        checkGameStatus() {
            // 检查是否达到胜利条件（根据难度设置）
            const winTile = this.difficultySettings[this.currentDifficulty].winTile;
            
            if (!this.won) {
                for (let row = 0; row < this.size; row++) {
                    for (let col = 0; col < this.size; col++) {
                        if (this.grid[row][col] === winTile) {
                            this.won = true;
                            this.showMessage('你赢了！');
                            this.promptForName();
                            return;
                        }
                    }
                }
            }
            
            // 检查是否还有空格子
            for (let row = 0; row < this.size; row++) {
                for (let col = 0; col < this.size; col++) {
                    if (this.grid[row][col] === 0) {
                        return; // 还有空格子，游戏继续
                    }
                }
            }
            
            // 检查是否还有可合并的瓦片
            for (let row = 0; row < this.size; row++) {
                for (let col = 0; col < this.size; col++) {
                    const value = this.grid[row][col];
                    
                    // 检查右侧
                    if (col < this.size - 1 && this.grid[row][col + 1] === value) {
                        return; // 有可合并的瓦片，游戏继续
                    }
                    
                    // 检查下方
                    if (row < this.size - 1 && this.grid[row + 1][col] === value) {
                        return; // 有可合并的瓦片，游戏继续
                    }
                }
            }
            
            // 没有空格子且没有可合并的瓦片，游戏结束
            this.gameOver = true;
            this.showMessage('游戏结束！');
            this.promptForName();
        }
        
        // 显示消息
        showMessage(message) {
            this.gameMessageText.textContent = message;
            this.gameMessage.classList.add('game-over');
        }
        
        // 隐藏消息
        hideMessage() {
            this.gameMessage.classList.remove('game-over');
        }
        
        // 提示输入玩家名称
        promptForName() {
            // 游戏结束时，提示玩家输入名称以记录分数
            setTimeout(() => {
                const playerName = prompt('恭喜你！请输入你的名字记录成绩：', '玩家' + Math.floor(Math.random() * 1000));
                
                if (playerName) {
                    this.leaderboard.addScore(playerName, this.score, this.currentDifficulty);
                }
            }, 500);
        }
    }
    
    // 创建游戏实例
    new Game2048();
});