/**
 * Supabase geeft zijn foutmeldingen in het Engels terug. Dit vertaalt de
 * meldingen die een gebruiker echt kan tegenkomen; de rest valt terug op de
 * originele tekst zodat we nooit een fout wegmoffelen.
 */
const VERTALINGEN: [RegExp, string][] = [
  [/invalid login credentials/i, "E-mailadres of wachtwoord klopt niet."],
  [
    /email not confirmed/i,
    "Je account is nog niet bevestigd. Kijk in je mailbox voor de bevestigingsmail.",
  ],
  [
    /user already registered|already been registered/i,
    "Er bestaat al een account met dit e-mailadres. Meld je hierboven aan.",
  ],
  [
    /password should be at least (\d+)/i,
    "Je wachtwoord is te kort — gebruik minstens 8 tekens.",
  ],
  [/unable to validate email address|invalid email/i, "Dat e-mailadres ziet er niet geldig uit."],
  [
    /email rate limit exceeded|over_email_send_rate_limit/i,
    "Er zijn net te veel mails verstuurd. Wacht een paar minuten en probeer opnieuw.",
  ],
  [
    /for security purposes|request this after/i,
    "Even geduld — je kunt dit pas over een minuutje opnieuw proberen.",
  ],
  [/new password should be different/i, "Kies een ander wachtwoord dan je vorige."],
  [/token has expired|invalid.*token/i, "Deze link is verlopen. Vraag een nieuwe aan."],
];

export function vertaalAuthFout(melding: string): string {
  for (const [patroon, nederlands] of VERTALINGEN) {
    if (patroon.test(melding)) return nederlands;
  }
  return melding;
}
