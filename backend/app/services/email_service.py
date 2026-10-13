import os
import smtplib
from email.message import EmailMessage
from html import escape


class EmailDeliveryError(Exception):
  """Raised when the configured SMTP service cannot deliver an email."""


def send_password_reset_email(recipient: str, reset_url: str) -> None:
  smtp_host = os.getenv("SMTP_HOST")
  smtp_username = os.getenv("SMTP_USERNAME")
  smtp_password = os.getenv("SMTP_PASSWORD")
  smtp_port = int(os.getenv("SMTP_PORT", "587"))
  smtp_from = os.getenv("SMTP_FROM_EMAIL", smtp_username or "")
  use_tls = os.getenv("SMTP_USE_TLS", "true").lower() == "true"

  if not all((smtp_host, smtp_username, smtp_password, smtp_from)):
    raise EmailDeliveryError("SMTP is not configured")

  message = EmailMessage()
  message["Subject"] = "Reset your Ormoc Transport App password"
  message["From"] = smtp_from
  message["To"] = recipient
  message.set_content(
    "A password reset was requested for your Ormoc Transport App account.\n\n"
    f"Use this link to choose a new password: {reset_url}\n\n"
    "This link expires in 30 minutes and can only be used once. If you did not request "
    "a password reset, you can safely ignore this email."
  )
  safe_reset_url = escape(reset_url, quote=True)
  message.add_alternative(
    f"""\
<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#f4f7f6;font-family:Arial,sans-serif;color:#173f3c;">
    <main style="max-width:520px;margin:0 auto;padding:32px;background:#ffffff;border-radius:10px;">
      <h1 style="margin:0 0 16px;font-size:22px;">Reset your password</h1>
      <p style="margin:0 0 24px;line-height:1.5;">A password reset was requested for your Ormoc Transport App account.</p>
      <p style="margin:0 0 24px;">
        <a href="{safe_reset_url}" style="display:inline-block;padding:12px 20px;background:#0f766e;border-radius:6px;color:#ffffff;font-weight:700;text-decoration:none;">Reset password</a>
      </p>
      <p style="margin:0 0 8px;line-height:1.5;">This link expires in 30 minutes and can only be used once.</p>
      <p style="margin:0;color:#536b68;font-size:13px;line-height:1.5;">If the button does not work, copy and paste this link into your browser:<br><a href="{safe_reset_url}" style="color:#0f766e;word-break:break-all;">{safe_reset_url}</a></p>
    </main>
  </body>
</html>
""",
    subtype="html",
  )

  try:
    with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as client:
      client.ehlo()
      if use_tls:
        client.starttls()
        client.ehlo()
      client.login(smtp_username, smtp_password)
      client.send_message(message)
  except (OSError, smtplib.SMTPException) as exc:
    raise EmailDeliveryError("Unable to send password reset email") from exc


def send_email_verification_code(recipient: str, code: str) -> None:
  smtp_host = os.getenv("SMTP_HOST")
  smtp_username = os.getenv("SMTP_USERNAME")
  smtp_password = os.getenv("SMTP_PASSWORD")
  smtp_port = int(os.getenv("SMTP_PORT", "587"))
  smtp_from = os.getenv("SMTP_FROM_EMAIL", smtp_username or "")
  use_tls = os.getenv("SMTP_USE_TLS", "true").lower() == "true"

  if not all((smtp_host, smtp_username, smtp_password, smtp_from)):
    raise EmailDeliveryError("SMTP is not configured")

  message = EmailMessage()
  message["Subject"] = "Verify your Ormoc Transport App email"
  message["From"] = smtp_from
  message["To"] = recipient
  message.set_content(
    f"Your email verification code is {code}.\n\n"
    "This code expires in 10 minutes. If you did not request this change, "
    "you can safely ignore this email."
  )

  try:
    with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as client:
      client.ehlo()
      if use_tls:
        client.starttls()
        client.ehlo()
      client.login(smtp_username, smtp_password)
      client.send_message(message)
  except (OSError, smtplib.SMTPException) as exc:
    raise EmailDeliveryError("Unable to send email verification code") from exc


def send_password_reset_code(recipient: str, code: str) -> None:
  smtp_host = os.getenv("SMTP_HOST")
  smtp_username = os.getenv("SMTP_USERNAME")
  smtp_password = os.getenv("SMTP_PASSWORD")
  smtp_port = int(os.getenv("SMTP_PORT", "587"))
  smtp_from = os.getenv("SMTP_FROM_EMAIL", smtp_username or "")
  use_tls = os.getenv("SMTP_USE_TLS", "true").lower() == "true"

  if not all((smtp_host, smtp_username, smtp_password, smtp_from)):
    raise EmailDeliveryError("SMTP is not configured")

  message = EmailMessage()
  message["Subject"] = "Your Ormoc Transport App password reset code"
  message["From"] = smtp_from
  message["To"] = recipient
  message.set_content(
    f"Your password reset code is {code}.\n\n"
    "This code expires in 10 minutes. If you did not request a password reset, "
    "you can safely ignore this email."
  )

  try:
    with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as client:
      client.ehlo()
      if use_tls:
        client.starttls()
        client.ehlo()
      client.login(smtp_username, smtp_password)
      client.send_message(message)
  except (OSError, smtplib.SMTPException) as exc:
    raise EmailDeliveryError("Unable to send password reset code") from exc


def send_account_activity_email(recipient: str, subject: str, notice: str) -> None:
  smtp_host = os.getenv("SMTP_HOST")
  smtp_username = os.getenv("SMTP_USERNAME")
  smtp_password = os.getenv("SMTP_PASSWORD")
  smtp_port = int(os.getenv("SMTP_PORT", "587"))
  smtp_from = os.getenv("SMTP_FROM_EMAIL", smtp_username or "")
  use_tls = os.getenv("SMTP_USE_TLS", "true").lower() == "true"

  if not all((smtp_host, smtp_username, smtp_password, smtp_from)):
    raise EmailDeliveryError("SMTP is not configured")

  message = EmailMessage()
  message["Subject"] = subject
  message["From"] = smtp_from
  message["To"] = recipient
  message.set_content(f"Greetings,\n\n{notice}\n\nBest regards,\nOrmoc Transport App")
  safe_notice = escape(notice).replace("\n", "<br>")
  message.add_alternative(
    f"""<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#f4f7f6;font-family:Arial,sans-serif;color:#173f3c;">
    <main style="max-width:560px;margin:0 auto;padding:32px;background:#ffffff;border-radius:10px;line-height:1.6;">
      <p>Greetings,</p>
      <p>{safe_notice}</p>
      <p>Best regards,<br>Ormoc Transport App</p>
    </main>
  </body>
</html>""",
    subtype="html",
  )

  try:
    with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as client:
      client.ehlo()
      if use_tls:
        client.starttls()
        client.ehlo()
      client.login(smtp_username, smtp_password)
      client.send_message(message)
  except (OSError, smtplib.SMTPException) as exc:
    raise EmailDeliveryError("Unable to send account activity email") from exc
