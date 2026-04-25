-- Author-domain permissions
INSERT INTO permission (name) VALUES ('AUTHOR_EDIT');

-- ROLE_ADMIN: gets author edit permission
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM role r
JOIN permission p ON p.name = 'AUTHOR_EDIT'
WHERE r.name = 'ROLE_ADMIN';
