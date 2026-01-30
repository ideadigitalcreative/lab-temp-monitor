-- Create equipment_inspections table for equipment inspection logs
CREATE TABLE public.equipment_inspections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  condition TEXT NOT NULL CHECK (condition IN ('bagus', 'tidak_bagus')),
  notes TEXT,
  inspected_by UUID REFERENCES auth.users(id),
  inspected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.equipment_inspections ENABLE ROW LEVEL SECURITY;

-- Public read access for dashboard (no login required)
CREATE POLICY "Anyone can view equipment inspections" 
ON public.equipment_inspections 
FOR SELECT 
USING (true);

-- Only authenticated users can insert equipment inspections
CREATE POLICY "Authenticated users can insert equipment inspections" 
ON public.equipment_inspections 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Admin policies for update and delete
CREATE POLICY "Admins can update equipment inspections" 
ON public.equipment_inspections 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can delete equipment inspections" 
ON public.equipment_inspections 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Enable realtime for equipment_inspections
ALTER PUBLICATION supabase_realtime ADD TABLE public.equipment_inspections;

-- Create index for faster queries
CREATE INDEX idx_equipment_inspections_equipment_id ON public.equipment_inspections(equipment_id);
CREATE INDEX idx_equipment_inspections_inspected_at ON public.equipment_inspections(inspected_at DESC);
