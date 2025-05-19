import { setCookie, getCookie, deleteCookie } from './utils.js';

export class LevelManager {
    constructor() {
        console.log('===== LevelManager Constructor Start =====');
        console.log('LevelManager 构造函数执行');
        this.currentLevel = 1;
        this.maxLevel = 40;
        this.timeLimit = 60000; // 60秒
        this.onLevelStart = null;
        this.onLevelComplete = null;
        this.onGameComplete = null;
        this.onGameOver = null;
        this.isGameOver = false; // 添加游戏失败状态标记
        this.isFreeMode = false; // 添加自由模式标记
        this.loadProgress();
        console.log('加载进度后:', {
            currentLevel: this.currentLevel,
            isGameCompleted: this.isGameCompleted,
            cookieLevel: getCookie('currentLevel')
        });
        this.bgmPlayer = new Audio();
        this.bgmPlayer.loop = true;
        this.successSound = new Audio('audio/success.mp3');
        this.failSound = new Audio('audio/over2.mp3');
        this.isMusicPlaying = true; // 添加音乐状态跟踪
        this.musicButton = document.getElementById('music_btn');
        this.syncMusicButtonState();
        this.isGameCompleted = false;
        this.loadGameCompletedStatus();

        // 添加音频预加载
        this.preloadedBGMs = new Map();
        this.preloadAudios();

        // 在构造函数中添加对当前关卡的检查
        if (this.currentLevel > this.maxLevel) {
            this.currentLevel = this.maxLevel;
            this.isGameCompleted = true;
            this.saveGameCompletedStatus();
        }
        this.isGameStarted = false;
        console.log('===== LevelManager Constructor End =====');
    }

    // 添加预加载方法
    async preloadAudios() {
        // 预加载成功和失败音效
        await this.preloadAudio(this.successSound);
        await this.preloadAudio(this.failSound);

        // 预加载所有BGM
        for (let level = 1; level <= this.maxLevel; level++) {
            const audio = new Audio(`audio/bgm/${level}.MP3`);
            await this.preloadAudio(audio);
            this.preloadedBGMs.set(level, audio);
        }
    }

    // 单个音频预加载
    preloadAudio(audio) {
        return new Promise((resolve) => {
            audio.load();
            audio.oncanplaythrough = () => resolve();
            audio.onerror = () => {
                console.warn(`音频加载失败: ${audio.src}`);
                resolve(); // 即使失败也继续
            };
        });
    }

    loadProgress() {
        console.log('===== Load Progress Start =====');
        const level = getCookie('currentLevel');
        console.log('读取到的关卡:', level);

        // 这里需要判断是否已重置
        if (!level || level === 'undefined') {
            this.currentLevel = 1;
            return;
        }

        if (level === '-1') {
            console.log('检测到通关标记');
            this.isGameCompleted = true;
            this.saveGameCompletedStatus();
            this.currentLevel = this.maxLevel;
        } else if (level) {
            this.currentLevel = parseInt(level);
        }

        console.log('加载后状态:', {
            currentLevel: this.currentLevel,
            isGameCompleted: this.isGameCompleted,
            cookieLevel: getCookie('currentLevel')
        });
        console.log('===== Load Progress End =====');
    }

    loadGameCompletedStatus() {
        const completed = getCookie('gameCompleted');
        this.isGameCompleted = completed === 'true';
    }

    saveGameCompletedStatus() {
        setCookie('gameCompleted', this.isGameCompleted, 30);
    }

    start() {
        this.isGameStarted = true;
        console.log('LevelManager.start() 被调用');
        console.log('当前关卡:', this.currentLevel);
        console.log('Cookie中的关卡:', getCookie('currentLevel'));
        
        // 进入自由模式
        if (this.isGameCompleted || getCookie('currentLevel') === '-1') {
            this.isFreeMode = true;
            this.startLevel();
            return;
            return;
        }

        if (!getCookie('currentLevel')) {
            this.currentLevel = 1;
            setCookie('currentLevel', '1', 30);
        }
        this.startLevel();
    }

    startLevel() {
        if (!this.isGameStarted) {
            return;
        }
        
        // 重置游戏失败状态
        this.isGameOver = false;
        
        console.log('LevelManager.startLevel() 被调用');
        console.log('即将开始的关卡:', this.currentLevel);
        
        // 添加自由模式处理
        if (this.isFreeMode) {
            // 随机选择BGM (1-40)
            const randomBGM = Math.floor(Math.random() * 40) + 1;
            this.playLevelBGM(randomBGM);
        } else {
            this.playLevelBGM(this.currentLevel);
        }

        // 进入关卡前确保所有页面状态正确
        $('.VideoPage').hide();
        $('.MapPage').hide();
        $('.HomePage').hide();
        $('.GamePage').show();

        // 重置页面宽度
        $('.GamePage').css('width', '100%');

        this.syncMusicButtonState(); // 每次开始新关卡时同步按钮状态
        if (this.onLevelStart) {
            // 在自由模式下固定显示为0602
            this.onLevelStart(this.isFreeMode ? 602 : this.currentLevel);
        }
    }

    completeLevel() {
        console.log('===== Complete Level Start =====');
        console.log('当前关卡:', this.currentLevel);
        console.log('最大关卡:', this.maxLevel);
        
        this.stopBGM();
        
        // 确保成功音效已加载完成
        if (this.successSound.readyState >= 3) {
            this.successSound.currentTime = 0;
            this.successSound.play().catch(error => {
                console.warn('播放成功音效失败:', error);
            });
        } else {
            console.warn('成功音效未加载完成');
        }

        // 自由模式下不更新currentLevel，直接触发完成事件
        if (this.isFreeMode) {
            if (this.onLevelComplete) {
                this.onLevelComplete(602, false);
            }
            return;
        }

        // 第40关通过的特殊处理
        if (this.currentLevel === this.maxLevel) {
            console.log('达到最后一关，设置通关状态');
            this.isGameCompleted = true;
            this.saveGameCompletedStatus();
            // 设置特殊的currentLevel值表示游戏完成
            setCookie('currentLevel', '-1', 30);
            console.log('保存后的状态:', {
                isGameCompleted: this.isGameCompleted,
                cookieLevel: getCookie('currentLevel'),
                cookieCompleted: getCookie('gameCompleted')
            });
            if (this.onLevelComplete) {
                this.onLevelComplete(this.currentLevel, true);
            }
            return;
        }

        this.currentLevel++;
        setCookie('currentLevel', this.currentLevel, 30);
        
        if (this.onLevelComplete) {
            this.onLevelComplete(this.currentLevel, false);
        }
        console.log('===== Complete Level End =====');
    }

    retryLevel() {
        // 无论是否游戏失败，都只重试当前关卡
        this.startLevel();
    }

    resetProgress(forceClear = false) {
        this.stopBGM();
        // 只有在强制清除时才重置所有进度
        if(forceClear) {
            this.currentLevel = 1;
            this.isGameOver = false;
            this.isGameCompleted = false;
            deleteCookie('currentLevel');
            deleteCookie('gameCompleted');
        } else {
            // 保持当前关卡进度
            this.isGameOver = false;
        }
    }

    getCurrentLevel() {
        return this.currentLevel;
    }

    getTimeLimit() {
        return this.timeLimit;
    }

    playLevelBGM(level) {
        this.stopBGM();
        
        // 使用预加载的BGM
        const preloadedBGM = this.preloadedBGMs.get(level);
        if (preloadedBGM) {
            this.bgmPlayer = preloadedBGM;
            this.bgmPlayer.loop = true;
            
            if (this.isMusicPlaying) {
                this.bgmPlayer.play().catch(error => {
                    console.warn('BGM播放失败:', error);
                });
            }
        } else {
            console.warn(`BGM未预加载: 第${level}关`);
            // 降级方案：直接加载
            this.bgmPlayer.src = `audio/bgm/${level}.MP3`;
            if (this.isMusicPlaying) {
                this.bgmPlayer.load();
                this.bgmPlayer.play().catch(error => {
                    console.warn('BGM播放失败:', error);
                });
            }
        }
    }

    stopBGM() {
        if (this.bgmPlayer) {
            this.bgmPlayer.pause();
            this.bgmPlayer.currentTime = 0;
        }
    }

    gameOver() {
        //this.stopBGM();
        //this.stopBGM();
        // 不重置收集品和关卡进度
        if (this.failSound.readyState >= 3) {
            this.failSound.currentTime = 0;
            this.failSound.play().catch(error => {
                console.warn('播放失败音效失败:', error);
            });
        }
        // 只设置游戏状态,保留关卡进度
        this.isGameOver = true;
        this.isGameStarted = false;
        
        
        
        if (this.onGameOver) {
            this.onGameOver();
        }
    }

    toggleMusic() {
        this.isMusicPlaying = !this.isMusicPlaying;
        if (this.isMusicPlaying) {
            this.bgmPlayer.play();
        } else {
            this.bgmPlayer.pause();
        }
        this.syncMusicButtonState(); // 切换音乐时同步按钮状态
        return this.isMusicPlaying;
    }

    // 添加新方法：同步音乐按钮状态
    syncMusicButtonState() {
        if (this.musicButton) {
            this.musicButton.src = this.isMusicPlaying ? 'images/music.png' : 'images/music-off.png';
            this.musicButton.style.display = 'inline'; // 确保按钮可见
        }
    }

    isAllLevelsCompleted() {
        const status = {
            isGameCompleted: this.isGameCompleted,
            currentLevel: this.currentLevel,
            cookieLevel: getCookie('currentLevel'),
            cookieCompleted: getCookie('gameCompleted')
        };
        console.log('检查通关状态:', status);
        return this.isGameCompleted || getCookie('currentLevel') === '-1';
    }
}
