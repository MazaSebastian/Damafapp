-- Add Foreign Key constraint if it's missing.
-- If you see an error saying "constraint ... already exists", that is GOOD. It means everything is set up correctly.
-- If this runs successfully, it fixed the missing link.

ALTER TABLE public.orders
ADD CONSTRAINT fk_orders_drivers
FOREIGN KEY (driver_id)
REFERENCES public.drivers(id);
