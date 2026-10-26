-- Enable foreign key constraint support in SQLite
PRAGMA foreign_keys = ON;

-- ============================================================
-- 1. TABLE DEFINITIONS
-- ============================================================

-- Students Table
CREATE TABLE students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE
);

-- Courses Table
CREATE TABLE courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL
);

-- Enrolments Table (Join table for students and courses, storing grade)
CREATE TABLE enrolments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    grade TEXT,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    CONSTRAINT unique_student_course UNIQUE (student_id, course_id)
);

-- ============================================================
-- 2. SAMPLE DATA INSERTIONS
-- ============================================================

-- Insert Students (4 students: includes one who will have no enrolments)
INSERT INTO students (name, email) VALUES
    ('Alice Smith', 'alice.smith@example.com'),
    ('Bob Jones', 'bob.jones@example.com'),
    ('Charlie Brown', 'charlie.brown@example.com'),
    ('Diana Prince', 'diana.prince@example.com');

-- Insert Courses (3 courses)
INSERT INTO courses (code, title) VALUES
    ('CS101', 'Introduction to Computer Science'),
    ('MATH201', 'Linear Algebra'),
    ('ENG150', 'Technical Writing');

-- Insert Enrolments (5 enrolments across students and courses)
-- Note: Diana Prince (id 4) is intentionally left with no enrolments
INSERT INTO enrolments (student_id, course_id, grade) VALUES
    (1, 1, 'A'),   -- Alice in CS101
    (1, 2, 'B+'),  -- Alice in MATH201
    (2, 1, 'B'),   -- Bob in CS101
    (2, 3, 'A-'),  -- Bob in ENG150
    (3, 2, 'C');   -- Charlie in MATH201

-- ============================================================
-- 3. QUERIES
-- ============================================================

-- Query 1: All courses for one student (by name)
SELECT
    s.name AS student_name,
    c.code AS course_code,
    c.title AS course_title,
    e.grade
FROM students s
JOIN enrolments e ON s.id = e.student_id
JOIN courses c ON e.course_id = c.id
WHERE s.name = 'Alice Smith';

-- Query 2: All students on one course (by course code/title)
SELECT
    c.code AS course_code,
    c.title AS course_title,
    s.name AS student_name,
    s.email AS student_email,
    e.grade
FROM courses c
JOIN enrolments e ON c.id = e.course_id
JOIN students s ON e.student_id = s.id
WHERE c.code = 'CS101';

-- Query 3: The number of students per course (including courses with 0 students)
SELECT
    c.code AS course_code,
    c.title AS course_title,
    COUNT(e.student_id) AS student_count
FROM courses c
LEFT JOIN enrolments e ON c.id = e.course_id
GROUP BY c.id, c.code, c.title
ORDER BY student_count DESC, c.code ASC;

-- Query 4: Students who have no enrolments
SELECT
    s.id AS student_id,
    s.name AS student_name,
    s.email AS student_email
FROM students s
LEFT JOIN enrolments e ON s.id = e.student_id
WHERE e.id IS NULL;

-- Query 5: Update of one enrolment's grade
UPDATE enrolments
SET grade = 'A+'
WHERE student_id = 3 AND course_id = 2;

-- Verify Query 5 update result
SELECT
    s.name AS student_name,
    c.code AS course_code,
    e.grade AS updated_grade
FROM enrolments e
JOIN students s ON e.student_id = s.id
JOIN courses c ON e.course_id = c.id
WHERE s.name = 'Charlie Brown' AND c.code = 'MATH201';
