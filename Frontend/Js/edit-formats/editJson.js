function editJsonFormat(jsonString) {
	// remove { } and " "
    jsonString = jsonString.replace(/{|}|"/g, '');
    return jsonString;
}

window.editJsonFormat = editJsonFormat;