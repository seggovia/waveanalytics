-- WaveAnalytics - Schema MySQL 8.0
CREATE DATABASE IF NOT EXISTS waveanalytics CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE waveanalytics;

-- Tabla de sesiones de captura
CREATE TABLE IF NOT EXISTS sesiones (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  nombre      VARCHAR(100),
  descripcion TEXT,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de configuración del osciloscopio por sesión
CREATE TABLE IF NOT EXISTS configuraciones (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  sesion_id       INT NOT NULL,
  parametro       VARCHAR(100),
  comando_scpi    VARCHAR(100),
  valor           VARCHAR(100),
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sesion_id) REFERENCES sesiones(id) ON DELETE CASCADE
);

-- Tabla de mediciones automáticas
CREATE TABLE IF NOT EXISTS mediciones (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  sesion_id       INT NOT NULL,
  canal           VARCHAR(10),
  frecuencia_hz   FLOAT,
  periodo_s       FLOAT,
  vpp             FLOAT,
  vmax            FLOAT,
  vmin            FLOAT,
  vrms            FLOAT,
  vmedio          FLOAT,
  amplitud        FLOAT,
  ciclo_trabajo   FLOAT,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sesion_id) REFERENCES sesiones(id) ON DELETE CASCADE
);

-- Tabla de puntos de forma de onda
CREATE TABLE IF NOT EXISTS waveform_points (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  sesion_id   INT NOT NULL,
  canal       VARCHAR(10),
  muestra     INT,
  tiempo_s    DOUBLE,
  voltaje_v   DOUBLE,
  FOREIGN KEY (sesion_id) REFERENCES sesiones(id) ON DELETE CASCADE
);

-- Índices para consultas rápidas
CREATE INDEX idx_waveform_sesion ON waveform_points(sesion_id, canal);
CREATE INDEX idx_mediciones_sesion ON mediciones(sesion_id);
