# School Database System Design

This document describes the architectural design, table structures, relationship models, indexing strategy, and database paradigm evaluation for the School Enrollment System.

---

## 1. Table Explanations

The database model is composed of three core relational tables:

- **`students`**:
  - Represents individual learners registered in the institution.
  - Attributes: `id` (INTEGER PRIMARY KEY), `name` (TEXT NOT NULL), and `email` (TEXT NOT NULL UNIQUE).
  - Enforces entity uniqueness through email address validation.

- **`courses`**:
  - Represents academic subjects/classes available for registration.
  - Attributes: `id` (INTEGER PRIMARY KEY), `code` (TEXT NOT NULL UNIQUE, e.g., `CS101`), and `title` (TEXT NOT NULL).
  - Uniquely identifies course offerings by institutional code.

- **`enrolments`**:
  - Represents the academic event of a student enrolling into a course, serving as the bridge table.
  - Attributes: `id` (INTEGER PRIMARY KEY), `student_id` (INTEGER NOT NULL, foreign key to `students(id)`), `course_id` (INTEGER NOT NULL, foreign key to `courses(id)`), and `grade` (TEXT).
  - Enforces business integrity via composite constraint `UNIQUE (student_id, course_id)`, preventing double registrations.

---

## 2. Relationships & Join Table Necessity

### One-to-Many vs. Many-to-Many Relationships
- **Student to Enrolments (One-to-Many / 1:N)**: A single student can have multiple course enrolment records, but each enrolment record belongs to exactly one student.
- **Course to Enrolments (One-to-Many / 1:N)**: A single course can appear in multiple enrolment records as different students sign up, but each enrolment record links to only one course.
- **Students to Courses (Many-to-Many / M:N)**: A student can register for multiple courses throughout their academic career, and a single course can be taken by dozens or hundreds of students simultaneously.

### Why a Join Table is Needed
In a relational database, an M:N relationship cannot be represented cleanly within either the `students` or `courses` table alone without violating normalization rules (such as 1NF and 2NF). Storing a delimited list of course IDs inside a single student column prevents relational integrity, indexing, foreign keys, and efficient filtering. Conversely, duplicating student rows for each course creates massive data redundancy.

The `enrolments` join table decomposes the M:N relationship into two clean 1:N relationships (`students` 1:N `enrolments` and `courses` 1:N `enrolments`). Furthermore, it serves as an associative entity that holds relationship-specific metadata—in this case, the student's assigned `grade`.

---

## 3. Recommended Index & Rationale

**Index Recommendation:**
```sql
CREATE INDEX idx_enrolments_course_id ON enrolments(course_id);
```

**Reason:**
In the `enrolments` table, the composite unique constraint `UNIQUE (student_id, course_id)` automatically generates an underlying B-tree index on `(student_id, course_id)`. While this covers queries filtering by `student_id`, it cannot efficiently accelerate queries that filter or join primarily on `course_id` (such as listing all students in a given course or counting enrollments per course). Adding an explicit index on `enrolments(course_id)` eliminates full-table scans for course-centric joins and aggregates, optimizing performance to $O(\log N)$ as enrollment records scale into tens or hundreds of thousands.

---

## 4. SQL vs. NoSQL Paradigm Decision

For this school enrollment system, **SQL (Relational)** is overwhelmingly the superior architectural choice over NoSQL. Academic enrollment data is inherently structured, relational, and requires strict ACID transactional guarantees—such as ensuring grade updates, enrollment capacity limits, and registration events are atomic and never corrupted by partial writes. A relational schema enforces strong consistency via foreign keys and composite unique constraints (`UNIQUE (student_id, course_id)`), preventing duplicate enrollments at the database engine level. In contrast, a document-based NoSQL database would either require embedding courses within student documents (creating severe synchronization challenges when course titles or grades change) or embedding students within course documents (leading to unbounded document growth and duplication), making queries like "find students with no enrollments" or "calculate grade averages across departments" complex, inefficient, and prone to anomalies.
