import { useState, type FormEvent } from "react";
import { getSupabase } from "../lib/supabaseClient";
import appIcon from "../assets/app-icon.png";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const { error: signInError } = await getSupabase().auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInError) setError(signInError.message);
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 border-t border-neutral-200 p-5">
      <div className="flex flex-col items-center gap-1.5">
        <img src={appIcon} alt="" className="h-9 w-9 rounded-xl" />
        <p className="text-sm font-medium text-neutral-700">登入 TODO 小工具</p>
      </div>
      <form onSubmit={handleSubmit} className="flex w-full flex-col gap-2">
        <input
          type="email"
          placeholder="Email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100"
        />
        <input
          type="password"
          placeholder="密碼"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100"
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-accent-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-700 disabled:opacity-50"
        >
          {loading ? "登入中…" : "登入"}
        </button>
      </form>
    </div>
  );
}
