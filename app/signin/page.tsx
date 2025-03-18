import Signin from "@/components/supaauth/signin";
import React from "react";
import { Toaster } from "sonner";


export default function SigninPage() {
    return(
        <div className="min-h-screen flex items-center justify-center p-4">
            <Signin/>
            <Toaster />
        </div>
    );
}