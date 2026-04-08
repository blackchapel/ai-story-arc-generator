import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText


SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 587


def send_arc_ready_email(to_email: str, job_id: str) -> None:
    gmail_address  = os.environ["GMAIL_ADDRESS"]
    gmail_app_password = os.environ["GMAIL_APP_PASSWORD"]
    app_base_url   = os.environ.get("APP_BASE_URL", "").rstrip("/")

    arc_url = f"{app_base_url}/arc/{job_id}"

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Your arc is ready"
    msg["From"]    = f"arc. <{gmail_address}>"
    msg["To"]      = to_email

    text_body = f"Your story arc is ready. Open it here: {arc_url}"

    html_body = f"""
<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
      <tr>
        <td align="center">
          <table width="480" cellpadding="0" cellspacing="0"
                 style="background:#ffffff;border-radius:16px;overflow:hidden;
                        box-shadow:0 2px 12px rgba(0,0,0,0.08);">

            <!-- Header bar -->
            <tr>
              <td style="height:4px;background:linear-gradient(90deg,#6366F1,#EC4899,#F5A623);"></td>
            </tr>

            <!-- Logo -->
            <tr>
              <td align="center" style="padding:32px 40px 0;">
                <span style="font-size:28px;font-weight:900;letter-spacing:-1.5px;color:#0C0C0C;">
                  arc<span style="color:#F5A623;">.</span>
                </span>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:24px 40px 8px;text-align:center;">
                <p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0C0C0C;">
                  Your arc is ready
                </p>
                <p style="margin:0;font-size:14px;color:#8C8C8C;line-height:1.55;">
                  The story arc you requested has finished generating.<br>
                  Tap below to open it.
                </p>
              </td>
            </tr>

            <!-- CTA -->
            <tr>
              <td align="center" style="padding:28px 40px 36px;">
                <a href="{arc_url}"
                   style="display:inline-block;padding:14px 32px;
                          background:linear-gradient(135deg,#6366F1,#8B5CF6);
                          color:#ffffff;font-size:14px;font-weight:700;
                          text-decoration:none;border-radius:10px;
                          box-shadow:0 4px 14px rgba(99,102,241,0.35);">
                  Open your arc
                </a>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:0 40px 28px;text-align:center;">
                <p style="margin:0;font-size:11px;color:#ABABAB;">
                  If the button doesn't work, copy this link:<br>
                  <a href="{arc_url}" style="color:#6366F1;word-break:break-all;">{arc_url}</a>
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
"""

    msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.ehlo()
        server.starttls()
        server.login(gmail_address, gmail_app_password)
        server.sendmail(gmail_address, to_email, msg.as_string())

    print(f"[✓] Notification email sent to {to_email} for arc {job_id}")


def send_otp_email(to_email: str, code: str) -> None:
    gmail_address      = os.environ["GMAIL_ADDRESS"]
    gmail_app_password = os.environ["GMAIL_APP_PASSWORD"]

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Your arc. sign-in code"
    msg["From"]    = f"arc. <{gmail_address}>"
    msg["To"]      = to_email

    text_body = f"Your arc. sign-in code is: {code}\n\nThis code expires in 10 minutes. Do not share it with anyone."

    html_body = f"""
<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
      <tr>
        <td align="center">
          <table width="480" cellpadding="0" cellspacing="0"
                 style="background:#ffffff;border-radius:16px;overflow:hidden;
                        box-shadow:0 2px 12px rgba(0,0,0,0.08);">

            <!-- Header bar -->
            <tr>
              <td style="height:4px;background:linear-gradient(90deg,#6366F1,#EC4899,#F5A623);"></td>
            </tr>

            <!-- Logo -->
            <tr>
              <td align="center" style="padding:32px 40px 0;">
                <span style="font-size:28px;font-weight:900;letter-spacing:-1.5px;color:#0C0C0C;">
                  arc<span style="color:#F5A623;">.</span>
                </span>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:24px 40px 8px;text-align:center;">
                <p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0C0C0C;">
                  Your sign-in code
                </p>
                <p style="margin:0;font-size:14px;color:#8C8C8C;line-height:1.55;">
                  Use the code below to sign in to arc.<br>
                  It expires in <strong>10 minutes</strong>.
                </p>
              </td>
            </tr>

            <!-- OTP code -->
            <tr>
              <td align="center" style="padding:28px 40px;">
                <div style="display:inline-block;padding:20px 36px;
                            background:#F8F7FF;border-radius:12px;
                            border:2px solid #E0DFFE;">
                  <span style="font-size:40px;font-weight:900;letter-spacing:10px;
                               color:#6366F1;font-variant-numeric:tabular-nums;">
                    {code}
                  </span>
                </div>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:0 40px 28px;text-align:center;">
                <p style="margin:0;font-size:11px;color:#ABABAB;line-height:1.6;">
                  If you did not request this code, you can safely ignore this email.<br>
                  Never share this code with anyone.
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
"""

    msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.ehlo()
        server.starttls()
        server.login(gmail_address, gmail_app_password)
        server.sendmail(gmail_address, to_email, msg.as_string())

    print(f"[✓] OTP email sent to {to_email}")
