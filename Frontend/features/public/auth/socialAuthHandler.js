import { redirectUser, setCurrentUser } from "/Services/session.service.js";

let googleTokenClient = null;

function persistSocialSession(authResult) {
  if (!authResult?.access_token || !authResult?.user) {
    throw new Error("Invalid social login response");
  }

  setCurrentUser(authResult.user, authResult.access_token);
  redirectUser();
}

window.addEventListener("load", () => {
  if (window.google && google.accounts && google.accounts.oauth2) {
    googleTokenClient = google.accounts.oauth2.initTokenClient({
      client_id: "296325964496-kflv79cbuslllqgl2u84q0em5f0m71q8.apps.googleusercontent.com",
      scope: "openid email profile",
      callback: async (response) => {
        try {
          const res = await axios.post("/api/v1/auth/google", {
            accessToken: response.access_token,
          });

          persistSocialSession(res.data);
        } catch (error) {
          console.error("Google login failed:", error);
        }
      },
    });
  } else {
    console.error("Google SDK not loaded");
  }

  const googleSigninBtn = document.getElementById("google-signin-btn");
  const googleSignupBtn = document.getElementById("google-signup-btn");
  const linkedinSigninBtn = document.getElementById("linkedin-signin-btn");
  const linkedinSignupBtn = document.getElementById("linkedin-signup-btn");

  if (googleSigninBtn) {
    googleSigninBtn.addEventListener("click", (event) => {
      event.preventDefault();

      if (googleTokenClient) {
        googleTokenClient.requestAccessToken();
      } else {
        console.error("Google token client not initialized");
      }
    });
  }

  if (googleSignupBtn) {
    googleSignupBtn.addEventListener("click", (event) => {
      event.preventDefault();

      if (googleTokenClient) {
        googleTokenClient.requestAccessToken();
      } else {
        console.error("Google token client not initialized");
      }
    });
  }

  if (linkedinSigninBtn) {
    linkedinSigninBtn.addEventListener("click", (event) => {
      event.preventDefault();
      window.location.assign("/api/v1/auth/linkedin");
    });
  }

  if (linkedinSignupBtn) {
    linkedinSignupBtn.addEventListener("click", (event) => {
      event.preventDefault();
      window.location.assign("/api/v1/auth/linkedin");
    });
  }
});
