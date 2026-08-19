import { getToken } from './auth.js';
getToken()
  .then((t) => console.log('TOKEN_OK len=' + t.length))
  .catch((e) => { console.error('TOKEN_FAIL', e.message); process.exit(1); });
