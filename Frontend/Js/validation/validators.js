function isValidEmail(email) {
	var re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return re.test(email);
}

function isValidPassword(password) {
    var re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
	return re.test(password) && password.length >= 8;
}

function isRequired(value) {
	return value !== null && value !== undefined && value.trim() !== '';
}

function isValidPhone(phone) {
    // but phone is optional, so if it's empty, we consider it valid
	if (!phone) return true;
	var re = /^\+?[0-9]{7,15}$/;
	return re.test(phone);
}

function validateSignIn(email, password) {
	var errors = [];
	if (!isRequired(email)) errors.push('Email is required.');
	else if (!isValidEmail(email)) errors.push('Please enter a valid email address.');
	if (!isRequired(password)) errors.push('Password is required.');
	return errors;
}

function validateSignUp(data) {
	var errors = [];
	if (!isRequired(data.firstname)) errors.push('First name is required.');
	if (!isRequired(data.lastname)) errors.push('Last name is required.');
	if (!isRequired(data.email)) errors.push('Email is required.');
	else if (!isValidEmail(data.email)) errors.push('Please enter a valid email address.');
	if (!isRequired(data.password)) errors.push('Password is required.');
	else if (!isValidPassword(data.password)) errors.push('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number.');
	if (data.phone && !isValidPhone(data.phone)) errors.push('Please enter a valid phone number.');
	return errors;
}

window.validators = {
	isValidEmail: isValidEmail,
	isValidPassword: isValidPassword,
	isRequired: isRequired,
	isValidPhone: isValidPhone,
	validateSignIn: validateSignIn,
	validateSignUp: validateSignUp,
};
