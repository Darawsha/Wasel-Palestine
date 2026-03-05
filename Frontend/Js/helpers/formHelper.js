function clearFields(form) {
	var inputs = form.querySelectorAll('input[type="text"], input[type="password"]');
	for (var i = 0; i < inputs.length; i++) {
		inputs[i].value = '';
	}
}

window.formHelper = { clearFields: clearFields };
