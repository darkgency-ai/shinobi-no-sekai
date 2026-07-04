const { getStore, connectLambda } = require('@netlify/blobs');

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  try {
    connectLambda(event);
    const store = getStore({ name: 'shinobi-no-sekai', consistency: 'strong' });

    if (event.httpMethod === 'GET') {
      const data = await store.get('state', { type: 'json' });
      return { statusCode: 200, headers, body: JSON.stringify(data || null) };
    }

    if (event.httpMethod === 'POST') {
      let body;
      try {
        body = JSON.parse(event.body || '{}');
      } catch (e) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'JSON invalide' }) };
      }
      await store.setJSON('state', body);
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Méthode non autorisée' }) };
  } catch (e) {
    console.error('ERREUR FONCTION DATA:', e && e.stack ? e.stack : e);
    return { statusCode: 500, headers, body: JSON.stringify({ error: String((e && e.message) || e) }) };
  }
};
