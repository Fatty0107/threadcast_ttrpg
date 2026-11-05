import { useState } from "react";
import { useLocation } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/components/auth/auth-context";
import { ArrowRight, Compass, Eye, EyeOff, LoaderCircle, LockKeyhole } from "lucide-react";
import "@/styles/journal-entry.css";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { setUser } = useAuth();
  const [, setLocation] = useLocation();
  const loginMutation = useLogin();
  const handleLogin = (event: React.FormEvent) => {
    event.preventDefault();
    loginMutation.mutate({ data: { username, password } }, {
      onSuccess: (data) => { setUser(data); setLocation("/characters"); },
    });
  };

  return (
    <main className="ae-login">
      <section className="ae-login-world" aria-labelledby="login-world-heading">
        <div className="ae-login-world-image" aria-hidden="true" />
        <div className="ae-login-wordmark"><Compass size={29} strokeWidth={1.1} aria-hidden="true" /><span>THREADCAST<small>WORLD OF AETHROS</small></span></div>
        <div className="ae-login-story"><p className="ae-kicker">A WORLD WOVEN BY YOUR CHOICES</p><h1 id="login-world-heading">The world is waiting.<br /><em>Take up your thread.</em></h1><p>Gather your companions. Shape your magic.<br />Leave your mark on Aethros.</p></div>
        <div className="ae-login-world-footer"><span>CHARACTERS · MAGIC · STORIES</span><span aria-hidden="true">✦</span></div>
      </section>
      <section className="ae-login-form-side" aria-label="Sign in">
        <div className="ae-login-form-wrap">
          <div className="ae-login-ornament" aria-hidden="true"><span /><Compass size={31} strokeWidth={1} /><span /></div>
          <p className="ae-kicker">YOUR NEXT CHAPTER</p>
          <h2>Welcome to the Weave.</h2>
          <p className="ae-login-intro">Sign in to return to your characters and your campaign.</p>
          <form onSubmit={handleLogin} className="ae-login-form">
            <div className="ae-login-field"><label htmlFor="login-username">Username</label><input id="login-username" type="text" value={username} onChange={event => setUsername(event.target.value)} data-testid="input-username" autoComplete="username" autoCapitalize="none" spellCheck={false} required placeholder="Your username" /></div>
            <div className="ae-login-field"><label htmlFor="login-password">Passphrase</label><div className="ae-password-field"><input id="login-password" type={showPassword ? "text" : "password"} value={password} onChange={event => setPassword(event.target.value)} data-testid="input-password" autoComplete="current-password" required placeholder="Your passphrase" /><button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? "Hide passphrase" : "Show passphrase"} aria-pressed={showPassword}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
            {loginMutation.isError && <p role="alert" className="ae-inline-error">We couldn’t sign you in. Check your username and passphrase, then try again.</p>}
            <button type="submit" className="ae-gold-button ae-login-submit" disabled={loginMutation.isPending} data-testid="button-submit-login">{loginMutation.isPending ? <><LoaderCircle size={18} className="ae-spin" aria-hidden="true" /> Entering the Weave…</> : <>Enter the Weave <ArrowRight size={18} aria-hidden="true" /></>}</button>
          </form>
          <p className="ae-login-footnote"><LockKeyhole size={13} aria-hidden="true" /> Your character’s story continues here.</p>
        </div>
        <p className="ae-login-bottom">A companion for the stories you tell together.</p>
      </section>
    </main>
  );
}
