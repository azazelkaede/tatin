CREATE DATABASE IF NOT EXISTS enrollment_system
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE enrollment_system;

-- Keep the existing Users table and its data. This is created only if absent.
CREATE TABLE IF NOT EXISTS Users (
  Access_ID VARCHAR(50) NOT NULL,
  Full_Name VARCHAR(100) NOT NULL,
  Course VARCHAR(50) NOT NULL,
  Year_Level INT NOT NULL,
  Age INT NOT NULL,
  Email VARCHAR(100) NULL,
  Location VARCHAR(100) NULL DEFAULT 'Iloilo Sector',
  Password_Hash VARCHAR(255) NOT NULL,
  Created_At TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (Access_ID)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS subjects (
  code VARCHAR(20) NOT NULL,
  description VARCHAR(160) NOT NULL,
  units TINYINT UNSIGNED NOT NULL,
  schedule VARCHAR(100) NOT NULL,
  PRIMARY KEY (code)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS enrollments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_access_id VARCHAR(50) NOT NULL,
  total_units TINYINT UNSIGNED NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_enrollments_student (student_access_id),
  CONSTRAINT fk_enrollments_user FOREIGN KEY (student_access_id) REFERENCES Users(Access_ID)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS enrollment_subjects (
  enrollment_id BIGINT UNSIGNED NOT NULL,
  subject_code VARCHAR(20) NOT NULL,
  PRIMARY KEY (enrollment_id, subject_code),
  CONSTRAINT fk_enrollment_subjects_enrollment FOREIGN KEY (enrollment_id) REFERENCES enrollments(id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_enrollment_subjects_subject FOREIGN KEY (subject_code) REFERENCES subjects(code)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS student_photos (
  student_access_id VARCHAR(50) NOT NULL,
  mime_type VARCHAR(30) NOT NULL,
  image_data MEDIUMBLOB NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (student_access_id),
  CONSTRAINT fk_student_photos_user FOREIGN KEY (student_access_id) REFERENCES Users(Access_ID)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

INSERT IGNORE INTO subjects (code, description, units, schedule) VALUES
  ('ITPD4', 'Software Engineering', 3, 'MWF 9:00-10:00 AM'),
  ('ITPC2', 'Database System', 3, 'TTH 1:00-2:30 PM'),
  ('ITPC6', 'Information Assurance and Security', 3, 'MWF 1:00-2:00 PM'),
  ('ITPD2', 'Design UI', 3, 'TTH 8:30-10:00 AM'),
  ('ITNET2', 'Networking 2', 3, 'MWF 3:00-4:30 PM'),
  ('ITNET4', 'Networking 4', 3, 'SAT 8:00-11:00 AM'),
  ('ITCC212', 'Cyber Security', 6, 'MTWTHF 8:00-5:00 PM'),
  ('ITPE1', 'Seminars and Field Trips', 3, 'SAT 1:00-4:00 PM'),
  ('ITPE2', 'Advanced Cybersecurity', 3, 'TTH 4:30-6:00 PM'),
  ('ITGE1', 'Blockchain Technologies', 3, 'MWF 5:30-6:30 PM');
