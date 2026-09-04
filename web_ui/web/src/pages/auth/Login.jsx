import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Eye, EyeClosed, User, Key } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isHidden, setVisibility] = useState(true);
  const [isVisible, setIsvisible] = useState(false)

  const { login, mustChangePassword } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (error) {
      const animationFrame = requestAnimationFrame(() => {
        setIsvisible(true);
      });

      const timer = setTimeout(() => {
      setIsvisible(false);
      }, 2000);

      const clearErrorTimer = setTimeout(() => {
        setError(null);
      }, 25000);

      return () => {
        cancelAnimationFrame(animationFrame);
        clearTimeout(timer);
        clearTimeout(clearErrorTimer);
      };
    };
  }, [error]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(username, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-screen h-screen bg-[#042F2E] flex items-center justify-center relative"> {/* body wrapper */}

      <div className="w-[457px] h-max flex flex-col items-right justify-between"> {/* form wrapper */}
        <div className="flex flex-col items-center mb-8"> {/* Web Title */}
          <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mb-3">
            <span className="text-2xl">🙂</span>
          </div>
          <h1 className="text-[#eafff5] font-[family-name:var(--poppins-font)] font-semibold text-2xl">Ormoc Transport App</h1>
        </div>

        <div className="flex flex-col items-start justify-center w-full h-max bg-[#134E4A] rounded-[10px] px-[46px] py-[23px] gap-y-[40px]">
          <div className="w-full h-max flex flex-col items-start justify-center">
            <h2 className="text-[#eafff5] text-xl font-[family-name: var(--poppins-font)] font-semibold mb-1">Admin Login</h2>

            {/* Horizontal line */}
            <div className="w-[60px] h-[2px] bg-[var(--labels)]"></div>
          </div>

          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-[11px]">
            <div>
              <label className="block text-[var(--labels)] text-[12px] mb-1.5">Username or Email</label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  className="w-full bg-[var(--btn-fg)] border border-[var(--stroke-color)] rounded-[var(--input-radius)] px-10 py-3 text-[#eafff5] text-sm outline-none focus:border-[var(--stroke-color-focus)] transition-colors"
                  placeholder="Enter your username"
                />

                <div className="absolute left-3 top-1/2 -translate-y-1/2 cursor-pointer">
                  <User 
                    size={"18px"}
                    color={"#22D3EE"}
                  />
                </div>
              </div>
            </div>
              
            <div>
              <label className="block text-[var(--labels)] text-xs mb-1.5">Password</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 cursor-pointer">
                  <Key 
                    size={"18px"}
                    color={"#22D3EE"}
                  />
                </div>
                <input
                  type={isHidden ? "password" : "text"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full bg-[var(--btn-fg)] border border-[var(--stroke-color)] rounded-[var(--input-radius)] px-10 py-3 text-[#eafff5] text-sm outline-none focus:border-[var(--stroke-color-focus)] transition-colors"
                  placeholder="Enter your password"
                />

                <div className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer">
                  {isHidden ? 
                      <EyeClosed
                        size={"18px"} 
                        color={"#22D3EE"}
                        onClick={() => setVisibility(!isHidden)}
                      />
                    :
                      <Eye 
                        size={"18px"} 
                        color={"#22D3EE"}
                        onClick={() => setVisibility(!isHidden)}
                      />
                  }
                </div>
              </div>
            </div>
            <a
              href=""
              className="text-right text-[var(--labels)] w-full text-xs hover:underline"
            >
              Forgot Password?
            </a>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-[46px] flex items-center justify-center bg-[var(--labels)] text-[var(--btn-fg)] font-semibold rounded-[5px] mt-2 hover:bg-[#40c2d6] transition-bg"
            >
              {isSubmitting ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
      {error && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-[#3A1B14] text-[#D98B72] text-sm rounded-xl px-4 py-3 shadow-lg transition-all duration-300 ease-in-out ${
            isVisible
              ? "translate-y-0 opacity-100"
              : "-translate-y-16 opacity-0"
          }`}>
          {error}
        </div>
      )}
    </div>
  );
}
