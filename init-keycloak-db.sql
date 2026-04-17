-- Create Keycloak database if it doesn't exist
CREATE DATABASE IF NOT EXISTS keycloak CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- Grant privileges to the admin user
GRANT ALL PRIVILEGES ON keycloak.* TO 'admin'@'%';
FLUSH PRIVILEGES;
