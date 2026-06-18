const baseUrl = 'http://127.0.0.1:8001/api/lookups';

async function test() {
  console.log('1. Testing GET /api/lookups/test_type');
  let getRes = await fetch(`${baseUrl}/test_type`);
  let getList = await getRes.json();
  console.log('GET response:', getList);

  console.log('\n2. Testing POST /api/lookups/test_type');
  let postRes = await fetch(`${baseUrl}/test_type`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value: 'v1', label: 'L1', sort_order: 1 })
  });
  let item = await postRes.json();
  console.log('POST response:', item);

  if (item.error) {
    return console.error('Aborting. Error:', item.error);
  }

  const id = item.id;

  console.log(`\n3. Testing PATCH /api/lookups/item/${id}`);
  let patchRes = await fetch(`${baseUrl}/item/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ label: 'L1 Updated', isActive: false })
  });
  let patchItem = await patchRes.json();
  console.log('PATCH response:', patchItem);

  console.log(`\n4. Testing DELETE /api/lookups/item/${id}`);
  let deleteRes = await fetch(`${baseUrl}/item/${id}`, {
    method: 'DELETE'
  });
  let deleteData = await deleteRes.json();
  console.log('DELETE response:', deleteData);

  console.log('\n5. Verifying deletion GET /api/lookups/test_type');
  let finalGetRes = await fetch(`${baseUrl}/test_type`);
  let finalGetList = await finalGetRes.json();
  console.log('Final GET response:', finalGetList);
}

test().catch(console.error);
