-- Drop the existing foreign key constraint
ALTER TABLE products
DROP CONSTRAINT products_category_id_fkey;

-- Re-add the constraint with ON DELETE CASCADE
ALTER TABLE products
ADD CONSTRAINT products_category_id_fkey
FOREIGN KEY (category_id)
REFERENCES categories(id)
ON DELETE CASCADE;
