const { getStore, connectLambda } = require('@netlify/blobs');

exports.handler = async (event) => {
  connectLambda(event);

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  const store = getStore({ name: 'shinobi-no-sekai', consistency: 'strong' });

  if (event.httpMethod === 'GET') {
    try {
      const data = await store.get('state', { type: 'json' });
      return { statusCode: 200, headers, body: JSON.stringify(data || null) };
    } catch (e) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erreur de lecture' }) };
    }
  }

  if (event.httpMethod === 'POST') {
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (e) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'JSON invalide' }) };
    }
    try {
      await store.setJSON('state', body);
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    } catch (e) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erreur d\'écriture' }) };
    }
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Méthode non autorisée' }) };
};
