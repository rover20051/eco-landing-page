// ═══════════════════════════════════════════════════════
// ECO E-Learning Platform - Complete Logic
// ═══════════════════════════════════════════════════════

const SUPABASE_URL = 'https://yzsrfcttzkridsfibagk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6c3JmY3R0emtyaWRzZmliYWdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMjAwNDcsImV4cCI6MjA4Nzc5NjA0N30.RVAI4BrlsC1EUlFjB9J4sPCdNgYEWihlD8dohG7PLBs';

// ═══════════════════════════════════════════════════════
// ECO_TEXTS — Todos los textos visibles de la plataforma
// Cambia aquí cualquier texto sin tocar el resto del código
// ═══════════════════════════════════════════════════════
const ECO_TEXTS = {
    // Login
    loginTitle: 'Bienvenido a ECO',
    loginSubtitle: 'Inicia sesión para acceder a tu plataforma de aprendizaje',
    loginBtn: 'INICIAR SESIÓN',
    loginFooter: '¿No tienes cuenta? Completa el formulario de inscripción y un administrador creará tu acceso.',

    // Dashboard
    dashGreeting: '¡Hola',
    dashSubtitle: 'Es un gran día para seguir creciendo y transformando tu entorno.',
    dashResumeSectionTitle: 'Continuar donde lo dejaste',
    dashResumeBtnLabel: 'REANUDAR LECCIÓN',
    dashMetricsSectionTitle: 'Tu Impacto',
    dashNextSectionTitle: 'Próximos Pasos',
    metricPointsLabel: 'ECO Puntos',
    metricStreakLabel: 'Racha Activa',
    metricModulesLabel: 'Módulos OK',

    // Módulos
    modulesTitle: 'Explora tus Módulos',
    modulesSubtitle: 'Continúa tu camino hacia el liderazgo',
    filterAll: 'TODOS',
    filterInProgress: 'EN CURSO',
    filterCompleted: 'COMPLETADOS',
    moduleBtnStart: 'COMENZAR MÓDULO',
    moduleBtnContinue: 'CONTINUAR',
    moduleBtnReview: 'REPASAR',
    moduleLocked: 'MÓDULO BLOQUEADO',
    moduleLockedDesc: 'Completa el módulo anterior para desbloquear este.',

    // Logros
    logrosTitle: 'Mis Logros',
    logrosSubtitle: 'Tu camino como líder ECO se refleja en tus insignias.',

    // Lección
    leccionTabContent: 'Contenido',
    leccionTabTasks: 'Tareas',
    leccionTabQuiz: 'Cuestionario',
    quizLocked: 'Cuestionario Bloqueado',
    quizLockedDesc: 'Completa el video de la lección para desbloquear el cuestionario.',
    quizTitle: 'Cuestionario de la Lección',
    quizSubtitle: 'Responde las siguientes preguntas para evaluar tu comprensión.',
    quizSubmitBtn: 'ENVIAR RESPUESTAS',
    taskTitle: 'Entregable: Reflexión Práctica',
    taskDesc: 'Aplica lo aprendido. Escribe una reflexión de al menos 300 palabras sobre lo que aprendiste en esta lección y cómo lo aplicarás en tu vida.',
    taskUploadHint: 'Adjunta tu archivo PDF o DOCX aquí',
    taskSelectFileBtn: 'SELECCIONAR ARCHIVO',
    taskDivider: 'O redacta tu respuesta directamente:',
    taskTextPlaceholder: 'Escribe tu reflexión aquí...',
    taskSubmitBtn: 'ENVIAR TAREA',
    taskSentTitle: 'Tarea Enviada',
    taskSentDesc: 'Tu tarea fue enviada correctamente. Espera la calificación de tu mentor.',

    // Notificaciones
    toastStreakTitle: 'Racha Activa',
    toastStreakDesc: 'Llevas {n} días consecutivos!',
    toastQuizDoneTitle: 'Quiz completado!',
    toastTaskDoneTitle: 'Tarea enviada',
    toastTaskDoneDesc: 'Tu reflexión fue enviada correctamente.',
    toastLessonDoneTitle: 'Lección completada!',
    toastModuleDoneTitle: 'Módulo completado!',

    // Sidebar / Perfil
    themeLight: 'Modo Día',
    themeDark: 'Modo Noche',
    editProfileLabel: 'Editar Perfil',
    logoutLabel: 'Cerrar Sesión',
    navDashboard: 'Dashboard',
    navModules: 'Módulos',
    navLogros: 'Logros',

    // Lección bloqueada por fecha
    lessonLockedByDate: 'Disponible desde el {date}',
};

// ═══════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════

function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

let sb;
let currentUser = null;
let currentProfile = null;
let ytPlayer = null;
let currentLessonId = null;
let currentModuleId = null;
let videoCompleted = false;
let pointsQueue = Promise.resolve();

// ═══════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', async () => {
    if (!window.supabase) {
        console.error('Supabase library not loaded');
        return;
    }
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Check existing session
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
        currentUser = session.user;
        await initApp();
    } else {
        showLogin();
    }

    // Listen for auth changes
    sb.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
            currentUser = session.user;
            await initApp();
        } else if (event === 'SIGNED_OUT') {
            currentUser = null;
            currentProfile = null;
            showLogin();
        }
    });

    setupLoginForm();
    setupNavigation();
    setupThemeToggle();
    setupFilters();
    setupMobileMenu();
});

// ═══════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════

function showLogin() {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('app-container').style.display = 'none';
}

function showApp() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-container').style.display = 'flex';
}

function setupLoginForm() {
    const form = document.getElementById('login-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        const errorEl = document.getElementById('login-error');
        const btn = document.getElementById('login-btn');

        errorEl.style.display = 'none';
        btn.disabled = true;
        btn.textContent = 'INGRESANDO...';

        const { data, error } = await sb.auth.signInWithPassword({ email, password });

        if (error) {
            errorEl.textContent = 'Correo o contraseña incorrectos. Intenta de nuevo.';
            errorEl.style.display = 'block';
            btn.disabled = false;
            btn.textContent = ECO_TEXTS.loginBtn;
            return;
        }

        currentUser = data.user;
        await initApp();
    });
}

// ═══════════════════════════════════════════════════════
// APP INIT
// ═══════════════════════════════════════════════════════

async function initApp() {
    showApp();

    // Load profile
    const { data: profile } = await sb.from('profiles').select('*').eq('id', currentUser.id).single();
    currentProfile = profile;

    // Check if admin or mentor
    if (currentProfile && (currentProfile.role === 'admin' || currentProfile.role === 'mentor')) {
        window.location.href = 'admin.html';
        return;
    }

    // Update streak
    await updateStreak();

    // Update UI with user data
    updateUserUI();

    // Load dashboard data
    await loadDashboard();

    // Load notifications
    await loadNotifications();

    // Init from hash
    initFromHash();
}

function updateUserUI() {
    if (!currentProfile) return;
    const name = currentProfile.full_name || currentUser.email.split('@')[0];
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    document.getElementById('userName').textContent = name;
    document.getElementById('userAvatar').textContent = initials;
    document.getElementById('dashGreeting').textContent = `${ECO_TEXTS.dashGreeting}, ${name.split(' ')[0]}!`;
    document.getElementById('metricPoints').textContent = (currentProfile.eco_points || 0).toLocaleString();
    document.getElementById('metricStreak').textContent = `${currentProfile.current_streak || 0} días`;
}

async function updateStreak() {
    if (!currentProfile) return;
    const today = new Date().toISOString().split('T')[0];
    const lastLogin = currentProfile.last_login_date;

    if (lastLogin === today) return;

    try {
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        let newStreak = lastLogin === yesterday ? (currentProfile.current_streak || 0) + 1 : 1;

        await sb.from('profiles').update({
            current_streak: newStreak,
            last_login_date: today,
            updated_at: new Date().toISOString()
        }).eq('id', currentUser.id);

        currentProfile.current_streak = newStreak;
        currentProfile.last_login_date = today;

        if (newStreak > 1) {
            showToast(ECO_TEXTS.toastStreakTitle, ECO_TEXTS.toastStreakDesc.replace('{n}', newStreak));
        }
    } catch (e) {
        showToast(ECO_TEXTS.toastErrorTitle, ECO_TEXTS.toastErrorDesc);
    }
}

// ═══════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════

function setupNavigation() {
    document.querySelectorAll('.nav-item[data-view]').forEach(item => {
        item.addEventListener('click', () => {
            const viewId = item.dataset.view;
            if (viewId) switchView(viewId);
        });
    });

    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await sb.auth.signOut();
    });

    document.getElementById('backToModulos').addEventListener('click', () => switchView('modulos'));
    document.getElementById('backToLecciones').addEventListener('click', () => {
        if (currentModuleId) openModule(currentModuleId);
        else switchView('modulos');
    });

    window.addEventListener('hashchange', initFromHash);

    // Profile buttons
    setupProfileMenu();

    // Notifications
    setupNotifications();
}

function setupProfileMenu() {
    const userProfile = document.getElementById('userProfile');
    const profileDropdown = document.getElementById('profileDropdown');

    if (userProfile && profileDropdown) {
        userProfile.addEventListener('click', (e) => {
            if (e.target.closest('#editProfileBtn') || e.target.closest('#logoutBtn')) return;
            profileDropdown.style.display = profileDropdown.style.display === 'none' ? 'block' : 'none';
            e.stopPropagation();
        });

        document.addEventListener('click', (e) => {
            if (!userProfile.contains(e.target)) {
                profileDropdown.style.display = 'none';
            }
        });
    }

    const editBtn = document.getElementById('editProfileBtn');
    if (editBtn) {
        editBtn.addEventListener('click', () => {
            if (profileDropdown) profileDropdown.style.display = 'none';
            openProfileModal();
        });
    }

    const closeBtn = document.getElementById('profileModalClose');
    if (closeBtn) closeBtn.addEventListener('click', () => {
        document.getElementById('profileModalOverlay').style.display = 'none';
    });

    const overlay = document.getElementById('profileModalOverlay');
    if (overlay) overlay.addEventListener('click', (e) => {
        if (e.target === e.currentTarget) e.currentTarget.style.display = 'none';
    });

    const saveBtn = document.getElementById('saveProfileBtn');
    if (saveBtn) saveBtn.addEventListener('click', saveProfile);
}

function openProfileModal() {
    document.getElementById('profileModalOverlay').style.display = 'flex';
    document.getElementById('profileName').value = currentProfile?.full_name || '';
    document.getElementById('profileNewPass').value = '';
    document.getElementById('profileConfirmPass').value = '';
}

async function saveProfile() {
    const newName = document.getElementById('profileName').value.trim();
    const newPass = document.getElementById('profileNewPass').value;
    const confirmPass = document.getElementById('profileConfirmPass').value;

    if (!newName) { showToast('Error', 'El nombre no puede estar vacío.'); return; }

    const { error: profileErr } = await sb.from('profiles')
        .update({ full_name: newName })
        .eq('id', currentUser.id);

    if (profileErr) { showToast('Error', 'No se pudo actualizar el nombre.'); return; }

    if (newPass) {
        if (newPass !== confirmPass) { showToast('Error', 'Las contraseñas no coinciden.'); return; }
        if (newPass.length < 6) { showToast('Error', 'La contraseña debe tener al menos 6 caracteres.'); return; }

        const { error: passErr } = await sb.auth.updateUser({ password: newPass });
        if (passErr) { showToast('Error', 'No se pudo actualizar la contraseña: ' + passErr.message); return; }
    }

    currentProfile = { ...currentProfile, full_name: newName };
    document.getElementById('userName').textContent = newName;
    document.getElementById('userAvatar').textContent = newName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    document.getElementById('profileModalOverlay').style.display = 'none';
    showToast('Perfil actualizado', 'Tus cambios fueron guardados.');
}

// ═══════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════

function setupNotifications() {
    const notifBtn = document.getElementById('notificationsWidget');
    const markReadBtn = document.getElementById('markAllReadBtn');
    const closeBtn = document.getElementById('closeNotificationsModal');

    if (notifBtn) {
        notifBtn.addEventListener('mouseenter', markNotificationsAsRead);
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            const drop = document.getElementById('notificationsDropdown');
            if (drop) drop.style.display = 'none';
        });
    }

    if (markReadBtn) {
        markReadBtn.addEventListener('click', () => {
            const body = document.getElementById('notificationsModalBody');
            if (body) body.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-muted);"><p>No tienes notificaciones nuevas.</p></div>';
            const drop = document.getElementById('notificationsDropdown');
            if (drop) drop.style.display = 'none';
            markNotificationsAsRead();
        });
    }
}

async function loadNotifications() {
    const badge = document.getElementById('notificationBadge');
    const body = document.getElementById('notificationsModalBody');
    if (!badge || !body) return;

    try {
        const { data: assignments } = await sb.from('assignments')
            .select('*, lessons(title, modules(id, module_number))')
            .eq('user_id', currentUser.id)
            .eq('status', 'graded')
            .order('graded_at', { ascending: false });

        if (!assignments || assignments.length === 0) {
            body.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-muted);"><p>No tienes notificaciones nuevas.</p></div>';
            return;
        }

        const lastReadTime = localStorage.getItem(`notifs_read_${currentUser.id}`) || '1970-01-01T00:00:00Z';
        const newCount = assignments.filter(a => new Date(a.graded_at || a.updated_at) > new Date(lastReadTime)).length;

        if (newCount > 0) {
            badge.style.display = 'flex';
            badge.textContent = newCount > 9 ? '+9' : newCount;
        } else {
            badge.style.display = 'none';
        }

        body.innerHTML = assignments.map(a => `
            <div style="padding:12px 16px; border-bottom:1px solid var(--border-color); cursor:pointer; transition:background 0.2s ease; ${new Date(a.graded_at || a.updated_at) > new Date(lastReadTime) ? 'background:rgba(232, 185, 49, 0.08);' : ''}" 
                 onmouseover="this.style.background='rgba(22,36,68,0.03)'" 
                 onmouseout="this.style.background='${new Date(a.graded_at || a.updated_at) > new Date(lastReadTime) ? 'rgba(232, 185, 49, 0.08)' : ''}'"
                 onclick="openLessonFromNotification('${a.lesson_id}', '${a.lessons?.modules?.id}')">
                <p style="margin:0 0 6px 0; font-size:0.75rem; color:var(--text-muted);">${new Date(a.graded_at || a.updated_at).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                <h4 style="margin:0 0 6px 0; font-size:0.95rem; color:var(--text-main);">Tu tarea en Mod ${a.lessons?.modules?.module_number || ''}</h4>
                <div style="background:#ECFDF5; padding:10px; border-radius:6px; font-size:0.85rem; border:1px solid #D1FAE5;">
                    <p style="margin:0 0 4px 0; color:#065F46;"><strong>Nota: ${a.grade}/100</strong></p>
                    <p style="margin:0; color:#065F46;">${a.feedback ? `"${a.feedback}"` : '¡Buen trabajo! Tarea aprobada.'}</p>
                </div>
            </div>
        `).join('');
    } catch (e) {
        console.error("Error loading notifications: ", e);
    }
}

function markNotificationsAsRead() {
    localStorage.setItem(`notifs_read_${currentUser.id}`, new Date().toISOString());
    const badge = document.getElementById('notificationBadge');
    if (badge) badge.style.display = 'none';
}

function openLessonFromNotification(lessonId, moduleId) {
    if (moduleId) currentModuleId = moduleId;
    switchView('modulos');
    openLesson(lessonId, moduleId);
    const drop = document.getElementById('notificationsDropdown');
    if (drop) drop.style.display = 'none';
}

function switchView(viewId) {
    document.querySelectorAll('.nav-item[data-view]').forEach(item => {
        item.classList.toggle('active', item.dataset.view === viewId);
    });

    document.querySelectorAll('.view-section').forEach(section => {
        section.classList.toggle('active', section.id === `view-${viewId}`);
    });

    if (window.location.hash !== `#${viewId}`) {
        window.history.pushState(null, '', `#${viewId}`);
    }

    if (viewId === 'modulos') loadModules();
    if (viewId === 'logros') loadLogros();

    // Close mobile menu
    document.getElementById('sidebar').classList.remove('open');
}

function initFromHash() {
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    const exists = document.getElementById(`view-${hash}`);
    if (exists) switchView(hash);
}

// ═══════════════════════════════════════════════════════
// FILTERS (TASK 6 fix)
// ═══════════════════════════════════════════════════════

function setupFilters() {
    document.querySelectorAll('.filter-btn[data-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const filter = btn.dataset.filter;
            document.querySelectorAll('#modulesGrid .module-card').forEach(card => {
                if (card.classList.contains('new-content-card')) {
                    card.style.display = filter === 'all' ? '' : 'none';
                    return;
                }
                const status = card.dataset.status;
                if (filter === 'all') {
                    card.style.display = '';
                } else if (filter === 'in_progress') {
                    card.style.display = status === 'in_progress' ? '' : 'none';
                } else if (filter === 'completed') {
                    card.style.display = status === 'completed' ? '' : 'none';
                }
            });
        });
    });
}

// ═══════════════════════════════════════════════════════
// MOBILE MENU (TASK 14 fix)
// ═══════════════════════════════════════════════════════

function setupMobileMenu() {
    const menuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');
    if (!menuBtn || !sidebar) return;

    menuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });

    // Close sidebar when clicking on main content area in mobile
    document.getElementById('mainContent').addEventListener('click', () => {
        if (sidebar.classList.contains('open')) {
            sidebar.classList.remove('open');
        }
    });
}

// ═══════════════════════════════════════════════════════
// THEME TOGGLE (TASK 18 fix — persists in localStorage)
// ═══════════════════════════════════════════════════════

function setupThemeToggle() {
    const toggle = document.getElementById('themeToggle');
    const label = document.getElementById('themeLabel');
    if (!toggle) return;

    // Load saved preference
    const savedTheme = localStorage.getItem('eco-theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        if (label) label.textContent = ECO_TEXTS.themeLight;
    }

    toggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        if (label) label.textContent = isDark ? ECO_TEXTS.themeLight : ECO_TEXTS.themeDark;
        localStorage.setItem('eco-theme', isDark ? 'dark' : 'light');
    });
}

// ═══════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════

async function loadDashboard() {
    const [progressRes, totalModRes] = await Promise.all([
        sb.from('user_progress').select('*, modules(*)').eq('user_id', currentUser.id),
        sb.from('modules').select('*', { count: 'exact', head: true }).eq('is_active', true)
    ]);

    const progress = progressRes.data || [];
    const totalModules = totalModRes.count || 0;
    const completed = progress.filter(p => p.status === 'completed').length;

    document.getElementById('metricModules').textContent = `${completed} / ${totalModules}`;

    // Load resume card
    const { data: lessonProg } = await sb.from('lesson_progress')
        .select('*, lessons(*, modules(*))')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(1);

    if (lessonProg && lessonProg.length > 0) {
        const lp = lessonProg[0];
        const lesson = lp.lessons;
        const mod = lesson.modules;
        document.getElementById('resumeTag').innerHTML = `MÓDULO ${mod.module_number} &bull; LECCIÓN ${lesson.lesson_number}`;
        document.getElementById('resumeTitle').textContent = lesson.title;
        const prog = (lp.video_completed ? 33 : 0) + (lp.assignment_submitted ? 33 : 0) + (lp.quiz_completed ? 34 : 0);
        document.getElementById('resumeProgressBar').style.width = `${prog}%`;
        document.getElementById('resumeProgressText').textContent = `${prog}%`;
        document.getElementById('resumeCard').onclick = () => openLesson(lesson.id, mod.id);
    } else {
        const { data: firstModule } = await sb.from('modules').select('*').eq('module_number', 1).single();
        if (firstModule) {
            const { data: firstLesson } = await sb.from('lessons').select('*').eq('module_id', firstModule.id).eq('lesson_number', 1).single();
            if (firstLesson) {
                document.getElementById('resumeTag').innerHTML = `MÓDULO 1 &bull; LECCIÓN 1`;
                document.getElementById('resumeTitle').textContent = firstLesson.title;
                document.getElementById('resumeCard').onclick = () => openLesson(firstLesson.id, firstModule.id);
            }
        }
    }

    loadNextSteps(progress);
}

function loadNextSteps(progress) {
    const list = document.getElementById('nextStepsList');
    const inProgress = (progress || []).filter(p => p.status === 'in_progress');
    const items = [];

    if (inProgress.length > 0 && inProgress[0].modules) {
        items.push({ title: `Continuar: ${escapeHTML(inProgress[0].modules.title)}`, desc: 'Sigue avanzando en tu módulo actual' });
    }

    items.push({ title: 'Zoom de Mentoría Grupal', desc: 'Revisa tu correo para el próximo link' });
    items.push({ title: 'Completar tu reflexión semanal', desc: 'Entrega tu tarea antes del viernes' });

    const today = new Date();
    list.innerHTML = items.map((item, i) => {
        const d = new Date(today.getTime() + (i + 1) * 3 * 86400000);
        return `<li class="step-item">
            <div class="step-date${i === 1 ? ' warning' : ''}">
                <span class="date-day">${d.getDate()}</span>
                <span class="date-month">${d.toLocaleString('es', { month: 'short' }).toUpperCase()}</span>
            </div>
            <div class="step-info">
                <h4>${item.title}</h4>
                <p>${item.desc}</p>
            </div>
        </li>`;
    }).join('');
}

// ═══════════════════════════════════════════════════════
// MODULES
// ═══════════════════════════════════════════════════════

async function loadModules() {
    const { data: modules } = await sb.from('modules').select('*').eq('is_active', true).order('module_number');
    const { data: progress } = await sb.from('user_progress').select('*').eq('user_id', currentUser.id);

    if (!modules) return;

    const progressMap = {};
    (progress || []).forEach(p => { progressMap[p.module_id] = p; });

    const totalMods = modules.length;
    const completedMods = (progress || []).filter(p => p.status === 'completed').length;
    const generalProg = totalMods > 0 ? Math.round((completedMods / totalMods) * 100) : 0;
    document.getElementById('generalProgressFill').style.width = `${generalProg}%`;
    document.getElementById('generalProgressPercent').textContent = `${generalProg}%`;
    document.getElementById('modulesCount').textContent = `${totalMods} Módulos en total`;

    const grid = document.getElementById('modulesGrid');
    grid.innerHTML = '';

    for (const mod of modules) {
        const prog = progressMap[mod.id];
        const status = getModuleStatus(mod, progressMap, modules);
        const card = createModuleCard(mod, prog, status);
        grid.appendChild(card);
    }

    // New content placeholder
    const placeholder = document.createElement('div');
    placeholder.className = 'module-card new-content-card';
    placeholder.innerHTML = `<div class="new-content-inner">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="sparkle-icon"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
        <h4>NUEVOS RETOS</h4>
        <p>Estamos preparando más contenido increíble para tu crecimiento.</p>
    </div>`;
    grid.appendChild(placeholder);
}

// TASK 1 FIX: module unlock logic was inverted
function getModuleStatus(mod, progressMap, allModules) {
    const prog = progressMap[mod.id];
    if (prog) return prog.status;

    // Module 1 is always unlocked
    if (mod.module_number === 1) return 'in_progress';

    // Check if prerequisite module is completed
    if (mod.unlock_after_module_id) {
        const prereq = progressMap[mod.unlock_after_module_id];
        if (prereq && prereq.status === 'completed') return 'in_progress';
        return 'locked';
    }

    // Check by module number
    const prevMod = allModules.find(m => m.module_number === mod.module_number - 1);
    if (prevMod) {
        const prevProg = progressMap[prevMod.id];
        if (prevProg && prevProg.status === 'completed') return 'in_progress';
    }

    return 'locked';
}

function createModuleCard(mod, prog, status) {
    const card = document.createElement('div');
    card.className = `module-card${status === 'locked' ? ' locked-module' : ''}`;
    card.dataset.status = status;
    card.dataset.moduleId = mod.id;

    const progressPct = prog ? prog.progress_percentage : 0;

    if (status === 'locked') {
        card.innerHTML = `
            <div class="module-image-container">
                <div class="module-img img-placeholder" style="background-color:#E5E7EB;"></div>
                <div class="lock-overlay">
                    <svg viewBox="0 0 24 24" fill="white" class="lock-icon"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"/></svg>
                </div>
            </div>
            <div class="module-body">
                <span class="module-num">MÓDULO ${String(mod.module_number).padStart(2, '0')}</span>
                <h3 class="module-title">${escapeHTML(mod.title)}</h3>
                <p class="module-desc">${escapeHTML(mod.description)}</p>
                <div class="locked-footer">
                    <span class="locked-text">DESBLOQUEA AL TERMINAR MOD ${mod.module_number - 1}</span>
                </div>
            </div>`;
    } else if (status === 'completed') {
        card.innerHTML = `
            <div class="module-image-container">
                <img src="${mod.cover_image || 'images/teens-worshipping.png'}" alt="${escapeHTML(mod.title)}" class="module-img" style="filter:grayscale(100%);">
                <span class="module-tag tag-red">COMPLETADO</span>
                <div class="module-check"><svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div>
            </div>
            <div class="module-body">
                <span class="module-num">MÓDULO ${String(mod.module_number).padStart(2, '0')}</span>
                <h3 class="module-title">${escapeHTML(mod.title)}</h3>
                <p class="module-desc">${escapeHTML(mod.description)}</p>
                <div class="module-footer">
                    <div class="avatars-group">
                        <div class="avatar-mini" style="background:#162444">JS</div>
                        <div class="avatar-mini" style="background:#D32F2F">LC</div>
                        <div class="avatar-mini" style="background:#E8B931;color:#000">+2k</div>
                    </div>
                    <button class="link-btn" onclick="openModule('${mod.id}')">Repasar &rarr;</button>
                </div>
            </div>`;
    } else {
        card.innerHTML = `
            <div class="module-image-container">
                <img src="${mod.cover_image || 'images/teens-worshipping.png'}" alt="${escapeHTML(mod.title)}" class="module-img">
                <span class="module-tag tag-blue">EN PROGRESO</span>
            </div>
            <div class="module-body">
                <span class="module-num">MÓDULO ${String(mod.module_number).padStart(2, '0')}</span>
                <h3 class="module-title">${escapeHTML(mod.title)}</h3>
                <p class="module-desc">${escapeHTML(mod.description)}</p>
                <div class="module-progress">
                    <div class="progress-details">
                        <span class="progress-label-sm">PROGRESO</span>
                        <span class="progress-val-sm">${progressPct}%</span>
                    </div>
                    <div class="progress-track">
                        <div class="progress-fill" style="width:${progressPct}%;"></div>
                    </div>
                </div>
                <button class="btn-primary-full" onclick="openModule('${mod.id}')">CONTINUAR &#9655;</button>
            </div>`;
    }

    if (status !== 'locked') {
        card.style.cursor = 'pointer';
        card.addEventListener('click', (e) => {
            if (e.target.closest('button')) return;
            openModule(mod.id);
        });
    }

    return card;
}

// ═══════════════════════════════════════════════════════
// LESSONS LIST (inside a module)
// — NEW: lessons unlock by date (unlock_date column)
// ═══════════════════════════════════════════════════════

async function openModule(moduleId) {
    currentModuleId = moduleId;

    const [modRes, lessonsRes, lpRes] = await Promise.all([
        sb.from('modules').select('*').eq('id', moduleId).single(),
        sb.from('lessons').select('*').eq('module_id', moduleId).order('lesson_number'),
        sb.from('lesson_progress').select('*').eq('user_id', currentUser.id)
    ]);

    const mod = modRes.data;
    const lessons = lessonsRes.data;
    const lessonProgress = lpRes.data;

    if (!mod || !lessons) return;

    const lpMap = {};
    (lessonProgress || []).forEach(lp => { lpMap[lp.lesson_id] = lp; });

    document.getElementById('leccionesModuleTitle').textContent = `Módulo ${mod.module_number}: ${mod.title}`;
    document.getElementById('leccionesModuleDesc').textContent = mod.description || '';

    const list = document.getElementById('leccionesList');
    list.innerHTML = '';
    const today = new Date().toISOString().split('T')[0];

    lessons.forEach((lesson) => {
        const lp = lpMap[lesson.id];
        const isComplete = lp && lp.video_completed && lp.quiz_completed && lp.assignment_submitted;
        const hasProgress = lp && (lp.video_completed || lp.quiz_completed || lp.assignment_submitted);

        // Check date-based unlock
        const unlockDate = lesson.unlock_date;
        const isLockedByDate = unlockDate && unlockDate > today;

        const card = document.createElement('div');
        card.className = `lesson-card${isComplete ? ' completed' : ''}${isLockedByDate ? ' locked-lesson' : ''}`;

        if (isLockedByDate) {
            const formattedDate = new Date(unlockDate + 'T00:00:00').toLocaleDateString('es', { day: 'numeric', month: 'short' });
            card.innerHTML = `
                <div class="lesson-number" style="opacity:0.5;">
                    <svg viewBox="0 0 24 24" fill="currentColor" style="width:20px;height:20px;color:var(--text-muted);"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"/></svg>
                </div>
                <div class="lesson-info" style="opacity:0.5;">
                    <h3>${escapeHTML(lesson.title)}</h3>
                    <div class="lesson-meta">
                        <span>${lesson.estimated_minutes || 15} min</span>
                        <span class="lesson-badge" style="background:#FEF3C7;color:#92400E;">Disponible ${formattedDate}</span>
                    </div>
                </div>
            `;
            card.style.cursor = 'not-allowed';
        } else {
            card.innerHTML = `
                <div class="lesson-number">${isComplete ?
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:24px;height:24px;color:#10B981;"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>' :
                    `<span>${lesson.lesson_number}</span>`
                }</div>
                <div class="lesson-info">
                    <h3>${escapeHTML(lesson.title)}</h3>
                    <div class="lesson-meta">
                        <span>${lesson.estimated_minutes || 15} min</span>
                        ${lp && lp.video_completed ? '<span class="lesson-badge done">Video</span>' : '<span class="lesson-badge">Video</span>'}
                        ${lp && lp.assignment_submitted ? '<span class="lesson-badge done">Tarea</span>' : '<span class="lesson-badge">Tarea</span>'}
                        ${lp && lp.quiz_completed ? '<span class="lesson-badge done">Quiz</span>' : '<span class="lesson-badge">Quiz</span>'}
                    </div>
                </div>
                <button class="lesson-action-btn">${isComplete ? 'REPASAR' : hasProgress ? 'CONTINUAR' : 'COMENZAR'}</button>
            `;
            card.addEventListener('click', () => openLesson(lesson.id, moduleId));
        }
        list.appendChild(card);
    });

    // Ensure user_progress row exists for this module
    await sb.from('user_progress').upsert({
        user_id: currentUser.id,
        module_id: moduleId,
        status: 'in_progress'
    }, { onConflict: 'user_id,module_id', ignoreDuplicates: true });

    // Switch to lecciones view
    document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
    document.getElementById('view-lecciones').classList.add('active');
    document.querySelectorAll('.nav-item[data-view]').forEach(item => {
        item.classList.toggle('active', item.dataset.view === 'modulos');
    });
}

// ═══════════════════════════════════════════════════════
// LESSON DETAIL
// ═══════════════════════════════════════════════════════

async function openLesson(lessonId, moduleId) {
    currentLessonId = lessonId;
    currentModuleId = moduleId;
    videoCompleted = false;

    const { data: lesson } = await sb.from('lessons').select('*, modules(*)').eq('id', lessonId).single();
    if (!lesson) return;

    const mod = lesson.modules;

    document.getElementById('leccionModuleLabel').textContent = `MÓDULO ${mod.module_number}`;
    document.getElementById('leccionBreadcrumbModule').textContent = `MÓDULO ${String(mod.module_number).padStart(2, '0')}`;
    document.getElementById('leccionBreadcrumbLesson').textContent = `Lección ${lesson.lesson_number}: ${lesson.title}`;
    document.getElementById('leccionTitle').textContent = lesson.title;
    document.getElementById('leccionText').textContent = lesson.content_text || '';
    document.getElementById('rachaPill').textContent = `${currentProfile?.current_streak || 0} Días de Racha`;

    // Calculate module progress
    const [moduleLessonsRes, lessonProgRes] = await Promise.all([
        sb.from('lessons').select('id').eq('module_id', moduleId),
        sb.from('lesson_progress').select('*').eq('user_id', currentUser.id)
    ]);

    const moduleLessons = moduleLessonsRes.data || [];
    const allLessonProg = lessonProgRes.data || [];
    const moduleLessonIds = moduleLessons.map(l => l.id);
    const moduleLp = allLessonProg.filter(lp => moduleLessonIds.includes(lp.lesson_id));
    const completedLessons = moduleLp.filter(lp => lp.video_completed && lp.quiz_completed && lp.assignment_submitted).length;
    const totalLessons = moduleLessons.length;
    const modProg = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
    document.getElementById('leccionProgressFill').style.width = `${modProg}%`;
    document.getElementById('leccionProgressVal').textContent = `${modProg}%`;

    // Load lesson progress (TASK 4/5 FIX: use maybeSingle)
    let { data: lp } = await sb.from('lesson_progress').select('*')
        .eq('user_id', currentUser.id).eq('lesson_id', lessonId).maybeSingle();
    if (!lp) {
        const { data: newLp } = await sb.from('lesson_progress').insert({
            user_id: currentUser.id,
            lesson_id: lessonId
        }).select().single();
        lp = newLp;
    }

    videoCompleted = lp ? lp.video_completed : false;

    // Load YouTube video
    loadYouTubeVideo(lesson.youtube_video_id || 'dQw4w9WgXcQ');

    // Setup tabs
    setupLeccionTabs(lp);

    // Load resources, task state, quiz state in parallel
    await Promise.all([
        loadResources(lessonId),
        loadTaskState(lessonId),
        loadQuizState(lessonId, lp)
    ]);

    // Show lesson view
    document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
    document.getElementById('view-leccion').classList.add('active');

    window.scrollTo(0, 0);
}

// ═══════════════════════════════════════════════════════
// YOUTUBE PLAYER (TASK 20 fix)
// ═══════════════════════════════════════════════════════

let ytReady = false;
let ytPendingVideoId = null;

window.onYouTubeIframeAPIReady = function () {
    ytReady = true;
    if (ytPendingVideoId) {
        createPlayer(ytPendingVideoId);
        ytPendingVideoId = null;
    }
};

let ytCurrentVideoId = null;

function loadYouTubeVideo(videoId) {
    const wrapper = document.getElementById('videoPlayerWrapper');
    const overlay = document.getElementById('videoCompletedOverlay');
    overlay.style.display = 'none';
    ytCurrentVideoId = videoId;

    // Destroy existing player
    if (ytPlayer && typeof ytPlayer.destroy === 'function') {
        try { ytPlayer.destroy(); } catch (e) { /* ignore */ }
        ytPlayer = null;
    }

    // Remove any leftover elements
    const oldIframe = wrapper.querySelector('iframe');
    if (oldIframe) oldIframe.remove();
    const oldDiv = document.getElementById('youtube-player');
    if (oldDiv) oldDiv.remove();
    const oldErr = document.getElementById('ytErrorBox');
    if (oldErr) oldErr.remove();

    const newDiv = document.createElement('div');
    newDiv.id = 'youtube-player';
    wrapper.insertBefore(newDiv, wrapper.firstChild);

    if (ytReady || (typeof YT !== 'undefined' && YT.Player)) {
        ytReady = true;
        createPlayer(videoId);
    } else {
        ytPendingVideoId = videoId;
    }
}

function createPlayer(videoId) {
    ytPlayer = new YT.Player('youtube-player', {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: {
            rel: 0,
            modestbranding: 1,
            cc_load_policy: 1
        },
        events: {
            onStateChange: onPlayerStateChange,
            onError: onPlayerError
        }
    });
}

function onPlayerError(event) {
    console.error('YouTube Player Error', event.data);
    const wrapper = document.getElementById('videoPlayerWrapper');
    let errDiv = document.getElementById('ytErrorBox');
    if (!errDiv) {
        errDiv = document.createElement('div');
        errDiv.id = 'ytErrorBox';
        errDiv.innerHTML = `
            <div style="position:absolute; inset:0; background:var(--primary); display:flex; flex-direction:column; align-items:center; justify-content:center; color:white; padding:20px; text-align:center; z-index:10;">
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:48px;height:48px;margin-bottom:16px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                 <h3 style="margin:0 0 8px; font-family:'Playfair Display',serif;">El video no está disponible</h3>
                 <p style="font-size:0.9rem; max-width:400px; margin:0 0 16px; opacity:0.8;">Hubo un problema al cargar YouTube. Puedes reintentar o marcar completado manualmente.</p>
                 <div style="display:flex; gap:12px; justify-content:center;">
                    <button class="btn-primary" onclick="loadYouTubeVideo(ytCurrentVideoId)" style="background:white; color:var(--primary); cursor:pointer;">REINTENTAR</button>
                    <button class="btn-outline" onclick="forceCompleteVideo()" style="color:white; border-color:rgba(255,255,255,0.3); background:transparent; cursor:pointer;">MARCAR COMPLETADO</button>
                 </div>
            </div>
        `;
        wrapper.appendChild(errDiv);
    }
}

function forceCompleteVideo() {
    const errDiv = document.getElementById('ytErrorBox');
    if (errDiv) errDiv.remove();
    markVideoCompleted();
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.ENDED && !videoCompleted) {
        videoCompleted = true;
        markVideoCompleted();
    }
}

async function markVideoCompleted() {
    if (!currentLessonId || !currentUser) return;

    await sb.from('lesson_progress').upsert({
        user_id: currentUser.id,
        lesson_id: currentLessonId,
        video_completed: true
    }, { onConflict: 'user_id,lesson_id' });

    // Show overlay
    document.getElementById('videoCompletedOverlay').style.display = 'flex';

    // Unlock quiz tab immediately
    unlockQuizTab();

    // Reload updated progress to pass to quiz state
    const { data: lp } = await sb.from('lesson_progress').select('*')
        .eq('user_id', currentUser.id).eq('lesson_id', currentLessonId).maybeSingle();

    // Check if there are questions for this lesson right now
    const { count: quizCount } = await sb.from('quiz_questions').select('*', { count: 'exact', head: true }).eq('lesson_id', currentLessonId);

    if (quizCount === 0) {
        // Auto mark quiz as completed
        await sb.from('lesson_progress').upsert({
            user_id: currentUser.id,
            lesson_id: currentLessonId,
            quiz_completed: true
        }, { onConflict: 'user_id,lesson_id' });
        showToast('Video completado', 'Cuestionario validado automáticamente (No hay preguntas).');

        const { data: lpFinal } = await sb.from('lesson_progress').select('*')
            .eq('user_id', currentUser.id).eq('lesson_id', currentLessonId).maybeSingle();

        await loadQuizState(currentLessonId, lpFinal);

    } else {
        await loadQuizState(currentLessonId, lp);
        showToast('Video completado', 'El cuestionario se ha desbloqueado.');
    }

    await awardPoints(50);

    // Update the lesson card badge in the background
    updateLessonCardBadge(currentLessonId, 'video');
    if (quizCount === 0) updateLessonCardBadge(currentLessonId, 'quiz');

    checkLessonComplete();
}

function updateLessonCardBadge(lessonId, type) {
    const card = document.querySelector(`.lesson-card[data-lesson-id="${lessonId}"]`);
    if (card) {
        const badge = card.querySelector(`.lesson-badge[data-type="${type}"]`);
        if (badge) badge.classList.add('done');
    }
}

// ═══════════════════════════════════════════════════════
// LESSON TABS (TASK 3 fix — no more cloneNode)
// ═══════════════════════════════════════════════════════

let tabClickHandlers = new WeakMap();

function setupLeccionTabs(lessonProgress) {
    const tabs = document.querySelectorAll('.leccion-tabs-nav .tab-btn');
    const contents = document.querySelectorAll('.leccion-tab-content');

    // Reset tabs
    tabs.forEach(tab => {
        tab.classList.remove('active', 'locked-tab');
        tab.style.pointerEvents = '';
    });
    contents.forEach(c => c.classList.remove('active'));

    // Default to contenido
    tabs[0].classList.add('active');
    document.getElementById('tab-contenido').classList.add('active');

    // Quiz tab locked state
    const quizTab = document.getElementById('quizTab');
    const lockIcon = document.getElementById('quizLockIcon');

    if (!lessonProgress || !lessonProgress.video_completed) {
        quizTab.classList.add('locked-tab');
        lockIcon.style.display = '';
    } else {
        lockIcon.style.display = 'none';
    }

    // Tab click handlers — remove old, add new
    tabs.forEach(tab => {
        const oldHandler = tabClickHandlers.get(tab);
        if (oldHandler) tab.removeEventListener('click', oldHandler);

        const newHandler = () => {
            if (tab.classList.contains('locked-tab')) {
                showToast('Bloqueado', ECO_TEXTS.quizLockedDesc);
                return;
            }
            const tabId = tab.dataset.tab;
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(`tab-${tabId}`).classList.add('active');
        };
        tabClickHandlers.set(tab, newHandler);
        tab.addEventListener('click', newHandler);
    });
}

function unlockQuizTab() {
    const quizTab = document.getElementById('quizTab');
    if (quizTab) {
        quizTab.classList.remove('locked-tab');
        const lockIcon = document.getElementById('quizLockIcon');
        if (lockIcon) lockIcon.style.display = 'none';
    }
    const lockedEl = document.getElementById('quizLocked');
    if (lockedEl) lockedEl.style.display = 'none';
    const containerEl = document.getElementById('quizContainer');
    if (containerEl) containerEl.style.display = 'block';
}

// ═══════════════════════════════════════════════════════
// RESOURCES
// ═══════════════════════════════════════════════════════

async function loadResources(lessonId) {
    const [resourcesRes, lessonRes] = await Promise.all([
        sb.from('lesson_resources').select('*').eq('lesson_id', lessonId),
        sb.from('lessons').select('pdf_guide_url').eq('id', lessonId).single()
    ]);

    const resources = resourcesRes.data;
    const lesson = lessonRes.data;

    const actionsEl = document.getElementById('leccionActions');
    actionsEl.innerHTML = '';

    if (lesson && lesson.pdf_guide_url) {
        actionsEl.innerHTML += `<a href="${escapeHTML(lesson.pdf_guide_url)}" target="_blank" class="btn-outline">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> GUÍA DE PDF</a>`;
    }

    if (resources && resources.length > 0) {
        resources.forEach(r => {
            actionsEl.innerHTML += `<a href="${escapeHTML(r.file_url)}" target="_blank" class="btn-outline">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg> ${escapeHTML(r.title)}</a>`;
        });
    }

    if (!actionsEl.innerHTML) {
        actionsEl.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;">No hay recursos disponibles para esta lección.</p>';
    }
}

// ═══════════════════════════════════════════════════════
// TASKS (Tareas) — TASK 4 fix: maybeSingle
// ═══════════════════════════════════════════════════════

async function loadTaskState(lessonId) {
    const { data: assignment } = await sb.from('assignments')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('lesson_id', lessonId)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    const formEl = document.getElementById('tareaForm');
    const submittedEl = document.getElementById('tareaSubmitted');
    const feedbackEl = document.getElementById('tareaFeedback');

    if (assignment) {
        formEl.style.display = 'none';
        submittedEl.style.display = 'block';

        if (assignment.status === 'graded') {
            document.getElementById('tareaStatusText').textContent = 'Tu tarea fue calificada por tu mentor.';
            feedbackEl.style.display = 'block';
            document.getElementById('tareaGrade').textContent = assignment.grade || '--';
            document.getElementById('tareaFeedbackText').textContent = assignment.feedback || 'Sin comentarios adicionales.';
        } else {
            document.getElementById('tareaStatusText').textContent = ECO_TEXTS.taskSentDesc;
            feedbackEl.style.display = 'none';
        }
    } else {
        formEl.style.display = 'block';
        submittedEl.style.display = 'none';
        document.getElementById('tareaTextarea').value = '';
        document.getElementById('fileName').textContent = '';
    }

    setupTaskHandlers(lessonId);
}

function setupTaskHandlers(lessonId) {
    const selectFileBtn = document.getElementById('selectFileBtn');
    const fileInput = document.getElementById('tareaFile');
    const submitBtn = document.getElementById('submitTareaBtn');
    const textarea = document.getElementById('tareaTextarea');

    // TASK 13: LocalStorage Backup for text
    const draftKey = `eco_draft_${currentUser.id}_${lessonId}`;
    if (textarea) {
        const saved = localStorage.getItem(draftKey);
        if (saved) textarea.value = saved;
        textarea.addEventListener('input', () => {
            localStorage.setItem(draftKey, textarea.value);
        });
    }

    // Clone to remove old listeners
    const newSelectBtn = selectFileBtn.cloneNode(true);
    selectFileBtn.parentNode.replaceChild(newSelectBtn, selectFileBtn);
    newSelectBtn.addEventListener('click', () => fileInput.click());

    fileInput.onchange = () => {
        const file = fileInput.files[0];
        document.getElementById('fileName').textContent = file ? file.name : '';
    };

    const newSubmitBtn = submitBtn.cloneNode(true);
    submitBtn.parentNode.replaceChild(newSubmitBtn, submitBtn);
    newSubmitBtn.addEventListener('click', () => submitTask(lessonId, draftKey));
}

async function submitTask(lessonId, draftKey) {
    const textarea = document.getElementById('tareaTextarea');
    const fileInput = document.getElementById('tareaFile');
    const text = textarea.value.trim();
    const file = fileInput ? fileInput.files[0] : null;

    if (!text && !file) {
        showToast('Error', 'Escribe tu reflexión o adjunta un archivo.');
        return;
    }

    const btn = document.getElementById('submitTareaBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }

    let fileUrl = null;

    if (file) {
        if (file.size > 5 * 1024 * 1024) {
            showToast('Error', 'El archivo no puede superar los 5MB.');
            if (btn) { btn.disabled = false; btn.textContent = ECO_TEXTS.taskSubmitBtn; }
            return;
        }

        const uploadBox = document.getElementById('uploadBox');
        let progressDiv = null;
        let uploadAnim = null;
        const previousDisplays = [];

        if (uploadBox) {
            Array.from(uploadBox.children).forEach(c => {
                previousDisplays.push({ el: c, d: c.style.display });
                c.style.display = 'none';
            });
            progressDiv = document.createElement('div');
            progressDiv.innerHTML = `
                <div style="text-align:center; padding: 10px 0;">
                   <div class="progress-bar-container" style="width:100%; height:8px; background:#E5E7EB; border-radius:4px; overflow:hidden; margin-bottom:8px;">
                        <div id="uploadProgressFill" style="width:0%; height:100%; background:var(--primary); transition: width 0.3s ease;"></div>
                   </div>
                   <p style="font-size:0.85rem; color:var(--text-color); margin:0;">Subiendo archivo...</p>
                </div>
            `;
            uploadBox.appendChild(progressDiv);

            let p = 0;
            uploadAnim = setInterval(() => {
                p += Math.random() * 10;
                if (p > 90) p = 90;
                const fill = document.getElementById('uploadProgressFill');
                if (fill) fill.style.width = p + '%';
            }, 250);
        }

        try {
            const fileName = `${currentUser.id}/${lessonId}/${Date.now()}_${file.name}`;
            const { error: uploadError } = await sb.storage
                .from('assignments')
                .upload(fileName, file);

            if (uploadAnim) clearInterval(uploadAnim);
            const fill = document.getElementById('uploadProgressFill');
            if (fill) fill.style.width = '100%';

            if (!uploadError) {
                fileUrl = fileName;
            } else {
                console.warn('File upload skipped:', uploadError.message);
                showToast('Aviso', 'Falló la subida del archivo. Intentaremos guardar el texto de todos modos.');
            }
        } catch (e) {
            if (uploadAnim) clearInterval(uploadAnim);
            console.warn('Storage not available, saving text only');
        }

        if (progressDiv) setTimeout(() => progressDiv.remove(), 500);
        if (uploadBox) previousDisplays.forEach(item => item.el.style.display = item.d);
    }

    const { error } = await sb.from('assignments').insert({
        lesson_id: lessonId,
        user_id: currentUser.id,
        content_text: text || null,
        file_url: fileUrl,
        status: 'submitted'
    });

    if (btn) { btn.disabled = false; btn.textContent = ECO_TEXTS.taskSubmitBtn; }

    if (error) {
        showToast('Error', 'No se pudo enviar la tarea: ' + error.message);
        return;
    }

    await sb.from('lesson_progress')
        .upsert({ user_id: currentUser.id, lesson_id: lessonId, assignment_submitted: true }, { onConflict: 'user_id,lesson_id' });

    if (draftKey) localStorage.removeItem(draftKey);

    await awardPoints(30);
    showToast(ECO_TEXTS.toastTaskDoneTitle, ECO_TEXTS.toastTaskDoneDesc);
    loadTaskState(lessonId);
    checkLessonComplete();
}

// ═══════════════════════════════════════════════════════
// QUIZZES — TASK 5 fix + auto-complete if no questions
// ═══════════════════════════════════════════════════════

async function loadQuizState(lessonId, lessonProgress) {
    const lockedEl = document.getElementById('quizLocked');
    const containerEl = document.getElementById('quizContainer');
    const resultsEl = document.getElementById('quizResults');
    const alreadyDoneEl = document.getElementById('quizAlreadyDone');

    lockedEl.style.display = 'none';
    containerEl.style.display = 'none';
    resultsEl.style.display = 'none';
    alreadyDoneEl.style.display = 'none';

    // Check if already completed (TASK 5 FIX: maybeSingle)
    const { data: prevAttempt } = await sb.from('quiz_attempts')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('lesson_id', lessonId)
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (prevAttempt) {
        alreadyDoneEl.style.display = 'block';
        document.getElementById('quizPrevScore').textContent = `${prevAttempt.score}/${prevAttempt.max_score}`;
        return;
    }

    // Check if video is completed
    if (!lessonProgress || !lessonProgress.video_completed) {
        lockedEl.style.display = 'block';
        return;
    }

    // Load questions
    const { data: questions } = await sb.from('quiz_questions')
        .select('*, quiz_options(*)')
        .eq('lesson_id', lessonId)
        .order('question_order');

    // NEW: If no questions exist, auto-mark quiz as completed
    if (!questions || questions.length === 0) {
        await sb.from('lesson_progress')
            .upsert({ user_id: currentUser.id, lesson_id: lessonId, quiz_completed: true }, { onConflict: 'user_id,lesson_id' });

        alreadyDoneEl.style.display = 'block';
        document.getElementById('quizPrevScore').textContent = 'N/A';
        document.querySelector('#quizAlreadyDone h3').textContent = 'Sin Cuestionario';
        document.querySelector('#quizAlreadyDone p').textContent = 'Esta lección no tiene cuestionario. Se marcó como completada automáticamente.';
        checkLessonComplete();
        return;
    }

    containerEl.style.display = 'block';
    document.getElementById('submitQuizBtn').style.display = '';

    const questionsHTML = questions.map((q, i) => {
        const options = (q.quiz_options || []).sort((a, b) => a.option_order - b.option_order);
        return `<div class="quiz-question" data-question-id="${q.id}">
            <p class="quiz-q-number">PREGUNTA ${i + 1} DE ${questions.length}</p>
            <p class="quiz-q-text">${escapeHTML(q.question_text)}</p>
            <div class="quiz-options">
                ${options.map(opt => `
                    <label class="quiz-option">
                        <input type="radio" name="quiz_${q.id}" value="${opt.id}">
                        <span class="quiz-option-text">${escapeHTML(opt.option_text)}</span>
                    </label>
                `).join('')}
            </div>
        </div>`;
    }).join('');

    document.getElementById('quizQuestions').innerHTML = questionsHTML;

    // Setup submit handler
    const submitBtn = document.getElementById('submitQuizBtn');
    const newBtn = submitBtn.cloneNode(true);
    submitBtn.parentNode.replaceChild(newBtn, submitBtn);
    newBtn.addEventListener('click', () => submitQuiz(lessonId, questions));
}

async function submitQuiz(lessonId, questions) {
    const answers = [];
    let allAnswered = true;

    questions.forEach(q => {
        const selected = document.querySelector(`input[name="quiz_${q.id}"]:checked`);
        if (!selected) {
            allAnswered = false;
        } else {
            const correctOpt = (q.quiz_options || []).find(o => o.is_correct);
            answers.push({
                question_id: q.id,
                selected_option_id: selected.value,
                is_correct: correctOpt ? selected.value === correctOpt.id : false
            });
        }
    });

    if (!allAnswered) {
        showToast('Incompleto', 'Responde todas las preguntas antes de enviar.');
        return;
    }

    const score = answers.filter(a => a.is_correct).length;
    const maxScore = questions.length;

    // Create attempt
    const { data: attempt, error: attemptErr } = await sb.from('quiz_attempts').insert({
        user_id: currentUser.id,
        lesson_id: lessonId,
        score: score,
        max_score: maxScore
    }).select().single();

    if (attemptErr) {
        showToast('Error', 'No se pudo guardar el quiz: ' + attemptErr.message);
        return;
    }

    // Save answers
    if (attempt) {
        const answersToInsert = answers.map(a => ({
            attempt_id: attempt.id,
            question_id: a.question_id,
            selected_option_id: a.selected_option_id,
            is_correct: a.is_correct
        }));
        await sb.from('quiz_answers').insert(answersToInsert);
    }

    // Mark quiz as completed
    await sb.from('lesson_progress')
        .upsert({ user_id: currentUser.id, lesson_id: lessonId, quiz_completed: true }, { onConflict: 'user_id,lesson_id' });

    // Show results
    const containerEl = document.getElementById('quizContainer');
    const resultsEl = document.getElementById('quizResults');
    containerEl.style.display = 'none';
    resultsEl.style.display = 'block';

    const pct = Math.round((score / maxScore) * 100);
    const isGood = pct >= 70;
    document.getElementById('quizScore').textContent = `${score}/${maxScore}`;
    document.getElementById('quizResultTitle').textContent = isGood ? 'Excelente!' : 'Sigue practicando';
    document.getElementById('quizResultMsg').textContent = isGood ?
        `Obtuviste ${pct}%. Muy buen trabajo!` :
        `Obtuviste ${pct}%. Repasa la lección para mejorar.`;

    const iconEl = document.getElementById('quizResultIcon');
    iconEl.className = `quiz-result-icon ${isGood ? 'success' : 'warning'}`;

    await awardPoints(isGood ? 100 : 30);
    showToast(ECO_TEXTS.toastQuizDoneTitle, `${score}/${maxScore} respuestas correctas.`);
    checkLessonComplete();
}

// ═══════════════════════════════════════════════════════
// LESSON COMPLETION — TASK 12 fix: updates module progress
// ═══════════════════════════════════════════════════════

async function checkLessonComplete() {
    if (!currentLessonId || !currentModuleId) return;

    const { data: lp } = await sb.from('lesson_progress').select('*')
        .eq('user_id', currentUser.id).eq('lesson_id', currentLessonId).maybeSingle();

    if (!lp) return;

    const isLessonComplete = lp.video_completed && lp.quiz_completed && lp.assignment_submitted;

    if (isLessonComplete && !lp.completed_at) {
        await sb.from('lesson_progress').update({
            completed_at: new Date().toISOString()
        }).eq('user_id', currentUser.id).eq('lesson_id', currentLessonId);

        showToast(ECO_TEXTS.toastLessonDoneTitle, 'Has completado todos los requisitos de esta lección.');
    }

    // TASK 12: Update module progress
    await updateModuleProgress(currentModuleId);
}

async function updateModuleProgress(moduleId) {
    const { data: moduleLessons } = await sb.from('lessons').select('id').eq('module_id', moduleId);
    if (!moduleLessons || moduleLessons.length === 0) return;

    const lessonIds = moduleLessons.map(l => l.id);
    const { data: lessonProg } = await sb.from('lesson_progress')
        .select('*')
        .eq('user_id', currentUser.id)
        .in('lesson_id', lessonIds);

    const completedLessons = (lessonProg || []).filter(lp =>
        lp.video_completed && lp.quiz_completed && lp.assignment_submitted
    ).length;

    const totalLessons = moduleLessons.length;
    const progressPct = Math.round((completedLessons / totalLessons) * 100);
    const isModuleComplete = completedLessons === totalLessons;

    await sb.from('user_progress').upsert({
        user_id: currentUser.id,
        module_id: moduleId,
        status: isModuleComplete ? 'completed' : 'in_progress',
        progress_percentage: progressPct,
        last_accessed: new Date().toISOString()
    }, { onConflict: 'user_id,module_id' });

    // Update progress bar in lesson detail view
    document.getElementById('leccionProgressFill').style.width = `${progressPct}%`;
    document.getElementById('leccionProgressVal').textContent = `${progressPct}%`;

    if (isModuleComplete) {
        showToast(ECO_TEXTS.toastModuleDoneTitle, 'Has completado todas las lecciones de este módulo!');
        await awardPoints(200);
    }
}

// ═══════════════════════════════════════════════════════
// POINTS — TASK 13 fix: serialized queue to prevent race conditions
// ═══════════════════════════════════════════════════════

async function awardPoints(amount) {
    pointsQueue = pointsQueue.then(async () => {
        const { data } = await sb.from('profiles').select('eco_points').eq('id', currentUser.id).single();
        const current = data?.eco_points || 0;
        await sb.from('profiles').update({ eco_points: current + amount }).eq('id', currentUser.id);
        currentProfile.eco_points = current + amount;
        document.getElementById('metricPoints').textContent = (current + amount).toLocaleString();
    }).catch(err => console.warn('Points update failed:', err));
    return pointsQueue;
}

// ═══════════════════════════════════════════════════════
// LOGROS (Badges)
// ═══════════════════════════════════════════════════════

async function loadLogros() {
    const [progressRes, attemptsRes] = await Promise.all([
        sb.from('user_progress').select('*').eq('user_id', currentUser.id),
        sb.from('quiz_attempts').select('*').eq('user_id', currentUser.id)
    ]);

    const progress = progressRes.data || [];
    const attempts = attemptsRes.data || [];
    const completedModules = progress.filter(p => p.status === 'completed').length;
    const totalQuizzes = attempts.length;
    const perfectQuizzes = attempts.filter(a => a.score === a.max_score).length;
    const streak = currentProfile?.current_streak || 0;

    const badges = [
        { title: 'Primer Paso', desc: 'Completa tu primera lección', icon: 'star', color: 'red-bg', unlocked: completedModules > 0 || totalQuizzes > 0 },
        { title: 'Oyente Activo', desc: 'Completa el Módulo 1', icon: 'headphones', color: 'blue-bg', unlocked: completedModules >= 1 },
        { title: 'Empatía en Acción', desc: 'Completa el Módulo 2', icon: 'heart', color: 'red-bg', unlocked: completedModules >= 2 },
        { title: 'Organizador', desc: 'Completa el Módulo 3', icon: 'settings', color: 'yellow-bg', unlocked: completedModules >= 3 },
        { title: 'Líder Resonante', desc: 'Completa el Módulo 4', icon: 'award', color: 'blue-bg', unlocked: completedModules >= 4 },
        { title: 'Quiz Master', desc: 'Obtén 100% en 3 quizzes', icon: 'check', color: 'yellow-bg', unlocked: perfectQuizzes >= 3 },
        { title: 'Racha de Fuego', desc: '7 días consecutivos', icon: 'flame', color: 'red-bg', unlocked: streak >= 7 },
        { title: 'Perseverante', desc: '30 días consecutivos', icon: 'trophy', color: 'blue-bg', unlocked: streak >= 30 },
    ];

    const totalBadges = badges.length;
    const unlockedCount = badges.filter(b => b.unlocked).length;
    const percent = totalBadges > 0 ? Math.round((unlockedCount / totalBadges) * 100) : 0;

    document.getElementById('logrosPoints').textContent = (currentProfile?.eco_points || 0).toLocaleString();
    document.getElementById('logrosCount').textContent = `${unlockedCount} de ${totalBadges}`;
    document.getElementById('logrosPercent').textContent = `${percent}%`;
    document.getElementById('logrosFill').style.width = `${percent}%`;

    const grid = document.getElementById('badgesGrid');
    grid.innerHTML = badges.map(b => `
        <div class="badge-card ${b.unlocked ? 'unlocked' : 'locked'}">
            <div class="badge-icon-wrapper ${b.unlocked ? b.color : 'grey-bg'}">
                <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" class="badge-svg">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                ${b.unlocked ?
            `<div class="badge-check"><svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div>` :
            `<div class="badge-lock"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6z"/></svg></div>`}
            </div>
            <h4 class="badge-title">${b.title}</h4>
            <p class="badge-desc">${b.desc}</p>
            <span class="badge-status">${b.unlocked ? 'DESBLOQUEADA' : 'BLOQUEADA'}</span>
        </div>
    `).join('');
}

// ═══════════════════════════════════════════════════════
// TOASTS
// ═══════════════════════════════════════════════════════

let activeToasts = 0;
const toastQueue = [];

function showToast(title, desc) {
    toastQueue.push({ title, desc });
    processToastQueue();
}

function processToastQueue() {
    // Max 3 toasts at a time
    if (toastQueue.length === 0 || activeToasts >= 3) return;

    const { title, desc } = toastQueue.shift();
    activeToasts++;

    const container = document.getElementById('toastContainer');
    if (!container) {
        activeToasts--;
        return;
    }

    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.innerHTML = `
        <div class="toast-text">
            <span class="toast-title">${escapeHTML(title)}</span>
            <span class="toast-desc">${escapeHTML(desc)}</span>
        </div>
        <button class="toast-close">&times;</button>
    `;

    const removeToast = () => {
        if (toast.parentNode) {
            toast.classList.add('hiding');
            setTimeout(() => {
                if (toast.parentNode) toast.remove();
                activeToasts--;
                processToastQueue();
            }, 300);
        }
    };

    toast.querySelector('.toast-close').addEventListener('click', removeToast);
    container.appendChild(toast);

    setTimeout(removeToast, 4000);
}
