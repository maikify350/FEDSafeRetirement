const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://gqarlkfmpgaotbezpkbs.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxYXJsa2ZtcGdhb3RiZXpwa2JzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTA2NDYzNCwiZXhwIjoyMDkwNjQwNjM0fQ.N8TxFsnqnGUkMK_qmvATDSs-kyneci8ULziUHzpOwq8';

async function main() {
  console.log('1. Ensuring "gallery" bucket is public...');
  
  // Check bucket
  const getBucketRes = await fetch(`${SUPABASE_URL}/storage/v1/bucket/gallery`, {
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`
    }
  });

  if (getBucketRes.status === 404) {
    console.log('Creating gallery bucket...');
    const createRes = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id: 'gallery',
        name: 'gallery',
        public: true
      })
    });
    console.log('Bucket created status:', createRes.status);
  } else {
    console.log('Gallery bucket status:', getBucketRes.status);
  }

  const dirsToUpload = [
    path.join(__dirname, '../App/public/images/scenes'),
    path.join(__dirname, '../_ARCHIVE_SCENES')
  ];

  let uploadedCount = 0;
  let errorCount = 0;

  for (const dir of dirsToUpload) {
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir);
    console.log(`\nScanning directory: ${dir} (${files.length} files)`);

    for (const file of files) {
      const filePath = path.join(dir, file);
      if (!fs.statSync(filePath).isFile()) continue;

      const ext = path.extname(file).toLowerCase();
      if (!['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif'].includes(ext)) continue;

      let contentType = 'image/png';
      if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
      else if (ext === '.webp') contentType = 'image/webp';
      else if (ext === '.svg') contentType = 'image/svg+xml';
      else if (ext === '.gif') contentType = 'image/gif';

      const fileBuffer = fs.readFileSync(filePath);
      const encodedFilename = encodeURIComponent(file);

      // Direct Storage API upload
      const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/gallery/${encodedFilename}`, {
        method: 'POST',
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Content-Type': contentType,
          'x-upsert': 'true'
        },
        body: fileBuffer
      });

      if (!uploadRes.ok) {
        const errText = await uploadRes.text();
        console.error(`Error uploading ${file} (${uploadRes.status}):`, errText);
        errorCount++;
      } else {
        uploadedCount++;
        if (uploadedCount % 10 === 0) {
          console.log(`Uploaded ${uploadedCount} images...`);
        }
      }
    }
  }

  console.log(`\nMigration completed! Successfully uploaded ${uploadedCount} files to Supabase gallery (Errors: ${errorCount}).`);
}

main().catch(console.error);
