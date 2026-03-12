
// Native fetch available in Node 22

const BASE_URL = 'http://localhost:8081';
const SESSION_ID = 'ddcdb0d6-2bc7-44d0-ba46-5648ce5a7cb7'; // From sessions.json

async function testEditFlow() {
  console.log('--- Testing Edit Flow ---');

  // 1. Get conversations
  const convsRes = await fetch(`${BASE_URL}/api/sessions/${SESSION_ID}/conversations`);
  const convs = await convsRes.json();
  const convId = convs.conversations[0]?.id;
  if (!convId) {
    console.error('No conversation found');
    return;
  }
  console.log(`Using conversation: ${convId}`);

  // 2. Get messages
  const msgRes = await fetch(`${BASE_URL}/api/sessions/${SESSION_ID}/conversations/${convId}`);
  const { messages } = await msgRes.json();
  const userMsg = messages.find(m => m.role === 'user');
  if (!userMsg) {
    console.error('No user message found');
    return;
  }
  console.log(`Editing message: ${userMsg.id} ("${userMsg.content}")`);

  // 3. Edit message
  const editRes = await fetch(`${BASE_URL}/api/sessions/${SESSION_ID}/conversations/${convId}/messages/${userMsg.id}/edit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: 'EDITED: ' + userMsg.content })
  });

  if (!editRes.ok) {
    const error = await editRes.json();
    console.error('Edit failed:', error);
    return;
  }

  const { branchId, messageId } = await editRes.json();
  console.log(`Edit successful! New branch: ${branchId}, New message ID: ${messageId}`);

  // 4. Try to regenerate (expect 400)
  console.log(`Attempting regenerate on user message ${messageId} (SHOULD FAIL WITH 400)`);
  const regenRes = await fetch(`${BASE_URL}/api/sessions/${SESSION_ID}/conversations/${convId}/messages/${messageId}/regenerate`, {
    method: 'POST'
  });

  if (regenRes.status === 400) {
    console.log('Regenerate failed with 400 as expected: "Only assistant messages can be regenerated"');
  } else {
    console.log(`Unexpected result for regenerate: ${regenRes.status}`);
  }

  console.log('--- Test Complete ---');
}

testEditFlow().catch(console.error);
