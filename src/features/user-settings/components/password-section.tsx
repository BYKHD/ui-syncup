"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RiLockPasswordLine, RiCheckboxCircleFill, RiInformationFill } from "@remixicon/react";
import { useSession } from "@/features/auth/hooks/use-session";
import { authClient } from "@/lib/auth-client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { PasswordStrengthIndicator } from "@/features/auth/components/password-strength-indicator";
import { setPassword } from "@/features/user-settings/actions/set-password";

const passwordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export interface PasswordSectionProps {
  hasPassword: boolean;
}

export function PasswordSection({ hasPassword }: PasswordSectionProps) {
  const { invalidateSession } = useSession();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Password</CardTitle>
        <CardDescription>
          Manage your password to secure your account.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
            <RiLockPasswordLine className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium">
                {hasPassword ? "Password set" : "No password set"}
              </p>
               {hasPassword ? (
                <RiCheckboxCircleFill className="h-4 w-4 text-green-500" />
              ) : (
                <RiInformationFill className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {hasPassword
                ? "Your account is secured with a password."
                : "Secure your account by setting a password."}
            </p>
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant={hasPassword ? "outline" : "default"}>
              {hasPassword ? "Change Password" : "Set Password"}
            </Button>
          </DialogTrigger>
          <DialogContent>
            {hasPassword ? (
               <ChangePasswordForm onSuccess={() => setIsDialogOpen(false)} />
            ) : (
               <SetPasswordForm onSuccess={() => setIsDialogOpen(false)} />
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}



// ... existing imports

function SetPasswordForm({ onSuccess }: { onSuccess: () => void }) {
  const { user } = useSession();
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
  });

  const password = watch("password");

  const onSubmit = async (data: z.infer<typeof passwordSchema>) => {
    setLoading(true);
    try {
        const formData = new FormData();
        formData.append("password", data.password);
        formData.append("confirmPassword", data.confirmPassword);

        const result = await setPassword({}, formData);
        
        if (result.error) {
             toast.error(result.error);
             return;
        }

        toast.success("Password set successfully");
        onSuccess();
        window.location.reload(); 
    } catch (err) {
      toast.error("Failed to set password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <DialogHeader>
        <DialogTitle>Set Password</DialogTitle>
        <DialogDescription>
          Create a password to sign in with email.
        </DialogDescription>
      </DialogHeader>
      
      <div className="space-y-2">
        <Label htmlFor="password">New Password</Label>
        <Input
          id="password"
          type="password"
          {...register("password")}
        />
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
        <PasswordStrengthIndicator password={password} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <Input
          id="confirmPassword"
          type="password"
          {...register("confirmPassword")}
        />
        {errors.confirmPassword && (
          <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
        )}
      </div>

      <DialogFooter>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Set Password
        </Button>
      </DialogFooter>
    </form>
  );
}

function ChangePasswordForm({ onSuccess }: { onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<z.infer<typeof changePasswordSchema>>({
    resolver: zodResolver(changePasswordSchema),
  });

  const newPassword = watch("newPassword");

  const onSubmit = async (data: z.infer<typeof changePasswordSchema>) => {
    setLoading(true);
    try {
        const { error } = await authClient.changePassword({
            currentPassword: data.currentPassword,
            newPassword: data.newPassword,
            revokeOtherSessions: true,
        });

        if (error) {
            toast.error(error.message);
            return;
        }

        toast.success("Password changed successfully");
        onSuccess();
    } catch (err) {
      toast.error("Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <DialogHeader>
        <DialogTitle>Change Password</DialogTitle>
        <DialogDescription>
          Enter your current password to set a new one.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-2">
        <Label htmlFor="currentPassword">Current Password</Label>
        <Input
          id="currentPassword"
          type="password"
          {...register("currentPassword")}
        />
        {errors.currentPassword && (
          <p className="text-sm text-destructive">{errors.currentPassword.message}</p>
        )}
         <div className="text-right">
            <Link 
                href="/forgot-password" 
                className="text-xs text-primary hover:underline hover:text-primary/80"
                onClick={() => onSuccess()} // Close dialog
            >
                Forgot your password?
            </Link>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="newPassword">New Password</Label>
        <Input
          id="newPassword"
          type="password"
          {...register("newPassword")}
        />
        {errors.newPassword && (
          <p className="text-sm text-destructive">{errors.newPassword.message}</p>
        )}
        <PasswordStrengthIndicator password={newPassword} />
      </div>

       <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm New Password</Label>
        <Input
          id="confirmPassword"
          type="password"
          {...register("confirmPassword")}
        />
        {errors.confirmPassword && (
          <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
        )}
      </div>

      <DialogFooter>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Change Password
        </Button>
      </DialogFooter>
    </form>
  );
}
