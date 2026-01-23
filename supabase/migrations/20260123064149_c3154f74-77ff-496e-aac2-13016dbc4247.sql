-- Create rooms table for laboratory rooms
CREATE TABLE public.rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  barcode TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create temperature_logs table for recording temperature data
CREATE TABLE public.temperature_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  temperature NUMERIC(5,2) NOT NULL CHECK (temperature >= 0 AND temperature <= 50),
  humidity NUMERIC(5,2) NOT NULL CHECK (humidity >= 0 AND humidity <= 100),
  recorded_by UUID REFERENCES auth.users(id),
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.temperature_logs ENABLE ROW LEVEL SECURITY;

-- Public read access for dashboard (no login required)
CREATE POLICY "Anyone can view rooms" 
ON public.rooms 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can view temperature logs" 
ON public.temperature_logs 
FOR SELECT 
USING (true);

-- Only authenticated users can insert temperature logs
CREATE POLICY "Authenticated users can insert temperature logs" 
ON public.temperature_logs 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Enable realtime for temperature_logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.temperature_logs;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_rooms_updated_at
BEFORE UPDATE ON public.rooms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial rooms data
INSERT INTO public.rooms (name, location, barcode) VALUES
  ('Lab Mikrobiologi', 'Gedung A, Lantai 2', 'LAB-MIKRO-001'),
  ('Lab Kimia Analitik', 'Gedung A, Lantai 3', 'LAB-KIMIA-002'),
  ('Lab Biologi Molekuler', 'Gedung B, Lantai 1', 'LAB-BIOMOL-003'),
  ('Cold Storage', 'Gedung B, Basement', 'LAB-COLD-004'),
  ('Lab Farmasi', 'Gedung C, Lantai 2', 'LAB-FARM-005'),
  ('Ruang Inkubator', 'Gedung A, Lantai 1', 'LAB-INKUB-006');