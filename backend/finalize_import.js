const fs = require('fs');
const path = require('path');

async function run() {
  try {
    console.log('1. Logging in as Aisha...');
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'aisha@splitease.com',
        password: 'password123'
      })
    });
    
    const loginData = await loginRes.json();
    if (!loginRes.ok) throw new Error('Login failed: ' + JSON.stringify(loginData));
    const token = loginData.token;
    console.log('   Login successful!');
    
    console.log('2. Uploading CSV to group 1 ("Flat Expenses")...');
    const csvPath = path.join(__dirname, '../Expenses Export.csv');
    const csvContent = fs.readFileSync(csvPath);
    
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    let payload = `--${boundary}\r\n`;
    payload += `Content-Disposition: form-data; name="file"; filename="Expenses Export.csv"\r\n`;
    payload += `Content-Type: text/csv\r\n\r\n`;
    
    const headerBuffer = Buffer.from(payload, 'utf-8');
    const footerBuffer = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf-8');
    const bodyBuffer = Buffer.concat([headerBuffer, csvContent, footerBuffer]);
    
    const importRes = await fetch('http://localhost:5000/api/groups/1/import', {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Authorization': `Bearer ${token}`
      },
      body: bodyBuffer
    });
    
    const importData = await importRes.json();
    if (!importRes.ok) throw new Error('Upload failed: ' + JSON.stringify(importData));
    const importId = importData.importId;
    console.log(`   Upload successful! Import ID: ${importId}.`);
    
    console.log('3. Fetching anomalies from DB to get database IDs...');
    const importDetailsRes = await fetch(`http://localhost:5000/api/imports/${importId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const importDetails = await importDetailsRes.json();
    const anomaliesFromDB = importDetails.import.anomalies;
    console.log(`   Found ${anomaliesFromDB.length} anomalies in database.`);
    
    console.log('4. Resolving anomalies according to rules...');
    const resolutions = {};
    for (const a of anomaliesFromDB) {
      if (a.severity === 'REQUIRES_ACTION') {
        resolutions[a.id.toString()] = {
          action: a.resolvedValue === 'skip' ? 'skip' : 'keep',
          value: a.resolvedValue
        };
      } else if (a.severity === 'WARNING' && a.requiresApproval) {
        resolutions[a.id.toString()] = {
          action: 'approved',
          value: null
        };
      }
    }
    
    console.log(`   Applying resolutions for ${Object.keys(resolutions).length} anomalies...`);
    const finalizeRes = await fetch(`http://localhost:5000/api/imports/${importId}/finalize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ resolutions })
    });
    
    const finalizeData = await finalizeRes.json();
    if (!finalizeRes.ok) throw new Error('Finalization failed: ' + JSON.stringify(finalizeData));
    console.log('   Finalization successful!');
    
    console.log('\n5. Fetching final Import Report...');
    const reportRes = await fetch(`http://localhost:5000/api/imports/${importId}/report`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const reportData = await reportRes.json();
    
    console.log('\n==================== IMPORT REPORT ====================');
    console.log(`Title: ${reportData.report.title}`);
    console.log(`Status: ${reportData.report.status}`);
    console.log(`Summary:`);
    console.log(`- Total Rows in CSV: ${reportData.report.summary.totalRows}`);
    console.log(`- Imported Rows:     ${reportData.report.summary.importedRows}`);
    console.log(`- Skipped Rows:      ${reportData.report.summary.skippedRows}`);
    console.log(`- Total Anomalies:   ${reportData.report.summary.totalAnomalies}`);
    console.log(`  - Auto Fixed:      ${reportData.report.summary.autoFixed}`);
    console.log(`  - Warnings:        ${reportData.report.summary.warnings}`);
    console.log(`  - Requires Action: ${reportData.report.summary.requiresAction}`);
    console.log('=======================================================');
    
  } catch (err) {
    console.error('Error:', err.message);
  }
}

run();
