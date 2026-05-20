const { createUser, getUserByUsername, updateUserStatus } = require('./src/lib/db');
(async () => {
  console.log('Creating test user...');
  const newUser = await createUser({
    username: 'testuser123',
    email: 'test@example.com',
    password: 'Password123!',
    fullName: 'Test User',
    ip_address: '1.2.3.4',
    status: 'pending'
  });
  console.log('Created:', newUser);

  const fetched = await getUserByUsername('testuser123');
  console.log('Fetched after creation:', fetched);

  // Simulate admin approval by updating status
  await updateUserStatus(newUser.id, 'approved');
  const afterApprove = await getUserByUsername('testuser123');
  console.log('After approval status:', afterApprove.status);
})();
