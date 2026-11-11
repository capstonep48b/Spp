import core from './midtrans-core.js';

export default {
  async fetch(request, env) {
    const apiResponse = await core.handleApiRequest(request, env, fetch);
    if (apiResponse) {
      return new Response(apiResponse.body, {
        status: apiResponse.status,
        headers: apiResponse.headers
      });
    }

    return new Response(
      JSON.stringify({
        ok: false,
        code: 'NOT_FOUND',
        message: 'Endpoint API tidak ditemukan.'
      }),
      {
        status: 404,
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        }
      }
    );
  }
};
