import Register from "@/components/supaauth/register";
import React from "react";
import { Toaster } from "sonner";

export default function RegisterPage() {
    return(
        <div className="min-h-screen flex items-center justify-center p-4">
            <Register/>
            <Toaster />
        </div>
    );
}