import { useCallback, useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { GraduationCap, LogIn } from "lucide-react";
import { useLogin } from "@workspace/api-client-react";
import { setToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const loginMutation = useLogin();
  const [googleLoading, setGoogleLoading] = useState(false);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = (data: LoginForm) => {
    loginMutation.mutate(
      { data: { email: data.email, password: data.password } },
      {
        onSuccess: (result) => {
          setToken(result.token);
          toast.success("Logged in successfully");
          if (result.user.role === "admin") {
            setLocation("/admin");
          } else if (!result.user.profileCompleted) {
            setLocation("/onboarding");
          } else {
            setLocation("/dashboard");
          }
        },
        onError: (err: unknown) => {
          const e = err as { data?: { error?: string }; message?: string };
          toast.error(e?.data?.error ?? e?.message ?? "Login failed");
        },
      }
    );
  };

  const handleGoogleCredential = useCallback(async (credential: string) => {
    setGoogleLoading(true);
    try {
      const res = await fetch(`${BASE}/api/auth/google-signin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Google sign-in failed");
      setToken(data.token);
      toast.success("Signed in with Google");
      if (data.user.role === "admin") {
        setLocation("/admin");
      } else if (!data.user.profileCompleted) {
        setLocation("/onboarding");
      } else {
        setLocation("/dashboard");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed");
    } finally {
      setGoogleLoading(false);
    }
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground leading-none">AttendPortal</h1>
            <p className="text-xs text-muted-foreground">Smart Attendance System</p>
          </div>
        </div>

        <Card className="shadow-lg border-card-border">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Sign in</CardTitle>
            <CardDescription>Enter your credentials to access your account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@college.edu"
                  data-testid="input-email"
                  {...form.register("email")}
                />
                {form.formState.errors.email && (
                  <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  data-testid="input-password"
                  {...form.register("password")}
                />
                {form.formState.errors.password && (
                  <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loginMutation.isPending || googleLoading}
                data-testid="button-submit"
              >
                {loginMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <LogIn className="w-4 h-4" />
                    Sign in
                  </span>
                )}
              </Button>
            </form>

            <GoogleSignInButton onCredential={handleGoogleCredential} text="signin_with" />

            <div className="mt-4 text-center text-sm text-muted-foreground">
              No account?{" "}
              <Link href="/signup" className="text-primary font-medium hover:underline">
                Create one
              </Link>
            </div>

            <div className="mt-4 p-3 bg-muted rounded-lg text-xs text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Demo credentials</p>
              <p>Admin: <span className="font-mono">admin@portal.com</span> / <span className="font-mono">Admin@123</span></p>
              <p>Student: <span className="font-mono">alice@student.com</span> / <span className="font-mono">Pass@123</span></p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
