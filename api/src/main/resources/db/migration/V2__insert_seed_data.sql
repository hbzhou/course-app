-- Baseline data (roles + permissions + an admin user)

INSERT INTO role (name) VALUES ('ROLE_ADMIN');
INSERT INTO role (name) VALUES ('ROLE_USER');

-- Permissions (fine-grained authorities)
INSERT INTO permission (name) VALUES ('COURSE_VIEW');
INSERT INTO permission (name) VALUES ('COURSE_EDIT');
INSERT INTO permission (name) VALUES ('USER_MANAGE');
INSERT INTO permission (name) VALUES ('ROLE_MANAGE');

-- role -> permission mapping
-- ROLE_USER: can view courses
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM role r
JOIN permission p ON p.name = 'COURSE_VIEW'
WHERE r.name = 'ROLE_USER';

-- ROLE_ADMIN: gets all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM role r
JOIN permission p ON p.name IN ('COURSE_VIEW', 'COURSE_EDIT', 'USER_MANAGE', 'ROLE_MANAGE')
WHERE r.name = 'ROLE_ADMIN';

-- admin / admin123
-- BCrypt hash generated for 'admin123'
INSERT INTO users (username, email, password)
VALUES ('admin', 'admin@email.com', '$2a$10$KdoOdPYtcEkmP0bk4Y3r8ekFkNKh/92qCJeqOcIy8EwPOiYBsHhZm');

-- grant admin both roles
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
JOIN role r ON r.name IN ('ROLE_ADMIN', 'ROLE_USER')
WHERE u.email = 'admin@email.com';

-- Authors data
INSERT INTO author (name) VALUES ('author');
INSERT INTO author (name) VALUES ('author2');
INSERT INTO author (name) VALUES ('author3');
INSERT INTO author (name) VALUES ('author4');
INSERT INTO author (name) VALUES ('author5');
INSERT INTO author (name) VALUES ('author6');

-- Course data
INSERT INTO course (title, description, creation_date, duration)
VALUES ('title', 'description', '9/3/2021', 30);

-- Course-Author relationships
INSERT INTO course_authors (course_id, author_id)
SELECT c.id, a.id
FROM course c
JOIN author a ON a.name = 'author'
WHERE c.title = 'title';
