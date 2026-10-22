CREATE DATABASE IF NOT EXISTS it_park CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE it_park;

-- Roles first (referenced by users)
CREATE TABLE roles (
  role_id INT AUTO_INCREMENT PRIMARY KEY,
  role_name VARCHAR(100) NOT NULL UNIQUE
);

-- Users
CREATE TABLE users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role_id INT NOT NULL,
  profile_picture VARCHAR(500) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (role_id) REFERENCES roles(role_id)
);

-- Categories (self-referencing hierarchy)
CREATE TABLE categories (
  category_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  parent_category_id INT NULL DEFAULT NULL,
  FOREIGN KEY (parent_category_id) REFERENCES categories(category_id) ON DELETE SET NULL
);

-- Content
CREATE TABLE content (
  content_id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  author VARCHAR(255),
  description TEXT,
  category_id INT NULL,
  content_creator VARCHAR(255),
  access_level ENUM('internaluser','externaluser') DEFAULT 'internaluser',
  status ENUM('active','archived','pending') DEFAULT 'active',
  view_count INT NOT NULL DEFAULT 0,
  download_count INT NOT NULL DEFAULT 0,
  preview_path VARCHAR(500),
  file_url VARCHAR(500),
  uploaded_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE SET NULL
);

-- Tags
CREATE TABLE tags (
  tag_id INT AUTO_INCREMENT PRIMARY KEY,
  tag_name VARCHAR(100) NOT NULL UNIQUE
);

-- Content ↔ Tag (many-to-many)
CREATE TABLE content_tag (
  content_id INT NOT NULL,
  tag_id INT NOT NULL,
  PRIMARY KEY (content_id, tag_id),
  FOREIGN KEY (content_id) REFERENCES content(content_id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(tag_id) ON DELETE CASCADE
);

-- User interactions with content (views/downloads)
CREATE TABLE content_user_interaction (
  interaction_id INT AUTO_INCREMENT PRIMARY KEY,
  content_id INT NOT NULL,
  user_id INT NOT NULL,
  interaction_type ENUM('view','download') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (content_id) REFERENCES content(content_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Password reset tokens (OTP)
CREATE TABLE password_reset (
  reset_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  reset_token VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Permissions
CREATE TABLE permissions (
  permission_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE
);

-- Role ↔ Permission (many-to-many)
CREATE TABLE role_permissions (
  role_id INT NOT NULL,
  permission_id INT NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(permission_id) ON DELETE CASCADE
);

-- Seed data — roles (matches role_id values in Login.jsx)
INSERT INTO roles (role_id, role_name) VALUES
  (3, 'internaluser'),
  (4, 'externaluser'),
  (5, 'admin'),
  (6, 'contentmanager');

-- Seed data — categories (from AddContents form)
INSERT INTO categories (name, parent_category_id) VALUES
  ('Videos', NULL),
  ('Articles', NULL),
  ('Documentaries', NULL),
  ('Research Papers', NULL),
  ('Tutorials', NULL),
  ('Scientific Papers', NULL),
  ('Blog Posts', NULL),
  ('News Articles', NULL),
  ('Case Studies', NULL);