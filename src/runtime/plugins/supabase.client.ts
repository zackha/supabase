import { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { watch } from 'vue'
import { useSupabaseClient } from '../composables/useSupabaseClient'
import { useSupabaseUser } from '../composables/useSupabaseUser'
import { useSupabaseToken } from '../composables/useSupabaseToken'
import { defineNuxtPlugin, useRuntimeConfig, useRoute, navigateTo } from '#imports'

export default defineNuxtPlugin(async (nuxtApp) => {
  const user = useSupabaseUser()
  const client = useSupabaseClient()
  const redirect = useRuntimeConfig().public.supabase.redirect

  // If user has not been set on server side (for instance in SPA), set it for client
  if (!user.value) {
    const token = useSupabaseToken()
    if (token.value) {
      const { data: { user: supabaseUser }, error } = await client.auth.getUser(token.value)

      if (error) {
        token.value = null
        user.value = null
      } else {
        user.value = supabaseUser
      }
    }
  }

  // If user is not set, redirect to login page
  if (redirect && redirect.login) {
    watch(user, (newUser) => {
      if (newUser) { return }

      // Do not redirect if already on login page
      const route = useRoute()
      if (route.fullPath === redirect.login) { return }

      // Navigate to login page on frontside
      setTimeout(() => {
        navigateTo(redirect.login)
      }, 0)
    }, { immediate: true })
  }

  // Once Nuxt app is mounted
  nuxtApp.hooks.hook('app:mounted', () => {
    // Listen to Supabase auth changes
    client.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      await setServerSession(event, session)
      const userResponse = await client.auth.getUser()
      user.value = userResponse.data.user
    })
  })
})

function setServerSession (event: AuthChangeEvent, session: Session | null): Promise<any> {
  return $fetch('/api/_supabase/session', {
    method: 'POST',
    body: { event, session }
  })
}
