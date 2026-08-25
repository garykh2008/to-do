import { useState, type FormEvent } from "react";
import { supabase } from "../lib/supabaseClient";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInError) setError(signInError.message);
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-4">
      <p className="text-sm font-medium">TODO 小工具</p>
      <form onSubmit={handleSubmit} className="flex w-full flex-col gap-2">
        <input
          type="email"
          placeholder="Email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-neutral-500"
        />
        <input
          type="password"
          placeholder="密碼"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-neutral-500"
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? "登入中…" : "登入"}
        </button>
      </form>
    </div>
  );
}
