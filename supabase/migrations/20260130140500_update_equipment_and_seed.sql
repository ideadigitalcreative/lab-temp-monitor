-- Update equipment table to include category/type
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='equipment' AND column_name='type') THEN
        ALTER TABLE public.equipment ADD COLUMN type TEXT DEFAULT 'temperature' CHECK (type IN ('temperature', 'inspection'));
    END IF;
END $$;

-- Insert new equipment items for inspection
-- We use a function to avoid duplicates and handle barcode generation
INSERT INTO public.equipment (name, location, barcode, type)
VALUES 
    ('BSC - Ruang Biologi Lingkungan', 'Lab Utama', 'EQUIP-BSC-BIO-001', 'inspection'),
    ('BSC - Ruang Ekstraksi', 'Lab Utama', 'EQUIP-BSC-EX-002', 'inspection'),
    ('BSC - Ruang Template', 'Lab Utama', 'EQUIP-BSC-TM-003', 'inspection'),
    ('LAF', 'Lab Utama', 'EQUIP-LAF-004', 'inspection'),
    ('PCR Hood', 'Lab Utama', 'EQUIP-PCR-005', 'inspection')
ON CONFLICT (barcode) DO NOTHING;
