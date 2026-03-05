(function () {
	var signInBtn = document.getElementById('sign-in-btn');
	var signUpBtn = document.getElementById('sign-up-btn');
	var container = document.querySelector('.container');

	if (signUpBtn) {
		signUpBtn.addEventListener('click', function () {
			container.classList.add('sign-up-mode');
		});
	}

	if (signInBtn) {
		signInBtn.addEventListener('click', function () {
			container.classList.remove('sign-up-mode');
		});
	}
})();
