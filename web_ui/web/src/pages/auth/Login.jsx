import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, mustChangePassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const data = await login(username, password);
      if (data.must_change_password) {
        navigate("/change-password");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-() flex items-center justify-center px-4">
      <div className="w-full max-w-sm"> 
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mb-3">
            <span className="text-2xl">🙂</span>
          </div>
          <h1 className="text-[#eafff5] text-lg font-semibold">Ormoc Transport App</h1>
        </div>

        <div className="bg-[#0a2420] rounded-2xl p-6">
          <h2 className="text-[#eafff5] text-xl font-semibold mb-1">Terminal Admin Login</h2>
          <p className="text-[#9fcabd] text-sm mb-6">Sign in to manage terminal operations</p>

          {error && (
            <div className="bg-[#3A1B14] text-[#D98B72] text-sm rounded-xl px-4 py-3 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[#9fcabd] text-xs mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[#eafff5] text-sm outline-none focus:border-[#1D9E75] transition-colors"
                placeholder="Enter your username"
              />
            </div>

            <div>
              <label className="block text-[#9fcabd] text-xs mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[#eafff5] text-sm outline-none focus:border-[#1D9E75] transition-colors"
                placeholder="Enter your password"
              />
            </div>

            // Sign in button
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#1D9E75] text-[#04342C] font-semibold rounded-xl py-3 mt-2 disabled:opacity-60 transition-opacity"
            >
              {isSubmitting ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
