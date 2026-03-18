/* ============================================================
   SCHOLARIS LMS v2.0 — ADMIN PANEL JAVASCRIPT
   Polytechnic University of Cabuyao | app.js
   ============================================================ */

// ── STORAGE & VALIDATION ─────────────────────────────────────

class StorageManager {
    constructor(key) { this.key = key; }
    load() {
        const data = localStorage.getItem(this.key);
        return data ? JSON.parse(data) : [];
    }
    save(data) { localStorage.setItem(this.key, JSON.stringify(data)); }
}

class Validator {
    static rules = {
        stuName: [
            { test: v => v.trim().length > 0,  msg: 'Full name is required.' },
            { test: v => v.trim().length >= 2, msg: 'Name must be at least 2 characters.' },
            { test: v => /^[a-zA-Z\s\-'.]+$/.test(v.trim()), msg: 'Name can only contain letters.' }
        ],
        stuEmail: [
            { test: v => v.trim().length > 0, msg: 'Email address is required.' },
            { test: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()), msg: 'Enter a valid email address.' }
        ],
        stuId: [
            { test: v => v.trim().length > 0,  msg: 'Student ID is required.' },
            { test: v => v.trim().length >= 4, msg: 'Student ID must be at least 4 digits.' },
            { test: v => /^[0-9]+$/.test(v.trim()), msg: 'Student ID must contain numbers only.' }
        ],
        tchName: [
            { test: v => v.trim().length > 0,  msg: 'Full name is required.' },
            { test: v => v.trim().length >= 2, msg: 'Name must be at least 2 characters.' }
        ],
        tchEmail: [
            { test: v => v.trim().length > 0, msg: 'Email address is required.' },
            { test: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()), msg: 'Enter a valid email address.' }
        ],
        tchId: [
            { test: v => v.trim().length > 0, msg: 'Employee ID is required.' }
        ]
    };

    static validateField(fieldId, value, extraCheck) {
        const rules = this.rules[fieldId] || [];
        const msgEl = $(`#${fieldId}-msg`);
        const input = $(`#${fieldId}`);
        for (const rule of rules) {
            if (!rule.test(value)) { this.setInvalid(input, msgEl, rule.msg); return false; }
        }
        if (extraCheck) {
            const res = extraCheck(value.trim());
            if (res) { this.setInvalid(input, msgEl, res); return false; }
        }
        this.setValid(input, msgEl);
        return true;
    }

    static validateStudent(name, email, id, students) {
        const dupEmail = v => students.some(s => s.email.toLowerCase() === v.toLowerCase()) ? 'Email already registered.' : null;
        const dupId    = v => students.some(s => s.studentId.toLowerCase() === v.toLowerCase()) ? 'Student ID already exists.' : null;
        const ok = [
            this.validateField('stuName', name, null),
            this.validateField('stuEmail', email, dupEmail),
            this.validateField('stuId', id, dupId)
        ];
        ok.forEach((valid, i) => {
            if (!valid) {
                const ids = ['stuName', 'stuEmail', 'stuId'];
                $(`#${ids[i]}`).addClass('shake');
                setTimeout(() => $(`#${ids[i]}`).removeClass('shake'), 400);
            }
        });
        return ok.every(Boolean);
    }

    static validateTeacher(name, email, id, teachers) {
        const dupEmail = v => teachers.some(t => t.email.toLowerCase() === v.toLowerCase()) ? 'Email already registered.' : null;
        const dupId    = v => teachers.some(t => t.employeeId.toLowerCase() === v.toLowerCase()) ? 'Employee ID already exists.' : null;
        const ok = [
            this.validateField('tchName', name, null),
            this.validateField('tchEmail', email, dupEmail),
            this.validateField('tchId', id, dupId)
        ];
        ok.forEach((valid, i) => {
            if (!valid) {
                const ids = ['tchName', 'tchEmail', 'tchId'];
                $(`#${ids[i]}`).addClass('shake');
                setTimeout(() => $(`#${ids[i]}`).removeClass('shake'), 400);
            }
        });
        return ok.every(Boolean);
    }

    static setInvalid(input, msgEl, msg) {
        input.removeClass('field-valid').addClass('field-invalid');
        msgEl.text(msg).removeClass('field-msg-valid').addClass('field-msg-error').show();
    }
    static setValid(input, msgEl) {
        input.removeClass('field-invalid').addClass('field-valid');
        msgEl.text('✓ Looks good').removeClass('field-msg-error').addClass('field-msg-valid').show();
    }
    static clearField(fieldId) {
        $(`#${fieldId}`).removeClass('field-valid field-invalid');
        $(`#${fieldId}-msg`).hide().text('').removeClass('field-msg-error field-msg-valid');
    }
    static clearAll(fields) {
        fields.forEach(id => this.clearField(id));
    }
}

// ── STUDENT ──────────────────────────────────────────────────

class Student {
    constructor(name, email, id, section = '', courses = []) {
        this.name = name;
        this.email = email;
        this.studentId = id;
        this.section = section;
        this.enrolledCourses = courses;
    }
}

class StudentManager {
    constructor() {
        this.repo = new StorageManager("pnc_students");
        this.students = this.repo.load().map(s => new Student(s.name, s.email, s.studentId, s.section || '', s.enrolledCourses));
    }
    add() {
        const n = $('#stuName').val().trim();
        const e = $('#stuEmail').val().trim();
        const i = $('#stuId').val().trim();
        const sec = $('#stuSection').val();
        if (!Validator.validateStudent(n, e, i, this.students)) return;
        this.students.push(new Student(n, e, i, sec));
        this.repo.save(this.students);
        app.renderAll();
        $('#stuName, #stuEmail, #stuId').val('');
        $('#stuSection').val('');
        Validator.clearAll(['stuName', 'stuEmail', 'stuId']);
        app.logActivity(`Registered student <strong>${n}</strong>`, 'green');
    }
    enroll(idx, code) {
        if (!code) return;
        if (!this.students[idx].enrolledCourses.includes(code)) {
            this.students[idx].enrolledCourses.push(code);
            this.repo.save(this.students);
            app.renderAll();
            app.logActivity(`Enrolled <strong>${this.students[idx].name}</strong> in <strong>${code}</strong>`, 'blue');
        }
    }
    edit(idx) {
        const s = this.students[idx];
        const n = prompt("Edit Name:", s.name);
        const e = prompt("Edit Email:", s.email);
        if (n && e) {
            s.name = n; s.email = e;
            if (s.enrolledCourses.length > 0) {
                const rem = prompt(`Enrolled in: ${s.enrolledCourses.join(', ')}\nEnter code to remove (leave blank to skip):`);
                if (rem) s.enrolledCourses = s.enrolledCourses.filter(c => c !== rem.toUpperCase());
            }
            this.repo.save(this.students);
            app.renderAll();
            app.logActivity(`Updated student <strong>${n}</strong>`, 'gold');
        }
    }
    delete(idx) {
        if (confirm("Delete this student? This action cannot be undone.")) {
            const name = this.students[idx].name;
            this.students.splice(idx, 1);
            this.repo.save(this.students);
            app.renderAll();
            app.logActivity(`Removed student <strong>${name}</strong>`, 'red');
        }
    }
}

// ── TEACHER ──────────────────────────────────────────────────

class Teacher {
    constructor(name, email, id, dept = '') {
        this.name = name;
        this.email = email;
        this.employeeId = id;
        this.department = dept;
    }
}

class TeacherManager {
    constructor() {
        this.repo = new StorageManager("pnc_teachers");
        this.teachers = this.repo.load().map(t => new Teacher(t.name, t.email, t.employeeId, t.department));
    }
    add() {
        const n = $('#tchName').val().trim();
        const e = $('#tchEmail').val().trim();
        const i = $('#tchId').val().trim();
        const d = $('#tchDept').val().trim();
        if (!Validator.validateTeacher(n, e, i, this.teachers)) return;
        this.teachers.push(new Teacher(n, e, i, d));
        this.repo.save(this.teachers);
        app.renderAll();
        $('#tchName, #tchEmail, #tchId, #tchDept').val('');
        Validator.clearAll(['tchName', 'tchEmail', 'tchId']);
        app.logActivity(`Registered teacher <strong>${n}</strong>`, 'blue');
    }
    delete(idx) {
        if (confirm("Delete this teacher record?")) {
            const name = this.teachers[idx].name;
            this.teachers.splice(idx, 1);
            this.repo.save(this.teachers);
            app.renderAll();
            app.logActivity(`Removed teacher <strong>${name}</strong>`, 'red');
        }
    }
}

// ── SECTION ──────────────────────────────────────────────────

class Section {
    constructor(name, year, teacherId) {
        this.name = name;
        this.year = year;
        this.teacherId = teacherId;
    }
}

class SectionManager {
    constructor() {
        this.repo = new StorageManager("pnc_sections");
        this.sections = this.repo.load().map(s => new Section(s.name, s.year, s.teacherId));
    }
    add() {
        const n = $('#secName').val().trim();
        const y = $('#secYear').val();
        const t = $('#secTeacher').val();
        if (!n) return alert("Please enter a section name.");
        if (!y) return alert("Please select a year level.");
        if (this.sections.some(s => s.name.toLowerCase() === n.toLowerCase())) {
            return alert("Section name already exists.");
        }
        this.sections.push(new Section(n, y, t));
        this.repo.save(this.sections);
        app.renderAll();
        $('#secName').val('');
        $('#secYear, #secTeacher').val('');
        app.logActivity(`Created section <strong>${n}</strong>`, 'purple');
    }
    delete(idx) {
        if (confirm("Delete this section?")) {
            const name = this.sections[idx].name;
            this.sections.splice(idx, 1);
            this.repo.save(this.sections);
            app.renderAll();
            app.logActivity(`Deleted section <strong>${name}</strong>`, 'red');
        }
    }
}

// ── COURSE ───────────────────────────────────────────────────

class Course { constructor(name, code) { this.name = name; this.code = code; } }

class CourseManager {
    constructor() {
        this.repo = new StorageManager("pnc_courses");
        this.courses = this.repo.load().map(c => new Course(c.name, c.code));
    }
    add() {
        const n = $('#crsName').val().trim();
        const c = $('#crsCode').val().trim().toUpperCase();
        if (!n || !c) return alert("Please fill in both fields.");
        if (this.courses.some(x => x.code === c)) return alert("Subject code already exists.");
        this.courses.push(new Course(n, c));
        this.repo.save(this.courses);
        app.renderAll();
        $('#crsName, #crsCode').val('');
        app.logActivity(`Created subject <strong>${c}: ${n}</strong>`, 'blue');
    }
    delete(idx) {
        const c = this.courses[idx];
        if (confirm(`Delete subject "${c.code}: ${c.name}"? This will also unenroll all students from it.`)) {
            app.studentManager.students.forEach(s => {
                s.enrolledCourses = s.enrolledCourses.filter(code => code !== c.code);
            });
            app.studentManager.repo.save(app.studentManager.students);
            this.courses.splice(idx, 1);
            this.repo.save(this.courses);
            app.renderAll();
            app.logActivity(`Deleted subject <strong>${c.code}: ${c.name}</strong>`, 'red');
        }
    }
    removeStudent(courseIdx) {
        const code = this.courses[courseIdx].code;
        const enrolled = app.studentManager.students.filter(s => s.enrolledCourses.includes(code));
        if (!enrolled.length) return alert("No students enrolled in this subject.");
        const name = prompt(`Students in ${code}:\n${enrolled.map(s => s.name).join('\n')}\nEnter exact name to remove:`);
        const stu = app.studentManager.students.find(s => s.name === name);
        if (stu) {
            stu.enrolledCourses = stu.enrolledCourses.filter(c => c !== code);
            app.studentManager.repo.save(app.studentManager.students);
            app.renderAll();
            app.logActivity(`Removed <strong>${name}</strong> from <strong>${code}</strong>`, 'red');
        }
    }
}

// ── GRADES & ATTENDANCE ──────────────────────────────────────

class GradesManager {
    constructor() {
        this.repo = new StorageManager("pnc_grades");
        this.records = this.repo.load(); // { studentId, courseCode, prelim, midterm, finals, attendance: [] }
    }

    getRecord(studentId, courseCode) {
        return this.records.find(r => r.studentId === studentId && r.courseCode === courseCode) || null;
    }

    load() {
        const stuId   = $('#gradeStudentSelect').val();
        const crsCode = $('#gradeSubjectSelect').val();
        if (!stuId || !crsCode) return alert("Please select both a student and a subject.");

        const stu = app.studentManager.students.find(s => s.studentId === stuId);
        const crs = app.courseManager.courses.find(c => c.code === crsCode);
        if (!stu || !crs) return;

        const rec = this.getRecord(stuId, crsCode);

        // Show student info
        $('#gradeStudentInfo').html(`
            <strong>${stu.name}</strong> &nbsp;<span class="badge badge-blue">${stu.studentId}</span>
            &nbsp;|&nbsp; Subject: <strong>${crs.code} — ${crs.name}</strong>
        `);

        // Fill grade inputs
        $('#gradePrelim').val(rec ? rec.prelim : '');
        $('#gradeMidterm').val(rec ? rec.midterm : '');
        $('#gradeFinals').val(rec ? rec.finals : '');
        this.updateComputed();

        // Set today's date as default
        const today = new Date().toISOString().split('T')[0];
        $('#attendDate').val(today);

        // Render attendance
        this.renderAttendance(rec);

        $('#gradeRecordArea').show();
        $('#gradeEmptyState').hide();

        // Live grade computation
        $('#gradePrelim, #gradeMidterm, #gradeFinals').off('input').on('input', () => this.updateComputed());
    }

    updateComputed() {
        const p = parseFloat($('#gradePrelim').val());
        const m = parseFloat($('#gradeMidterm').val());
        const f = parseFloat($('#gradeFinals').val());
        const box = $('#computedGrade');
        if (!isNaN(p) && !isNaN(m) && !isNaN(f)) {
            const avg = ((p + m + f) / 3).toFixed(2);
            const threshold = parseFloat($('#passThreshold').val()) || 75;
            const passed = parseFloat(avg) >= threshold;
            box.text(avg).css('color', passed ? 'var(--green-mid)' : 'var(--danger)');
        } else {
            box.text('—').css('color', 'var(--n500)');
        }
    }

    save() {
        const stuId   = $('#gradeStudentSelect').val();
        const crsCode = $('#gradeSubjectSelect').val();
        const p = parseFloat($('#gradePrelim').val());
        const m = parseFloat($('#gradeMidterm').val());
        const f = parseFloat($('#gradeFinals').val());
        if (!stuId || !crsCode) return alert("No student/subject loaded.");
        if ([p, m, f].some(isNaN)) return alert("Please fill in all three grade fields.");
        if ([p, m, f].some(v => v < 0 || v > 100)) return alert("Grades must be between 0 and 100.");

        let rec = this.getRecord(stuId, crsCode);
        if (rec) {
            rec.prelim = p; rec.midterm = m; rec.finals = f;
        } else {
            rec = { studentId: stuId, courseCode: crsCode, prelim: p, midterm: m, finals: f, attendance: [] };
            this.records.push(rec);
        }
        this.repo.save(this.records);
        this.updateComputed();
        const stu = app.studentManager.students.find(s => s.studentId === stuId);
        app.logActivity(`Saved grades for <strong>${stu ? stu.name : stuId}</strong> — ${crsCode}`, 'gold');
        alert("Grade saved successfully!");
    }

    addAttendance() {
        const stuId   = $('#gradeStudentSelect').val();
        const crsCode = $('#gradeSubjectSelect').val();
        if (!stuId || !crsCode) return alert("No student/subject loaded.");
        const date    = $('#attendDate').val();
        const status  = $('#attendStatus').val();
        const remarks = $('#attendRemarks').val().trim();
        if (!date) return alert("Please select a date.");

        let rec = this.getRecord(stuId, crsCode);
        if (!rec) {
            rec = { studentId: stuId, courseCode: crsCode, prelim: null, midterm: null, finals: null, attendance: [] };
            this.records.push(rec);
        }
        // Prevent duplicate date entry
        if (rec.attendance.some(a => a.date === date)) {
            if (!confirm("Attendance for this date already exists. Overwrite?")) return;
            rec.attendance = rec.attendance.filter(a => a.date !== date);
        }
        rec.attendance.push({ date, status, remarks });
        rec.attendance.sort((a, b) => new Date(b.date) - new Date(a.date));
        this.repo.save(this.records);
        this.renderAttendance(rec);
        $('#attendRemarks').val('');
        app.logActivity(`Logged attendance for <strong>${stuId}</strong> — ${date}: ${status}`, 'blue');
    }

    renderAttendance(rec) {
        const list = $('#attendanceList').empty();
        if (!rec || !rec.attendance || !rec.attendance.length) {
            list.append(`<div class="empty-state" style="padding:16px;"><p>No attendance records yet.</p></div>`);
            $('#attendSummary').text('');
            return;
        }
        const total   = rec.attendance.length;
        const present = rec.attendance.filter(a => a.status === 'present').length;
        const late    = rec.attendance.filter(a => a.status === 'late').length;
        const absent  = rec.attendance.filter(a => a.status === 'absent').length;
        const pct     = Math.round(((present + late) / total) * 100);
        $('#attendSummary').html(`<span class="badge badge-green">${pct}% attendance</span> &nbsp; ${present}P · ${late}L · ${absent}A`);

        rec.attendance.forEach((a, i) => {
            const colors = { present: 'badge-green', absent: 'badge-danger', late: 'badge-gold', excused: 'badge-blue' };
            list.append(`
                <div class="data-item" style="padding:7px 10px;">
                    <div class="item-left">
                        <strong style="font-size:0.8rem;">${a.date}</strong>
                        <small>${a.remarks || '—'}</small>
                    </div>
                    <div style="display:flex;align-items:center;gap:6px;">
                        <span class="badge ${colors[a.status] || 'badge-gray'}">${a.status.toUpperCase()}</span>
                        <button class="btn-delete" style="font-size:0.65rem;padding:3px 6px;" onclick="app.gradesManager.deleteAttendance('${$('#gradeStudentSelect').val()}','${$('#gradeSubjectSelect').val()}',${i})">✕</button>
                    </div>
                </div>`);
        });
    }

    deleteAttendance(stuId, crsCode, idx) {
        const rec = this.getRecord(stuId, crsCode);
        if (rec) {
            rec.attendance.splice(idx, 1);
            this.repo.save(this.records);
            this.renderAttendance(rec);
        }
    }

    getStudentAvgGrade(studentId) {
        const recs = this.records.filter(r => r.studentId === studentId && r.prelim !== null);
        if (!recs.length) return null;
        const avg = recs.reduce((sum, r) => sum + (r.prelim + r.midterm + r.finals) / 3, 0) / recs.length;
        return avg.toFixed(2);
    }

    getStudentAttendancePct(studentId) {
        const recs = this.records.filter(r => r.studentId === studentId);
        const allAttend = recs.flatMap(r => r.attendance || []);
        if (!allAttend.length) return null;
        const attended = allAttend.filter(a => a.status === 'present' || a.status === 'late').length;
        return Math.round((attended / allAttend.length) * 100);
    }
}

// ── APP ───────────────────────────────────────────────────────

class App {
    constructor() {
        this.studentManager = new StudentManager();
        this.teacherManager = new TeacherManager();
        this.sectionManager = new SectionManager();
        this.courseManager  = new CourseManager();
        this.gradesManager  = new GradesManager();
        this.activityLog    = [];
        this.init();
    }

    // ── SESSION ──────────────────────────────────────────────────
    checkSession() {
        const session = JSON.parse(sessionStorage.getItem('pnc_session') || 'null');
        if (!session) { window.location.href = 'login.html'; return null; }
        return session;
    }

    renderSessionUI(session) {
        const roleLabels = { admin: 'Admin', teacher: 'Teacher', student: 'Student' };
        const roleEmoji  = { admin: '🛡️', teacher: '👨‍🏫', student: '🎓' };
        const name = session.name || session.email;
        const role = session.role || 'admin';
        $('#sidebarAvatar').text(name.charAt(0).toUpperCase());
        $('#sidebarUserName').text(name);
        $('#sidebarUserRole').text(`${roleLabels[role] || role} · A.Y. 2025–2026`);
        $('#sessionRole').text(`${roleEmoji[role] || ''} ${roleLabels[role] || role}`);
        $('#sessionName').text(name);
    }

    logout() {
        if (confirm('Are you sure you want to sign out?')) {
            sessionStorage.removeItem('pnc_session');
            window.location.href = 'login.html';
        }
    }

    init() {
        // Session guard
        const session = this.checkSession();
        if (!session) return;
        this.renderSessionUI(session);

        $('.nav-link[data-page]').on('click', (e) => {
            this.navigateTo($(e.currentTarget).data('page'));
        });

        $('#stuSearch, #stuField').on('input change', () => this.renderStudents());
        $('#crsSearch').on('input', () => this.renderCourses());
        $('#tchSearch').on('input', () => this.renderTeachers());
        $('#rptSectionFilter, #rptStatusFilter').on('change', () => this.renderPerformanceTable());

        // Live student field validation
        $('#stuName').on('input', () => {
            Validator.validateField('stuName', $('#stuName').val(), null);
        });
        $('#stuEmail').on('input', () => {
            Validator.validateField('stuEmail', $('#stuEmail').val(),
                v => app.studentManager.students.some(s => s.email.toLowerCase() === v.toLowerCase()) ? 'Email already registered.' : null
            );
        });
        $('#stuId').on('input', () => {
            Validator.validateField('stuId', $('#stuId').val(),
                v => app.studentManager.students.some(s => s.studentId.toLowerCase() === v.toLowerCase()) ? 'Student ID already exists.' : null
            );
        });

        // Live teacher field validation
        $('#tchName').on('input', () => Validator.validateField('tchName', $('#tchName').val(), null));
        $('#tchEmail').on('input', () => {
            Validator.validateField('tchEmail', $('#tchEmail').val(),
                v => app.teacherManager.teachers.some(t => t.email.toLowerCase() === v.toLowerCase()) ? 'Email already registered.' : null
            );
        });
        $('#tchId').on('input', () => {
            Validator.validateField('tchId', $('#tchId').val(),
                v => app.teacherManager.teachers.some(t => t.employeeId.toLowerCase() === v.toLowerCase()) ? 'Employee ID already exists.' : null
            );
        });

        const now = new Date();
        $('#topnavDate').text(now.toLocaleDateString('en-PH', {
            weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
        }));

        this.renderAll();
        this.navigateTo('dashboard');
    }

    navigateTo(page) {
        $('.nav-link').removeClass('active');
        $(`.nav-link[data-page="${page}"]`).addClass('active');
        $('.page-view').removeClass('active');
        $(`#page-${page}`).addClass('active');

        const labels = {
            dashboard: 'Dashboard', students: 'Students', teachers: 'Teachers',
            sections: 'Sections', courses: 'Subjects', grades: 'Grades & Attendance',
            reports: 'Reports', settings: 'Settings'
        };
        $('#breadcrumbCurrent').text(labels[page] || page);

        if (page === 'dashboard') this.renderDashboard();
        if (page === 'reports')   this.renderReports();
        if (page === 'grades')    this.populateGradeSelects();
    }

    logActivity(html, type = 'green') {
        const timeLabels = ['Just now', '1m ago', '3m ago', '7m ago', '12m ago', '20m ago'];
        this.activityLog.unshift({ html, type, time: 'Just now' });
        this.activityLog.forEach((e, i) => { if (i > 0) e.time = timeLabels[Math.min(i, timeLabels.length - 1)]; });
        if (this.activityLog.length > 10) this.activityLog.pop();
        this.renderActivity();
    }

    populateGradeSelects() {
        const stuSel = $('#gradeStudentSelect').empty().append('<option value="">— Select Student —</option>');
        this.studentManager.students.forEach(s => {
            stuSel.append(`<option value="${s.studentId}">${s.name} (${s.studentId})</option>`);
        });
        const crseSel = $('#gradeSubjectSelect').empty().append('<option value="">— Select Subject —</option>');
        this.courseManager.courses.forEach(c => {
            crseSel.append(`<option value="${c.code}">${c.code} — ${c.name}</option>`);
        });
        $('#gradeRecordArea').hide();
        $('#gradeEmptyState').show();
    }

    renderDashboard() {
        const students = this.studentManager.students;
        const teachers = this.teacherManager.teachers;
        const sections = this.sectionManager.sections;
        const courses  = this.courseManager.courses;

        $('#dashStudents').text(students.length);
        $('#dashTeachers').text(teachers.length);
        $('#dashSections').text(sections.length);
        $('#dashCourses').text(courses.length);

        const tbody = $('#recentStudentsBody').empty();
        const recent = [...students].slice(-5).reverse();
        if (!recent.length) {
            tbody.append(`<tr><td colspan="4" style="text-align:center;color:var(--n400);padding:22px 0;">No students yet.</td></tr>`);
        } else {
            recent.forEach(s => {
                const avg = this.gradesManager.getStudentAvgGrade(s.studentId);
                const threshold = parseFloat($('#passThreshold').val()) || 75;
                const gradeLabel = avg
                    ? `<span class="badge ${parseFloat(avg) >= threshold ? 'badge-green' : 'badge-danger'}">${avg}</span>`
                    : `<span class="badge badge-gray">N/A</span>`;
                tbody.append(`
                    <tr>
                        <td><strong>${s.name}</strong></td>
                        <td><span class="badge badge-blue">${s.studentId}</span></td>
                        <td>${s.section ? `<span class="badge badge-purple">${s.section}</span>` : '<span class="badge badge-gray">—</span>'}</td>
                        <td>${gradeLabel}</td>
                    </tr>`);
            });
        }
        this.renderActivity();
    }

    renderActivity() {
        const list = $('#activityList').empty();
        if (!this.activityLog.length) {
            list.append(`<div class="empty-state"><div class="empty-icon">📋</div><p>No recent activity yet.</p></div>`);
            return;
        }
        this.activityLog.forEach(e => {
            list.append(`
                <div class="activity-item">
                    <div class="activity-dot ${e.type}"></div>
                    <div class="activity-text">${e.html}</div>
                    <div class="activity-time">${e.time}</div>
                </div>`);
        });
    }

    renderStudents() {
        const query     = $('#stuSearch').val().toLowerCase();
        const field     = $('#stuField').val();
        const container = $('#studentList').empty();
        const filtered  = this.studentManager.students.filter(s => {
            if (field === "name")      return s.name.toLowerCase().includes(query);
            if (field === "studentId") return s.studentId.toLowerCase().includes(query);
            if (field === "section")   return (s.section || '').toLowerCase().includes(query);
            return s.name.toLowerCase().includes(query) || s.studentId.toLowerCase().includes(query) || (s.section || '').toLowerCase().includes(query);
        });

        $('.student-count').text(`${filtered.length} student(s)`);
        $('#sidebarStudentBadge').text(this.studentManager.students.length);

        // Repopulate section dropdown
        const secSel = $('#stuSection').empty().append('<option value="">— Select Section —</option>');
        this.sectionManager.sections.forEach(s => secSel.append(`<option value="${s.name}">${s.name} (${s.year})</option>`));

        if (!filtered.length) {
            container.append(`<div class="empty-state"><div class="empty-icon">🔍</div><p>No students found.</p></div>`);
            return;
        }

        filtered.forEach((s, i) => {
            const realIdx    = this.studentManager.students.indexOf(s);
            const options    = this.courseManager.courses.map(c => `<option value="${c.code}">${c.name} (${c.code})</option>`).join('');
            const courseTags = s.enrolledCourses.length
                ? s.enrolledCourses.map(c => `<span class="badge badge-gold">${c}</span>`).join('')
                : `<span class="badge badge-gray">No subjects</span>`;
            const secTag = s.section ? `<span class="badge badge-purple">${s.section}</span>` : '';
            const avg = this.gradesManager.getStudentAvgGrade(s.studentId);
            const gradeTag = avg ? `<span class="badge badge-blue">Avg: ${avg}</span>` : '';
            container.append(`
                <div class="data-item">
                    <div class="item-left">
                        <strong>${s.name} <span class="badge badge-blue">${s.studentId}</span> ${secTag} ${gradeTag}</strong>
                        <small>${s.email}</small>
                        <div class="tags-row">${courseTags}</div>
                        <select onchange="app.studentManager.enroll(${realIdx}, this.value)">
                            <option value="">＋ Enroll in a subject</option>${options}
                        </select>
                    </div>
                    <div class="item-actions">
                        <button class="btn-edit" onclick="app.studentManager.edit(${realIdx})">✏️ Edit</button>
                        <button class="btn-delete" onclick="app.studentManager.delete(${realIdx})">🗑 Delete</button>
                    </div>
                </div>`);
        });
    }

    renderTeachers() {
        const query = ($('#tchSearch').val() || '').toLowerCase();
        const container = $('#teacherList').empty();
        $('#sidebarTeacherBadge').text(this.teacherManager.teachers.length);
        $('#teacherCount').text(`${this.teacherManager.teachers.length} teacher(s)`);

        // Refresh teacher dropdown in sections
        const tchSel = $('#secTeacher').empty().append('<option value="">— Select Teacher —</option>');
        this.teacherManager.teachers.forEach(t => tchSel.append(`<option value="${t.employeeId}">${t.name} (${t.employeeId})</option>`));

        const filtered = this.teacherManager.teachers.filter(t =>
            t.name.toLowerCase().includes(query) || t.employeeId.toLowerCase().includes(query) || t.email.toLowerCase().includes(query)
        );

        if (!filtered.length) {
            container.append(`<div class="empty-state"><div class="empty-icon">👨‍🏫</div><p>No teachers found.</p></div>`);
            return;
        }

        filtered.forEach(t => {
            const realIdx = this.teacherManager.teachers.indexOf(t);
            const handledSections = this.sectionManager.sections.filter(s => s.teacherId === t.employeeId);
            const secTags = handledSections.length
                ? handledSections.map(s => `<span class="badge badge-purple">${s.name}</span>`).join('')
                : `<span class="badge badge-gray">No sections</span>`;
            container.append(`
                <div class="data-item">
                    <div class="item-left">
                        <strong>${t.name} <span class="badge badge-blue">${t.employeeId}</span></strong>
                        <small>${t.email} ${t.department ? '· ' + t.department : ''}</small>
                        <div class="tags-row">Sections: ${secTags}</div>
                    </div>
                    <div class="item-actions">
                        <button class="btn-delete" onclick="app.teacherManager.delete(${realIdx})">🗑 Delete</button>
                    </div>
                </div>`);
        });
    }

    renderSections() {
        const container = $('#sectionList').empty();
        $('#sidebarSectionBadge').text(this.sectionManager.sections.length);
        $('#sectionCount').text(`${this.sectionManager.sections.length} section(s)`);

        if (!this.sectionManager.sections.length) {
            container.append(`<div class="empty-state"><div class="empty-icon">🏫</div><p>No sections yet.</p></div>`);
            return;
        }

        this.sectionManager.sections.forEach((s, idx) => {
            const teacher = this.teacherManager.teachers.find(t => t.employeeId === s.teacherId);
            const stuCount = this.studentManager.students.filter(st => st.section === s.name).length;
            container.append(`
                <div class="data-item">
                    <div class="item-left">
                        <strong>${s.name} <span class="badge badge-purple">${s.year}</span></strong>
                        <small>Teacher: ${teacher ? teacher.name : '<em>Unassigned</em>'} &nbsp;·&nbsp; ${stuCount} student(s)</small>
                    </div>
                    <div class="item-actions">
                        <button class="btn-delete" onclick="app.sectionManager.delete(${idx})">🗑 Delete</button>
                    </div>
                </div>`);
        });
    }

    renderCourses() {
        const query     = ($('#crsSearch').val() || '').toLowerCase();
        const container = $('#courseList').empty();
        $('#sidebarCourseBadge').text(this.courseManager.courses.length);

        const filtered = this.courseManager.courses.filter(c =>
            c.name.toLowerCase().includes(query) || c.code.toLowerCase().includes(query)
        );
        $('#courseCount').text(`${filtered.length} subject(s)`);

        if (!this.courseManager.courses.length) {
            container.append(`<div class="empty-state"><div class="empty-icon">📚</div><p>No subjects yet.</p></div>`);
            return;
        }
        if (!filtered.length) {
            container.append(`<div class="empty-state"><div class="empty-icon">🔍</div><p>No subjects match your search.</p></div>`);
            return;
        }

        filtered.forEach(c => {
            const i = this.courseManager.courses.indexOf(c);
            const count = this.studentManager.students.filter(s => s.enrolledCourses.includes(c.code)).length;
            container.append(`
                <div class="data-item">
                    <div class="item-left" style="display:flex;align-items:center;">
                        <span class="course-code-pill">${c.code}</span>
                        <div>
                            <strong>${c.name}</strong>
                            <small>${count} student(s) enrolled</small>
                        </div>
                    </div>
                    <div class="item-actions">
                        <button class="btn-edit" onclick="app.courseManager.removeStudent(${i})">👤 Manage</button>
                        <button class="btn-delete" onclick="app.courseManager.delete(${i})">🗑 Delete</button>
                    </div>
                </div>`);
        });
    }

    renderReports() {
        const students = this.studentManager.students;
        const courses  = this.courseManager.courses;
        const teachers = this.teacherManager.teachers;
        const total    = students.length;
        const totalEnr = students.reduce((s, st) => s + st.enrolledCourses.length, 0);
        const fullLoad = students.filter(s => s.enrolledCourses.length >= 3).length;
        const noEnr    = students.filter(s => s.enrolledCourses.length === 0).length;
        const avg      = total ? (totalEnr / total).toFixed(1) : 0;

        const gradesRecorded = students.filter(s => this.gradesManager.getStudentAvgGrade(s.studentId) !== null).length;
        const allAvgs = students.map(s => this.gradesManager.getStudentAvgGrade(s.studentId)).filter(Boolean).map(Number);
        const classAvg = allAvgs.length ? (allAvgs.reduce((a, b) => a + b, 0) / allAvgs.length).toFixed(2) : '—';

        $('#rptTotalStudents').text(total);
        $('#rptTotalTeachers').text(teachers.length);
        $('#rptTotalCourses').text(courses.length);
        $('#rptTotalEnr').text(totalEnr);
        $('#rptAvgLoad').text(avg);
        $('#rptFullLoad').text(fullLoad);
        $('#rptNoEnr').text(noEnr);
        $('#rptWithGrades').text(gradesRecorded);
        $('#rptClassAvg').text(classAvg);

        // Section filter options
        const secFilter = $('#rptSectionFilter').empty().append('<option value="all">All Sections</option>');
        this.sectionManager.sections.forEach(s => secFilter.append(`<option value="${s.name}">${s.name}</option>`));

        // Enrollment bars
        const barsContainer = $('#courseEnrollBars').empty();
        if (!courses.length) {
            barsContainer.append(`<div class="empty-state"><div class="empty-icon">📊</div><p>No subjects to report yet.</p></div>`);
        } else {
            const max = Math.max(...courses.map(c => students.filter(s => s.enrolledCourses.includes(c.code)).length), 1);
            const targets = [];
            courses.forEach(c => {
                const cnt = students.filter(s => s.enrolledCourses.includes(c.code)).length;
                const pct = Math.round((cnt / max) * 100);
                targets.push(pct);
                barsContainer.append(`
                    <div class="report-row">
                        <span class="r-label"><span class="course-code-pill" style="margin-right:8px;">${c.code}</span>${c.name}</span>
                        <div class="progress-bar-wrap"><div class="progress-bar" style="width:0%"></div></div>
                        <span class="r-val">${cnt}</span>
                    </div>`);
            });
            setTimeout(() => {
                barsContainer.find('.progress-bar').each(function(i) { $(this).css('width', targets[i] + '%'); });
            }, 80);
        }

        this.renderPerformanceTable();
    }

    renderPerformanceTable() {
        const students  = this.studentManager.students;
        const secFilter = $('#rptSectionFilter').val();
        const stsFilter = $('#rptStatusFilter').val();
        const threshold = parseFloat($('#passThreshold').val()) || 75;
        const tbody = $('#performanceBody').empty();

        let filtered = students;
        if (secFilter !== 'all') filtered = filtered.filter(s => s.section === secFilter);

        filtered = filtered.map(s => {
            const avg  = this.gradesManager.getStudentAvgGrade(s.studentId);
            const attd = this.gradesManager.getStudentAttendancePct(s.studentId);
            let status;
            if (avg === null) status = 'incomplete';
            else if (parseFloat(avg) >= threshold) status = 'passed';
            else status = 'failed';
            return { ...s, avg, attd, status };
        });

        if (stsFilter !== 'all') filtered = filtered.filter(s => s.status === stsFilter);

        if (!filtered.length) {
            tbody.append(`<tr><td colspan="7" style="text-align:center;color:var(--n400);padding:22px;">No records match the selected filters.</td></tr>`);
            return;
        }

        const statusBadge = { passed: 'badge-green', failed: 'badge-danger', incomplete: 'badge-gray' };
        filtered.forEach(s => {
            tbody.append(`
                <tr>
                    <td><strong>${s.name}</strong></td>
                    <td><span class="badge badge-blue">${s.studentId}</span></td>
                    <td>${s.section ? `<span class="badge badge-purple">${s.section}</span>` : '—'}</td>
                    <td>${s.enrolledCourses.length}</td>
                    <td><strong>${s.avg !== null ? s.avg : '—'}</strong></td>
                    <td>${s.attd !== null ? s.attd + '%' : '—'}</td>
                    <td><span class="badge ${statusBadge[s.status]}">${s.status.toUpperCase()}</span></td>
                </tr>`);
        });
    }

    renderAll() {
        this.renderStudents();
        this.renderTeachers();
        this.renderSections();
        this.renderCourses();
        this.renderDashboard();
    }
}

// ── BOOT ──────────────────────────────────────────────────────
$(document).ready(() => {
    window.app = new App();
});
