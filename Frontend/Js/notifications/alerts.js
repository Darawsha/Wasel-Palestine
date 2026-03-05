function showAlert(type, message) {
	if (typeof Swal === 'undefined') {
		alert(message);
		return;
	}

	var icons = {
		success: 'success',
		error: 'error',
		warning: 'warning',
		info: 'info',
	};

	Swal.fire({
		icon: icons[type] || 'info',
		title: type.charAt(0).toUpperCase() + type.slice(1),
		text: message,
		confirmButtonColor: {
			success: '#28a745',
			error: '#dc3545',
			warning: '#ffc107',
			info: '#17a2b8',
		}[type] || '#17a2b8',
	});
}

function showSuccess(message) {
	showAlert('success', message);
}

function showError(message) {
	showAlert('error', message);
}

function showWarning(message) {
	showAlert('warning', message);
}

function showInfo(message) {
	showAlert('info', message);
}

window.showSuccess = showSuccess;
window.showError = showError;
window.showWarning = showWarning;
window.showInfo = showInfo;
window.showAlert = showAlert;
