function storeToken(token) {
    localStorage.setItem('jwtToken', token);
}

window.storeToken = storeToken;