import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
    Alert,
    Button,
    PasswordInput,
    Paper,
    Stack,
    TextInput,
    Title,
} from "@mantine/core";
import { useLoginMutation } from "../../store/api/authApi";

function loginErrorMessage(error: unknown): string {
    if (
        error !== null &&
        typeof error === "object" &&
        "data" in error &&
        error.data !== null &&
        typeof error.data === "object"
    ) {
        const data = error.data as { detail?: string; non_field_errors?: string[] };
        if (typeof data.detail === "string") {
            return data.detail;
        }
        if (Array.isArray(data.non_field_errors) && data.non_field_errors[0]) {
            return data.non_field_errors[0];
        }
    }
    return "Could not sign in. Check your email and password.";
}

export default function Login() {
    const navigate = useNavigate();
    const [login, { isLoading }] = useLoginMutation();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setErrorMessage(null);
        const trimmedEmail = email.trim();
        if (!trimmedEmail || !password) {
            setErrorMessage("Enter your email and password.");
            return;
        }
        try {
            await login({ email: trimmedEmail, password }).unwrap();
            navigate("/home");
        } catch (err) {
            setErrorMessage(loginErrorMessage(err));
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <Paper className="w-full max-w-sm" shadow="md" p="xl" radius="md" withBorder>
                <Title order={2} className="mb-6 text-center">
                    Sign in
                </Title>
                <form onSubmit={handleSubmit}>
                    <Stack gap="md">
                        {errorMessage ? (
                            <Alert color="red" title="Sign-in failed">
                                {errorMessage}
                            </Alert>
                        ) : null}
                        <TextInput
                            label="Email"
                            type="email"
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.currentTarget.value)}
                            disabled={isLoading}
                            required
                        />
                        <PasswordInput
                            label="Password"
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.currentTarget.value)}
                            disabled={isLoading}
                            required
                        />
                        <Button type="submit" loading={isLoading} fullWidth className="mt-2">
                            {isLoading ? "Signing in..." : "Sign in"}
                        </Button>
                    </Stack>
                </form>
            </Paper>
        </div>
    );
}
