export class SocialAuthService {
  static googleTokenClient = null;

  static initGoogle() {
    if (!window.google || !google.accounts || !google.accounts.oauth2) {
      console.error("Google SDK not loaded");
      return;
    }

    this.googleTokenClient = google.accounts.oauth2.initTokenClient({
      client_id: "296325964496-kflv79cbuslllqgl2u84q0em5f0m71q8.apps.googleusercontent.com",
      scope: "openid email profile",
      callback: async (response) => {
        try {
          const res = await axios.post("http://localhost:3000/api/v1/auth/google", {
            accessToken: response.access_token,
          });

          localStorage.setItem("token", res.data.access_token);
          localStorage.setItem("user", JSON.stringify(res.data.user));

          window.location.href =
            "http://localhost:3000/views/citizen/header/header.html#home";
        } catch (error) {
          console.error("Google login failed:", error);
        }
      },
    });
  }

  static startGoogleLogin() {
    if (this.googleTokenClient) {
      this.googleTokenClient.requestAccessToken();
    } else {
      console.error("Google token client not initialized");
    }
  }

  static startLinkedinLogin() {
    window.location.href = "http://localhost:3000/api/v1/auth/linkedin";
  }
}