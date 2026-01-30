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
INSERT INTO author (id, name) VALUES ('9b87e8b8-6ba5-40fc-a439-c4e30a373d36', 'author');
INSERT INTO author (id, name) VALUES ('1c972c52-3198-4098-b6f7-799b45903199', 'author2');
INSERT INTO author (id, name) VALUES ('072fe3fc-e751-4745-9af5-aa9eed0ea9ed', 'author3');
INSERT INTO author (id, name) VALUES ('40b21bd5-cbae-4f33-b154-0252b1ae03a9', 'author4');
INSERT INTO author (id, name) VALUES ('5e0b0f18-32c9-4933-b142-50459b47f09e', 'author5');
INSERT INTO author (id, name) VALUES ('9987de6a-b475-484a-b885-622b8fb88bda', 'author6');

-- Course data
INSERT INTO course (id, title, description, creation_date, duration)
VALUES ('66cc289e-6de9-49b2-9ca7-8b4f409d6467', 'title', 'description', '9/3/2021', 30);

-- Course-Author relationships
INSERT INTO course_authors (course_id, author_id)
VALUES ('66cc289e-6de9-49b2-9ca7-8b4f409d6467', '9b87e8b8-6ba5-40fc-a439-c4e30a373d36');

