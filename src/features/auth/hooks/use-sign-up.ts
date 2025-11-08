import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { signUpSchema, type SignUpSchema } from "../utils/validators";

const initialForm = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
};

export function useSignUp() {
  const [status, setStatus] = useState<"idle" | "submitting">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const form = useForm<SignUpSchema>({
    resolver: zodResolver(signUpSchema),
    defaultValues: initialForm,
  });

  const handleSubmit = form.handleSubmit((data) => {
    setMessage(null);
    setStatus("submitting");

    // Mock API call - replace with real auth logic later
    setTimeout(() => {
      setStatus("idle");
      setMessage(
        "Account created successfully! Mock redirect to onboarding coming soon.",
      );
      // In real implementation, redirect to dashboard or onboarding
    }, 700);
  });

  return {
    form,
    status,
    message,
    handleSubmit,
  };
}
