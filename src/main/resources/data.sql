-- Baseline data (roles + an admin user)

INSERT INTO role (name) VALUES ('ROLE_ADMIN');
INSERT INTO role (name) VALUES ('ROLE_USER');

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

