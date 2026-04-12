import {
  redirectToSignIn,
  redirectUser,
  setCurrentUser,
} from "/Services/session.service.js";

const statusElement = document.getElementById("linkedin-auth-status");

function setStatus(message) {
  if (statusElement) {
    statusElement.textContent = message;
  }
}

function getErrorMessage(error, fallbackMessage) {
  if (typeof error === "string" && error.trim()) {
    return error;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
}

async function exchangeLinkedinCode(code, state) {
  const response = await fetch("/api/v1/auth/linkedin", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code, state }),
  });

  const text = await response.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const message =
      data?.message && Array.isArray(data.message)
        ? data.message.join(", ")
        : data?.message || data;

    throw new Error(getErrorMessage(message, "LinkedIn authentication failed"));
  }

  return data;
}

async function handleLinkedinCallback() {
  const params = new URLSearchParams(window.location.search);
  const providerError = params.get("error");
  const code = params.get("code");
  const state = params.get("state");

  if (providerError) {
    throw new Error(providerError);
  }

  if (!code || !state) {
    throw new Error("Missing LinkedIn authorization code");
  }

  const authResult = await exchangeLinkedinCode(code, state);
  setCurrentUser(authResult.user, authResult.access_token);
  redirectUser();
}

handleLinkedinCallback().catch((error) => {
  console.error("LinkedIn callback failed:", error);
  setStatus(getErrorMessage(error, "LinkedIn sign-in failed. Redirecting..."));

  window.setTimeout(() => {
    redirectToSignIn();
  }, 1500);
});
