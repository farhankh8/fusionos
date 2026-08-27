/**
 * FusionOS Database Runtime Test
 * Verifies real PostgreSQL connectivity via Prisma Client
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 FusionOS Database Runtime Test\n');
  const results: Record<string, string> = {};

  // 1. Raw connection test
  try {
    await prisma.$queryRaw`SELECT 1 as test`;
    results['Connection'] = '✅ PASS';
  } catch (e: any) {
    results['Connection'] = `❌ FAIL: ${e.message}`;
  }

  // 2. Tenant foundation
  try {
    const tenants = await prisma.tenant.findMany();
    results['Tenant foundation'] = `✅ PASS (${tenants.length} tenants: ${tenants.map(t => t.name).join(', ')})`;
  } catch (e: any) {
    results['Tenant foundation'] = `❌ FAIL: ${e.message}`;
  }

  // 3. User foundation
  try {
    const users = await prisma.user.findMany({ select: { email: true, status: true, passwordHash: true } });
    results['User foundation'] = `✅ PASS (${users.length} users: ${users.map(u => u.email).join(', ')})`;
  } catch (e: any) {
    results['User foundation'] = `❌ FAIL: ${e.message}`;
  }

  // 4. Role foundation
  try {
    const roles = await prisma.role.findMany({ select: { name: true, isSystem: true } });
    results['Role foundation'] = `✅ PASS (${roles.length} roles: ${roles.map(r => r.name).join(', ')})`;
  } catch (e: any) {
    results['Role foundation'] = `❌ FAIL: ${e.message}`;
  }

  // 5. Permission foundation
  try {
    const perms = await prisma.permission.findMany();
    results['Permission foundation'] = `✅ PASS (${perms.length} permissions)`;
  } catch (e: any) {
    results['Permission foundation'] = `❌ FAIL: ${e.message}`;
  }

  // 6. Role-Permission relationships
  try {
    const rps = await prisma.rolePermission.findMany();
    results['Role-Permission relationships'] = `✅ PASS (${rps.length} mappings)`;
  } catch (e: any) {
    results['Role-Permission relationships'] = `❌ FAIL: ${e.message}`;
  }

  // 7. UserRole foundation
  try {
    const urs = await prisma.userRole.findMany();
    results['UserRole foundation'] = `✅ PASS (${urs.length} assignments)`;
  } catch (e: any) {
    results['UserRole foundation'] = `❌ FAIL: ${e.message}`;
  }

  // 8. Session table exists (empty is OK)
  try {
    const sessions = await prisma.session.findMany();
    results['Session table'] = `✅ PASS (${sessions.length} sessions — empty is expected)`;
  } catch (e: any) {
    results['Session table'] = `❌ FAIL: ${e.message}`;
  }

  // 9. VerificationToken table exists
  try {
    const vts = await prisma.verificationToken.findMany();
    results['VerificationToken table'] = `✅ PASS (${vts.length} tokens — empty is expected)`;
  } catch (e: any) {
    results['VerificationToken table'] = `❌ FAIL: ${e.message}`;
  }

  // 10. PasswordResetToken table exists
  try {
    const prts = await prisma.passwordResetToken.findMany();
    results['PasswordResetToken table'] = `✅ PASS (${prts.length} tokens — empty is expected)`;
  } catch (e: any) {
    results['PasswordResetToken table'] = `❌ FAIL: ${e.message}`;
  }

  // 11. AuthEvent table exists
  try {
    const aes = await prisma.authEvent.findMany();
    results['AuthEvent table'] = `✅ PASS (${aes.length} events — empty is expected)`;
  } catch (e: any) {
    results['AuthEvent table'] = `❌ FAIL: ${e.message}`;
  }

  // 12. Company foundation
  try {
    const companies = await prisma.company.findMany({ select: { name: true, code: true } });
    results['Company foundation'] = `✅ PASS (${companies.length} companies: ${companies.map(c => c.name).join(', ')})`;
  } catch (e: any) {
    results['Company foundation'] = `❌ FAIL: ${e.message}`;
  }

  // 13. Core relationship test (User -> UserRole -> Role -> Permission)
  try {
    const userWithRoles = await prisma.user.findUnique({
      where: { email: 'admin@fusionos.dev' },
      include: {
        tenants: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });
    if (userWithRoles && userWithRoles.tenants.length > 0) {
      const role = userWithRoles.tenants[0].role;
      results['Core relationship (User→Role→Permission)'] = `✅ PASS (user=${userWithRoles.email}, role=${role.name}, permissions=${role.rolePermissions.length})`;
    } else {
      results['Core relationship (User→Role→Permission)'] = '❌ FAIL: No user-role assignment found';
    }
  } catch (e: any) {
    results['Core relationship (User→Role→Permission)'] = `❌ FAIL: ${e.message}`;
  }

  // Print results
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  DATABASE RUNTIME TEST RESULTS');
  console.log('═══════════════════════════════════════════════════════════════');
  for (const [test, result] of Object.entries(results)) {
    console.log(`  ${result}  ${test}`);
  }
  console.log('═══════════════════════════════════════════════════════════════');

  const failures = Object.values(results).filter(r => r.startsWith('❌'));
  if (failures.length > 0) {
    console.log(`\n⚠️  ${failures.length} test(s) FAILED`);
    process.exit(1);
  } else {
    console.log('\n✅ All database runtime tests PASSED');
  }

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error('❌ Runtime test crashed:', error);
  await prisma.$disconnect();
  process.exit(1);
});
