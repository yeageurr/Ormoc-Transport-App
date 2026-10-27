import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Eye, EyeClosed, User, Key } from 'lucide-react';
import setTitle from "../../components/pageTitle";
import ormocDriverMark from "../../../../OTA-Ticketing/src/assets/ormoc-driver-mark.png";

export default function Login() {
  setTitle('Admin Login');
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
      navigate('/users');
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-screen items-center justify-center bg-[#A9E4FF] px-4"> {/* body wrapper */}

      <div className="w-[457px] h-max flex flex-col items-right justify-between"> {/* form wrapper */}
        <div className="flex flex-col items-center mb-8"> {/* Web Title */}
          <img className="mb-3 h-20 w-20 object-contain" src={ormocDriverMark} alt="Ormoc City transport logo" />
          <h1 className="text-center text-2xl font-semibold text-[#173b4e]">Ormoc Transport App</h1>
        </div>

        <div className="flex h-max w-full flex-col items-start justify-center gap-y-8 rounded-xl border border-[#d4e4eb] bg-[#f5fbff] px-8 py-7 shadow-[0_12px_35px_rgba(10,44,63,0.12)] max-sm:px-5">
          <div className="w-full h-max flex flex-col items-start justify-center">
            <h2 className="mb-1 text-xl font-semibold text-[#173b4e]">Admin Login</h2>

            {/* Horizontal line */}
            <div className="h-[2px] w-[60px] bg-[#168dff]"></div>
          </div>

          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-[11px]">
            <div>
              <label className="mb-1.5 block text-[12px] text-[#405f6d]">Username or Email</label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  className="w-full rounded-md border border-[#becbd1] bg-white px-10 py-2.5 text-sm text-[#203f4f] outline-none transition-colors placeholder:text-[#718792] focus:border-[#168dff]"
                  placeholder="Enter your username"
                />

                <div className="absolute left-3 top-1/2 -translate-y-1/2 cursor-pointer">
                  <User 
                    size={"18px"}
                    color={"#0879ac"}
                  />
                </div>
              </div>
            </div>
              
            <div>
              <label className="mb-1.5 block text-xs text-[#405f6d]">Password</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 cursor-pointer">
                  <Key size={"18px"} color={"#0879ac"}/>
                </div>
                <input
                  type={isHidden ? "password" : "text"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full rounded-md border border-[#becbd1] bg-white px-10 py-2.5 text-sm text-[#203f4f] outline-none transition-colors placeholder:text-[#718792] focus:border-[#168dff]"
                  placeholder="Enter your password"
                />

                <div className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer">
                  {isHidden ? 
                      <EyeClosed
                        size={"18px"} 
                        color={"#52636b"}
                        onClick={() => setVisibility(!isHidden)}
                      />
                    :
                      <Eye 
                        size={"18px"} 
                        color={"#52636b"}
                        onClick={() => setVisibility(!isHidden)}
                      />
                  }
                </div>
              </div>
            </div>
            <Link
              to="/forgot-password"
              className="w-full text-right text-xs text-[#0879ac] hover:underline"
            >
              Forgot Password?
            </Link>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 flex h-[35px] w-full items-center justify-center rounded-md border-0 bg-[#168dff] font-semibold text-white transition-colors hover:bg-[#0876db] disabled:opacity-60"
            >
              {isSubmitting ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
      {error && (
        <div className={`fixed left-1/2 top-6 z-50 -translate-x-1/2 rounded-md border border-[#f3c9c9] bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-lg transition-all duration-300 ease-in-out ${
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
