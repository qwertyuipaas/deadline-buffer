import { supabase } from './supabaseClient'

/**
 * Validates format of username: letters, numbers, underscores, and hyphens.
 * Minimum 3 characters, max 30 characters.
 */
export function validateUsernameFormat(username) {
  const trimmed = (username || '').trim()
  if (!trimmed) return { valid: false, message: 'Username is required.' }
  if (trimmed.length < 3) return { valid: false, message: 'Username must be at least 3 characters.' }
  if (trimmed.length > 30) return { valid: false, message: 'Username must be 30 characters or less.' }
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return { valid: false, message: 'Username can only contain letters, numbers, underscores, and hyphens.' }
  }
  return { valid: true, message: '' }
}

/**
 * Checks if a username is already taken in the profiles table.
 * Returns { available: boolean, message: string }
 */
export async function checkUsernameAvailability(username, excludeUserId = null) {
  const formatCheck = validateUsernameFormat(username)
  if (!formatCheck.valid) {
    return { available: false, message: formatCheck.message, invalidFormat: true }
  }

  const trimmed = username.trim()

  try {
    let query = supabase
      .from('profiles')
      .select('id, username')
      .ilike('username', trimmed)

    if (excludeUserId) {
      query = query.neq('id', excludeUserId)
    }

    const { data, error } = await query.maybeSingle()

    // If table doesn't exist yet, we treat as available and allow signup
    if (error) {
      if (error.code === 'PGRST205' || error.code === '42P01') {
        return { available: true, message: '' }
      }
      console.warn('Username check query warning:', error)
      return { available: true, message: '' }
    }

    if (data) {
      return { available: false, message: 'Username is already taken. Please choose another one.' }
    }

    return { available: true, message: 'Username is available' }
  } catch (err) {
    console.warn('Error checking username availability:', err)
    return { available: true, message: '' }
  }
}

/**
 * Saves or updates a user profile username in the profiles table.
 */
export async function saveUserProfile(userId, username) {
  if (!userId || !username) return { error: null }
  const trimmed = username.trim()

  try {
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        username: trimmed,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })

    if (error && error.code !== 'PGRST205' && error.code !== '42P01') {
      console.warn('Profile upsert warning:', error)
    }
    return { error }
  } catch (err) {
    console.warn('Failed to save profile:', err)
    return { error: err }
  }
}
