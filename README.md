# WaveAnalytics

Dashboard web para visualización y análisis de señales del osciloscopio OWON SDS1202.

## Arquitectura

```
Osciloscopio OWON SDS1202
        ↓ USB
  Python (capturador.py)
        ↓ HTTP POST
  Express.js (backend) → MySQL
        ↓
  Next.js (dashboard web)
```

## Estructura del proyecto

```
WaveAnalytics/
├── sql/
│   └── schema.sql          ← Crear la base de datos aquí
├── python/
│   └── capturador.py       ← Script de captura
├── backend/
│   ├── server.js           ← API REST Express
│   ├── package.json
│   └── .env                ← Configurar contraseña MySQL aquí
└── frontend/
    ├── src/
    │   ├── app/            ← Páginas Next.js
    │   ├── components/     ← Componentes React
    │   └── lib/            ← Helpers API
    └── package.json
```

---

## Instalación paso a paso

### 1. Base de datos MySQL

Abre MySQL Workbench y ejecuta:
```sql
-- Abre el archivo sql/schema.sql y ejecútalo
```

### 2. Backend

```bash
cd backend
npm install
```

Edita `.env` y cambia `tu_password_aqui` por tu contraseña de MySQL.

```bash
npm run dev
```

Debe aparecer: `WaveAnalytics backend corriendo en http://localhost:3001`

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Abre http://localhost:3000

### 4. Python

```bash
cd python
pip install pyusb numpy requests openpyxl
python capturador.py
```

Requiere driver WinUSB instalado con Zadig para el osciloscopio.

---

## Uso

1. Conecta el osciloscopio al PC por USB
2. Enciende el osciloscopio y conecta la señal al CH1
3. Corre `python capturador.py`
4. Ingresa un nombre para la sesión (ej: "Señal 1kHz")
5. Los datos aparecen automáticamente en el dashboard

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Captura hardware | Python + pyusb |
| Backend API | Node.js + Express |
| Base de datos | MySQL 8.0 |
| Frontend | Next.js 14 + React |
| Gráficos | Chart.js |
| Exportación | SheetJS (xlsx) |
