-- ========================================================
-- SCHEMA DATABASE SUPABASE - APLIKASI SPP PAUD SETIA BHAKTI
-- Dokumentasi Lengkap Struktur Tabel & Relasi Data
-- Mendukung Manajemen Siswa, Multi-Kelas, & Midtrans Gateway
-- ========================================================

-- 1. Tabel Settings (Pengaturan Sekolah, Kredensial Admin, Periode & Midtrans)
CREATE TABLE IF NOT EXISTS public.settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_name VARCHAR(255) NOT NULL DEFAULT 'PAUD SETIA BHAKTI',
    address TEXT DEFAULT 'Bekasi, Jawa Barat',
    phone VARCHAR(50) DEFAULT '081234567890',
    academic_year VARCHAR(50) DEFAULT '2025/2026',
    active_period_name VARCHAR(100) DEFAULT 'Periode 2025/2026',
    semester VARCHAR(50) DEFAULT 'Semua',
    admin_name VARCHAR(255) DEFAULT 'Siti Rahma (Admin TU)',
    admin_username VARCHAR(100) DEFAULT 'admin',
    admin_password VARCHAR(255) DEFAULT 'admin123',
    due_date_day INT DEFAULT 10,
    midtrans_client_key VARCHAR(255) DEFAULT '',
    midtrans_server_key VARCHAR(255) DEFAULT '',
    start_month VARCHAR(50) DEFAULT 'Juli',
    start_year INT DEFAULT 2025,
    end_month VARCHAR(50) DEFAULT 'Juni',
    end_year INT DEFAULT 2026,
    academic_periods JSONB DEFAULT '[]',
    custom_classes JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migrasi/Penambahan kolom untuk tabel settings jika sudah ada
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS school_name VARCHAR(255) DEFAULT 'PAUD SETIA BHAKTI';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS address TEXT DEFAULT 'Bekasi, Jawa Barat';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS phone VARCHAR(50) DEFAULT '081234567890';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS academic_year VARCHAR(50) DEFAULT '2025/2026';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS active_period_name VARCHAR(100) DEFAULT 'Periode 2025/2026';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS semester VARCHAR(50) DEFAULT 'Semua';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS admin_name VARCHAR(255) DEFAULT 'Siti Rahma (Admin TU)';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS admin_username VARCHAR(100) DEFAULT 'admin';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS admin_password VARCHAR(255) DEFAULT 'admin123';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS due_date_day INT DEFAULT 10;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS midtrans_client_key VARCHAR(255) DEFAULT '';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS midtrans_server_key VARCHAR(255) DEFAULT '';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS start_month VARCHAR(50) DEFAULT 'Juli';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS start_year INT DEFAULT 2025;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS end_month VARCHAR(50) DEFAULT 'Juni';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS end_year INT DEFAULT 2026;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS academic_periods JSONB DEFAULT '[]';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS custom_classes JSONB DEFAULT '[]';

-- Insert Default Settings jika tabel masih kosong
INSERT INTO public.settings (
    school_name, address, phone, academic_year, active_period_name, semester,
    admin_name, admin_username, admin_password, due_date_day,
    start_month, start_year, end_month, end_year,
    academic_periods, custom_classes
)
SELECT 
    'PAUD SETIA BHAKTI', 'Bekasi, Jawa Barat', '081234567890', '2025/2026', 'Periode 2025/2026', 'Semua',
    'Siti Rahma (Admin TU)', 'admin', 'admin123', 10,
    'Juli', 2025, 'Juni', 2026,
    '[{"id":"1","name":"Periode 2025/2026","startMonth":"Juli","startYear":2025,"endMonth":"Juni","endYear":2026,"semester":"Semua","isActive":true}]'::jsonb,
    '[]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.settings);

-- 2. Tabel Students (Data Siswa, Data Diri Lengkap, Kelas, Tarif, Mutasi, WhatsApp & Keringanan)
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nis VARCHAR(50) NOT NULL UNIQUE,
    nipd VARCHAR(50) DEFAULT '',
    nisn VARCHAR(50) DEFAULT '',
    name VARCHAR(255) NOT NULL,
    jk VARCHAR(10) DEFAULT 'L',
    tempat_lahir VARCHAR(100) DEFAULT '',
    tanggal_lahir VARCHAR(50) DEFAULT '',
    nik VARCHAR(50) DEFAULT '',
    agama VARCHAR(50) DEFAULT 'Islam',
    alamat TEXT DEFAULT '',
    rt VARCHAR(10) DEFAULT '',
    rw VARCHAR(10) DEFAULT '',
    kelas VARCHAR(100) NOT NULL,
    tarif NUMERIC(12,2) NOT NULL DEFAULT 0,
    wali VARCHAR(255),
    telepon VARCHAR(50),
    password VARCHAR(255) DEFAULT NULL,
    photo_url TEXT DEFAULT '',
    status VARCHAR(50) DEFAULT 'Aktif',
    keringanan_note VARCHAR(255) DEFAULT '',
    arrears_amount NUMERIC(12,2) DEFAULT 0,
    arrears_note VARCHAR(255) DEFAULT 'Tunggakan Tahun Sebelumnya',
    class_history JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.students ADD COLUMN IF NOT EXISTS nipd VARCHAR(50) DEFAULT '';
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS nisn VARCHAR(50) DEFAULT '';
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS jk VARCHAR(10) DEFAULT 'L';
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS tempat_lahir VARCHAR(100) DEFAULT '';
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS tanggal_lahir VARCHAR(50) DEFAULT '';
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS nik VARCHAR(50) DEFAULT '';
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS agama VARCHAR(50) DEFAULT 'Islam';
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS alamat TEXT DEFAULT '';
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS rt VARCHAR(10) DEFAULT '';
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS rw VARCHAR(10) DEFAULT '';
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS password VARCHAR(255) DEFAULT NULL;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS photo_url TEXT DEFAULT '';
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS telepon VARCHAR(50) DEFAULT '';
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Aktif';
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS keringanan_note VARCHAR(255) DEFAULT '';
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS arrears_amount NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS arrears_note VARCHAR(255) DEFAULT 'Tunggakan Tahun Sebelumnya';
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS class_history JSONB DEFAULT '[]';

-- 3. Tabel Transactions (Riwayat Pembayaran Kasir Manual & Midtrans Payment Gateway)
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
    student_name VARCHAR(255) NOT NULL,
    kelas VARCHAR(100) NOT NULL,
    month VARCHAR(50) NOT NULL,
    amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    method VARCHAR(50) DEFAULT '-',
    status VARCHAR(50) NOT NULL DEFAULT 'Belum Bayar',
    is_read BOOLEAN DEFAULT false,
    date VARCHAR(50) DEFAULT '-',
    kuitansi_no VARCHAR(100) DEFAULT '-',
    
    -- Kolom Tambahan Integrasi Midtrans Payment Gateway
    order_id VARCHAR(100) DEFAULT NULL,
    snap_token VARCHAR(255) DEFAULT NULL,
    payment_type VARCHAR(50) DEFAULT NULL,
    payment_time TIMESTAMPTZ DEFAULT NULL,
    academic_year VARCHAR(50) DEFAULT NULL,
    period_name VARCHAR(100) DEFAULT NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS order_id VARCHAR(100) DEFAULT NULL;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS snap_token VARCHAR(255) DEFAULT NULL;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS payment_type VARCHAR(50) DEFAULT NULL;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS payment_time TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS academic_year VARCHAR(50) DEFAULT NULL;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS period_name VARCHAR(100) DEFAULT NULL;

-- 4. Tabel Announcements (Berita & Pengumuman Sekolah dengan Foto)
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    date VARCHAR(50) DEFAULT '-',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabel Student Notes (Catatan Perkembangan Anak + Komentar Wali)
CREATE TABLE IF NOT EXISTS public.student_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    student_name VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'Catatan Harian',
    comments TEXT DEFAULT '[]',
    date VARCHAR(50) DEFAULT '-',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.student_notes ADD COLUMN IF NOT EXISTS comments TEXT DEFAULT '[]';

-- 6. Tabel Complaints (Pengaduan Wali Murid + Balasan Admin + 1 Jam Expire Limit)
CREATE TABLE IF NOT EXISTS public.complaints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    student_name VARCHAR(255) NOT NULL,
    wali_name VARCHAR(255),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    admin_reply TEXT DEFAULT '',
    messages TEXT DEFAULT '[]',
    status VARCHAR(50) DEFAULT 'Belum Ditangani',
    is_read BOOLEAN DEFAULT false,
    date VARCHAR(50) DEFAULT '-',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 hour')
);

ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS admin_reply TEXT DEFAULT '';
ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS messages TEXT DEFAULT '[]';
ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;
ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 hour');

-- 7. Pengaturan RLS (Row Level Security) untuk Akses Publik
ALTER TABLE public.settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.students DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints DISABLE ROW LEVEL SECURITY;

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow All Settings" ON public.settings;
DROP POLICY IF EXISTS "Allow All Students" ON public.students;
DROP POLICY IF EXISTS "Allow All Transactions" ON public.transactions;
DROP POLICY IF EXISTS "Allow All Announcements" ON public.announcements;
DROP POLICY IF EXISTS "Allow All Student Notes" ON public.student_notes;
DROP POLICY IF EXISTS "Allow All Complaints" ON public.complaints;

CREATE POLICY "Allow All Settings" ON public.settings FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Students" ON public.students FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Transactions" ON public.transactions FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Announcements" ON public.announcements FOR ALL TO PUBLIC USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Student Notes" ON public.student_notes FOR ALL TO PUBLIC USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Complaints" ON public.complaints FOR ALL TO PUBLIC USING (true) WITH CHECK (true);

-- 8. Indexing untuk Performa Query Cepat
CREATE INDEX IF NOT EXISTS idx_students_nis ON public.students(nis);
CREATE INDEX IF NOT EXISTS idx_students_kelas ON public.students(kelas);
CREATE INDEX IF NOT EXISTS idx_students_status ON public.students(status);
CREATE INDEX IF NOT EXISTS idx_transactions_student_id ON public.transactions(student_id);
CREATE INDEX IF NOT EXISTS idx_transactions_month ON public.transactions(month);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_order_id ON public.transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_student_notes_student_id ON public.student_notes(student_id);
CREATE INDEX IF NOT EXISTS idx_complaints_student_id ON public.complaints(student_id);
