const https = require('https');

function httpPost(url, formData) {
  return new Promise((resolve, reject) => {
    const body = Object.entries(formData)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
        'User-Agent': 'Mozilla/5.0',
        'Origin': 'https://ssi.mef.gob.pe',
        'Referer': 'https://ssi.mef.gob.pe/'
      }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          console.log('Total filas:', parsed.length);
          console.log('Primera fila:', JSON.stringify(parsed[0], null, 2));
          console.log('\nSuma MTO_DEVEN:', parsed.reduce((s,r) => s + (parseFloat(r.MTO_DEVEN)||0), 0));
          console.log('Suma DEV_ANIO1:', parsed.reduce((s,r) => s + (parseFloat(r.DEV_ANIO1)||0), 0));
        } catch(e) {
          console.log('Raw:', data.substring(0, 1000));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

httpPost('https://ofi5.mef.gob.pe/invierteWS/Ssi/traeDevengPIM', { id: '2591893', tipo: 'FINAN' });
