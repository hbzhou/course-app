-- Tag-domain permissions
INSERT INTO permission (name) VALUES ('TAG_VIEW');
INSERT INTO permission (name) VALUES ('TAG_EDIT');

-- ROLE_USER: can view tags
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM role r
JOIN permission p ON p.name = 'TAG_VIEW'
WHERE r.name = 'ROLE_USER';

-- ROLE_ADMIN: gets all tag permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM role r
JOIN permission p ON p.name IN ('TAG_VIEW', 'TAG_EDIT')
WHERE r.name = 'ROLE_ADMIN';
