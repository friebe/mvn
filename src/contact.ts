/** Inbox on the Resend-verified root domain. */
export const CONTACT_EMAIL = 'hello@getstint.de'

export function contactMailto(): string {
  return `mailto:${CONTACT_EMAIL}`
}

export function contactCornerHtml(): string {
  return `<a class="contact-corner" href="${contactMailto()}">${CONTACT_EMAIL}</a>`
}
