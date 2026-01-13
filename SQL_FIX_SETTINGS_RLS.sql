-- Allow everyone to READ app settings (needed for store location, logic, etc.)
-- But keep WRITE access restricted to admins

DROP POLICY IF EXISTS "Admins can view settings" ON app_settings;

CREATE POLICY "Anyone can view settings" ON app_settings 
    FOR SELECT USING (true);
