(function () {
	function setupToggle(toggleId) {
		var icon = document.getElementById(toggleId);
		if (!icon) return;

		var input = icon.closest('.input-field').querySelector('input[type="password"], input[type="text"]');
		if (!input) return;

		icon.addEventListener('click', function () {
			if (input.type === 'password') {
				input.type = 'text';
				icon.classList.remove('fa-eye');
				icon.classList.add('fa-eye-slash');
			} else {
				input.type = 'password';
				icon.classList.remove('fa-eye-slash');
				icon.classList.add('fa-eye');
			}
		});
	}

	setupToggle('toggle-signin-password');
	setupToggle('toggle-signup-password');
})();
