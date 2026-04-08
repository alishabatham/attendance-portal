import { useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { GraduationCap, ChevronRight } from "lucide-react";
import {
  useGetProfile,
  useSaveProfile,
  getGetProfileQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getToken } from "@/lib/auth";

const onboardingSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  joiningDate: z.string().min(1, "Joining date is required"),
  collegeName: z.string().min(2, "College name is required"),
  branch: z.string().min(1, "Branch is required"),
  section: z.string().min(1, "Section is required"),
  year: z.string().min(1, "Year is required"),
  semester: z.string().min(1, "Semester is required"),
  subject: z.string().min(1, "Subject is required"),
  interestArea: z.string().min(1, "Interest area is required"),
  interestAreaCustom: z.string().optional().nullable(),
});

type OnboardingForm = z.infer<typeof onboardingSchema>;

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: profile } = useGetProfile({
    query: { queryKey: getGetProfileQueryKey(), enabled: !!getToken() },
  });

  const saveProfile = useSaveProfile();

  useEffect(() => {
    if (profile?.profileCompleted) {
      if (profile.role === "admin") {
        setLocation("/admin");
      } else {
        setLocation("/dashboard");
      }
    }
  }, [profile, setLocation]);

  const form = useForm<OnboardingForm>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      fullName: "",
      joiningDate: "",
      collegeName: "",
      branch: "",
      section: "",
      year: "",
      semester: "",
      subject: "",
      interestArea: "",
      interestAreaCustom: "",
    },
  });

  const interestArea = form.watch("interestArea");

  const onSubmit = (data: OnboardingForm) => {
    saveProfile.mutate(
      {
        data: {
          fullName: data.fullName,
          joiningDate: data.joiningDate,
          collegeName: data.collegeName,
          branch: data.branch,
          section: data.section,
          year: data.year,
          semester: data.semester,
          subject: data.subject,
          interestArea: data.interestArea,
          interestAreaCustom: data.interestAreaCustom ?? null,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey() });
          toast.success("Profile saved! Welcome to AttendPortal.");
          setLocation("/dashboard");
        },
        onError: (err: unknown) => {
          const e = err as { data?: { error?: string }; message?: string };
          toast.error(e?.data?.error ?? e?.message ?? "Failed to save profile");
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground leading-none">AttendPortal</h1>
            <p className="text-xs text-muted-foreground">Complete your profile to get started</p>
          </div>
        </div>

        <Card className="shadow-lg border-card-border">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Student Profile Setup</CardTitle>
            <CardDescription>
              Fill in your academic details. This information helps your institution track your progress.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3 pb-2 border-b border-border">
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      placeholder="Your full name"
                      data-testid="input-fullName"
                      {...form.register("fullName")}
                    />
                    {form.formState.errors.fullName && (
                      <p className="text-xs text-destructive">{form.formState.errors.fullName.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="joiningDate">Date of Joining</Label>
                    <Input
                      id="joiningDate"
                      type="date"
                      data-testid="input-joiningDate"
                      {...form.register("joiningDate")}
                    />
                    {form.formState.errors.joiningDate && (
                      <p className="text-xs text-destructive">{form.formState.errors.joiningDate.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Academic Details */}
              <div>
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3 pb-2 border-b border-border">
                  Academic Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="collegeName">College Name</Label>
                    <Input
                      id="collegeName"
                      placeholder="e.g. National Institute of Technology"
                      data-testid="input-collegeName"
                      {...form.register("collegeName")}
                    />
                    {form.formState.errors.collegeName && (
                      <p className="text-xs text-destructive">{form.formState.errors.collegeName.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Branch</Label>
                    <Select onValueChange={(v) => form.setValue("branch", v)}>
                      <SelectTrigger data-testid="select-branch">
                        <SelectValue placeholder="Select branch" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CSE">CSE</SelectItem>
                        <SelectItem value="IT">IT</SelectItem>
                        <SelectItem value="ECE">ECE</SelectItem>
                        <SelectItem value="EEE">EEE</SelectItem>
                        <SelectItem value="ME">ME</SelectItem>
                        <SelectItem value="CE">CE</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    {form.formState.errors.branch && (
                      <p className="text-xs text-destructive">{form.formState.errors.branch.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="section">Section</Label>
                    <Input
                      id="section"
                      placeholder="e.g. A"
                      data-testid="input-section"
                      {...form.register("section")}
                    />
                    {form.formState.errors.section && (
                      <p className="text-xs text-destructive">{form.formState.errors.section.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Year</Label>
                    <Select onValueChange={(v) => form.setValue("year", v)}>
                      <SelectTrigger data-testid="select-year">
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1st">1st Year</SelectItem>
                        <SelectItem value="2nd">2nd Year</SelectItem>
                        <SelectItem value="3rd">3rd Year</SelectItem>
                        <SelectItem value="4th">4th Year</SelectItem>
                      </SelectContent>
                    </Select>
                    {form.formState.errors.year && (
                      <p className="text-xs text-destructive">{form.formState.errors.year.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Semester</Label>
                    <Select onValueChange={(v) => form.setValue("semester", v)}>
                      <SelectTrigger data-testid="select-semester">
                        <SelectValue placeholder="Select semester" />
                      </SelectTrigger>
                      <SelectContent>
                        {["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"].map((s) => (
                          <SelectItem key={s} value={s}>{s} Semester</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.semester && (
                      <p className="text-xs text-destructive">{form.formState.errors.semester.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Subject & Interest */}
              <div>
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3 pb-2 border-b border-border">
                  Course & Interest
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="subject">Current Subject / Course</Label>
                    <Input
                      id="subject"
                      placeholder="e.g. Machine Learning"
                      data-testid="input-subject"
                      {...form.register("subject")}
                    />
                    {form.formState.errors.subject && (
                      <p className="text-xs text-destructive">{form.formState.errors.subject.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Interest Area</Label>
                    <Select onValueChange={(v) => form.setValue("interestArea", v)}>
                      <SelectTrigger data-testid="select-interestArea">
                        <SelectValue placeholder="Select interest area" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Placement">Placement</SelectItem>
                        <SelectItem value="Startup">Startup</SelectItem>
                        <SelectItem value="Higher Studies">Higher Studies</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    {form.formState.errors.interestArea && (
                      <p className="text-xs text-destructive">{form.formState.errors.interestArea.message}</p>
                    )}
                  </div>
                  {interestArea === "Other" && (
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="interestAreaCustom">Describe your interest</Label>
                      <Input
                        id="interestAreaCustom"
                        placeholder="e.g. Research & Development"
                        data-testid="input-interestAreaCustom"
                        {...form.register("interestAreaCustom")}
                      />
                    </div>
                  )}
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={saveProfile.isPending}
                data-testid="button-submit"
              >
                {saveProfile.isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving profile...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Complete Profile
                    <ChevronRight className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
