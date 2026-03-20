// Handles saving and loading data from localStorage
class StorageManager {
    constructor(key) { this.key = key; }

    // Loads and parses stored data, returns empty array if nothing found
    load() {
        const data = localStorage.getItem(this.key);
        return data ? JSON.parse(data) : [];
    }

    // Serializes and saves data to localStorage
    save(data) { localStorage.setItem(this.key, JSON.stringify(data)); }
}

// Handles all form field validation rules and UI feedback
class Validator {
    // Validation rules for each form field
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

    // Runs all rules for a field and shows error or success message
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

    // Validates all student form fields, including duplicate checks
    static validateStudent(name, email, id, students) {
        const dupEmail = v => students.some(s => s.email.toLowerCase() === v.toLowerCase()) ? 'Email already registered.' : null;
        const dupId    = v => students.some(s => s.studentId.toLowerCase() === v.toLowerCase()) ? 'Student ID already exists.' : null;
        const ok = [
            this.validateField('stuName', name, null),
            this.validateField('stuEmail', email, dupEmail),
            this.validateField('stuId', id, dupId)
        ];
        // Shake animation on invalid fields
        ok.forEach((valid, i) => {
            if (!valid) {
                const ids = ['stuName', 'stuEmail', 'stuId'];
                $(`#${ids[i]}`).addClass('shake');
                setTimeout(() => $(`#${ids[i]}`).removeClass('shake'), 400);
            }
        });
        return ok.every(Boolean);
    }

    // Validates all teacher form fields, including duplicate checks
    static validateTeacher(name, email, id, teachers) {
        const dupEmail = v => teachers.some(t => t.email.toLowerCase() === v.toLowerCase()) ? 'Email already registered.' : null;
        const dupId    = v => teachers.some(t => t.employeeId.toLowerCase() === v.toLowerCase()) ? 'Employee ID already exists.' : null;
        const ok = [
            this.validateField('tchName', name, null),
            this.validateField('tchEmail', email, dupEmail),
            this.validateField('tchId', id, dupId)
        ];
        // Shake animation on invalid fields
        ok.forEach((valid, i) => {
            if (!valid) {
                const ids = ['tchName', 'tchEmail', 'tchId'];
                $(`#${ids[i]}`).addClass('shake');
                setTimeout(() => $(`#${ids[i]}`).removeClass('shake'), 400);
            }
        });
        return ok.every(Boolean);
    }

    // Marks a field as invalid and shows an error message
    static setInvalid(input, msgEl, msg) {
        input.removeClass('field-valid').addClass('field-invalid');
        msgEl.text(msg).removeClass('field-msg-valid').addClass('field-msg-error').show();
    }

    // Marks a field as valid and shows a success message
    static setValid(input, msgEl) {
        input.removeClass('field-invalid').addClass('field-valid');
        msgEl.text('✓ Looks good').removeClass('field-msg-error').addClass('field-msg-valid').show();
    }

    // Resets a single field's validation state
    static clearField(fieldId) {
        $(`#${fieldId}`).removeClass('field-valid field-invalid');
        $(`#${fieldId}-msg`).hide().text('').removeClass('field-msg-error field-msg-valid');
    }

    // Clears validation state for a list of fields
    static clearAll(fields) {
        fields.forEach(id => this.clearField(id));
    }
}

// Represents a single student record
class Student {
    constructor(name, email, id, section = '', courses = []) {
        this.name = name;
        this.email = email;
        this.studentId = id;
        this.section = section;
        this.enrolledCourses = courses; // Array of course codes the student is enrolled in
    }
}

// Manages student records: adding, editing, deleting, and enrolling in courses
class StudentManager {
    constructor() {
        this.repo = new StorageManager("pnc_students");
        // Load saved students and rebuild Student instances from plain objects
        this.students = this.repo.load().map(s => new Student(s.name, s.email, s.studentId, s.section || '', s.enrolledCourses));
    }

    // Reads form inputs, validates, then adds a new student
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

    // Enrolls a student in a course by index if not already enrolled
    enroll(idx, code) {
        if (!code) return;
        if (!this.students[idx].enrolledCourses.includes(code)) {
            this.students[idx].enrolledCourses.push(code);
            this.repo.save(this.students);
            app.renderAll();
            app.logActivity(`Enrolled <strong>${this.students[idx].name}</strong> in <strong>${code}</strong>`, 'blue');
        }
    }

    // Opens prompts to edit a student's name, email, and enrolled courses
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

    // Confirms then permanently removes a student record
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

// Represents a single teacher record
class Teacher {
    constructor(name, email, id, dept = '') {
        this.name = name;
        this.email = email;
        this.employeeId = id;
        this.department = dept;
    }
}

// Manages teacher records: adding and deleting
class TeacherManager {
    constructor() {
        this.repo = new StorageManager("pnc_teachers");
        // Load saved teachers and rebuild Teacher instances from plain objects
        this.teachers = this.repo.load().map(t => new Teacher(t.name, t.email, t.employeeId, t.department));
    }

    // Reads form inputs, validates, then adds a new teacher
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

    // Confirms then permanently removes a teacher record
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

// Represents a single class section
class Section {
    constructor(name, year, teacherId) {
        this.name = name;
        this.year = year;
        this.teacherId = teacherId; // Employee ID of the assigned teacher
    }
}

// Manages class sections: creating, deleting, and assigning teachers
class SectionManager {
    constructor() {
        this.repo = new StorageManager("pnc_sections");
        this.sections = this.repo.load().map(s => new Section(s.name, s.year, s.teacherId));
        this.seedDefaults(); // Pre-populate default sections on first load
    }

    // Creates default sections for all programs, year levels, and blocks if not yet seeded
    seedDefaults() {
        const SEED_VERSION = 'v3';
        const seeded = localStorage.getItem('pnc_sections_seeded');
        if (seeded === SEED_VERSION) return;

        this.sections = [];
        const programs = ['IT','CS','IS'];
        const years    = ['1st Year','2nd Year','3rd Year','4th Year'];
        const blocks   = ['A','B','C'];

        years.forEach((yr, yi) => {
            const yNum = yi + 1;
            programs.forEach(prog => {
                blocks.forEach(blk => {
                    this.sections.push(new Section(`${yNum}${prog}-${blk}`, yr, ''));
                });
            });
        });

        this.repo.save(this.sections);
        localStorage.setItem('pnc_sections_seeded', SEED_VERSION);
    }

    // Reads form inputs and adds a new section if the name is unique
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

    // Confirms then permanently removes a section
    delete(idx) {
        if (confirm("Delete this section?")) {
            const name = this.sections[idx].name;
            this.sections.splice(idx, 1);
            this.repo.save(this.sections);
            app.renderAll();
            app.logActivity(`Deleted section <strong>${name}</strong>`, 'red');
        }
    }

    // Assigns a teacher to a section by their employee ID
    assignTeacher(idx, teacherId) {
        this.sections[idx].teacherId = teacherId;
        this.repo.save(this.sections);
        const t = app.teacherManager.teachers.find(t => t.employeeId === teacherId);
        app.logActivity(`Assigned <strong>${t ? t.name : 'teacher'}</strong> to <strong>${this.sections[idx].name}</strong>`, 'blue');
        app.renderSections();
    }
}

// Represents a single course/subject
class Course { constructor(name, code, units = 3) { this.name = name; this.code = code; this.units = units; } }

// Manages courses/subjects: adding, deleting, and removing students from them
class CourseManager {
    constructor() {
        this.repo = new StorageManager("pnc_courses");
        this.courses = this.repo.load().map(c => new Course(c.name, c.code, c.units || 3));
    }

    // Reads form inputs and adds a new course if the code is unique
    add() {
        const n = $('#crsName').val().trim();
        const c = $('#crsCode').val().trim().toUpperCase();
        const u = parseInt($('#crsUnits').val()) || 3;
        if (!n || !c) return alert("Please fill in both fields.");
        if (this.courses.some(x => x.code === c)) return alert("Subject code already exists.");
        this.courses.push(new Course(n, c, u));
        this.repo.save(this.courses);
        app.renderAll();
        $('#crsName, #crsCode').val('');
        app.logActivity(`Created subject <strong>${c}: ${n}</strong>`, 'blue');
    }

    // Deletes a course and unenrolls all students from it
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

    // Prompts the admin to remove a specific student from a course
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

// Manages grade records and attendance tracking per student per course
class GradesManager {
    constructor() {
        this.repo = new StorageManager("pnc_grades");
        this.records = this.repo.load(); // Each record holds grades and attendance for one student-course pair
    }

    // Finds and returns a grade record for a specific student and course
    getRecord(studentId, courseCode) {
        return this.records.find(r => r.studentId === studentId && r.courseCode === courseCode) || null;
    }

    // Loads grade and attendance data into the form for the selected student and course
    load() {
        const stuId   = $('#gradeStudentSelect').val();
        const crsCode = $('#gradeSubjectSelect').val();
        if (!stuId || !crsCode) return alert("Please select both a student and a subject.");

        const stu = app.studentManager.students.find(s => s.studentId === stuId);
        const crs = app.courseManager.courses.find(c => c.code === crsCode);
        if (!stu || !crs) return;

        const rec = this.getRecord(stuId, crsCode);

        $('#gradeStudentInfo').html(`
            <strong>${stu.name}</strong> &nbsp;<span class="badge badge-blue">${stu.studentId}</span>
            &nbsp;|&nbsp; Subject: <strong>${crs.code} — ${crs.name}</strong>
        `);

        $('#gradePrelim').val(rec ? rec.prelim : '');
        $('#gradeMidterm').val(rec ? rec.midterm : '');
        $('#gradeFinals').val(rec ? rec.finals : '');
        this.updateComputed();

        const today = new Date().toISOString().split('T')[0];
        $('#attendDate').val(today);

        this.renderAttendance(rec);

        $('#gradeRecordArea').show();
        $('#gradeEmptyState').hide();

        // Recompute the grade average whenever any grade input changes
        $('#gradePrelim, #gradeMidterm, #gradeFinals').off('input').on('input', () => this.updateComputed());
    }

    // Computes and displays the average of prelim, midterm, and finals grades
    updateComputed() {
        const p = parseFloat($('#gradePrelim').val());
        const m = parseFloat($('#gradeMidterm').val());
        const f = parseFloat($('#gradeFinals').val());
        const box = $('#computedGrade');
        if (!isNaN(p) && !isNaN(m) && !isNaN(f)) {
            const avg = ((p + m + f) / 3).toFixed(2);
            const threshold = parseFloat($('#passThreshold').val()) || 75;
            const passed = parseFloat(avg) >= threshold;
            // Green if passing, red if failing
            box.text(avg).css('color', passed ? 'var(--green-mid)' : 'var(--danger)');
        } else {
            box.text('—').css('color', 'var(--n500)');
        }
    }

    // Saves or updates the grade record for the currently loaded student and course
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
            // Update existing record
            rec.prelim = p; rec.midterm = m; rec.finals = f;
        } else {
            // Create a new record if none exists
            rec = { studentId: stuId, courseCode: crsCode, prelim: p, midterm: m, finals: f, attendance: [] };
            this.records.push(rec);
        }
        this.repo.save(this.records);
        this.updateComputed();
        const stu = app.studentManager.students.find(s => s.studentId === stuId);
        app.logActivity(`Saved grades for <strong>${stu ? stu.name : stuId}</strong> — ${crsCode}`, 'gold');
        alert("Grade saved successfully!");
    }

    // Adds a new attendance entry for the selected date, preventing duplicates
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
            // Create a grade record shell if it doesn't exist yet
            rec = { studentId: stuId, courseCode: crsCode, prelim: null, midterm: null, finals: null, attendance: [] };
            this.records.push(rec);
        }
        if (rec.attendance.some(a => a.date === date)) {
            if (!confirm("Attendance for this date already exists. Overwrite?")) return;
            rec.attendance = rec.attendance.filter(a => a.date !== date);
        }
        rec.attendance.push({ date, status, remarks });
        rec.attendance.sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort newest first
        this.repo.save(this.records);
        this.renderAttendance(rec);
        $('#attendRemarks').val('');
        app.logActivity(`Logged attendance for <strong>${stuId}</strong> — ${date}: ${status}`, 'blue');
    }

    // Renders the attendance list and summary stats for a given grade record
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
        const pct     = Math.round(((present + late) / total) * 100); // Attendance percentage
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

    // Removes a single attendance entry by index and re-renders the list
    deleteAttendance(stuId, crsCode, idx) {
        const rec = this.getRecord(stuId, crsCode);
        if (rec) {
            rec.attendance.splice(idx, 1);
            this.repo.save(this.records);
            this.renderAttendance(rec);
        }
    }

    // Returns the overall average grade across all subjects for a student
    getStudentAvgGrade(studentId) {
        const recs = this.records.filter(r => r.studentId === studentId && r.prelim !== null);
        if (!recs.length) return null;
        const avg = recs.reduce((sum, r) => sum + (r.prelim + r.midterm + r.finals) / 3, 0) / recs.length;
        return avg.toFixed(2);
    }

    // Returns the overall attendance percentage across all subjects for a student
    getStudentAttendancePct(studentId) {
        const recs = this.records.filter(r => r.studentId === studentId);
        const allAttend = recs.flatMap(r => r.attendance || []);
        if (!allAttend.length) return null;
        const attended = allAttend.filter(a => a.status === 'present' || a.status === 'late').length;
        return Math.round((attended / allAttend.length) * 100);
    }
}

// Main application controller — initializes all managers and drives the UI
class App {
    constructor() {
        this.studentManager = new StudentManager();
        this.teacherManager = new TeacherManager();
        this.sectionManager = new SectionManager();
        this.courseManager  = new CourseManager();
        this.gradesManager  = new GradesManager();
        this.activityLog    = []; // Tracks recent user actions for the dashboard feed
        this.init();
    }

    // Redirects to login if no active session is found
    checkSession() {
        const session = JSON.parse(sessionStorage.getItem('pnc_session') || 'null');
        if (!session) { window.location.href = 'login.html'; return null; }
        return session;
    }

    // Updates the sidebar with the logged-in user's name, role, and avatar
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

    // Restricts navigation and data visibility based on the user's role
    applyRoleAccess(session) {
        const role = session.role;

        // Pages each role is allowed to access
        const access = {
            admin:   ['dashboard','students','teachers','sections','courses','grades','reports','settings'],
            teacher: ['dashboard','students','sections','courses','grades','reports'],
            student: ['dashboard','grades','reports']
        };
        const allowed = access[role] || ['dashboard'];

        // Hide nav links the current role cannot access
        $('.nav-link[data-page]').each(function() {
            const page = $(this).data('page');
            $(this).toggle(allowed.includes(page));
        });

        // Wrap navigateTo to block unauthorized page access
        const self = this;
        const originalNavigate = this.navigateTo.bind(this);
        this.navigateTo = function(page) {
            if (!allowed.includes(page)) {
                originalNavigate('dashboard');
                return;
            }
            originalNavigate(page);
        };

        $('body').addClass(`role-${role}`);

        // Store the student's own ID to filter their data view
        if (role === 'student') {
            this._studentFilter = session.refId;
        }
    }

    // Clears the session and redirects to the login page
    logout() {
        if (confirm('Are you sure you want to sign out?')) {
            sessionStorage.removeItem('pnc_session');
            window.location.href = 'login.html';
        }
    }

    // Sets up event listeners, renders the UI, and navigates to the dashboard
    init() {
        const session = this.checkSession();
        if (!session) return;
        this.renderSessionUI(session);
        this.applyRoleAccess(session);

        // Navigation click handler
        $('.nav-link[data-page]').on('click', (e) => {
            this.navigateTo($(e.currentTarget).data('page'));
        });

        // Live search and filter listeners
        $('#stuSearch, #stuField').on('input change', () => this.renderStudents());
        $('#secSearch, #secYearFilter, #secProgFilter').on('input change', () => this.renderSections());
        $('#crsSearch').on('input', () => this.renderCourses());
        $('#rptSectionFilter, #rptStatusFilter').on('change', () => this.renderPerformanceTable());
        $('#crsSearch').on('input', () => this.renderCourses());
        $('#tchSearch').on('input', () => this.renderTeachers());
        $('#rptSectionFilter, #rptStatusFilter').on('change', () => this.renderPerformanceTable());

        // Real-time validation for student fields
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

        // Real-time validation for teacher fields
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

        // Display today's date in the top navigation bar
        const now = new Date();
        $('#topnavDate').text(now.toLocaleDateString('en-PH', {
            weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
        }));

        this.renderAll();
        this.navigateTo('dashboard');
    }

    // Switches the active page view and updates the breadcrumb
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

    // Adds an entry to the activity feed and keeps only the 10 most recent
    logActivity(html, type = 'green') {
        const timeLabels = ['Just now', '1m ago', '3m ago', '7m ago', '12m ago', '20m ago'];
        this.activityLog.unshift({ html, type, time: 'Just now' });
        this.activityLog.forEach((e, i) => { if (i > 0) e.time = timeLabels[Math.min(i, timeLabels.length - 1)]; });
        if (this.activityLog.length > 10) this.activityLog.pop();
        this.renderActivity();
    }

    // Populates the grade form dropdowns filtered by the user's role
    populateGradeSelects() {
        const session = this.checkSession();
        const role    = session ? session.role : 'student';

        const stuSel = $('#gradeStudentSelect').empty().append('<option value="">— Select Student —</option>');

        let students = this.studentManager.students;
        // Students only see themselves; teachers only see students in their sections
        if (role === 'student') {
            students = students.filter(s => s.studentId === session.refId);
        } else if (role === 'teacher') {
            const mySections = this.sectionManager.sections
                .filter(sec => sec.teacherId === session.refId)
                .map(sec => sec.name);
            if (mySections.length > 0) {
                students = students.filter(s => mySections.includes(s.section));
            }
        }

        students.forEach(s => stuSel.append(`<option value="${s.studentId}">${s.name} (${s.studentId})</option>`));

        const crseSel = $('#gradeSubjectSelect').empty().append('<option value="">— Select Subject —</option>');
        this.courseManager.courses.forEach(c => crseSel.append(`<option value="${c.code}">${c.code} — ${c.name}</option>`));

        $('#gradeRecordArea').hide();
        $('#gradeEmptyState').show();
    }

    // Renders summary stats and the recent students table on the dashboard
    renderDashboard() {
        const students = this.studentManager.students;
        const teachers = this.teacherManager.teachers;
        const sections = this.sectionManager.sections;
        const courses  = this.courseManager.courses;

        // Update count badges
        $('#dashStudents').text(students.length);
        $('#dashTeachers').text(teachers.length);
        $('#dashSections').text(sections.length);
        $('#dashCourses').text(courses.length);

        const tbody = $('#recentStudentsBody').empty();
        const recent = [...students].slice(-5).reverse(); // Show the 5 most recently added students
        if (!recent.length) {
            tbody.append(`<tr><td colspan="4" style="text-align:center;color:var(--n400);padding:22px 0;">No students yet.</td></tr>`);
        } else {
            recent.forEach(s => {
                const avg = this.gradesManager.getStudentAvgGrade(s.studentId);
                const threshold = parseFloat($('#passThreshold').val()) || 75;
                const gradeLabel = avg
                    ? `<span class="badge ${parseFloat(avg) >= threshold ? 'badge-green' : 'badge-danger'}">${avg}</span>`
                    : `<span class="badge badge-gray">N/A</span>`;
                const status = avg === null
                    ? `<span class="badge badge-gray">No grades</span>`
                    : parseFloat(avg) >= threshold
                        ? `<span class="badge badge-green">Passing</span>`
                        : `<span class="badge badge-danger">Failing</span>`;
                const secObj = this.sectionManager.sections.find(sec => sec.name === s.section);
                const secDisplay = s.section
                    ? `<span class="badge badge-purple">${s.section}</span><br><span style="font-size:0.68rem;color:var(--n500);">${secObj ? secObj.year : ''}</span>`
                    : '<span class="badge badge-gray">—</span>';
                tbody.append(`
                    <tr>
                        <td><strong>${s.name}</strong><br><span class="badge badge-blue" style="font-size:0.65rem;">${s.studentId}</span></td>
                        <td>${secDisplay}</td>
                        <td>${gradeLabel}</td>
                        <td>${status}</td>
                    </tr>`);
            });
        }
        this.renderActivity();
    }

    // Renders the recent activity feed on the dashboard
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

    // Renders the filtered and searchable list of students
    renderStudents() {
        const query     = $('#stuSearch').val().toLowerCase();
        const field     = $('#stuField').val();
        const container = $('#studentList').empty();
        const session   = this.checkSession();
        const role      = session ? session.role : 'student';

        let students = this.studentManager.students;
        // Filter visible students based on role
        if (role === 'student') {
            students = students.filter(s => s.studentId === session.refId);
        } else if (role === 'teacher') {
            const mySections = this.sectionManager.sections
                .filter(sec => sec.teacherId === session.refId)
                .map(sec => sec.name);
            if (mySections.length > 0) {
                students = students.filter(s => mySections.includes(s.section));
            }
        }

        const filtered = students.filter(s => {
            if (field === "name")      return s.name.toLowerCase().includes(query);
            if (field === "studentId") return s.studentId.toLowerCase().includes(query);
            if (field === "section")   return (s.section || '').toLowerCase().includes(query);
            return s.name.toLowerCase().includes(query) || s.studentId.toLowerCase().includes(query) || (s.section || '').toLowerCase().includes(query);
        });

        $('#studentCount').text(`${filtered.length} student(s)`);
        $('#sidebarStudentBadge').text(this.studentManager.students.length);

        const secSel = $('#stuSection').empty().append('<option value="">— Select Section —</option>');
        this.sectionManager.sections.forEach(s => secSel.append(`<option value="${s.name}">${s.name} (${s.year})</option>`));

        if (!filtered.length) {
            container.append(`<div class="empty-state"><div class="empty-icon">🔍</div><p>No students found.</p></div>`);
            return;
        }

        const isAdmin   = role === 'admin';
        const isTeacher = role === 'teacher';

        // Builds a student card with enroll/edit/delete controls based on role
        const renderCard = (s) => {
            const realIdx    = this.studentManager.students.indexOf(s);
            const options    = this.courseManager.courses.map(c => `<option value="${c.code}">${c.name} (${c.code})</option>`).join('');
            const courseTags = s.enrolledCourses.length
                ? s.enrolledCourses.map(c => `<span class="badge badge-gold">${c}</span>`).join('')
                : `<span class="badge badge-gray">No subjects</span>`;
            const secTag   = s.section ? `<span class="badge badge-purple">${s.section}</span>` : '';
            const avg      = this.gradesManager.getStudentAvgGrade(s.studentId);
            const gradeTag = avg ? `<span class="badge badge-blue">Avg: ${avg}</span>` : '';
            const actions  = isAdmin ? `
                <button class="btn-edit" onclick="app.studentManager.edit(${realIdx})">✏️ Edit</button>
                <button class="btn-delete" onclick="app.studentManager.delete(${realIdx})">🗑 Delete</button>` : '';
            const enrollRow = isAdmin ? `
                <select onchange="app.studentManager.enroll(${realIdx}, this.value)">
                    <option value="">＋ Enroll in a subject</option>${options}
                </select>` : '';
            return `<div class="data-item">
                <div class="item-left">
                    <strong>${s.name} <span class="badge badge-blue">${s.studentId}</span> ${isAdmin ? secTag : ''} ${gradeTag}</strong>
                    <small>${s.email}</small>
                    <div class="tags-row">${courseTags}</div>
                    ${enrollRow}
                </div>
                <div class="item-actions">${actions}</div>
            </div>`;
        };

        // Teachers see students grouped by section
        if (isTeacher) {
            const grouped = {};
            filtered.forEach(s => {
                const key = s.section || '— No Section —';
                if (!grouped[key]) grouped[key] = [];
                grouped[key].push(s);
            });

            Object.keys(grouped).sort().forEach(secName => {
                const secObj   = this.sectionManager.sections.find(sec => sec.name === secName);
                const stuCount = grouped[secName].length;
                container.append(`
                    <div class="section-group-card">
                        <div class="section-group-head">
                            <div>
                                <span class="section-group-title">${secName}</span>
                                <span class="badge badge-purple" style="margin-left:8px;">${secObj ? secObj.year : ''}</span>
                            </div>
                            <span class="badge badge-green">${stuCount} student(s)</span>
                        </div>
                        <div class="section-group-body">
                            ${grouped[secName].map(s => renderCard(s)).join('')}
                        </div>
                    </div>`);
            });
        } else {
            filtered.forEach(s => container.append(renderCard(s)));
        }
    }

    // Renders the filtered list of teachers and updates the section teacher dropdown
    renderTeachers() {
        const query = ($('#tchSearch').val() || '').toLowerCase();
        const container = $('#teacherList').empty();
        $('#sidebarTeacherBadge').text(this.teacherManager.teachers.length);
        $('#teacherCount').text(`${this.teacherManager.teachers.length} teacher(s)`);

        // Rebuild the teacher dropdown used in the sections form
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

    // Renders the filtered and searchable list of sections
    renderSections() {
        const query      = ($('#secSearch').val() || '').toLowerCase();
        const yearFilter = $('#secYearFilter').val() || 'all';
        const progFilter = $('#secProgFilter').val() || 'all';
        const container  = $('#sectionList').empty();
        const session    = this.checkSession();
        const role       = session ? session.role : 'admin';
        const isAdmin    = role === 'admin';

        $('#sidebarSectionBadge').text(this.sectionManager.sections.length);

        let sections = this.sectionManager.sections;
        // Teachers only see their own assigned sections
        if (role === 'teacher') {
            sections = sections.filter(s => s.teacherId === session.refId);
        }

        let filtered = sections.filter(s => {
            const matchQuery = s.name.toLowerCase().includes(query);
            const matchYear  = yearFilter === 'all' || s.year === yearFilter;
            const matchProg  = progFilter === 'all' || s.name.toUpperCase().includes(progFilter);
            return matchQuery && matchYear && matchProg;
        });
        $('#sectionCount').text(`${filtered.length} section(s)`);

        if (!filtered.length) {
            container.append(`<div class="empty-state"><div class="empty-icon">🏫</div><p>No sections ${role === 'teacher' ? 'assigned to you' : 'match your filter'}.</p></div>`);
            return;
        }

        const tchOptions = this.teacherManager.teachers.map(t =>
            `<option value="${t.employeeId}">${t.name} (${t.employeeId})</option>`).join('');

        filtered.forEach(s => {
            const realIdx  = this.sectionManager.sections.indexOf(s);
            const teacher  = this.teacherManager.teachers.find(t => t.employeeId === s.teacherId);
            const stuCount = this.studentManager.students.filter(st => st.section === s.name).length;

            // Admins get a teacher assignment dropdown; others just see the teacher name
            const teacherCell = isAdmin
                ? `<div style="display:flex;align-items:center;gap:6px;flex:1;min-width:200px;">
                       <span style="font-size:0.76rem;color:var(--n600);white-space:nowrap;">Assign Teacher:</span>
                       <select onchange="app.sectionManager.assignTeacher(${realIdx}, this.value)"
                           style="flex:1;font-size:0.78rem;padding:4px 8px;">
                           <option value="">— Unassigned —</option>
                           ${tchOptions}
                       </select>
                   </div>`
                : `<span style="font-size:0.78rem;color:var(--n600);">👨‍🏫 ${teacher ? teacher.name : '<em>Unassigned</em>'}</span>`;

            container.append(`
                <div class="data-item">
                    <div class="item-left" style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
                        <div>
                            <strong>${s.name} <span class="badge badge-purple">${s.year}</span></strong>
                            <small>${stuCount} student(s)</small>
                        </div>
                        ${teacherCell}
                    </div>
                    <div class="item-actions">
                        <span class="badge ${teacher ? 'badge-green' : 'badge-gray'}" style="font-size:0.7rem;">
                            ${teacher ? '✓ ' + teacher.name : 'No teacher'}
                        </span>
                    </div>
                </div>`);
            if (isAdmin) container.find('select').last().val(s.teacherId || '');
        });
    }

    // Renders the filtered list of courses/subjects
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
                            <strong>${c.name} <span class="badge badge-blue">${c.units || 3} unit(s)</span></strong>
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

    // Renders the full reports page with enrollment stats, grade summaries, and chart bars
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

        // Update report stat cards
        $('#rptTotalStudents').text(total);
        $('#rptTotalTeachers').text(teachers.length);
        $('#rptTotalCourses').text(courses.length);
        $('#rptTotalEnr').text(totalEnr);
        $('#rptAvgLoad').text(avg);
        $('#rptFullLoad').text(fullLoad);
        $('#rptNoEnr').text(noEnr);
        $('#rptWithGrades').text(gradesRecorded);
        $('#rptClassAvg').text(classAvg);

        // Populate the section filter dropdown
        const secFilter = $('#rptSectionFilter').empty().append('<option value="all">All Sections</option>');
        this.sectionManager.sections.forEach(s => secFilter.append(`<option value="${s.name}">${s.name}</option>`));

        // Draw enrollment bar chart for each course
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
            // Animate bars after they're inserted into the DOM
            setTimeout(() => {
                barsContainer.find('.progress-bar').each(function(i) { $(this).css('width', targets[i] + '%'); });
            }, 80);
        }

        this.renderPerformanceTable();
    }

    // Renders the student performance table with grade averages, attendance, and pass/fail status
    renderPerformanceTable() {
        const students  = this.studentManager.students;
        const secFilter = $('#rptSectionFilter').val() || 'all';
        const stsFilter = $('#rptStatusFilter').val() || 'all';
        const threshold = parseFloat($('#passThreshold').val()) || 75;
        const tbody     = $('#performanceBody').empty();

        let filtered = students;
        if (secFilter !== 'all') filtered = filtered.filter(s => s.section === secFilter);

        // Compute per-term averages and overall status for each student
        filtered = filtered.map(s => {
            const records = s.enrolledCourses.map(code => this.gradesManager.getRecord(s.studentId, code)).filter(Boolean);
            const prelims  = records.map(r => r.prelim).filter(v => v !== null && v !== undefined && v !== '');
            const midterms = records.map(r => r.midterm).filter(v => v !== null && v !== undefined && v !== '');
            const finals   = records.map(r => r.finals).filter(v => v !== null && v !== undefined && v !== '');
            const avgP = prelims.length  ? (prelims.reduce((a,b)=>a+parseFloat(b),0)/prelims.length).toFixed(1)   : null;
            const avgM = midterms.length ? (midterms.reduce((a,b)=>a+parseFloat(b),0)/midterms.length).toFixed(1) : null;
            const avgF = finals.length   ? (finals.reduce((a,b)=>a+parseFloat(b),0)/finals.length).toFixed(1)     : null;
            const avg  = this.gradesManager.getStudentAvgGrade(s.studentId);
            const attd = this.gradesManager.getStudentAttendancePct(s.studentId);
            let status;
            if (avg === null) status = 'incomplete';
            else if (parseFloat(avg) >= threshold) status = 'passed';
            else status = 'failed';
            return { ...s, avg, avgP, avgM, avgF, attd, status };
        });

        if (stsFilter !== 'all') filtered = filtered.filter(s => s.status === stsFilter);

        const passed = filtered.filter(s => s.status === 'passed').length;
        const failed = filtered.filter(s => s.status === 'failed').length;
        $('#rptPassed').text(passed); $('#rptFailed').text(failed);

        if (!filtered.length) {
            tbody.append(`<tr><td colspan="10" style="text-align:center;color:var(--n400);padding:22px;">No records match the selected filters.</td></tr>`);
            return;
        }

        const sb = { passed: 'badge-green', failed: 'badge-danger', incomplete: 'badge-gray' };
        filtered.forEach(s => {
            tbody.append(`
                <tr>
                    <td><strong>${s.name}</strong></td>
                    <td><span class="badge badge-blue">${s.studentId}</span></td>
                    <td>${s.section ? `<span class="badge badge-purple">${s.section}</span>` : '—'}</td>
                    <td>${s.enrolledCourses.length > 0 ? s.enrolledCourses.map(c=>`<span class="badge badge-gold">${c}</span>`).join(' ') : '—'}</td>
                    <td>${s.avgP !== null ? s.avgP : '—'}</td>
                    <td>${s.avgM !== null ? s.avgM : '—'}</td>
                    <td>${s.avgF !== null ? s.avgF : '—'}</td>
                    <td><strong>${s.avg !== null ? s.avg : '—'}</strong></td>
                    <td>${s.attd !== null ? s.attd + '%' : '—'}</td>
                    <td><span class="badge ${sb[s.status]}">${s.status.toUpperCase()}</span></td>
                </tr>`);
        });
    }

    // Triggers the browser's print dialog for the current report view
    printReport() {
        window.print();
    }

    // Re-renders all page sections and updates sidebar badges
    renderAll() {
        this.renderStudents();
        this.renderTeachers();
        this.renderSections();
        this.renderCourses();
        this.renderDashboard();
        const s = this.checkSession();
        if (s) $('#settingsUser').text(`${s.name} (${s.role})`);
    }
}

// Initialize the app once the DOM is fully loaded
$(document).ready(() => {
    window.app = new App();
});
