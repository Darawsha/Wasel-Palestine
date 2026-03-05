(function () {
	var signInForm = document.querySelector('.sign-in-form');

	if (!signInForm || !window.authApi) {
		return;
	}

	signInForm.addEventListener('submit', async function (e) {
		e.preventDefault();

		var email = signInForm.querySelector('input[type="text"]').value.trim();
		var password = signInForm.querySelector('input[type="password"]').value;

		var errors = window.validators.validateSignIn(email, password);
		if (errors.length > 0) {
			window.showError(errors.join('\n'));
			return;
		}

		try {
			await window.authApi.post('/signin', { email: email, password: password });
			window.formHelper.clearFields(signInForm);
			window.showSuccess('Login successful! Redirecting...');
		} catch (error) {
			window.showError('Login failed: ' + window.errorHelper.getErrorText(error));
		}
	});
})();
