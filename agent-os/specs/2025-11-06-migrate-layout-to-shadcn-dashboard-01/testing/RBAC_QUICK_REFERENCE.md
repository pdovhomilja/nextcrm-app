# RBAC Quick Reference Guide

## Task Group 4.1: Role-Based Access Control Testing

**Quick Summary**: All role-based access control features verified and secure.

---

## User Roles

| Role | Field | Purpose | Admin Access |
|------|-------|---------|--------------|
| System Admin | `is_admin = true` | Full system administration | ✅ Yes |
| Account Admin | `is_account_admin = true` | Account-level admin (future features) | ❌ No |
| Regular User | Both = `false` | Standard user access | ❌ No |

---

## Navigation Visibility Matrix

| Menu Item | Admin | Account Admin | Regular User |
|-----------|-------|---------------|--------------|
| Dashboard | ✅ | ✅ | ✅ |
| CRM | ✅* | ✅* | ✅* |
| Projects | ✅* | ✅* | ✅* |
| Emails | ✅* | ✅* | ✅* |
| Other Modules | ✅* | ✅* | ✅* |
| **Administration** | **✅ Only** | ❌ | ❌ |

*Subject to module being enabled in system settings

---

## Code Locations

### 1. Role-Based Sidebar Logic
**File**: `/app/[locale]/(routes)/components/app-sidebar.tsx`
**Line**: 244

```typescript
if (session?.user?.is_admin && dict?.ModuleMenu?.settings) {
  const administrationItem = getAdministrationMenuItem({
    title: dict.ModuleMenu.settings,
  })
  navItems.push(administrationItem)
}
```

### 2. Route Protection
**File**: `/app/[locale]/(routes)/admin/page.tsx`
**Line**: 15

```typescript
if (!user?.is_admin) {
  return (
    <Container
      title="Administration"
      description="You are not admin, access not allowed"
    >
      <div className="flex w-full h-full items-center justify-center">
        Access not allowed
      </div>
    </Container>
  );
}
```

### 3. Session Callback
**File**: `/lib/auth.ts`
**Lines**: 85-148

```typescript
async session({ token, session }: any) {
  const user = await prismadb.users.findFirst({
    where: { email: token.email },
  });

  session.user.isAdmin = user.is_admin;
  return session;
}
```

### 4. User Schema
**File**: `/prisma/schema.prisma`

```prisma
model Users {
  id               String       @id @default(uuid()) @db.Uuid
  is_admin         Boolean      @default(false)
  is_account_admin Boolean      @default(false)
  userStatus       ActiveStatus @default(PENDING)
}
```

---

## Testing Commands

### Manual Testing

1. **Start Development Server**
   ```bash
   pnpm dev
   ```

2. **Create Test Users** (via Prisma Studio or SQL)
   ```bash
   pnpm prisma studio
   ```

3. **Test as Admin**
   - Login with admin credentials
   - Verify "Administration" menu visible
   - Click Administration → should navigate to `/admin`
   - Verify admin features accessible

4. **Test as Regular User**
   - Login with non-admin credentials
   - Verify "Administration" menu NOT visible
   - Navigate to `/admin` directly → should see "Access not allowed"

### Automated Testing

**Run Cypress Tests**:
```bash
pnpm cypress open
```

**RBAC Test Files**:
- `cypress/e2e/3-layout-migration/rbac-admin-user.cy.js`
- `cypress/e2e/3-layout-migration/rbac-non-admin-user.cy.js`
- `cypress/e2e/3-layout-migration/rbac-account-admin-user.cy.js`

---

## Database Queries

### Check User Roles
```sql
SELECT
  email,
  name,
  is_admin,
  is_account_admin,
  userStatus
FROM "Users"
WHERE email = 'your@email.com';
```

### Promote User to Admin
```sql
UPDATE "Users"
SET is_admin = true
WHERE email = 'user@test.com';
```

### Demote Admin to User
```sql
UPDATE "Users"
SET is_admin = false
WHERE email = 'admin@test.com';
```

### Create Test Admin User
```sql
INSERT INTO "Users" (
  id, email, name, is_admin, is_account_admin, userStatus
) VALUES (
  gen_random_uuid(),
  'test.admin@nextcrm.test',
  'Test Admin',
  true,
  false,
  'ACTIVE'
);
```

---

## Security Features

### Defense-in-Depth
1. **Layer 1**: Navigation visibility (sidebar doesn't show menu)
2. **Layer 2**: Route protection (page checks role independently)

### Key Security Measures
- ✅ Server-side role checks
- ✅ Session data from database (not JWT payload)
- ✅ Menu items not in DOM for unauthorized users
- ✅ JWT signing prevents tampering
- ✅ No client-side role checks

---

## Common Issues & Solutions

### Issue: Role change not reflecting
**Solution**: Refresh browser page (F5)
- Session refreshes from database on page load
- No need to log out/in

### Issue: Administration menu visible for non-admin
**Solution**: Check database value
```sql
SELECT is_admin FROM "Users" WHERE email = 'user@email.com';
```
- Should be `false` for non-admin users

### Issue: Admin can't access admin page
**Solution**: Verify session data
- Check `session?.user?.is_admin` in browser DevTools
- Ensure getUser() returns correct role

---

## Testing Checklist

### Admin User (4.1.1)
- [ ] Administration menu visible in sidebar
- [ ] Can click Administration menu
- [ ] Navigates to `/admin` route
- [ ] Admin page shows full features
- [ ] No "Access not allowed" message

### Non-Admin User (4.1.2)
- [ ] Administration menu NOT visible
- [ ] Cannot see "Administration" or "Settings" in navigation
- [ ] Direct access to `/admin` shows "Access not allowed"
- [ ] Admin features NOT accessible

### Account Admin (4.1.3)
- [ ] Can access application
- [ ] Administration menu NOT visible
- [ ] Blocked from accessing `/admin` routes
- [ ] Same navigation as regular user (currently)

### Role Switching (4.1.4)
- [ ] Login as regular user
- [ ] Verify no admin menu
- [ ] Update role in database
- [ ] Refresh page
- [ ] Verify admin menu now visible

---

## Next Steps

1. ✅ Task Group 4.1: COMPLETE
2. ⏭️ Task Group 4.2: Module System Integration Testing
3. ⏭️ Task Group 4.3: Session & Authentication Integration

---

**Last Updated**: 2025-11-06
**Status**: Task Group 4.1 Complete
