The new schema introduces significant changes (new `Role` enum, `Specialization` relations, new `Order` fields) and is missing the `RefreshSession` model required by the authentication system.

I will update the project to align with the new schema:

1. **Schema Alignment**:

   * Add `RefreshSession` model back to `prisma/schema.prisma` and link it to `User` to support the existing secure authentication.

   * Run `prisma generate` to update the client.

2. **Code Refactoring (Fixing Logics)**:

   * **Auth**: Update `Role.USER` to `Role.CUSTOMER` across the app.

   * **Technicians**: Update logic to handle `Specialization` relation (many-to-many) instead of string array.

   * **Orders**: Update DTOs and Service to support new fields (`slotInstanceId`, `urgency`, etc.).

   * **Global**: Fix all type errors resulting from schema changes.

3. **Seed Script Update**:

   * Implement the requested seed logic:

     * Create 1 Admin User (`admin@gmail.com`).

     * Create 1 Customer User (`customer@gmail.com`) + Linked `Customer` profile.

     * Remove all other seed data.

4. **Verification**:

   * Run `npm run verify` (lint + typecheck) to ensure the backend is consistent.

   * Run `npx prisma db seed` to verify the new seed script.

