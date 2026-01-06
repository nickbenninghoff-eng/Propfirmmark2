import { Metadata } from "next";
import { RegisterForm } from "@/components/forms/register-form";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Create your PropFirm account and start trading",
};

export default function RegisterPage() {
  return <RegisterForm />;
}
