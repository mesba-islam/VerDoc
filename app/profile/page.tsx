import UserProfile from "@/components/supaauth/user-profile";
import React from "react";
import { Toaster } from "sonner";
// import { Hydrate } from '@tanstack/react-query'
export default function ProfilePage() {
    return(
        <div className="min-h-screen flex items-center justify-center p-4">
            
            <UserProfile />
           
            <Toaster />
        </div>
    );
}