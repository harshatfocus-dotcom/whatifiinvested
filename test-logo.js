const https = require('https');
https.get('https://autocomplete.clearbit.com/v1/companies/suggest?query=Reliance%20Industries', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(data));
});
