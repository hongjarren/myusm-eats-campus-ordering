# Debugging Delivery Accept Order Issue

## Steps to Debug

### 1. Check Browser Console
When you click "Accept Order", open the browser console (F12) and look for:
- `=== ACCEPT ORDER DEBUG START ===` - Shows the process started
- Error messages with `❌` - Shows exactly where it failed
- Success messages with `✅` - Shows what worked

### 2. Verify Migration Was Applied

Run this SQL in your Supabase SQL Editor to check if the policies exist:

```sql
-- Check if policies exist
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('orders', 'deliveries')
  AND policyname LIKE '%delivery%'
ORDER BY tablename, policyname;
```

You should see these policies:
- `Delivery personnel can view available orders` (on orders table)
- `Delivery personnel can accept orders` (on orders table)
- `Delivery personnel can accept deliveries` (on deliveries table)

### 3. Check Your User Role

Run this SQL to verify your user has the 'delivery' role:

```sql
SELECT id, full_name, role, is_active
FROM profiles
WHERE id = auth.uid();
```

Make sure:
- `role` = 'delivery'
- `is_active` = true

### 4. Test RLS Policies Directly

Test if you can view orders:

```sql
-- This should return orders with status 'pending', 'preparing', or 'ready'
SELECT id, order_number, status, driver_id, customer_id
FROM orders
WHERE status IN ('pending', 'preparing', 'ready')
LIMIT 5;
```

Test if you can update an order:

```sql
-- Try updating a test order (replace ORDER_ID with an actual order ID)
UPDATE orders
SET driver_id = auth.uid()
WHERE id = 'ORDER_ID'
  AND status IN ('pending', 'preparing', 'ready')
  AND driver_id IS NULL
RETURNING id, driver_id, status;
```

### 5. Check for Common Issues

#### Issue: Policy doesn't exist
**Solution**: Run the migration file `20251107000000_011_delivery_accept_order_policies.sql` in Supabase SQL Editor

#### Issue: User role is not 'delivery'
**Solution**: Update your profile:
```sql
UPDATE profiles
SET role = 'delivery'
WHERE id = auth.uid();
```

#### Issue: User is blocked
**Solution**: Check and unblock:
```sql
UPDATE profiles
SET is_active = true
WHERE id = auth.uid();
```

#### Issue: Order status is not in allowed states
**Solution**: The order must be in 'pending', 'preparing', or 'ready' status. Check:
```sql
SELECT id, order_number, status, driver_id
FROM orders
WHERE id = 'YOUR_ORDER_ID';
```

### 6. Check Trigger Function

If there's a trigger that syncs deliveries, check if it's interfering:

```sql
-- Check if trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'orders'
  AND trigger_name LIKE '%delivery%';
```

### 7. Manual Test

Try accepting an order manually via SQL:

```sql
-- Step 1: Update order
UPDATE orders
SET driver_id = auth.uid()
WHERE id = 'YOUR_ORDER_ID'
  AND status IN ('pending', 'preparing', 'ready')
  AND driver_id IS NULL
RETURNING id, driver_id, status;

-- Step 2: Insert delivery (if trigger didn't create it)
INSERT INTO deliveries (order_id, rider_id, status)
VALUES ('YOUR_ORDER_ID', auth.uid(), 'assigned')
ON CONFLICT DO NOTHING
RETURNING id, order_id, rider_id, status;
```

If this works, the issue is in the frontend code. If this fails, the issue is with RLS policies.

## Common Error Codes

- **42501**: Insufficient privilege (RLS policy blocking)
- **PGRST116**: No rows returned (might be RLS blocking)
- **23505**: Unique constraint violation (delivery already exists)
- **23503**: Foreign key violation (invalid order_id or rider_id)

## Next Steps

1. Run the migration if policies don't exist
2. Check browser console for detailed error messages
3. Verify your user role is 'delivery'
4. Test the SQL queries above
5. Share the console error messages for further debugging

