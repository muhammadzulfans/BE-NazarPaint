# NazarPaint Backend API

Project ini merupakan backend web service yang digunakan untuk mendukung sistem manajemen penjualan dan stok cat NazarPaint berbasis Express JS dan Prisma ORM.

---

## *🚀 Instalasi & Setup Project*

Ikuti langkah-langkah berikut untuk menjalankan project di local environment:

### 1. Clone Repository

```bash
git clone https://github.com/muhammadzulfans/BE-NazarPaint.git
```

### 2. Masuk ke Direktori Project

```bash
cd Nama_Repositories_Kalian
```

### 3. Install Dependencies

Pastikan sudah menginstall **Node.js** dan **npm** terlebih dahulu.

```bash
npm install
```

### 4. Setup Environment Variables

Buat file `.env` di root project, lalu isi dengan konfigurasi berikut:

```env
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET=your_secret_key
```

**Penjelasan:**

* `DATABASE_URL` → koneksi ke database MySQL
* `JWT_SECRET` → secret untuk authentication

### 5. Setup Database & Prisma

Generate Prisma Client:

```bash
npx prisma generate
```

Jalankan migration database:

```bash
npx prisma migrate dev
```

Jika hanya ingin sync schema tanpa migration:

```bash
npx prisma db push
```

### 6. Menjalankan Server

```bash
npm run dev
```

Server akan berjalan di:

```
http://localhost:3000
```

---

## 📁 Struktur Project

```
BE-NazarPaint/
│
├── prisma/
│   ├── migrations/        # File migration database
│   ├── prisma/            # Konfigurasi tambahan prisma
│   └── schema.prisma      # Schema database
│
├── src/
│   ├── lib/               # Konfigurasi library (db, prisma client, dll)
│   ├── middleware/        # Middleware (auth, error handler, dll)
│   ├── modules/           # Modular feature (auth, users, dll)
│   ├── utils/             # Helper / utility functions
│   ├── app.js             # Setup express app
│   └── index.js           # Entry point server
│
├── uploads/               # Penyimpanan file upload
├── .env                   # Environment variables
├── .gitignore
├── package.json
├── package-lock.json
├── prisma.config.ts       # Konfigurasi tambahan prisma
└── README.md
```

---

## 🌿 Git Workflow (Disarankan)

Gunakan branch agar development lebih rapi:

* `main` → branch utama (production / stable)
* `develop` → development

Contoh membuat branch:

```bash
git checkout -b nama_branch_kalian
```

Push branch ke repository:

```bash
git push -u origin nama_branch_kalian
```

---

## ⚠️ Notes Penting

* Pastikan database sudah aktif sebelum menjalankan project
* Jangan commit file `.env` ke repository
* Gunakan commit message yang jelas dan konsisten
* Selalu pull update terbaru sebelum mulai coding

---

## 💪 Reminder

Fokus pada proges satu persatu dan tetap konsisten dalam pengerjaan project setiap harinya 🧐.

# **Semangattt!! terus ber proses jangan pernah menyerah 🚀 👊🏻**
