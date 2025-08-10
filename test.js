
window.addEventListener("load", async () => {
    if (window.location.hash.includes("access_token")) {
        try {
            const { data, error } = await supabase.auth.getSessionFromUrl({ storeSession: true });
            if (error) {
                console.error("Error on reset link", error.message);
            } else {
                console.log("Password reset session", data.session);
                forgotPasswordForm.style.display = "none";
                resetPasswordForm.style.display = "block";
                // history.replaceState(null, "", window.location.pathname);
            }
        } catch (err) {
            console.error("Unexpected error", err);
        }
    }
});

