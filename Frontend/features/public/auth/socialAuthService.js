import { setCurrentUser } from "/Services/session.service.js";

export class SocialAuthService {
  static googleTokenClient = null;
  static fallbackOrigin = "http://localhost:3000";

  static getAppOrigin() {
    if (
      typeof window !== "undefined" &&
      window.location &&
      window.location.origin &&
      window.location.origin !== "null"
    ) {
      return window.location.origin;
    }

    return this.fallbackOrigin;
  }

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
          const res = await axios.post(`${this.getAppOrigin()}/api/v1/auth/google`, {
            accessToken: response.access_token,
          });

          setCurrentUser(res.data.user, res.data.access_token);

          window.location.href =
            `${this.getAppOrigin()}/views/citizen/header/header.html#home`;
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
    window.location.href = `${this.getAppOrigin()}/api/v1/auth/linkedin`;
  }
}
