// app/hooks/useUser.tsx
'use client'

import { useQuery } from '@tanstack/react-query'
import { createSupabaseBrowser } from '@/lib/supabase/client'

export default function useUser() {
  return useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const supabase = createSupabaseBrowser()
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) throw error
      return user
    }
  })
}