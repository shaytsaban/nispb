/**
 * metrics_learning_game - App Logic
 * Includes Sound Synth (Web Audio API), Particle Fireworks, Simulation, and Quiz systems.
 */

// --- STATE MANAGEMENT ---
const AppState = {
    currentStep: 1,
    totalSteps: 5,
    soundEnabled: true,
    scoreQC: 0,
    maxScoreQC: 4, // 4 anomalies to find
    foundQC: new Set(),
    activeSimTab: 'pm', // 'pm' or 'user'
    sortDirection: 1, // 1 for asc, -1 for desc
    activeCategoryFilter: 'all',
    stepsCompleted: new Set()
};

// --- AUDIO SYNTHESIS SYSTEM (Web Audio API) ---
const SoundEffects = {
    ctx: null,
    musicInterval: null,
    musicPlaying: false,
    tempo: 120, // BPM
    beatIndex: 0,

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    },

    playSuccess() {
        if (!AppState.soundEnabled) return;
        this.init();
        const now = this.ctx.currentTime;
        
        // Ascending major chord sound
        const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.1);
            
            gain.gain.setValueAtTime(0.1, now + idx * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.4);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.start(now + idx * 0.1);
            osc.stop(now + idx * 0.1 + 0.4);
        });
    },

    playFailure() {
        if (!AppState.soundEnabled) return;
        this.init();
        const now = this.ctx.currentTime;
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.3);
        
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start(now);
        osc.stop(now + 0.3);
    },

    playClick() {
        if (!AppState.soundEnabled) return;
        this.init();
        const now = this.ctx.currentTime;
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.05);
        
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start(now);
        osc.stop(now + 0.05);
    },

    playQuestComplete() {
        if (!AppState.soundEnabled) return;
        this.init();
        const now = this.ctx.currentTime;
        
        // Play beautiful complex victory tune
        const melody = [
            { f: 523.25, d: 0.15 }, // C5
            { f: 659.25, d: 0.15 }, // E5
            { f: 783.99, d: 0.15 }, // G5
            { f: 1046.50, d: 0.4 }  // C6
        ];
        
        melody.forEach((note, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(note.f, now + idx * 0.15);
            
            gain.gain.setValueAtTime(0.15, now + idx * 0.15);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + note.d);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.start(now + idx * 0.15);
            osc.stop(now + idx * 0.15 + note.d);
        });
    },

    toggleMusic() {
        this.init();
        if (this.musicPlaying) {
            clearInterval(this.musicInterval);
            this.musicPlaying = false;
            document.getElementById('musicIcon').innerText = '🎵';
            document.getElementById('musicText').innerText = 'נגן מוזיקה';
        } else {
            this.musicPlaying = true;
            document.getElementById('musicIcon').innerText = '⏸️';
            document.getElementById('musicText').innerText = 'עצור מוזיקה';
            
            const secondsPerBeat = 60.0 / this.tempo;
            const eighthNoteTime = secondsPerBeat / 2; // 0.25s at 120BPM
            
            // Loop step-sequencer
            this.musicInterval = setInterval(() => {
                const now = this.ctx.currentTime;
                
                // Synth Bass Line notes (C, Eb, G, Bb retro progression)
                const bassline = [130.81, 130.81, 155.56, 155.56, 196.00, 196.00, 233.08, 233.08];
                const note = bassline[this.beatIndex % bassline.length];
                
                // Play Synth Bass Beat
                if (this.beatIndex % 2 === 0) {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(note, now);
                    gain.gain.setValueAtTime(0.06, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
                    osc.connect(gain);
                    gain.connect(this.ctx.destination);
                    osc.start(now);
                    osc.stop(now + 0.3);
                }
                
                // Add soft high melodic keys occasionally for ambient gaming style
                const melodyPatterns = [
                    [523.25, 0, 587.33, 0, 659.25, 0, 783.99, 0],
                    [783.99, 0, 659.25, 0, 587.33, 0, 523.25, 0]
                ];
                const pattern = melodyPatterns[Math.floor((this.beatIndex / 8) % 2)];
                const melodyNote = pattern[this.beatIndex % 8];
                
                if (melodyNote > 0 && Math.random() > 0.3) {
                    const osc2 = this.ctx.createOscillator();
                    const gain2 = this.ctx.createGain();
                    osc2.type = 'sine';
                    osc2.frequency.setValueAtTime(melodyNote, now);
                    gain2.gain.setValueAtTime(0.02, now);
                    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
                    osc2.connect(gain2);
                    gain2.connect(this.ctx.destination);
                    osc2.start(now);
                    osc2.stop(now + 0.6);
                }
                
                this.beatIndex++;
            }, eighthNoteTime * 1000);
        }
    }
};

// --- FIREWORKS CANVAS SYSTEM ---
const Fireworks = {
    canvas: null,
    ctx: null,
    particles: [],
    animationFrame: null,

    init() {
        this.canvas = document.getElementById('fireworksCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());
    },

    resize() {
        if (this.canvas) {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        }
    },

    createFirework(x, y) {
        const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#0ea5e9', '#ec4899'];
        const particleCount = 60;
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 / particleCount) * i + Math.random() * 0.5;
            const speed = Math.random() * 5 + 3;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                alpha: 1,
                color: colors[Math.floor(Math.random() * colors.length)],
                size: Math.random() * 3 + 2,
                gravity: 0.15
            });
        }
        
        if (!this.animationFrame) {
            this.animate();
        }
    },

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity;
            p.alpha -= 0.015;
            
            if (p.alpha <= 0) {
                this.particles.splice(i, 1);
                continue;
            }
            
            this.ctx.save();
            this.ctx.globalAlpha = p.alpha;
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        }
        
        if (this.particles.length > 0) {
            this.animationFrame = requestAnimationFrame(() => this.animate());
        } else {
            this.animationFrame = null;
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    },

    launchBatch() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        
        // Launch multiple fireworks
        this.createFirework(w * 0.3, h * 0.4);
        setTimeout(() => this.createFirework(w * 0.5, h * 0.3), 200);
        setTimeout(() => this.createFirework(w * 0.7, h * 0.5), 450);
        setTimeout(() => this.createFirework(w * 0.4, h * 0.5), 700);
        setTimeout(() => this.createFirework(w * 0.6, h * 0.4), 900);
    }
};

// --- DATASET & SIMULATION MOCK DATA ---
const MockData = {
    // PM KPIs
    kpi: {
        all: { users: '24,580', retention: '48.2%', conversion: '3.4%', revenue: '₪420,500' },
        mobile: { users: '18,200', retention: '51.4%', conversion: '2.8%', revenue: '₪290,100' },
        web: { users: '6,380', retention: '39.0%', conversion: '5.1%', revenue: '₪130,400' }
    },
    
    // PM Tables Data (Detailed Activity Logs)
    transactions: [
        { id: 'TX-1001', name: 'עומר אהרוני', email: 'omer@gmail.com', segment: 'מובייל', product: 'מנוי פרימיום חודשי', amount: 89, date: '2026-05-26' },
        { id: 'TX-1002', name: 'מיכל לוי', email: 'michal@hotmail.com', segment: 'ווב', product: 'חבילת מפתח מקצועית', amount: 349, date: '2026-05-25' },
        { id: 'TX-1003', name: 'דניאל כהן', email: 'daniel.c@gmail.com', segment: 'מובייל', product: 'מנוי פרימיום חודשי', amount: 89, date: '2026-05-25' },
        { id: 'TX-1004', name: 'שירה רדעי', email: 'shira.r@gmail.com', segment: 'ווב', product: 'שירות יעוץ אינטראקטיבי', amount: 499, date: '2026-05-24' },
        { id: 'TX-1005', name: 'איתי מזרחי', email: 'itay.m@outlook.com', segment: 'מובייל', product: 'מנוי בסיסי', amount: 49, date: '2026-05-24' },
        { id: 'TX-1006', name: 'יעל ישראלי', email: 'yael.israeli@gmail.com', segment: 'ווב', product: 'חבילת מפתח מקצועית', amount: 349, date: '2026-05-23' }
    ],

    // Personalized User Performance Data (End-User Dashboard)
    userMetrics: {
        completedLessons: 12,
        totalTimeMinutes: 340,
        averageScore: 92,
        achievements: ['הטירון המהיר', 'חוקר נתונים מוסמך', 'מבקר איכות קפדן']
    }
};

// --- QUALITY CONTROL SIMULATION ---
const QCGame = {
    anomalies: {
        'qc-row-2': 'שגיאה: ערך רכישה שלילי! (₪-250) - לא ייתכן סכום שלילי ברכישה תקינה במערכת ללא החזר מאושר.',
        'qc-row-4': 'שגיאה: תאריך עתידי! (2028-12-15) - ה-AI ג׳נרט תאריך שעדיין לא התרחש.',
        'qc-row-6': 'שגיאה: סווג כמובייל אך הדפדפן הוא Chrome Desktop! - חוסר עקביות מהותי בנתונים.',
        'qc-row-8': 'שגיאה: מזהה משתמש חסר/ריק! - אינטגריטי של מפתח זר נפגע, לא ניתן לקשר משתמש לעסקה.'
    },

    handleRowClick(rowId, element) {
        if (AppState.foundQC.has(rowId)) return;

        if (this.anomalies[rowId]) {
            // Correct click (found anomaly)
            AppState.foundQC.add(rowId);
            AppState.scoreQC += 1;
            element.classList.remove('qc-row-clickable');
            element.classList.add('error-found');
            
            document.getElementById('qc-explanation-text').innerText = this.anomalies[rowId];
            document.getElementById('qc-explanation-text').style.color = '#b91c1c';
            
            SoundEffects.playSuccess();
            Fireworks.createFirework(window.innerWidth / 2, window.innerHeight / 2);
            
            // Check win condition
            if (AppState.scoreQC === AppState.maxScoreQC) {
                setTimeout(() => {
                    document.getElementById('qc-explanation-text').innerText = 'מדהים! מצאת את כל 4 השגיאות הקריטיות בנתונים! הוכחת יכולת בקרת איכות מעולה ששומרת על שלמות המאגר.';
                    document.getElementById('qc-explanation-text').style.color = '#15803d';
                    SoundEffects.playQuestComplete();
                    Fireworks.launchBatch();
                    
                    // Mark step completed
                    markStepCompleted(3);
                }, 500);
            }
        } else {
            // Wrong click
            element.classList.add('correct-clicked');
            document.getElementById('qc-explanation-text').innerText = 'נראה תקין! שורה זו עברה את הבדיקה בהצלחה.';
            document.getElementById('qc-explanation-text').style.color = '#15803d';
            SoundEffects.playClick();
            
            setTimeout(() => {
                element.classList.remove('correct-clicked');
            }, 1000);
        }
        
        document.getElementById('qc-score-val').innerText = AppState.scoreQC;
    }
};

// --- INITIALIZE & ATTACH HANDLERS ---
document.addEventListener('DOMContentLoaded', () => {
    // Init canvas
    Fireworks.init();
    
    // Attach audio toggler
    document.getElementById('audioToggle').addEventListener('click', () => {
        AppState.soundEnabled = !AppState.soundEnabled;
        const icon = document.getElementById('audioIcon');
        const text = document.getElementById('audioText');
        if (AppState.soundEnabled) {
            icon.innerText = '🔊';
            text.innerText = 'סאונד פעיל';
            SoundEffects.playClick();
        } else {
            icon.innerText = '🔇';
            text.innerText = 'ללא סאונד';
        }
    });

    // Attach music toggler
    document.getElementById('musicToggle').addEventListener('click', () => {
        SoundEffects.toggleMusic();
    });

    // Sidebar navigation clicks
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const step = parseInt(item.getAttribute('data-step'));
            goToStep(step);
        });
    });

    // Navigation buttons
    document.getElementById('btn-prev').addEventListener('click', () => {
        if (AppState.currentStep > 1) {
            goToStep(AppState.currentStep - 1);
        }
    });
    
    document.getElementById('btn-next').addEventListener('click', () => {
        if (AppState.currentStep < AppState.totalSteps) {
            goToStep(AppState.currentStep + 1);
        }
    });

    // Set up interactive prompts
    setupPromptCopier();

    // Set up mini-quiz
    setupQuiz();

    // Set up Quality Control Game
    setupQCGame();

    // Set up Live System Simulator
    setupSimulation();

    // Render initial simulation
    renderSimulation();
});

// --- NAVIGATION LOGIC ---
function goToStep(stepNum) {
    if (stepNum < 1 || stepNum > AppState.totalSteps) return;
    
    // Play transition sound
    SoundEffects.playClick();
    
    // Update State
    AppState.currentStep = stepNum;
    
    // Toggle active classes on cards
    document.querySelectorAll('.quest-card').forEach(card => {
        card.classList.remove('active');
    });
    document.getElementById(`step-${stepNum}`).classList.add('active');
    
    // Toggle active classes on sidebar
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`.nav-item[data-step="${stepNum}"]`).classList.add('active');
    
    // Handle buttons visibility
    const prevBtn = document.getElementById('btn-prev');
    const nextBtn = document.getElementById('btn-next');
    
    if (stepNum === 1) {
        prevBtn.style.visibility = 'hidden';
    } else {
        prevBtn.style.visibility = 'visible';
    }
    
    if (stepNum === AppState.totalSteps) {
        nextBtn.innerText = 'סיימתי את הלומדה בהצלחה! 🎓';
        nextBtn.style.background = 'linear-gradient(135deg, var(--color-success), var(--color-info))';
    } else {
        nextBtn.innerText = 'המשך לשלב הבא ←';
        nextBtn.style.background = 'var(--color-primary)';
    }

    // Scroll to top of content smoothly
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function markStepCompleted(stepNum) {
    AppState.stepsCompleted.add(stepNum);
    const navItem = document.querySelector(`.nav-item[data-step="${stepNum}"]`);
    if (navItem) {
        navItem.classList.add('completed');
    }
}

// --- PROMPT COPIER ---
function setupPromptCopier() {
    document.querySelectorAll('.btn-copy').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const codeText = document.getElementById(targetId).innerText;
            
            navigator.clipboard.writeText(codeText).then(() => {
                const originalText = btn.innerText;
                btn.innerText = 'הועתק! ✓';
                btn.style.backgroundColor = 'var(--color-success)';
                SoundEffects.playSuccess();
                
                setTimeout(() => {
                    btn.innerText = originalText;
                    btn.style.backgroundColor = '';
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy text: ', err);
            });
        });
    });
}

// --- QUIZ LOGIC ---
function setupQuiz() {
    const options = document.querySelectorAll('.quiz-option');
    options.forEach(opt => {
        opt.addEventListener('click', () => {
            const isCorrect = opt.getAttribute('data-correct') === 'true';
            
            // Clear siblings state
            const parent = opt.parentElement;
            parent.querySelectorAll('.quiz-option').forEach(sibling => {
                sibling.classList.remove('correct', 'wrong');
            });
            
            if (isCorrect) {
                opt.classList.add('correct');
                SoundEffects.playSuccess();
                Fireworks.createFirework(window.innerWidth / 2, window.innerHeight / 2);
                markStepCompleted(1);
            } else {
                opt.classList.add('wrong');
                SoundEffects.playFailure();
            }
        });
    });
}

// --- QUALITY CONTROL GAME ---
function setupQCGame() {
    document.querySelectorAll('.qc-row-clickable').forEach(row => {
        row.addEventListener('click', () => {
            const rowId = row.id;
            QCGame.handleRowClick(rowId, row);
        });
    });
}

// --- SIMULATION SYSTEM MOCK ---
function setupSimulation() {
    // Navigation Tabs
    document.getElementById('sim-btn-pm').addEventListener('click', (e) => {
        AppState.activeSimTab = 'pm';
        document.getElementById('sim-btn-pm').classList.add('active');
        document.getElementById('sim-btn-user').classList.remove('active');
        renderSimulation();
        SoundEffects.playClick();
    });

    document.getElementById('sim-btn-user').addEventListener('click', (e) => {
        AppState.activeSimTab = 'user';
        document.getElementById('sim-btn-user').classList.add('active');
        document.getElementById('sim-btn-pm').classList.remove('active');
        renderSimulation();
        SoundEffects.playClick();
    });

    // Filter segment
    document.getElementById('sim-segment-filter').addEventListener('change', (e) => {
        AppState.activeCategoryFilter = e.target.value;
        renderSimulation(true); // highlight values on change
        SoundEffects.playClick();
    });
}

function renderSimulation(shouldHighlight = false) {
    const pmContainer = document.getElementById('sim-view-pm');
    const userContainer = document.getElementById('sim-view-user');

    if (AppState.activeSimTab === 'pm') {
        pmContainer.style.display = 'block';
        userContainer.style.display = 'none';

        // Update KPIs based on filter
        const kpis = MockData.kpi[AppState.activeCategoryFilter];
        const valUsers = document.getElementById('kpi-users');
        const valRetention = document.getElementById('kpi-retention');
        const valConversion = document.getElementById('kpi-conversion');
        const valRevenue = document.getElementById('kpi-revenue');

        valUsers.innerText = kpis.users;
        valRetention.innerText = kpis.retention;
        valConversion.innerText = kpis.conversion;
        valRevenue.innerText = kpis.revenue;

        if (shouldHighlight) {
            // Apply flashing class to show update animation
            [valUsers, valRetention, valConversion, valRevenue].forEach(el => {
                const parent = el.closest('.kpi-card');
                parent.classList.add('highlight-new');
                setTimeout(() => parent.classList.remove('highlight-new'), 1000);
            });
        }

        // Render PM transaction list
        renderTransactionsTable();
    } else {
        pmContainer.style.display = 'none';
        userContainer.style.display = 'block';

        // User stats rendering
        document.getElementById('user-lessons').innerText = MockData.userMetrics.completedLessons;
        document.getElementById('user-time').innerText = MockData.userMetrics.totalTimeMinutes + " דקות";
        document.getElementById('user-score').innerText = MockData.userMetrics.averageScore + "%";

        // Badges rendering
        const badgesContainer = document.getElementById('user-badges-list');
        badgesContainer.innerHTML = '';
        MockData.userMetrics.achievements.forEach(badge => {
            const badgeEl = document.createElement('span');
            badgeEl.className = 'quest-step-badge';
            badgeEl.style.margin = '0 0 0 0.5rem';
            badgeEl.style.background = 'var(--color-success-light)';
            badgeEl.style.color = '#15803d';
            badgeEl.innerText = '🏆 ' + badge;
            badgesContainer.appendChild(badgeEl);
        });

        markStepCompleted(5);
    }
}

function renderTransactionsTable() {
    const tbody = document.getElementById('sim-table-body');
    tbody.innerHTML = '';

    // Filter
    let list = [...MockData.transactions];
    if (AppState.activeCategoryFilter !== 'all') {
        const seg = AppState.activeCategoryFilter === 'mobile' ? 'מובייל' : 'ווב';
        list = list.filter(t => t.segment === seg);
    }

    // Render list
    list.forEach(t => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-family: var(--font-english); font-weight: 600;">${t.id}</td>
            <td style="font-weight: 700;">${t.name}</td>
            <td style="font-family: var(--font-english); color: var(--text-secondary);">${t.email}</td>
            <td><span class="quest-step-badge" style="background: ${t.segment === 'מובייל' ? 'var(--color-primary-light)' : 'var(--color-info-light)'}; color: ${t.segment === 'מובייל' ? 'var(--color-primary)' : 'var(--color-info)'}; margin: 0;">${t.segment}</span></td>
            <td style="font-weight: 500;">${t.product}</td>
            <td style="font-family: var(--font-english); font-weight: 700; color: var(--color-success);">₪${t.amount}</td>
            <td style="font-family: var(--font-english); color: var(--text-muted);">${t.date}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Global click handler to celebrate end of the game
document.getElementById('btn-next').addEventListener('click', (e) => {
    if (AppState.currentStep === AppState.totalSteps) {
        SoundEffects.playQuestComplete();
        Fireworks.launchBatch();
        markStepCompleted(5);
        
        // Show success alert in UI
        const nextBtn = document.getElementById('btn-next');
        nextBtn.innerText = 'השלמת את כל הלומדה! 🌟🏆🎉';
        nextBtn.disabled = true;
        nextBtn.style.opacity = '0.8';
        nextBtn.style.cursor = 'default';
    }
});

// --- NEW: INTERACTIVE CHART DECISION TREE GUIDE ---
const ChartGuideData = {
    line: {
        title: 'תרשים קו (Line Chart)',
        badge: 'מגמה רציפה לאורך זמן',
        previewHtml: '<div class="chart-vector-line"></div>',
        business: 'הסבר מהותי לצירים ומשתנים: ציר ה-X מייצג את ציר הזמן הרציף (ימים/חודשים) כי זמן תמיד זורם קדימה. ציר ה-Y מודד משתנה רציף כמותי (כמו הכנסה מצטברת ב-₪). הבחירה במשתנים אלו נועדה לזהות שיפועים ומגמות צמיחה או דעיכה.',
        interpretation: 'שאלות מנחות לבחירה: (1) האם השאלה העסקית עוסקת במגמה לאורך זמן? (2) האם הנתון רציף? (3) כיצד לבנות ב-Tableau? גרור את שדה התאריך לעמודות (Columns) ואת מדד ה-Revenue לשיורות (Rows), וסמן Marks ל-Line.',
        industry: '<strong>הנחיית יצירה וייצוא ב-Tableau:</strong> גרור את [Transaction_Date] ל-Columns (עמודות) ואת [Amount_Paid_ILS] ל-Rows (שורות). שנה את ה-Mark ל-Line. לייצוא: לחץ על Worksheet -> Export -> Image לשילוב ישיר במצגת מנהלי המוצר!'
    },
    bar: {
        title: 'תרשים עמודות (Bar Chart)',
        badge: 'השוואת קטגוריות בדידות',
        previewHtml: `
            <div class="chart-vector-bar">
                <div class="chart-vector-bar-item" style="height: 60px;"></div>
                <div class="chart-vector-bar-item" style="height: 90px; background: var(--color-info);"></div>
                <div class="chart-vector-bar-item" style="height: 40px; background: var(--color-success);"></div>
            </div>
        `,
        business: 'הסבר מהותי לצירים ומשתנים: ציר ה-X (או Y בתרשים אופקי) מייצג קטגוריות בדידות לא רציפות (למשל: סוג פלטפורמה - מובייל לעומת ווב). ציר ה-Y מציג מדד מסוכם כמותי (כגון סך רכישות). הבחירה מאפשרת השוואת גבהים ברורה לעין.',
        interpretation: 'שאלות מנחות לבחירה: (1) האם אנו משווים בין קטגוריות שאינן תלויות בזמן? (2) האם ההפרש הוויזואלי הוא העיקר? (3) יצירה ב-Tableau: גרור מימד [Platform] ל-Columns ומדד [Amount_Paid_ILS] ל-Rows, ובחר תרשים Bar.',
        industry: '<strong>הנחיית יצירה וייצוא ב-Tableau:</strong> שים את השדה הדיסקרטי [Platform] ב-Columns ואת [Amount_Paid_ILS] (כאשר מופעל עליו SUM) ב-Rows. בחר Marks כ-Bar. ייצא כ-PDF דרך File -> Print to PDF לשיתוף עם מחלקת כספים.'
    },
    pie: {
        title: 'תרשים עוגה (Pie / Donut Chart)',
        badge: 'פילוח חלק מתוך השלם',
        previewHtml: '<div class="chart-vector-pie"></div>',
        business: 'הסבר מהותי לצירים ומשתנים: אין צירים קלאסיים! התרשים מבוסס על חלוקת זווית של 360 מעלות. המשתנה המפולח הוא מימד דיסקרטי קטן (עד 3 קטגוריות, למשל סוג מנוי). גודל הפרוסה נקבע לפי המדד הכמותי היחסי.',
        interpretation: 'שאלות מנחות לבחירה: (1) האם סך כל הפרוסות מסתכם בדיוק ל-100%? (2) האם יש מעט קטגוריות? (3) כיצד לבנות ב-Tableau? בחר Marks ל-Pie, גרור את המימד ל-Color ואת המדד הכמותי ל-Angle.',
        industry: '<strong>הנחיית יצירה וייצוא ב-Tableau:</strong> שנה את סוג ה-Mark ל-Pie. גרור את שדה הפילוח [Platform] אל כפתור ה-Color ב-Marks Card, וגרור את שדה המדד אל Angle. ייצא את התצוגה כנתונים גולמיים בעזרת Worksheet -> Export -> Crosstab to Excel.'
    },
    scatter: {
        title: 'תרשים פיזור (Scatter Plot)',
        badge: 'קשר וקורלציה בין משתנים',
        previewHtml: `
            <div class="chart-vector-scatter">
                <div class="scatter-dot" style="top: 20px; left: 30px;"></div>
                <div class="scatter-dot" style="top: 50px; left: 70px; animation-delay: 0.3s;"></div>
                <div class="scatter-dot" style="top: 80px; left: 110px; animation-delay: 0.6s;"></div>
                <div class="scatter-dot" style="top: 40px; left: 140px; animation-delay: 0.9s;"></div>
            </div>
        `,
        business: 'הסבר מהותי לצירים ומשתנים: שני הצירים (גם X וגם Y) מייצגים משתנים כמותיים רציפים שונים לחלוטין (למשל: ציר X = דקות שימוש, ציר Y = סכום רכישה). הבחירה מאפשרת לגלות האם קיימת קורלציה ביניהם.',
        interpretation: 'שאלות מנחות לבחירה: (1) האם אנו מחפשים קשר או קורלציה בין שני מדדים כמותיים שונים? (2) האם אנו רוצים לזהות לקוחות חריגים (Outliers)? (3) כיצד בונים? גרור מדד א\' ל-Columns ומדד ב\' ל-Rows, ובטל את ה-Aggregate Measures.',
        industry: '<strong>הנחיית יצירה וייצוא ב-Tableau:</strong> גרור את [User_Active_Time_Min] ל-Columns ואת [Amount_Paid_ILS] ל-Rows. כדי לראות נקודות נפרדות, כנס לתפריט Analysis בראש המסך ובטל את הסימון מ-Aggregate Measures. ייצא כקובץ תמונה איכותי.'
    }
};

function selectChartGuide(chartType) {
    // Play sound
    SoundEffects.playClick();

    // Toggle active class on buttons
    document.querySelectorAll('.chart-select-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`btn-chart-${chartType}`).classList.add('active');

    // Update panel
    const data = ChartGuideData[chartType];
    document.getElementById('chart-detail-title').innerText = data.title;
    document.getElementById('chart-detail-badge').innerText = data.badge;
    document.getElementById('chart-visual-preview').innerHTML = data.previewHtml;
    document.getElementById('chart-detail-business').innerText = data.business;
    document.getElementById('chart-detail-interpretation').innerText = data.interpretation;
    document.getElementById('chart-detail-industry').innerHTML = data.industry;

    // Small celebratory burst
    const rect = document.getElementById(`btn-chart-${chartType}`).getBoundingClientRect();
    Fireworks.createFirework(rect.left + rect.width / 2, rect.top + rect.height / 2);
    
    // Mark step completed
    markStepCompleted(4);
}

// --- TABLEAU FORMULA ASSEMBLY PUZZLE GAME ---
const FormulaPuzzle = {
    expectedOrder: [0, 1, 2, 3, 4],
    currentSequence: [],
    textValues: [],

    clickPart(buttonId, textValue, indexValue) {
        // If already selected, do nothing
        if (this.currentSequence.includes(indexValue)) return;

        const expectedNext = this.currentSequence.length;
        const btn = document.getElementById(buttonId);

        if (indexValue === expectedNext) {
            // Correct piece in sequence
            this.currentSequence.push(indexValue);
            this.textValues.push(textValue);
            btn.classList.add('correct');
            btn.disabled = true;
            SoundEffects.playClick();

            // Render on assembly zone
            const zone = document.getElementById('formula-assembly-zone');
            if (this.currentSequence.length === 1) zone.innerHTML = '';
            
            const span = document.createElement('span');
            span.className = 'formula-assembled-token';
            span.innerText = textValue;
            zone.appendChild(span);

            // Toast status
            showNotificationToast(`מעולה! הוספת את: ${textValue}`);

            // Check game completion
            if (this.currentSequence.length === this.expectedOrder.length) {
                document.getElementById('formula-feedback').innerText = '🎉 מדהים! הרכבת בהצלחה את נוסחת שיעור ההמרה: COUNTD([Paying_User_ID]) / COUNTD([All_User_ID])! אתה מוכן ל-Tableau!';
                document.getElementById('formula-feedback').style.color = 'var(--color-success)';
                SoundEffects.playQuestComplete();
                Fireworks.launchBatch();
                markStepCompleted(4);
            }
        } else {
            // Wrong piece sequence
            btn.classList.add('wrong');
            SoundEffects.playFailure();
            document.getElementById('formula-feedback').innerText = 'אופס! חלק זה אינו בסדר הלוגי הנכון. נסה לחשוב מה צריך לבוא עכשיו.';
            document.getElementById('formula-feedback').style.color = 'var(--color-danger)';
            
            setTimeout(() => {
                btn.classList.remove('wrong');
            }, 800);
        }
    },

    reset() {
        this.currentSequence = [];
        this.textValues = [];
        
        document.getElementById('formula-assembly-zone').innerHTML = '<span style="color: var(--text-muted); font-size: 0.9rem; font-weight: 500;">לחץ על חלקי הנוסחה למטה בסדר הנכון כדי להרכיב אותה...</span>';
        document.getElementById('formula-feedback').innerText = '';
        
        document.querySelectorAll('.puzzle-piece-btn').forEach(btn => {
            btn.classList.remove('correct', 'wrong');
            btn.disabled = false;
        });

        SoundEffects.playClick();
        showNotificationToast('משחק הנוסחאות אותחל בהצלחה 🔄');
    }
};

// Global wrapper functions for HTML onclicks
function clickFormulaPart(buttonId, textValue, indexValue) {
    FormulaPuzzle.clickPart(buttonId, textValue, indexValue);
}

function resetFormulaGame() {
    FormulaPuzzle.reset();
}

// --- POPUP NOTIFICATION TOASTER SYSTEM ---
function showNotificationToast(text) {
    // Remove existing toast if any
    const existing = document.getElementById('app-notification-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'app-notification-toast';
    toast.style.position = 'fixed';
    toast.style.bottom = '2rem';
    toast.style.left = '2rem';
    toast.style.background = 'rgba(15, 23, 42, 0.95)';
    toast.style.color = '#fff';
    toast.style.padding = '1rem 1.5rem';
    toast.style.borderRadius = 'var(--border-radius-md)';
    toast.style.boxShadow = 'var(--shadow-lg)';
    toast.style.zIndex = '9999';
    toast.style.direction = 'rtl';
    toast.style.fontSize = '0.95rem';
    toast.style.fontWeight = '700';
    toast.style.borderLeft = '4px solid var(--color-success)';
    toast.style.transform = 'translateY(100px)';
    toast.style.opacity = '0';
    toast.style.transition = 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    
    toast.innerText = text;
    document.body.appendChild(toast);

    // Trigger animate-in
    setTimeout(() => {
        toast.style.transform = 'translateY(0)';
        toast.style.opacity = '1';
    }, 50);

    // Clear after 3.5s
    setTimeout(() => {
        toast.style.transform = 'translateY(100px)';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 400);
    }, 3500);
}

