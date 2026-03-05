var authApi = axios.create({
	baseURL: window.AppConfig.API_BASE_URL,
	headers: {
		'Content-Type': 'application/json',
	},
});

window.authApi = authApi;