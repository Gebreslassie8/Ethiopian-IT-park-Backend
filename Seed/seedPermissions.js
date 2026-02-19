const db = require('../Config/db'); // adjust path as needed

// Permissions list
const permissions = [
  'Manage Users',
  'Manage Roles and Permissions',
  'Create Content',
  'Edit Content',
  'Delete Content',
  'Submit Content for Review',
  'Approve/Reject Submitted Content',
  'Publish Content',
  'Unpublish Content',
  'View Public Content',
  'View Internal Content',
  'View Restricted Content',
  'View Usage Analytics',
  'View Content Performance',
  'Download Content',
  'Archive Content',
];

// Role map: lowercase role name => label
const roleMap = {
  admin: 'Admin',
  contentmanager: 'Content Manager',
  internaluser: 'Internal User',
  externaluser: 'External User',
};

async function seedPermissionsAndRoleLinks() {
  try {
    // Insert all permissions
    for (const permission of permissions) {
      await db.query(
        'INSERT IGNORE INTO permissions (name) VALUES (?)',
        [permission]
      );
    }

    // Optional: clear existing role-permission links
    await db.query('DELETE FROM role_permissions');

    // For each role, assign permissions (customize below)
    for (const [roleKey, roleLabel] of Object.entries(roleMap)) {
      const [roleResult] = await db.query(
        'SELECT role_id FROM roles WHERE role_name = ?',
        [roleKey] // assuming lowercase names like "admin"
      );

      if (roleResult.length === 0) {
        console.error(` Role not found: ${roleKey}`);
        continue;
      }

      const roleId = roleResult[0].role_id;

      let assignedPermissions = [];

      if (roleKey === 'admin') {
        assignedPermissions = permissions;
      } else if (roleKey === 'contentmanager') {
        assignedPermissions = [
          'Create Content',
          'Edit Content',
          'Delete Content',
          'Submit Content for Review',
          'Approve/Reject Submitted Content',
          'Publish Content',
          'Unpublish Content',
          'View Content Performance',
        ];
      } else if (roleKey === 'internaluser') {
        assignedPermissions = [
          'View Public Content',
          'View Internal Content',
          'Download Content',
        ];
      } else if (roleKey === 'externaluser') {
        assignedPermissions = [
          'View Public Content',
        ];
      }

      for (const permissionName of assignedPermissions) {
        const [permResult] = await db.query(
          'SELECT permission_id FROM permissions WHERE name = ?',
          [permissionName]
        );

        if (permResult.length > 0) {
          const permissionId = permResult[0].permission_id;

          await db.query(
            'INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
            [roleId, permissionId]
          );
        } else {
          console.warn(` Permission not found: ${permissionName}`);
        }
      }
    }

    console.log(' Permissions and role-permission links seeded successfully!');
  } catch (err) {
    console.error(' Seeding failed:', err);
  } finally {
    db.end();
  }
}

// Run seeding
(async () => {
  await seedPermissionsAndRoleLinks();
})();
