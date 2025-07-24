-- Check all users in the database
SELECT 
    id,
    email,
    role,
    organization_id,
    name,
    created_at,
    updated_at
FROM users
ORDER BY created_at DESC;

-- Check if there are any admin users
SELECT 
    id,
    email,
    role,
    organization_id,
    name
FROM users
WHERE role = 'admin'
ORDER BY created_at DESC;

-- Check organizations
SELECT 
    id,
    name,
    created_at
FROM organizations
ORDER BY created_at DESC;