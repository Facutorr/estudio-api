import { Resend } from 'resend'
import { config } from '../config.js'

type SendArgs = {
  subject: string
  text: string
}

let resendClient: Resend | null = null

function getResendClient() {
  if (resendClient) return resendClient
  
  const apiKey = config.resendApiKey
  if (!apiKey) {
    console.log('[Email] No RESEND_API_KEY configured')
    return null
  }
  
  resendClient = new Resend(apiKey)
  return resendClient
}

export async function sendNotificationEmail(args: SendArgs) {
  const to = config.contactEmail
  const from = 'Estudio Torres <onboarding@resend.dev>'
  
  console.log('[Email] Attempting to send to:', to)
  
  const client = getResendClient()
  if (!client || !to) {
    console.log('[Email] Cannot send - client:', !!client, 'to:', to)
    return false
  }

  try {
    const result = await client.emails.send({
      from,
      to,
      subject: args.subject,
      text: args.text
    })
    console.log('[Email] Sent successfully:', result)
    return true
  } catch (err) {
    console.error('[Email] Error sending:', err)
    return false
  }
}
