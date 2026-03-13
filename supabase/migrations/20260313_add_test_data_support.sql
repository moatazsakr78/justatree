-- Add is_test column to customers, suppliers, and records
ALTER TABLE elfaroukgroup.customers ADD COLUMN IF NOT EXISTS is_test BOOLEAN DEFAULT false;
ALTER TABLE elfaroukgroup.suppliers ADD COLUMN IF NOT EXISTS is_test BOOLEAN DEFAULT false;
ALTER TABLE elfaroukgroup.records ADD COLUMN IF NOT EXISTS is_test BOOLEAN DEFAULT false;

-- Add indexes for fast filtering
CREATE INDEX IF NOT EXISTS idx_customers_is_test ON elfaroukgroup.customers (is_test) WHERE is_test = true;
CREATE INDEX IF NOT EXISTS idx_suppliers_is_test ON elfaroukgroup.suppliers (is_test) WHERE is_test = true;
CREATE INDEX IF NOT EXISTS idx_records_is_test ON elfaroukgroup.records (is_test) WHERE is_test = true;

-- RPC: Delete a test customer and all related data
CREATE OR REPLACE FUNCTION elfaroukgroup.delete_test_customer(p_customer_id UUID)
RETURNS void
LANGUAGE plpgsql
SET search_path = elfaroukgroup
AS $$
BEGIN
  -- Verify it's a test customer
  IF NOT EXISTS (SELECT 1 FROM customers WHERE id = p_customer_id AND is_test = true) THEN
    RAISE EXCEPTION 'Customer is not a test customer or does not exist';
  END IF;

  -- 1. cashbox_entries where sale_id in customer's sales
  DELETE FROM cashbox_entries WHERE sale_id IN (SELECT id FROM sales WHERE customer_id = p_customer_id);

  -- 2. cash_drawer_transactions where sale_id in customer's sales
  DELETE FROM cash_drawer_transactions WHERE sale_id IN (SELECT id FROM sales WHERE customer_id = p_customer_id);

  -- 3. sale_items where sale_id in customer's sales
  DELETE FROM sale_items WHERE sale_id IN (SELECT id FROM sales WHERE customer_id = p_customer_id);

  -- 4. sales where customer_id
  DELETE FROM sales WHERE customer_id = p_customer_id;

  -- 5. payment_receipts where order_id in customer's orders
  DELETE FROM payment_receipts WHERE order_id IN (SELECT id FROM orders WHERE customer_id = p_customer_id);

  -- 6. order_items where order_id in customer's orders
  DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE customer_id = p_customer_id);

  -- 7. orders where customer_id
  DELETE FROM orders WHERE customer_id = p_customer_id;

  -- 8. customer_payments where customer_id
  DELETE FROM customer_payments WHERE customer_id = p_customer_id;

  -- 9. product_ratings where customer_id
  DELETE FROM product_ratings WHERE customer_id = p_customer_id;

  -- 10. cart_items where customer_id
  DELETE FROM cart_items WHERE customer_id = p_customer_id;

  -- 11. favorites where customer_id
  DELETE FROM favorites WHERE customer_id = p_customer_id;

  -- 12. Finally delete the customer
  DELETE FROM customers WHERE id = p_customer_id AND is_test = true;
END;
$$;

-- RPC: Delete a test supplier and all related data
CREATE OR REPLACE FUNCTION elfaroukgroup.delete_test_supplier(p_supplier_id UUID)
RETURNS void
LANGUAGE plpgsql
SET search_path = elfaroukgroup
AS $$
BEGIN
  -- Verify it's a test supplier
  IF NOT EXISTS (SELECT 1 FROM suppliers WHERE id = p_supplier_id AND is_test = true) THEN
    RAISE EXCEPTION 'Supplier is not a test supplier or does not exist';
  END IF;

  -- 1. purchase_invoice_items where purchase_invoice_id in supplier's invoices
  DELETE FROM purchase_invoice_items WHERE purchase_invoice_id IN (SELECT id FROM purchase_invoices WHERE supplier_id = p_supplier_id);

  -- 2. purchase_invoices where supplier_id
  DELETE FROM purchase_invoices WHERE supplier_id = p_supplier_id;

  -- 3. supplier_payments where supplier_id
  DELETE FROM supplier_payments WHERE supplier_id = p_supplier_id;

  -- 4. Finally delete the supplier
  DELETE FROM suppliers WHERE id = p_supplier_id AND is_test = true;
END;
$$;

-- RPC: Delete a test safe (record) and all related data
CREATE OR REPLACE FUNCTION elfaroukgroup.delete_test_safe(p_record_id UUID)
RETURNS void
LANGUAGE plpgsql
SET search_path = elfaroukgroup
AS $$
DECLARE
  child_record RECORD;
BEGIN
  -- Verify it's a test record
  IF NOT EXISTS (SELECT 1 FROM records WHERE id = p_record_id AND is_test = true) THEN
    RAISE EXCEPTION 'Record is not a test record or does not exist';
  END IF;

  -- Handle child records first
  FOR child_record IN SELECT id FROM records WHERE parent_id = p_record_id LOOP
    -- Delete cash_drawer_transactions for child's drawers
    DELETE FROM cash_drawer_transactions WHERE drawer_id IN (SELECT id FROM cash_drawers WHERE record_id = child_record.id);
    -- Delete cash_drawers for child
    DELETE FROM cash_drawers WHERE record_id = child_record.id;
    -- Delete child record
    DELETE FROM records WHERE id = child_record.id;
  END LOOP;

  -- Delete cash_drawer_transactions for this record's drawers
  DELETE FROM cash_drawer_transactions WHERE drawer_id IN (SELECT id FROM cash_drawers WHERE record_id = p_record_id);

  -- Delete cash_drawers for this record
  DELETE FROM cash_drawers WHERE record_id = p_record_id;

  -- Finally delete the record
  DELETE FROM records WHERE id = p_record_id AND is_test = true;
END;
$$;

-- RPC: Delete ALL test data across all tables
CREATE OR REPLACE FUNCTION elfaroukgroup.delete_all_test_data()
RETURNS JSON
LANGUAGE plpgsql
SET search_path = elfaroukgroup
AS $$
DECLARE
  customer_count INT := 0;
  supplier_count INT := 0;
  safe_count INT := 0;
  rec RECORD;
BEGIN
  -- Delete all test customers
  FOR rec IN SELECT id FROM customers WHERE is_test = true LOOP
    PERFORM delete_test_customer(rec.id);
    customer_count := customer_count + 1;
  END LOOP;

  -- Delete all test suppliers
  FOR rec IN SELECT id FROM suppliers WHERE is_test = true LOOP
    PERFORM delete_test_supplier(rec.id);
    supplier_count := supplier_count + 1;
  END LOOP;

  -- Delete all test safes/records
  FOR rec IN SELECT id FROM records WHERE is_test = true AND parent_id IS NULL LOOP
    PERFORM delete_test_safe(rec.id);
    safe_count := safe_count + 1;
  END LOOP;

  -- Also delete any remaining child test records
  FOR rec IN SELECT id FROM records WHERE is_test = true LOOP
    PERFORM delete_test_safe(rec.id);
    safe_count := safe_count + 1;
  END LOOP;

  RETURN json_build_object(
    'customers', customer_count,
    'suppliers', supplier_count,
    'safes', safe_count
  );
END;
$$;
