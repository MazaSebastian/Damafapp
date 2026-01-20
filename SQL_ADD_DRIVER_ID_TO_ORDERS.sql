-- Add driver_id to orders table
ALTER TABLE public.orders 
ADD COLUMN driver_id uuid REFERENCES public.drivers(id);

-- Create index for performance
CREATE INDEX idx_orders_driver_id ON public.orders(driver_id);
