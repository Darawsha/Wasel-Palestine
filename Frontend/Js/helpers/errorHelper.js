function getErrorText(error) {
	if (error && error.response && error.response.data) {
		return JSON.stringify(error.response.data);
	}
	return error && error.message ? error.message : 'Unknown error';
}

window.errorHelper = { getErrorText: getErrorText };
