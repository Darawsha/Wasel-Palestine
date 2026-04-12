import axios from 'axios';

async function testApi() {
    try {
        const login = await axios.post('http://localhost:3000/api/v1/auth/signin', {
            email: 'admin@wasel.ps',
            password: 'AdminPassword123!',
        });
        const token = login.data.accessToken;
        const url = 'http://localhost:3000/api/v1/reports?statuses=pending,under_review&duplicateOnly=false';
        console.log("Fetching:", url);
        const adminRes = await axios.get(url, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log("Admin Reports Count:", adminRes.data.data.length);
        console.log("Counts:", adminRes.data.counts);
    } catch (e) {
        console.log("Error:", e.response ? e.response.data : e.message);
    }
}
testApi();
