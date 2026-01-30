-- Refine equipment types for inspection based on specific whitelist
-- 1. Reset all equipment to 'temperature' type
UPDATE public.equipment SET type = 'temperature';

-- 2. Update specific equipment to 'inspection' type if they exist
UPDATE public.equipment 
SET type = 'inspection' 
WHERE name IN (
    'BSC - Ruang Biologi Lingkungan',
    'BSC - Ruang Ekstraksi',
    'BSC - Ruang Template',
    'LAF',
    'PCR Hood',
    'Sensititre™ ARIS HiQ™ System for AST',
    'Eppendorf Centrifuge',
    'TOMY Centrifuges'
);

-- 3. Insert missing equipment for inspection if they don't already exist
INSERT INTO public.equipment (name, location, barcode, type)
VALUES 
    ('Sensititre™ ARIS HiQ™ System for AST', 'Lab Utama', 'EQUIP-AST-006', 'inspection'),
    ('Eppendorf Centrifuge', 'Lab Utama', 'EQUIP-CENT-007', 'inspection'),
    ('TOMY Centrifuges', 'Lab Utama', 'EQUIP-CENT-008', 'inspection')
ON CONFLICT (barcode) DO NOTHING;

-- 4. Final safety check: ensure the names in the list ARE set to inspection
UPDATE public.equipment 
SET type = 'inspection' 
WHERE name IN (
    'BSC - Ruang Biologi Lingkungan',
    'BSC - Ruang Ekstraksi',
    'BSC - Ruang Template',
    'LAF',
    'PCR Hood',
    'Sensititre™ ARIS HiQ™ System for AST',
    'Eppendorf Centrifuge',
    'TOMY Centrifuges'
);
