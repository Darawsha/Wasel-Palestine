(function () {
	var signUpForm = document.querySelector('.sign-up-form');

	if (!signUpForm || !window.authApi) {
		return;
	}

	signUpForm.addEventListener('submit', async function (e) {
		e.preventDefault();

		var data = {
			firstname: signUpForm.querySelector('input[placeholder="First Name"]').value.trim(),
			lastname: signUpForm.querySelector('input[placeholder="Last Name"]').value.trim(),
			email: signUpForm.querySelector('input[placeholder="Email"]').value.trim(),
			password: signUpForm.querySelector('input[type="password"]').value,
			phone: signUpForm.querySelector('input[placeholder="Phone(Optional)"]').value.trim(),
			address: signUpForm.querySelector('input[placeholder="Address(Optional)"]').value.trim(),
		};

		var errors = window.validators.validateSignUp(data);
		if (errors.length > 0) {
			window.showError(errors.join('\n'));
			return;
		}

		try {
			await window.authApi.post('/register', data);
			window.formHelper.clearFields(signUpForm);
			window.showSuccess('Signup successful! Please sign in.');
		} catch (error) {
			window.showError('Signup failed: ' + window.errorHelper.getErrorText(error));
		}
	});
})();
