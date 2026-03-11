(function () {
	function isReady() {
		return !!(
			window.authApi &&
			window.formHelper &&
			window.errorHelper &&
			window.showError &&
			window.showSuccess
		);
	}

	function getValue(form, selector, shouldTrim) {
		var input = form.querySelector(selector);
		var value = input ? input.value : '';

		if (shouldTrim) {
			return value.trim();
		}

		return value;
	}

	function showValidationErrors(errors) {
		if (!errors || !errors.length) {
			return false;
		}

		window.showError(errors.join('\n'));
		return true;
	}

	async function submit(options) {
		if (!options || !options.form || !options.endpoint || !isReady()) {
			return false;
		}

		try {
			const response = await window.authApi.post(options.endpoint, options.data || {});

			if (window.storeToken && response && response.data && response.data.access_token) {
				window.storeToken(response.data.access_token);
			}

			window.formHelper.clearFields(options.form);
			window.showSuccess(options.successMessage || 'Operation successful.');
			return true;
		} catch (error) {
			var prefix = options.failurePrefix || 'Operation failed: ';
			window.showError(prefix + window.errorHelper.getErrorText(error));
			return false;
		}
	}

	window.authFormHandler = {
		isReady: isReady,
		getValue: getValue,
		showValidationErrors: showValidationErrors,
		submit: submit,
	};
})();