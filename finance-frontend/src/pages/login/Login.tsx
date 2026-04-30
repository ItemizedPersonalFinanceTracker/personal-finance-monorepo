import { useNavigate } from "react-router-dom";
import { useLoginMutation } from "../../store/api/authApi";

export default function Login() {
    const navigate = useNavigate();
    const [login, { isLoading }] = useLoginMutation();

    function handleLogin() {
        void login({ email: "test@test.com", password: "1234" })
            .unwrap()
            .then(() => navigate("/home"));
    }

    return (
        <>
            <div>
                <p>Hello</p>
            </div>
            <button
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition duration-200"
                type="button"
                disabled={isLoading}
                onClick={handleLogin}
            >
                {isLoading ? "Logging in..." : "Login"}
            </button>
        </>
    );
}
