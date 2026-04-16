export function withJsonHeaders(extraHeaders = {}) {
  return {
    headers: {
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
  };
}

export function withBearerToken(token, extraHeaders = {}) {
  return withJsonHeaders({
    Authorization: `Bearer ${token}`,
    ...extraHeaders,
  });
}
