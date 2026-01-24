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
VALUES ('admin', 'admin@email.com', '$2a$10$9b8mLJ.2tRw2yGOSmZ6H2uT3r0lX0yvoOQnNj9VQ9vT1rLqgq6HkK');

-- grant admin both roles
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
JOIN role r ON r.name IN ('ROLE_ADMIN', 'ROLE_USER')
WHERE u.email = 'admin@email.com';
