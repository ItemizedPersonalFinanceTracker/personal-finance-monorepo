import { useCallback, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
    Alert,
    Anchor,
    Button,
    PasswordInput,
    Paper,
    Stack,
    Text,
    TextInput,
    Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useLoginMutation, useRegisterMutation } from "../../store/api/authApi";

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
    const [name, setName] = useState("");
    const [isRegister, setIsRegister] = useState(false);
    const [register, { isLoading: isRegisterLoading }] = useRegisterMutation();

    const handleLogin = useCallback(
        async (event: FormEvent<HTMLFormElement>) => {
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
        },
        [email, password, login, navigate],
    );

    const handleRegister = useCallback(
        async (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            setErrorMessage(null);
            const trimmedEmail = email.trim();
            if (!trimmedEmail || !password || !name) {
                setErrorMessage("Enter your email and password.");
                return;
            }
            try {
                await register({ email: trimmedEmail, name: name, password: password }).unwrap();
                notifications.show({
                    title: "Success",
                    message: "Account created. You can sign in now.",
                    color: "green",
                });
                setName("");
                setIsRegister(false);
            } catch (error) {
                setErrorMessage("Failed to create account. Please try again." + error);
            }
        },
        [email, name, password, register],
    );

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <Paper className="w-full max-w-sm" shadow="md" p="xl" radius="md" withBorder>
                <Title order={2} className="mb-6 text-center">
                    {isRegister ? "Register" : "Sign in"}
                </Title>
                {!isRegister ? 
                    <form onSubmit={handleLogin}>
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
                                {isLoading
                                    ? "Signing in..."
                                    : "Sign in"}
                            </Button>
                        </Stack>
                    </form> : 
                    <form onSubmit={handleRegister}>
                        <Stack gap="md">
                            {errorMessage ? (
                                <Alert color="red" title="Registration failed">
                                    {errorMessage}
                                </Alert>
                            ) : null}
                            <TextInput
                                label="Email"
                                type="email"
                                autoComplete="email"
                                value={email}
                                onChange={(e) => setEmail(e.currentTarget.value)}
                                disabled={isRegisterLoading}
                                required
                            />
                            <TextInput
                                label="Name"
                                type="text"
                                autoComplete="name"
                                value={name}
                                onChange={(e) => setName(e.currentTarget.value)}
                                disabled={isRegisterLoading}
                                required
                            />
                            <PasswordInput
                                label="Password"
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => setPassword(e.currentTarget.value)}
                                disabled={isRegisterLoading}
                                required
                            />
                            <Button type="submit" loading={isRegisterLoading} fullWidth className="mt-2">
                                {isRegisterLoading
                                    ? "Creating account..."
                                    : "Register"}
                            </Button>
                        </Stack>
                    </form>
                }
                <Text size="sm" ta="center" c="dimmed" mt="md">
                    {isRegister ? (
                        <>
                            Already have an account?{" "}
                            <Anchor
                                component="button"
                                type="button"
                                onClick={() => setIsRegister(false)}
                            >
                                Sign in
                            </Anchor>
                        </>
                    ) : (
                        <>
                            {"Don't have an account? "}
                            <Anchor
                                component="button"
                                type="button"
                                onClick={() => setIsRegister(true)}
                            >
                                Register
                            </Anchor>
                        </>
                    )}
                </Text>
            </Paper>
        </div>
    );
}
