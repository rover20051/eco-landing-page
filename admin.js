// ═══════════════════════════════════════════════════════
// ECO Admin Panel - Complete Logic
// ═══════════════════════════════════════════════════════

const SUPABASE_URL = 'https://yzsrfcttzkridsfibagk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6c3JmY3R0emtyaWRzZmliYWdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMjAwNDcsImV4cCI6MjA4Nzc5NjA0N30.RVAI4BrlsC1EUlFjB9J4sPCdNgYEWihlD8dohG7PLBs';

let sb;
let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const { data: { session } } = await sb.auth.getSession();
    if (!session) { window.location.href = 'elearning.html'; return; }

    currentUser = session.user;
    const { data: profile } = await sb.from('profiles').select('*').eq('id', currentUser.id).single();
    if (!profile || (profile.role !== 'admin' && profile.role !== 'mentor')) {
        window.location.href = 'elearning.html';
        return;
    }

    if (profile.role === 'mentor') {
        const style = document.createElement('style');
        style.textContent = `
            #createStudentBtn, #createModuleBtn { display: none !important; }
            button[onclick*="openEditStudentModal"] { display: none !important; }
            button[onclick*="confirmDelete"] { display: none !important; }
            button[onclick*="editModule"] { display: none !important; }
            button[onclick*="deleteModule"] { display: none !important; }
            button[onclick*="editLesson"] { display: none !important; }
            button[onclick*="deleteLesson"] { display: none !important; }
            button[onclick*="manageLessonResources"] { display: none !important; }
            button[onclick*="showCreateLessonModal"] { display: none !important; }
            button[onclick*="showCreateQuestionModal"] { display: none !important; }
            button[onclick*="deleteResource"] { display: none !important; }
            button[onclick*="editQuestion"] { display: none !important; }
            button.btn-danger, button.btn-warning { display: none !important; }
        `;
        document.head.appendChild(style);
    }

    setupNavigation();
    setupModal();
    loadDashboard();
});

// ═══════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════

function setupNavigation() {
    document.querySelectorAll('.admin-nav-item[data-section]').forEach(btn => {
        btn.addEventListener('click', () => {
            const section = btn.dataset.section;
            document.querySelectorAll('.admin-nav-item').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
            document.getElementById(`section-${section}`).classList.add('active');

            if (section === 'dashboard') loadDashboard();
            if (section === 'students') loadStudents();
            if (section === 'modules') loadModulesAdmin();
            if (section === 'quizzes') loadQuizzesAdmin();
            if (section === 'assignments') loadAssignments();
        });
    });

    document.getElementById('adminLogout').addEventListener('click', async () => {
        await sb.auth.signOut();
        window.location.href = 'elearning.html';
    });

    document.getElementById('createStudentBtn').addEventListener('click', showCreateStudentModal);
    document.getElementById('createModuleBtn').addEventListener('click', showCreateModuleModal);
    document.getElementById('assignmentFilter').addEventListener('change', loadAssignments);
}

// ═══════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════

async function loadDashboard() {
    // Total students
    const { count: totalStudents } = await sb.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student');
    document.getElementById('statTotalStudents').textContent = totalStudents || 0;

    // Active in last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const { count: activeStudents } = await sb.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student').gte('updated_at', sevenDaysAgo);
    document.getElementById('statActiveStudents').textContent = activeStudents || 0;

    // Pending assignments
    const { count: pendingTasks } = await sb.from('assignments').select('*', { count: 'exact', head: true }).eq('status', 'submitted');
    document.getElementById('statPendingTasks').textContent = pendingTasks || 0;

    // Average quiz score
    const { data: quizAttempts } = await sb.from('quiz_attempts').select('score, max_score');
    if (quizAttempts && quizAttempts.length > 0) {
        const totalPct = quizAttempts.reduce((sum, a) => sum + (a.max_score > 0 ? (a.score / a.max_score) * 100 : 0), 0);
        document.getElementById('statAvgScore').textContent = `${Math.round(totalPct / quizAttempts.length)}%`;
    }

    // Recent assignments
    const { data: recentAssignments } = await sb.from('assignments')
        .select('*, profiles!assignments_user_id_fkey(full_name), lessons!assignments_lesson_id_fkey(title)')
        .eq('status', 'submitted')
        .order('submitted_at', { ascending: false })
        .limit(5);

    const raEl = document.getElementById('recentAssignments');
    if (recentAssignments && recentAssignments.length > 0) {
        raEl.innerHTML = `<table><thead><tr><th>Alumno</th><th>Lección</th><th>Fecha</th><th>Estado</th></tr></thead><tbody>
            ${recentAssignments.map(a => `<tr>
                <td>${a.profiles?.full_name || 'Sin nombre'}</td>
                <td>${a.lessons?.title || '--'}</td>
                <td>${new Date(a.submitted_at).toLocaleDateString('es')}</td>
                <td><span class="status-badge status-submitted">PENDIENTE</span></td>
            </tr>`).join('')}
        </tbody></table>
        <div style="text-align:center; margin-top:16px;">
            <button class="btn-secondary" onclick="document.querySelector('[data-view=tareas]').click()">Ver todas las tareas</button>
        </div>`;
    } else {
        raEl.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:48px;height:48px;color:var(--border);margin-bottom:16px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                <p>No hay tareas pendientes en este momento.</p>
            </div>
        `;
    }

    // Top students by points
    const { data: topStudents } = await sb.from('profiles').select('full_name, eco_points, current_streak').eq('role', 'student').order('eco_points', { ascending: false }).limit(5);
    const tsEl = document.getElementById('topStudents');
    if (topStudents && topStudents.length > 0) {
        tsEl.innerHTML = `<table><thead><tr><th>Alumno</th><th>Puntos</th><th>Racha</th></tr></thead><tbody>
            ${topStudents.map(s => `<tr>
                <td>${s.full_name || 'Sin nombre'}</td>
                <td><strong>${s.eco_points || 0}</strong></td>
                <td>${s.current_streak || 0} días</td>
            </tr>`).join('')}
        </tbody></table>
        <div style="text-align:center; margin-top:16px;">
            <button class="btn-secondary" onclick="document.querySelector('[data-view=usuarios]').click()">Ver todos los alumnos</button>
        </div>`;
    } else {
        tsEl.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:48px;height:48px;color:var(--border);margin-bottom:16px;"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                <p>No hay alumnos registrados aún.</p>
            </div>
        `;
    }
}

// ═══════════════════════════════════════════════════════
// STUDENTS
// ═══════════════════════════════════════════════════════

async function loadStudents() {
    const { data: students } = await sb.from('profiles').select('*').order('role').order('created_at', { ascending: false });
    const { data: allProgress } = await sb.from('user_progress').select('*');

    const el = document.getElementById('studentsTable');
    if (!students || students.length === 0) {
        el.innerHTML = '<p class="empty-state">No hay alumnos registrados</p>';
        return;
    }

    const progressByUser = {};
    (allProgress || []).forEach(p => {
        if (!progressByUser[p.user_id]) progressByUser[p.user_id] = [];
        progressByUser[p.user_id].push(p);
    });

    const roleBadge = {
        admin: '<span class="status-badge" style="background:#EDE9FE;color:#5B21B6;">ADMIN</span>',
        mentor: '<span class="status-badge" style="background:#FEF3C7;color:#92400E;">MENTOR</span>',
        student: '<span class="status-badge status-graded">ALUMNO</span>'
    };

    el.innerHTML = `<table><thead><tr><th>Nombre</th><th>Rol</th><th>Puntos</th><th>Racha</th><th>Módulos</th><th>Último acceso</th><th>Acciones</th></tr></thead><tbody>
        ${students.map(s => {
        const userProg = progressByUser[s.id] || [];
        const completed = userProg.filter(p => p.status === 'completed').length;
        return `<tr>
                <td><strong>${s.full_name || 'Sin nombre'}</strong></td>
                <td>${roleBadge[s.role] || s.role}</td>
                <td>${s.eco_points || 0}</td>
                <td>${s.current_streak || 0} días</td>
                <td>
                    <div class="student-progress-bar">
                        <div class="progress-mini"><div class="progress-mini-fill" style="width:${(completed / 4) * 100}%"></div></div>
                        <span style="font-size:0.75rem;color:var(--text-muted);">${completed}/4</span>
                    </div>
                </td>
                <td>${s.last_login_date ? new Date(s.last_login_date).toLocaleDateString('es') : 'Nunca'}</td>
                <td><button class="btn-secondary btn-sm" onclick="viewStudentDetail('${s.id}')">Ver detalle</button></td>
            </tr>`;
    }).join('')}
    </tbody></table>`;
}

function showCreateStudentModal() {
    const tempPass = generatePassword();
    openModal('Crear Nuevo Usuario', `
        <form id="createStudentForm" class="grade-form">
            <div class="form-group">
                <label>Nombre completo</label>
                <input type="text" id="newStudentName" required placeholder="Nombre completo">
            </div>
            <div class="form-group">
                <label>Correo electrónico</label>
                <input type="email" id="newStudentEmail" required placeholder="usuario@email.com">
            </div>
            <div class="form-group">
                <label>Contraseña temporal</label>
                <div style="display:flex; gap:8px;">
                    <input type="password" id="newStudentPassword" required value="${tempPass}" style="flex:1;">
                    <button type="button" class="btn-secondary" onclick="const i=document.getElementById('newStudentPassword'); i.type = i.type==='password'?'text':'password';" style="padding: 0 12px;" title="Mostrar/Ocultar">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                    <button type="button" class="btn-secondary" onclick="navigator.clipboard.writeText(document.getElementById('newStudentPassword').value); showAdminToast('Contraseña copiada', 'success');" style="padding: 0 12px;" title="Copiar al portapapeles">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    </button>
                </div>
            </div>
            <div class="form-group">
                <label>Rol</label>
                <select id="newStudentRole">
                    <option value="student">Estudiante — accede al e-learning</option>
                    <option value="mentor">Mentor — puede ver progreso y calificar tareas</option>
                    <option value="admin">Admin — acceso total al panel de administración</option>
                </select>
            </div>
            <div id="roleHint" style="background:#F0F4FF;border-radius:8px;padding:12px;font-size:0.8rem;color:#162444;margin-top:-8px;">
                📚 <strong>Estudiante:</strong> ve sus módulos, lecciones y progreso personal.
            </div>
            <button type="submit" class="btn-primary" style="width:100%;margin-top:8px;">CREAR CUENTA</button>
        </form>
    `);

    // Update hint text when role changes
    document.getElementById('newStudentRole').addEventListener('change', (e) => {
        const hints = {
            student: '📚 <strong>Estudiante:</strong> ve sus módulos, lecciones y progreso personal.',
            mentor: '👁️ <strong>Mentor:</strong> ve el progreso de todos los alumnos y puede calificar tareas. No gestiona contenido.',
            admin: '⚙️ <strong>Admin:</strong> acceso completo: crea módulos, lecciones, quizzes, y gestiona todos los usuarios.'
        };
        document.getElementById('roleHint').innerHTML = hints[e.target.value];
    });

    document.getElementById('createStudentForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('newStudentName').value.trim();
        const email = document.getElementById('newStudentEmail').value.trim();
        const password = document.getElementById('newStudentPassword').value;
        const role = document.getElementById('newStudentRole').value;

        const submitBtn = e.target.querySelector('button[type=submit]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creando...';

        const { data, error } = await sb.auth.signUp({
            email,
            password,
            options: { data: { full_name: name } }
        });

        if (error) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'CREAR CUENTA';
            showAdminToast('Error: ' + error.message, 'error');
            return;
        }

        // Set role if not student (trigger creates profile as 'student' by default)
        if (data.user && role !== 'student') {
            await sb.from('profiles').update({ role, full_name: name }).eq('id', data.user.id);
        }

        const roleLabels = { student: 'Estudiante', mentor: 'Mentor', admin: 'Admin' };
        showAdminToast(`✅ ${roleLabels[role]} creado: ${name} · Contraseña: ${password}`, 'success');
        closeModal();
        loadStudents();
    });
}

async function viewStudentDetail(userId) {
    const [
        { data: student },
        { data: progress },
        { data: quizAttempts },
        { data: assignments }
    ] = await Promise.all([
        sb.from('profiles').select('*').eq('id', userId).single(),
        sb.from('user_progress').select('*, modules(title, module_number)').eq('user_id', userId),
        sb.from('quiz_attempts').select('*, lessons(title)').eq('user_id', userId).order('completed_at', { ascending: false }),
        sb.from('assignments').select('*, lessons(title, modules(module_number))').eq('user_id', userId).order('submitted_at', { ascending: false })
    ]);

    let html = `
        <div style="display:flex; justify-content:flex-end; gap:8px; margin-bottom:16px;">
            <button class="btn-secondary" onclick="openEditStudentModal('${userId}', '${escapeHTML(student?.full_name || '')}', '${student?.role || 'student'}')">Editar Perfil</button>
            <button class="btn-danger" style="background:#D32F2F; color:white;" onclick="confirmDeleteStudent('${userId}', '${escapeHTML(student?.full_name || '')}')">Inhabilitar Usuario</button>
        </div>
        <div style="background:var(--admin-bg);border-radius:10px;padding:16px;margin-bottom:20px;display:flex;gap:24px;flex-wrap:wrap;">
        <div><span style="font-size:0.7rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;">NOMBRE</span><p style="margin:4px 0;font-weight:700;">${student?.full_name || 'Sin nombre'} <span class="admin-badge" style="background:${student?.role === 'admin' ? 'var(--red)' : student?.role === 'mentor' ? 'var(--warning)' : 'var(--success)'}; margin-left:8px;">${student?.role || 'student'}</span></p></div>
        <div><span style="font-size:0.7rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;">ECO PUNTOS</span><p style="margin:4px 0;font-weight:700;color:var(--red);">${student?.eco_points || 0}</p></div>
        <div><span style="font-size:0.7rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;">RACHA</span><p style="margin:4px 0;font-weight:700;">${student?.current_streak || 0} d\u00EDas</p></div>
        <div><span style="font-size:0.7rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;">ÚLTIMO ACCESO</span><p style="margin:4px 0;font-weight:700;">${student?.last_login_date ? new Date(student.last_login_date).toLocaleDateString('es') : 'Nunca'}</p></div>
    </div>`;

    html += '<h4 style="margin-bottom:10px;font-size:0.9rem;">Progreso por Módulo</h4>';
    if (progress && progress.length > 0) {
        html += progress.map(p => `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);">
            <span style="font-size:0.85rem;">Módulo ${p.modules?.module_number || ''}: ${p.modules?.title || ''}</span>
            <div class="student-progress-bar">
                <div class="progress-mini"><div class="progress-mini-fill" style="width:${p.progress_percentage}%"></div></div>
                <span style="font-size:0.75rem;">${p.progress_percentage}%</span>
                <span class="status-badge ${p.status === 'completed' ? 'status-graded' : 'status-submitted'}" style="margin-left:8px;font-size:0.6rem;">${p.status === 'completed' ? 'COMPLETADO' : 'EN CURSO'}</span>
            </div>
        </div>`).join('');
    } else {
        html += '<p style="color:var(--text-muted);font-size:0.85rem;">Sin progreso registrado</p>';
    }

    if (quizAttempts && quizAttempts.length > 0) {
        html += '<h4 style="margin:18px 0 10px;font-size:0.9rem;">Quizzes</h4>';
        html += quizAttempts.map(q => `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:0.85rem;">
            <span>${q.lessons?.title || 'Lección'}</span>
            <strong style="color:${q.score / q.max_score >= 0.6 ? 'var(--success)' : 'var(--red)'};">${q.score}/${q.max_score} (${q.max_score > 0 ? Math.round(q.score / q.max_score * 100) : 0}%)</strong>
        </div>`).join('');
    }

    if (assignments && assignments.length > 0) {
        html += '<h4 style="margin:18px 0 10px;font-size:0.9rem;">Tareas Enviadas</h4>';
        html += assignments.map(a => `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);font-size:0.85rem;">
            <div>
                <span>Mod ${a.lessons?.modules?.module_number || ''} - ${a.lessons?.title || ''}</span>
                <span style="font-size:0.75rem;color:var(--text-muted);display:block;">${new Date(a.submitted_at).toLocaleDateString('es')}</span>
            </div>
            <div style="display:flex;gap:8px;align-items:center;">
                <span class="status-badge ${a.status === 'graded' ? 'status-graded' : 'status-submitted'}">${a.status === 'graded' ? `${a.grade}/100` : 'PENDIENTE'}</span>
                <button class="btn-secondary btn-sm" onclick="viewAssignment('${a.id}')">Ver</button>
                ${a.status === 'submitted' ? `<button class="btn-success btn-sm" onclick="gradeAssignment('${a.id}')">Calificar</button>` : ''}
            </div>
        </div>`).join('');
    }

    openModal(`Detalle: ${student?.full_name || 'Alumno'}`, html);
}

// ═══════════════════════════════════════════════════════
// MODULES ADMIN
// ═══════════════════════════════════════════════════════

async function loadModulesAdmin() {
    const { data: modules } = await sb.from('modules').select('*').order('module_number');
    const { data: lessons } = await sb.from('lessons').select('*').order('lesson_number');
    const { data: resources } = await sb.from('lesson_resources').select('*');

    const el = document.getElementById('modulesAdmin');
    if (!modules || modules.length === 0) {
        el.innerHTML = '<p class="empty-state">No hay módulos</p>';
        return;
    }

    const lessonsByModule = {};
    (lessons || []).forEach(l => {
        if (!lessonsByModule[l.module_id]) lessonsByModule[l.module_id] = [];
        lessonsByModule[l.module_id].push(l);
    });

    const resourcesByLesson = {};
    (resources || []).forEach(r => {
        if (!resourcesByLesson[r.lesson_id]) resourcesByLesson[r.lesson_id] = [];
        resourcesByLesson[r.lesson_id].push(r);
    });

    el.innerHTML = modules.map(mod => {
        const modLessons = lessonsByModule[mod.id] || [];
        return `<div class="module-admin-card">
            <div class="module-admin-header" onclick="this.nextElementSibling.classList.toggle('open')">
                <div style="display:flex;align-items:center;gap:12px;flex:1;">
                    <h3 style="margin:0;">Módulo ${mod.module_number}: ${mod.title}</h3>
                    <span style="background:${mod.is_active ? '#ECFDF5' : '#FEF2F2'};color:${mod.is_active ? '#065F46' : '#991B1B'};font-size:0.65rem;font-weight:700;padding:2px 8px;border-radius:4px;">${mod.is_active ? 'ACTIVO' : 'INACTIVO'}</span>
                </div>
                <div style="display:flex;gap:8px;align-items:center;">
                    <span style="font-size:0.8rem;color:var(--text-muted);">${modLessons.length} lecciones</span>
                    <button class="btn-secondary btn-sm" onclick="event.stopPropagation();editModule('${mod.id}')" style="padding:4px 10px;">✏️ Editar</button>
                    <button class="btn-danger btn-sm" onclick="event.stopPropagation();deleteModule('${mod.id}','${mod.title.replace(/'/g, "\\'")} ')" style="padding:4px 10px;">🗑️</button>
                </div>
            </div>
            <div class="module-admin-body">
                ${modLessons.map(l => {
            const lessonRes = resourcesByLesson[l.id] || [];
            return `<div class="lesson-admin-item">
                        <div class="lesson-admin-info">
                            <h4>Lección ${l.lesson_number}: ${l.title}</h4>
                            <p style="display:flex;gap:12px;flex-wrap:wrap;">
                                ${l.youtube_video_id ? `<span style="color:#065F46;">▶ ${l.youtube_video_id}</span>` : '<span style="color:#991B1B;">Sin video</span>'}
                                <span>${l.estimated_minutes || 0} min</span>
                                ${lessonRes.length ? `<span style="color:#065F46;">📎 ${lessonRes.length} recurso(s)</span>` : ''}
                                ${l.task_description ? '<span style="color:#162444;">📝 Tarea definida</span>' : '<span style="color:var(--text-muted);">Sin tarea</span>'}
                            </p>
                        </div>
                        <div class="lesson-admin-actions">
                            <button class="btn-secondary btn-sm" onclick="editLesson('${l.id}')">✏️ Editar</button>
                            <button class="btn-secondary btn-sm" onclick="manageLessonResources('${l.id}', '${l.title.replace(/'/g, "\\'")}')">📎 PDFs</button>
                            <button class="btn-danger btn-sm" onclick="deleteLesson('${l.id}','${l.title.replace(/'/g, "\\'")}')">🗑️</button>
                        </div>
                    </div>`;
        }).join('')}
                <button class="btn-secondary" style="margin-top:12px;width:100%;" onclick="showCreateLessonModal('${mod.id}', ${modLessons.length + 1})">+ Agregar Lección</button>
            </div>
        </div>`;
    }).join('');
}

function moduleFormHTML(defaults = {}) {
    return `
        <div class="form-group">
            <label>Título</label>
            <input type="text" id="modTitle" required placeholder="Título del módulo" value="${defaults.title || ''}">
        </div>
        <div class="form-group">
            <label>Descripción</label>
            <textarea id="modDesc" placeholder="Descripción del módulo">${defaults.description || ''}</textarea>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Número de módulo</label>
                <input type="number" id="modNumber" required min="1" value="${defaults.module_number || 5}">
            </div>
            <div class="form-group">
                <label>Activo</label>
                <select id="modActive">
                    <option value="true" ${defaults.is_active !== false ? 'selected' : ''}>Sí</option>
                    <option value="false" ${defaults.is_active === false ? 'selected' : ''}>No</option>
                </select>
            </div>
        </div>`;
}

function showCreateModuleModal() {
    openModal('Crear Nuevo Módulo', `
        <form id="moduleForm" class="grade-form">
            ${moduleFormHTML()}
            <button type="submit" class="btn-primary" style="width:100%;margin-top:8px;">CREAR MÓDULO</button>
        </form>
    `);
    document.getElementById('moduleForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const { error } = await sb.from('modules').insert({
            title: document.getElementById('modTitle').value,
            description: document.getElementById('modDesc').value,
            module_number: parseInt(document.getElementById('modNumber').value),
            is_active: document.getElementById('modActive').value === 'true'
        });
        if (error) { showAdminToast('Error: ' + error.message, 'error'); return; }
        showAdminToast('Módulo creado', 'success');
        closeModal();
        loadModulesAdmin();
    });
}

async function editModule(moduleId) {
    const { data: mod } = await sb.from('modules').select('*').eq('id', moduleId).single();
    if (!mod) return;
    openModal('Editar Módulo', `
        <form id="moduleForm" class="grade-form">
            ${moduleFormHTML(mod)}
            <button type="submit" class="btn-primary" style="width:100%;margin-top:8px;">GUARDAR CAMBIOS</button>
        </form>
    `);
    document.getElementById('moduleForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const { error } = await sb.from('modules').update({
            title: document.getElementById('modTitle').value,
            description: document.getElementById('modDesc').value,
            module_number: parseInt(document.getElementById('modNumber').value),
            is_active: document.getElementById('modActive').value === 'true'
        }).eq('id', moduleId);
        if (error) { showAdminToast('Error: ' + error.message, 'error'); return; }
        showAdminToast('Módulo actualizado', 'success');
        closeModal();
        loadModulesAdmin();
    });
}

async function deleteModule(moduleId, moduleTitle) {
    if (!confirm(`¿Eliminar el módulo "${moduleTitle}"? Esto también eliminará todas sus lecciones.`)) return;
    const { error } = await sb.from('modules').delete().eq('id', moduleId);
    if (error) { showAdminToast('Error: ' + error.message, 'error'); return; }
    showAdminToast('Módulo eliminado', 'success');
    loadModulesAdmin();
}

async function deleteLesson(lessonId, lessonTitle) {
    if (!confirm(`¿Eliminar la lección "${lessonTitle}"?`)) return;
    const { error } = await sb.from('lessons').delete().eq('id', lessonId);
    if (error) { showAdminToast('Error: ' + error.message, 'error'); return; }
    showAdminToast('Lección eliminada', 'success');
    loadModulesAdmin();
}

async function manageLessonResources(lessonId, lessonTitle) {
    const { data: resources } = await sb.from('lesson_resources').select('*').eq('lesson_id', lessonId);

    const resList = (resources || []).map(r => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);">
            <div>
                <strong style="font-size:0.9rem;">${r.title}</strong>
                <p style="font-size:0.75rem;color:var(--text-muted);margin:2px 0 0;">${r.resource_type.toUpperCase()} · <a href="${r.file_url}" target="_blank" style="color:var(--red);">Ver archivo</a></p>
            </div>
            <button class="btn-danger btn-sm" onclick="deleteResource('${r.id}','${lessonId}','${lessonTitle.replace(/'/g, "\\'")}')">🗑️</button>
        </div>
    `).join('');

    openModal(`PDFs/Recursos: ${lessonTitle}`, `
        <div style="margin-bottom:16px;">${resList || '<p style="color:var(--text-muted);font-size:0.9rem;">Sin recursos todavía.</p>'}</div>
        <hr style="border:none;border-top:1px solid var(--border);margin:16px 0;">
        <form id="resourceForm" class="grade-form">
            <div class="form-group">
                <label>Título del recurso</label>
                <input type="text" id="resTitle" required placeholder="Ej: Guía de estudio PDF">
            </div>
            <div class="form-group">
                <label>URL del archivo (Supabase Storage o enlace externo)</label>
                <input type="url" id="resUrl" required placeholder="https://...">
            </div>
            <div class="form-group">
                <label>Tipo</label>
                <select id="resType">
                    <option value="pdf">PDF</option>
                    <option value="doc">DOC</option>
                    <option value="link">Enlace</option>
                    <option value="video">Video</option>
                </select>
            </div>
            <button type="submit" class="btn-primary" style="width:100%;">AGREGAR RECURSO</button>
        </form>
    `);

    document.getElementById('resourceForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const { error } = await sb.from('lesson_resources').insert({
            lesson_id: lessonId,
            title: document.getElementById('resTitle').value,
            file_url: document.getElementById('resUrl').value,
            resource_type: document.getElementById('resType').value
        });
        if (error) { showAdminToast('Error: ' + error.message, 'error'); return; }
        showAdminToast('Recurso agregado', 'success');
        closeModal();
        loadModulesAdmin();
    });
}

async function deleteResource(resourceId, lessonId, lessonTitle) {
    if (!confirm('¿Eliminar este recurso?')) return;
    await sb.from('lesson_resources').delete().eq('id', resourceId);
    showAdminToast('Recurso eliminado', 'success');
    manageLessonResources(lessonId, lessonTitle);
}

function lessonFormHTML(defaults = {}) {
    return `
        <div class="form-group">
            <label>Título de la lección</label>
            <input type="text" id="lessonTitle" required placeholder="Título de la lección" value="${defaults.title || ''}">
        </div>
        <div class="form-group">
            <label>Contenido (descripción del tema)</label>
            <textarea id="lessonContent" placeholder="Texto explicativo de la lección..." style="min-height:80px;">${defaults.content_text || ''}</textarea>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Número de lección</label>
                <input type="number" id="lessonNumber" required min="1" value="${defaults.lesson_number || 1}">
            </div>
            <div class="form-group">
                <label>Duración (min)</label>
                <input type="number" id="lessonMinutes" value="${defaults.estimated_minutes || 15}" min="1">
            </div>
        </div>
        <div class="form-group">
            <label>YouTube Video ID</label>
            <input type="text" id="lessonYT" placeholder="ej: dQw4w9WgXcQ (solo el ID, no la URL completa)" value="${defaults.youtube_video_id || ''}">
            ${defaults.youtube_video_id ? `<p style="font-size:0.75rem;color:var(--text-muted);margin-top:4px;">Vista previa: <a href="https://youtube.com/watch?v=${defaults.youtube_video_id}" target="_blank" style="color:var(--red);">Ver en YouTube</a></p>` : ''}
        </div>
        <div class="form-group">
            <label>Descripción de la tarea (entregable)</label>
            <textarea id="lessonTaskDesc" placeholder="¿Qué deben entregar los alumnos? Ej: Escribe una reflexión de 300 palabras sobre..." style="min-height:80px;">${defaults.task_description || ''}</textarea>
        </div>`;
}

function showCreateLessonModal(moduleId, nextNumber) {
    openModal('Crear Nueva Lección', `
        <form id="lessonForm" class="grade-form">
            ${lessonFormHTML({ lesson_number: nextNumber })}
            <button type="submit" class="btn-primary" style="width:100%;margin-top:8px;">CREAR LECCIÓN</button>
        </form>
    `);
    document.getElementById('lessonForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const { error } = await sb.from('lessons').insert({
            module_id: moduleId,
            title: document.getElementById('lessonTitle').value,
            content_text: document.getElementById('lessonContent').value,
            lesson_number: parseInt(document.getElementById('lessonNumber').value),
            estimated_minutes: parseInt(document.getElementById('lessonMinutes').value),
            youtube_video_id: document.getElementById('lessonYT').value.trim() || null,
            task_description: document.getElementById('lessonTaskDesc').value || null
        });
        if (error) { showAdminToast('Error: ' + error.message, 'error'); return; }
        showAdminToast('Lección creada', 'success');
        closeModal();
        loadModulesAdmin();
    });
}

async function editLesson(lessonId) {
    const { data: lesson } = await sb.from('lessons').select('*').eq('id', lessonId).single();
    if (!lesson) return;

    openModal('Editar Lección', `
        <form id="lessonForm" class="grade-form">
            ${lessonFormHTML(lesson)}
            <button type="submit" class="btn-primary" style="width:100%;margin-top:8px;">GUARDAR CAMBIOS</button>
        </form>
    `);

    document.getElementById('lessonForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const { error } = await sb.from('lessons').update({
            title: document.getElementById('lessonTitle').value,
            content_text: document.getElementById('lessonContent').value,
            estimated_minutes: parseInt(document.getElementById('lessonMinutes').value),
            youtube_video_id: document.getElementById('lessonYT').value.trim() || null,
            task_description: document.getElementById('lessonTaskDesc').value || null
        }).eq('id', lessonId);
        if (error) { showAdminToast('Error: ' + error.message, 'error'); return; }
        showAdminToast('Lección actualizada', 'success');
        closeModal();
        loadModulesAdmin();
    });
}

// ═══════════════════════════════════════════════════════
// QUIZZES ADMIN
// ═══════════════════════════════════════════════════════

async function loadQuizzesAdmin() {
    const { data: lessons } = await sb.from('lessons').select('*, modules(title, module_number)').order('lesson_number');
    const { data: questions } = await sb.from('quiz_questions').select('*, quiz_options(*)').order('question_order');

    const el = document.getElementById('quizzesAdmin');

    if (!lessons || lessons.length === 0) {
        el.innerHTML = '<p class="empty-state">No hay lecciones</p>';
        return;
    }

    const qByLesson = {};
    (questions || []).forEach(q => {
        if (!qByLesson[q.lesson_id]) qByLesson[q.lesson_id] = [];
        qByLesson[q.lesson_id].push(q);
    });

    el.innerHTML = lessons.map(lesson => {
        const lessonQuestions = qByLesson[lesson.id] || [];
        return `<div class="module-admin-card">
            <div class="module-admin-header" onclick="this.nextElementSibling.classList.toggle('open')">
                <h3>Mod ${lesson.modules?.module_number} - Lección ${lesson.lesson_number}: ${lesson.title}</h3>
                <span>${lessonQuestions.length} preguntas</span>
            </div>
            <div class="module-admin-body">
                ${lessonQuestions.map((q, i) => {
            const opts = (q.quiz_options || []).sort((a, b) => a.option_order - b.option_order);
            return `<div class="quiz-admin-card">
                        <h4>P${i + 1}: ${q.question_text}</h4>
                        ${opts.map(o => `<div class="quiz-option-item">
                            <span class="${o.is_correct ? 'correct' : 'incorrect'}">${o.is_correct ? '✓' : '○'} ${o.option_text}</span>
                        </div>`).join('')}
                        <button class="btn-secondary btn-sm" style="margin-top:8px;" onclick="editQuestion('${q.id}')">Editar</button>
                    </div>`;
        }).join('')}
                <button class="btn-secondary" style="margin-top:12px;width:100%;" onclick="showCreateQuestionModal('${lesson.id}', ${lessonQuestions.length + 1})">+ Agregar Pregunta</button>
            </div>
        </div>`;
    }).join('');
}

function showCreateQuestionModal(lessonId, nextOrder) {
    openModal('Crear Pregunta', `
        <form id="createQuestionForm" class="grade-form">
            <div class="form-group">
                <label>Pregunta</label>
                <textarea id="newQText" required placeholder="Escribe la pregunta"></textarea>
            </div>
            <div class="form-group">
                <label>Opción 1 (correcta)</label>
                <input type="text" id="newQOpt1" required placeholder="Respuesta correcta">
            </div>
            <div class="form-group">
                <label>Opción 2</label>
                <input type="text" id="newQOpt2" required placeholder="Opción incorrecta">
            </div>
            <div class="form-group">
                <label>Opción 3</label>
                <input type="text" id="newQOpt3" placeholder="Opción incorrecta (opcional)">
            </div>
            <div class="form-group">
                <label>Opción 4</label>
                <input type="text" id="newQOpt4" placeholder="Opción incorrecta (opcional)">
            </div>
            <button type="submit" class="btn-primary" style="width:100%;">CREAR PREGUNTA</button>
        </form>
    `);

    document.getElementById('createQuestionForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const { data: question, error: qError } = await sb.from('quiz_questions').insert({
            lesson_id: lessonId,
            question_text: document.getElementById('newQText').value,
            question_order: nextOrder
        }).select().single();

        if (qError) { showAdminToast('Error: ' + qError.message, 'error'); return; }

        const options = [
            { option_text: document.getElementById('newQOpt1').value, is_correct: true, option_order: 1 },
            { option_text: document.getElementById('newQOpt2').value, is_correct: false, option_order: 2 },
        ];

        const opt3 = document.getElementById('newQOpt3').value;
        const opt4 = document.getElementById('newQOpt4').value;
        if (opt3) options.push({ option_text: opt3, is_correct: false, option_order: 3 });
        if (opt4) options.push({ option_text: opt4, is_correct: false, option_order: 4 });

        await sb.from('quiz_options').insert(options.map(o => ({ ...o, question_id: question.id })));

        showAdminToast('Pregunta creada', 'success');
        closeModal();
        loadQuizzesAdmin();
    });
}

async function editQuestion(questionId) {
    const { data: q } = await sb.from('quiz_questions').select('*, quiz_options(*)').eq('id', questionId).single();
    if (!q) return;

    const opts = (q.quiz_options || []).sort((a, b) => a.option_order - b.option_order);

    openModal('Editar Pregunta', `
        <form id="editQuestionForm" class="grade-form">
            <div class="form-group">
                <label>Pregunta</label>
                <textarea id="editQText" required>${q.question_text}</textarea>
            </div>
            ${opts.map((o, i) => `<div class="form-group">
                <label>Opción ${i + 1} ${o.is_correct ? '(correcta)' : ''}</label>
                <input type="text" id="editQOpt${o.id}" value="${o.option_text}" required>
            </div>`).join('')}
            <button type="submit" class="btn-primary" style="width:100%;">GUARDAR CAMBIOS</button>
        </form>
    `);

    document.getElementById('editQuestionForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        await sb.from('quiz_questions').update({
            question_text: document.getElementById('editQText').value
        }).eq('id', questionId);

        for (const o of opts) {
            const newText = document.getElementById(`editQOpt${o.id}`).value;
            await sb.from('quiz_options').update({ option_text: newText }).eq('id', o.id);
        }

        showAdminToast('Pregunta actualizada', 'success');
        closeModal();
        loadQuizzesAdmin();
    });
}

// ═══════════════════════════════════════════════════════
// ASSIGNMENTS
// ═══════════════════════════════════════════════════════

async function loadAssignments() {
    const filter = document.getElementById('assignmentFilter').value;
    let query = sb.from('assignments')
        .select('*, profiles!assignments_user_id_fkey(full_name), lessons!assignments_lesson_id_fkey(title, modules(title, module_number))')
        .order('submitted_at', { ascending: false });

    if (filter !== 'all') query = query.eq('status', filter);

    const { data: assignments } = await query;
    const el = document.getElementById('assignmentsTable');

    if (!assignments || assignments.length === 0) {
        el.innerHTML = '<p class="empty-state">No hay tareas</p>';
        return;
    }

    el.innerHTML = `<table><thead><tr><th>Alumno</th><th>Módulo/Lección</th><th>Fecha</th><th>Estado</th><th>Calificación</th><th>Acciones</th></tr></thead><tbody>
        ${assignments.map(a => `<tr>
            <td><strong>${a.profiles?.full_name || 'Sin nombre'}</strong></td>
            <td>Mod ${a.lessons?.modules?.module_number || ''} - ${a.lessons?.title || ''}</td>
            <td>${new Date(a.submitted_at).toLocaleDateString('es')}</td>
            <td><span class="status-badge ${a.status === 'graded' ? 'status-graded' : 'status-submitted'}">${a.status === 'graded' ? 'CALIFICADO' : 'PENDIENTE'}</span></td>
            <td>${a.grade !== null ? `${a.grade}/100` : '--'}</td>
            <td>
                <button class="btn-secondary btn-sm" onclick="viewAssignment('${a.id}')">Ver</button>
                ${a.status === 'submitted' ? `<button class="btn-success btn-sm" onclick="gradeAssignment('${a.id}')">Calificar</button>` : ''}
            </td>
        </tr>`).join('')}
    </tbody></table>`;
}

async function viewAssignment(assignmentId) {
    const { data: a } = await sb.from('assignments')
        .select('*, profiles!assignments_user_id_fkey(full_name), lessons!assignments_lesson_id_fkey(title)')
        .eq('id', assignmentId)
        .single();

    if (!a) return;

    let html = `<div style="margin-bottom:16px;">
        <p style="color:var(--text-muted);font-size:0.85rem;">Alumno: <strong>${a.profiles?.full_name || 'Sin nombre'}</strong></p>
        <p style="color:var(--text-muted);font-size:0.85rem;">Lección: <strong>${a.lessons?.title || ''}</strong></p>
        <p style="color:var(--text-muted);font-size:0.85rem;">Enviado: <strong>${new Date(a.submitted_at).toLocaleString('es')}</strong></p>
    </div>`;

    if (a.content_text) {
        // Prepare clean text for download
        const cleanText = a.content_text.replace(/'/g, "\\'").replace(/\n/g, '\\n');

        html += `<div style="background:var(--admin-bg);padding:16px;border-radius:8px;margin-bottom:16px;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
                 <h4 style="margin:0;">Texto de la tarea:</h4>
                 <button class="btn-secondary btn-sm" style="display:flex; align-items:center; gap:6px;" onclick="downloadTextAsFile('Tarea_${a.profiles?.full_name || 'Alumno'}.txt', '${cleanText}')">
                     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Descargar .txt
                 </button>
            </div>
            <p style="font-size:0.9rem;white-space:pre-wrap; margin:0;">${a.content_text}</p>
        </div>`;
    }

    if (a.file_url) {
        let path = a.file_url;
        if (path.includes('/object/public/assignments/')) {
            path = path.split('/object/public/assignments/')[1];
        } else if (path.includes('/object/sign/assignments/')) {
            path = path.split('/object/sign/assignments/')[1].split('?')[0];
        }

        html += `<p><button id="btnDownloadAssignmentFile" class="btn-secondary" style="display:inline-flex; align-items:center; gap:6px;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> 
            Descargar archivo adjunto
        </button></p>`;

        // Ejecutamos la inyección del evento despues de renderizar el html
        setTimeout(() => {
            const btnDown = document.getElementById('btnDownloadAssignmentFile');
            if (btnDown) {
                btnDown.addEventListener('click', async () => {
                    const originalText = btnDown.innerHTML;
                    btnDown.innerHTML = 'Descargando...';
                    btnDown.disabled = true;

                    try {
                        let targetPath = path;
                        // Forzar a buscar sin "http" si aún se filtró
                        if (targetPath.startsWith('http')) {
                            targetPath = targetPath.substring(targetPath.lastIndexOf('/') + 1);
                        }

                        // Descarga de blob con el SDK
                        const { data, error } = await sb.storage.from('assignments').download(targetPath);
                        if (error) throw error;

                        // Generar link local
                        const url = URL.createObjectURL(data);
                        const aLink = document.createElement('a');
                        aLink.href = url;
                        // Intentamos adivinar el nombre extraido de la ruta
                        aLink.download = targetPath.split('/').pop() || 'tarea_adjunta';
                        document.body.appendChild(aLink);
                        aLink.click();
                        document.body.removeChild(aLink);
                        URL.revokeObjectURL(url);

                    } catch (err) {
                        showAdminToast('Error de descarga: El archivo pudo haber sido borrado.', 'error');
                        console.error('Storage Download Error:', err);
                    } finally {
                        btnDown.innerHTML = originalText;
                        btnDown.disabled = false;
                    }
                });
            }
        }, 100);
    }

    if (a.status === 'graded') {
        html += `<div style="background:#ECFDF5;padding:16px;border-radius:8px;margin-top:16px;">
            <p><strong>Calificación:</strong> ${a.grade}/100</p>
            <p><strong>Feedback:</strong> ${a.feedback || 'Sin comentarios'}</p>
        </div>`;
    }

    openModal('Detalle de Tarea', html);
}

async function gradeAssignment(assignmentId) {
    openModal('Calificar Tarea', `
        <form id="gradeForm" class="grade-form">
            <div class="grade-input">
                <input type="number" id="gradeValue" min="0" max="100" required placeholder="0">
                <span>/ 100</span>
            </div>
            <div class="form-group">
                <label>Feedback para el alumno</label>
                <textarea id="gradeFeedback" placeholder="Escribe tus comentarios..."></textarea>
            </div>
            <button type="submit" class="btn-primary" style="width:100%;">GUARDAR CALIFICACIÓN</button>
        </form>
    `);

    document.getElementById('gradeForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const grade = parseInt(document.getElementById('gradeValue').value);
        const feedback = document.getElementById('gradeFeedback').value;

        const { error } = await sb.from('assignments').update({
            grade: grade,
            feedback: feedback,
            status: 'graded',
            graded_at: new Date().toISOString()
        }).eq('id', assignmentId);

        if (error) { showAdminToast('Error: ' + error.message, 'error'); return; }
        showAdminToast('Tarea calificada correctamente', 'success');
        closeModal();
        loadAssignments();
    });
}

// ═══════════════════════════════════════════════════════
// MODAL
// ═══════════════════════════════════════════════════════

function setupModal() {
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('modalOverlay').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeModal();
    });
}

function openModal(title, bodyHtml) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = bodyHtml;
    document.getElementById('modalOverlay').style.display = 'flex';
}

function closeModal() {
    document.getElementById('modalOverlay').style.display = 'none';
}

// ═══════════════════════════════════════════════════════
// TAREAS UX/UI ADMIN (Editar/Eliminar)
// ═══════════════════════════════════════════════════════

function openEditStudentModal(userId, fullName, currentRole) {
    document.getElementById('modalTitle').textContent = 'Editar Estudiante';
    document.getElementById('modalBody').innerHTML = `
        <form id="editStudentForm">
            <div class="form-group">
                <label>Nombre y Apellido</label>
                <input type="text" id="editStudentName" required value="${fullName}">
            </div>
            <div class="form-group">
                <label>Correo Electrónico (Requiere Backend para forzar cambio de auth, acá solo UI referencial)</label>
                <input type="email" id="editStudentEmail" placeholder="Ingresa nuevo correo" title="El cambio de correo requiere que el usuario lo confirme">
            </div>
            <div class="form-group">
                <label>Nueva Contraseña (Opcional)</label>
                <div style="display:flex; gap:8px;">
                    <input type="password" id="editStudentPassword" placeholder="Dejar en blanco para no cambiar" style="flex:1;">
                    <button type="button" class="btn-secondary" onclick="const i=document.getElementById('editStudentPassword'); i.type = i.type==='password'?'text':'password';" style="padding: 0 12px;" title="Mostrar/Ocultar">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                    <button type="button" class="btn-secondary" onclick="navigator.clipboard.writeText(document.getElementById('editStudentPassword').value); showAdminToast('Contraseña copiada', 'success');" style="padding: 0 12px;" title="Copiar al portapapeles">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    </button>
                </div>
            </div>
            <div class="form-group">
                <label>Rol</label>
                <select id="editStudentRole">
                    <option value="student" ${currentRole === 'student' ? 'selected' : ''}>Estudiante</option>
                    <option value="mentor" ${currentRole === 'mentor' ? 'selected' : ''}>Mentor</option>
                    <option value="admin" ${currentRole === 'admin' ? 'selected' : ''}>Admin</option>
                </select>
            </div>
            <button type="submit" class="btn-primary" style="width:100%;">GUARDAR CAMBIOS</button>
        </form>
    `;

    document.getElementById('editStudentForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const role = document.getElementById('editStudentRole').value;
        const name = document.getElementById('editStudentName').value;
        const btn = e.target.querySelector('button');
        const newEmail = document.getElementById('editStudentEmail').value;
        const newPass = document.getElementById('editStudentPassword').value;

        btn.disabled = true; btn.textContent = 'Guardando...';

        // 1. Update Profile (Role and Name)
        const { error: profileError } = await sb.from('profiles').update({ role, full_name: name }).eq('id', userId);

        let authErrors = [];

        // 2. Try to update Auth if Supabase Admin API is available (Usually not in standard client, but let's try gracefully)
        if (newEmail || newPass) {
            if (sb.auth.admin) {
                const updates = {};
                if (newEmail) updates.email = newEmail;
                if (newPass) updates.password = newPass;

                const { error: auError } = await sb.auth.admin.updateUserById(userId, updates);
                if (auError) authErrors.push("Error actualizando credenciales: " + auError.message);
            } else {
                authErrors.push("El cambio de correo y contraseña requiere privilegios Admin en backend (Service Role Key). No se aplicaron credenciales.");
            }
        }

        if (profileError) {
            showAdminToast('Error de Perfil: ' + profileError.message, 'error');
            btn.disabled = false; btn.textContent = 'GUARDAR CAMBIOS';
        } else {
            if (authErrors.length > 0) {
                showAdminToast('Perfil de UI guardado. ' + authErrors[0], 'warning');
            } else {
                showAdminToast('Estudiante actualizado exitosamente', 'success');
            }
            closeModal();
            loadStudents();
            viewStudentDetail(userId);
        }
    });

    document.getElementById('modalOverlay').style.display = 'flex';
}

function confirmDeleteStudent(userId, fullName) {
    if (confirm(`¿Estás seguro de que quieres inhabilitar a ${fullName}? Esta acción revocará todos sus accesos. (Requiere backend para purgar completamente)`)) {
        sb.auth.admin ? deleteUserWithAdminApi(userId) : fallbackSoftDelete(userId);
    }
}

async function fallbackSoftDelete(userId) {
    // Soft delete if no admin rights
    const { error } = await sb.from('profiles').update({
        role: 'student',
        full_name: '[Eliminado]',
        eco_points: 0
    }).eq('id', userId);

    if (error) {
        showAdminToast('Error al procesar: ' + error.message, 'error');
    } else {
        showAdminToast('Usuario inhabilitado correctamente.', 'success');
        switchAdminView('usuarios');
    }
}

async function deleteUserWithAdminApi(userId) {
    const { error } = await sb.auth.admin.deleteUser(userId);
    if (error) showAdminToast('Error: ' + error.message, 'error');
    else {
        showAdminToast('Usuario eliminado del sistema', 'success');
        switchAdminView('usuarios');
    }
}

// ═══════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════

function downloadTextAsFile(filename, text) {
    const actText = text.replace(/\\n/g, '\n').replace(/\\'/g, "'");
    const blob = new Blob([actText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function generatePassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let result = '';
    for (let i = 0; i < 8; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
}

function showAdminToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span class="toast-msg">${message}</span><button class="toast-close" onclick="this.parentElement.remove()">&times;</button>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}

// Make functions global
window.viewStudentDetail = viewStudentDetail;
window.editLesson = editLesson;
window.editModule = editModule;
window.deleteModule = deleteModule;
window.deleteLesson = deleteLesson;
window.manageLessonResources = manageLessonResources;
window.openEditStudentModal = openEditStudentModal;
window.confirmDeleteStudent = confirmDeleteStudent;
window.deleteResource = deleteResource;
window.editQuestion = editQuestion;
window.viewAssignment = viewAssignment;
window.gradeAssignment = gradeAssignment;
window.showCreateLessonModal = showCreateLessonModal;
window.showCreateQuestionModal = showCreateQuestionModal;
